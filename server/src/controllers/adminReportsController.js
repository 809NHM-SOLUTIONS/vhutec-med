
const prisma = require("../prisma");
const PDFDocument = require("pdfkit");

const TIME_ZONE = "Africa/Johannesburg";
const OFFSET = "+02:00";
const MAX_DAYS = 366;

function parseDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return null;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
    ? null
    : value;
}

function getPeriod(req) {
  const now = new Date();
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);

  const from = parseDate(req.query.from || today.slice(0, 7) + "-01");
  const to = parseDate(req.query.to || today);

  if (!from || !to || from > to) {
    throw new Error("Provide a valid date range in YYYY-MM-DD format.");
  }

  const start = new Date(`${from}T00:00:00${OFFSET}`);
  const end = new Date(`${to}T00:00:00${OFFSET}`);
  end.setUTCDate(end.getUTCDate() + 1);

  const days = (end - start) / 86400000;
  if (days > MAX_DAYS) {
    throw new Error("The reporting period cannot exceed 366 days.");
  }

  return {
    from,
    to,
    start,
    end,
    filter: { gte: start, lt: end },
  };
}

function countStatuses(rows) {
  return Object.fromEntries(
    rows.map((row) => [row.status, row._count._all])
  );
}

function dayKey(date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

async function buildReport(period) {
  const { filter } = period;

  const [
    registrations,
    newUsers,
    booked,
    scheduled,
    completed,
    checkIns,
    statuses,
    appointments,
    patients,
    consultations,
    queues,
  ] = await Promise.all([
    prisma.patient.count({ where: { createdAt: filter } }),
    prisma.user.count({ where: { createdAt: filter } }),
    prisma.appointment.count({ where: { createdAt: filter } }),
    prisma.appointment.count({ where: { date: filter } }),
    prisma.consultation.count({
      where: { completedAt: filter },
    }),
    prisma.queue.count({ where: { checkedInAt: filter } }),
    prisma.appointment.groupBy({
      by: ["status"],
      where: { createdAt: filter },
      _count: { _all: true },
    }),
    prisma.appointment.findMany({
      where: { createdAt: filter },
      select: {
        createdAt: true,
        doctorId: true,
        departmentId: true,
        doctor: {
          select: { firstName: true, lastName: true },
        },
        department: { select: { name: true } },
      },
    }),
    prisma.patient.findMany({
      where: { createdAt: filter },
      select: { createdAt: true },
    }),
    prisma.consultation.findMany({
      where: { completedAt: filter },
      select: { completedAt: true },
    }),
    prisma.queue.findMany({
      where: { checkedInAt: filter },
      select: { checkedInAt: true },
    }),
  ]);

  const trendMap = new Map();
  const cursor = new Date(`${period.from}T00:00:00Z`);
  const last = new Date(`${period.to}T00:00:00Z`);

  while (cursor <= last) {
    const date = cursor.toISOString().slice(0, 10);
    trendMap.set(date, {
      date,
      registrations: 0,
      appointments: 0,
      consultations: 0,
      checkIns: 0,
    });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  function addTrend(items, field, key) {
    for (const item of items) {
      const date = dayKey(item[field]);
      const row = trendMap.get(date);
      if (row) row[key]++;
    }
  }

  addTrend(patients, "createdAt", "registrations");
  addTrend(appointments, "createdAt", "appointments");
  addTrend(consultations, "completedAt", "consultations");
  addTrend(queues, "checkedInAt", "checkIns");

  const doctorMap = new Map();
  const departmentMap = new Map();

  for (const appointment of appointments) {
    const doctorName =
      `Dr. ${appointment.doctor.firstName} ${appointment.doctor.lastName}`;

    const doctor = doctorMap.get(appointment.doctorId) || {
      name: doctorName,
      appointments: 0,
    };
    doctor.appointments++;
    doctorMap.set(appointment.doctorId, doctor);

    const department =
      departmentMap.get(appointment.departmentId) || {
        name: appointment.department.name,
        appointments: 0,
      };
    department.appointments++;
    departmentMap.set(appointment.departmentId, department);
  }

  return {
    period: { from: period.from, to: period.to },
    summary: {
      patientRegistrations: registrations,
      newUserAccounts: newUsers,
      appointmentsBooked: booked,
      appointmentsScheduled: scheduled,
      consultationsCompleted: completed,
      patientCheckIns: checkIns,
    },
    appointmentStatuses: countStatuses(statuses),
    trends: [...trendMap.values()],
    doctors: [...doctorMap.values()].sort(
      (a, b) => b.appointments - a.appointments
    ),
    departments: [...departmentMap.values()].sort(
      (a, b) => b.appointments - a.appointments
    ),
    notes: [
      "Appointment status counts reflect the current status of appointments booked during the selected period.",
      "Doctor and department totals represent appointments created during the selected period.",
      "Historical patient sign-in events are not currently tracked.",
    ],
  };
}

function handleError(res, error) {
  const invalid = error.message.startsWith("Provide a valid") ||
    error.message.startsWith("The reporting period");

  if (!invalid) console.error("Admin reporting error:", error);

  if (!res.headersSent) {
    res.status(invalid ? 400 : 500).json({
      success: false,
      message: invalid
        ? error.message
        : "Unable to generate the requested report.",
    });
  } else {
    res.end();
  }
}

async function getAdminReport(req, res) {
  try {
    const report = await buildReport(getPeriod(req));
    res.json({ success: true, data: report });
  } catch (error) {
    handleError(res, error);
  }
}

function csvCell(value) {
  let text = String(value ?? "");
  // Prevent spreadsheet applications from interpreting values as formulas.
  if (/^[\s]*[=+\-@\t\r]/.test(text)) text = "'" + text;
  return `"${text.replace(/"/g, '""')}"`;
}

function makeCsv(report) {
  const rows = [
    ["Vhutec Med - Administration Report"],
    ["From", report.period.from],
    ["To", report.period.to],
    [],
    ["Metric", "Count"],
    ...Object.entries(report.summary),
    [],
    ["Appointment status", "Count"],
    ...Object.entries(report.appointmentStatuses),
    [],
    ["Doctor", "Appointments booked"],
    ...report.doctors.map((d) => [d.name, d.appointments]),
    [],
    ["Department", "Appointments booked"],
    ...report.departments.map((d) => [d.name, d.appointments]),
    [],
    ["Date", "Registrations", "Bookings", "Consultations", "Check-ins"],
    ...report.trends.map((t) => [
      t.date,
      t.registrations,
      t.appointments,
      t.consultations,
      t.checkIns,
    ]),
    [],
    ["Report notes"],
    ...report.notes.map((note) => [note]),
  ];

  return "\uFEFF" + rows.map(
    (row) => row.map(csvCell).join(",")
  ).join("\r\n");
}

function makePdf(res, report) {
  const doc = new PDFDocument({
    size: "A4",
    margin: 48,
    info: { Title: "Vhutec Med Administration Report" },
  });

  doc.pipe(res);

  doc.fontSize(21).fillColor("#0f766e")
    .text("VHUTEC MED");
  doc.fontSize(15).fillColor("#172033")
    .text("Administration Report");
  doc.moveDown(0.5);
  doc.fontSize(10).fillColor("#64748b")
    .text(`Period: ${report.period.from} to ${report.period.to}`);
  doc.moveDown();

  function section(title, entries) {
    if (doc.y > 680) doc.addPage();

    doc.fontSize(13).fillColor("#0f766e").text(title);
    doc.moveDown(0.35);

    for (const [label, value] of entries) {
      if (doc.y > 735) doc.addPage();

      doc.fontSize(10).fillColor("#172033")
        .text(`${label}: ${value}`, {
          width: 490,
        });
      doc.moveDown(0.25);
    }

    doc.moveDown();
  }

  section("Overview", [
    ["Patient registrations", report.summary.patientRegistrations],
    ["New user accounts", report.summary.newUserAccounts],
    ["Appointments booked", report.summary.appointmentsBooked],
    ["Scheduled appointments", report.summary.appointmentsScheduled],
    ["Completed consultations", report.summary.consultationsCompleted],
    ["Patient check-ins", report.summary.patientCheckIns],
  ]);

  section("Appointment Statuses", Object.entries(
    report.appointmentStatuses
  ));

  section("Doctor Activity", report.doctors.map(
    (d) => [d.name, d.appointments]
  ));

  section("Department Activity", report.departments.map(
    (d) => [d.name, d.appointments]
  ));

  section("Reporting Notes", report.notes.map(
    (note) => [note, ""]
  ));

  doc.end();
}

async function exportAdminReport(req, res) {
  try {
    const format = String(req.query.format || "").toLowerCase();

    if (!["pdf", "csv"].includes(format)) {
      return res.status(400).json({
        success: false,
        message: "Format must be pdf or csv.",
      });
    }

    const report = await buildReport(getPeriod(req));
    const filename =
      `vhutec-med-report-${report.period.from}-to-${report.period.to}.${format}`;

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${filename}"`
    );
    res.setHeader("Cache-Control", "no-store");

    if (format === "csv") {
      res.type("text/csv; charset=utf-8");
      return res.send(makeCsv(report));
    }

    res.type("application/pdf");
    makePdf(res, report);
  } catch (error) {
    handleError(res, error);
  }
}

module.exports = {
  getAdminReport,
  exportAdminReport,
};
