// Read-only data for the Receptionist Dashboard.
// Place in: server/controllers/receptionDashboardController.js
// (a separate file, so your existing receptionistController.js is untouched)

const prisma = require("../prisma");

const pad = (n) => String(n).padStart(2, "0");

const toDateKey = (d) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

// Start (inclusive) and end (exclusive) of a day. Defaults to today.
const dayRange = (dateParam) => {
    const valid = typeof dateParam === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dateParam);
    const start = valid ? new Date(`${dateParam}T00:00:00`) : new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    return { start, end };
};

const fullName = (p) => `${p.firstName} ${p.lastName}`.trim();

const toAppointment = (a) => ({
    id: a.id,
    date: a.date,
    timeSlot: a.timeSlot,
    reason: a.reason,
    status: a.status,
    patientId: a.patient.id,
    patientName: fullName(a.patient),
    patientNumber: a.patient.patientNumber,
    doctorName: `Dr. ${fullName(a.doctor)}`,
    department: a.department.name,
    queueNumber: a.queue ? a.queue.queueNumber : null,
    queueStatus: a.queue ? a.queue.status : null,
});

const toQueueEntry = (a) => ({
    id: a.id,
    queueNumber: a.queue.queueNumber,
    status: a.queue.status,
    checkedInAt: a.queue.checkedInAt,
    calledAt: a.queue.calledAt,
    patientName: fullName(a.patient),
    patientNumber: a.patient.patientNumber,
    doctorName: `Dr. ${fullName(a.doctor)}`,
    department: a.department.name,
    timeSlot: a.timeSlot,
});

const buildStats = (rows) => {
    const active = rows.filter((a) => a.status !== "CANCELLED");
    const countStatus = (...statuses) =>
        active.filter((a) => statuses.includes(a.status)).length;
    const countQueue = (...statuses) =>
        active.filter((a) => a.queue && statuses.includes(a.queue.status)).length;

    const waits = active
        .filter((a) => a.queue && a.queue.checkedInAt && a.queue.calledAt)
        .map((a) => (new Date(a.queue.calledAt) - new Date(a.queue.checkedInAt)) / 60000)
        .filter((m) => m >= 0);

    return {
        total: active.length,
        confirmed: countStatus("CONFIRMED"),
        pending: countStatus("PENDING"),
        remaining: countStatus("PENDING", "CONFIRMED"),
        arrived: countStatus("CHECKED_IN", "IN_PROGRESS", "COMPLETED"),
        completed: countStatus("COMPLETED"),
        cancelled: rows.length - active.length,
        waiting: countQueue("WAITING"),
        called: countQueue("CALLED"),
        inConsultation: countQueue("IN_CONSULTATION"),
        inQueue: countQueue("WAITING", "CALLED", "IN_CONSULTATION"),
        avgWaitMinutes: waits.length
            ? Math.round(waits.reduce((sum, m) => sum + m, 0) / waits.length)
            : null,
    };
};

const buildActivity = (rows) => {
    const events = [];

    rows.forEach((a) => {
        const name = fullName(a.patient);

        if (a.queue && a.queue.checkedInAt) {
            events.push({
                type: "checkin",
                title: "Patient checked in",
                description: `${name} was checked in.`,
                at: a.queue.checkedInAt,
            });
        }
        if (a.queue && a.queue.calledAt) {
            events.push({
                type: "called",
                title: "Patient called",
                description: `${name} was called for consultation.`,
                at: a.queue.calledAt,
            });
        }
        if (a.consultation && a.consultation.completedAt) {
            events.push({
                type: "completed",
                title: "Consultation completed",
                description: `${name}'s consultation was completed.`,
                at: a.consultation.completedAt,
            });
        }
    });

    return events.sort((x, y) => new Date(y.at) - new Date(x.at)).slice(0, 6);
};

const loadDay = async (dateParam) => {
    const { start, end } = dayRange(dateParam);

    const rows = await prisma.appointment.findMany({
        where: { date: { gte: start, lt: end } },
        orderBy: [{ timeSlot: "asc" }],
        include: {
            patient: {
                select: { id: true, firstName: true, lastName: true, patientNumber: true },
            },
            doctor: { select: { firstName: true, lastName: true } },
            department: { select: { name: true } },
            queue: true,
            consultation: { select: { completedAt: true } },
        },
    });

    return {
        date: toDateKey(start),
        stats: buildStats(rows),
        appointments: rows.map(toAppointment),
        queue: rows
            .filter((a) => a.queue)
            .sort((x, y) => x.queue.queueNumber - y.queue.queueNumber)
            .map(toQueueEntry),
        activity: buildActivity(rows),
    };
};

const handle = (message, build) => async (req, res) => {
    try {
        const day = await loadDay(req.query.date);
        res.json(build(day));
    } catch (error) {
        console.error(`${message}:`, error);
        res.status(500).json({ message });
    }
};

const getOverview = handle("Failed to load the reception overview", (day) => day);

const getAppointments = handle("Failed to load appointments", (day) => ({
    date: day.date,
    stats: day.stats,
    appointments: day.appointments,
}));

const getQueue = handle("Failed to load the queue", (day) => ({
    date: day.date,
    stats: day.stats,
    queue: day.queue,
}));

const getPatients = async (req, res) => {
    try {
        const terms = String(req.query.search || "")
            .trim()
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 5);

        const where = terms.length
            ? {
                  AND: terms.map((term) => ({
                      OR: [
                          { firstName: { contains: term, mode: "insensitive" } },
                          { lastName: { contains: term, mode: "insensitive" } },
                          { patientNumber: { contains: term, mode: "insensitive" } },
                          { phone: { contains: term } },
                      ],
                  })),
              }
            : {};

        const patients = await prisma.patient.findMany({
            where,
            orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
            take: 100,
            select: {
                id: true,
                firstName: true,
                lastName: true,
                patientNumber: true,
                phone: true,
                appointments: {
                    orderBy: { date: "desc" },
                    take: 1,
                    select: { date: true, status: true },
                },
            },
        });

        res.json({
            patients: patients.map((p) => ({
                id: p.id,
                name: fullName(p),
                patientNumber: p.patientNumber,
                phone: p.phone,
                lastAppointment: p.appointments[0] ? p.appointments[0].date : null,
                lastStatus: p.appointments[0] ? p.appointments[0].status : null,
            })),
        });
    } catch (error) {
        console.error("Failed to load patients:", error);
        res.status(500).json({ message: "Failed to load patients" });
    }
};

module.exports = { getOverview, getAppointments, getQueue, getPatients };
