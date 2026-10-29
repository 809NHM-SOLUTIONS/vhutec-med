

const prisma = require("../prisma");

const { notifyQueueEvent } = require("../services/queueNotifications");

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
    .filter(
        (a) =>
            a.queue &&
            a.status !== "CANCELLED" &&
            a.queue.status !== "COMPLETED"
    )
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

/* ------------------------------------------------------------------ */
/* Actions: check a patient in, call the next patient                  */
/* ------------------------------------------------------------------ */

// An error that carries the HTTP status and a message safe to show the user.
class ActionError extends Error {
    constructor(status, message) {
        super(message);
        this.status = status;
    }
}

// Runs a transaction again when the database reports a write conflict
// (P2034) or a duplicate queue entry (P2002). On the retry the guards below
// see the new state and answer with a clear message.
const withRetry = async (work, attempts = 3) => {
    for (let attempt = 1; ; attempt += 1) {
        try {
            return await work();
        } catch (error) {
            const retryable = error.code === "P2034" || error.code === "P2002";
            if (!retryable || attempt >= attempts) throw error;
        }
    }
};

const sendActionError = (res, error, fallbackMessage) => {
    if (error instanceof ActionError) {
        return res.status(error.status).json({ message: error.message });
    }
    if (error.code === "P2002") {
        return res.status(409).json({
            message: "This appointment is already in the queue.",
        });
    }
    if (error.code === "P2034") {
        return res.status(409).json({
            message: "The queue was busy. Please try again.",
        });
    }
    console.error(`${fallbackMessage}:`, error);
    return res.status(500).json({ message: fallbackMessage });
};

const ARRIVED_STATUSES = ["CHECKED_IN", "IN_PROGRESS", "COMPLETED"];
const CHECK_IN_STATUSES = ["PENDING", "CONFIRMED"];

// POST /api/receptionist/appointments/:id/check-in
// In ONE transaction: marks the appointment CHECKED_IN, creates its queue
// entry (WAITING) with the arrival time, and gives it the next queue number
// for today. Either all of it is saved or none of it.
const checkInAppointment = async (req, res) => {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ message: "Invalid appointment ID" });
    }

    try {
        const result = await withRetry(() =>
            prisma.$transaction(
                async (tx) => {
                    const { start, end } = dayRange();

                    const appointment = await tx.appointment.findUnique({
                        where: { id },
                        include: {
                            patient: { select: { firstName: true, lastName: true } },
                            queue: true,
                        },
                    });

                    if (!appointment) {
                        throw new ActionError(404, "Appointment not found.");
                    }
                    if (appointment.date < start || appointment.date >= end) {
                        throw new ActionError(
                            400,
                            "Only today's appointments can be checked in."
                        );
                    }
                    if (appointment.status === "CANCELLED") {
                        throw new ActionError(
                            409,
                            "This appointment was cancelled and cannot be checked in."
                        );
                    }
                    if (appointment.queue || ARRIVED_STATUSES.includes(appointment.status)) {
                        throw new ActionError(
                            409,
                            "This patient has already been checked in."
                        );
                    }

                    // Claim the appointment. The status condition makes this
                    // atomic: if two receptionists click at the same moment,
                    // only one update matches and the other gets count 0.
                    const claimed = await tx.appointment.updateMany({
                        where: { id, status: { in: CHECK_IN_STATUSES } },
                        data: { status: "CHECKED_IN" },
                    });

                    if (claimed.count === 0) {
                        throw new ActionError(
                            409,
                            "This appointment was just updated. Refresh and try again."
                        );
                    }

                    // Next queue number for today's queue.
                    const last = await tx.queue.aggregate({
                        _max: { queueNumber: true },
                        where: { appointment: { date: { gte: start, lt: end } } },
                    });
                    const queueNumber = (last._max.queueNumber || 0) + 1;

                    const queue = await tx.queue.create({
                        data: {
                            appointmentId: id,
                            queueNumber,
                            status: "WAITING",
                            checkedInAt: new Date(),
                        },
                    });

                    return { patient: appointment.patient, queue };
                },
                { isolationLevel: "Serializable" }
            )
        );

                await notifyQueueEvent({
            queue: result.queue,
            type: "PATIENT_CHECKED_IN",
            eventKey: `queue-checked-in:${result.queue.id}`,
        });

        res.status(201).json({
            message: `${fullName(result.patient)} checked in. Queue number ${pad(
                result.queue.queueNumber
            )}.`,
            queueNumber: result.queue.queueNumber,
            checkedInAt: result.queue.checkedInAt,
        });
    } catch (error) {
        sendActionError(res, error, "Failed to check in the patient");
    }
};

// POST /api/receptionist/queue/call-next
// Calls the patient with the lowest queue number who is still WAITING today:
// sets the queue status to CALLED and saves the time they were called.
const callNextPatient = async (req, res) => {
    try {
        const result = await withRetry(() =>
            prisma.$transaction(
                async (tx) => {
                    const { start, end } = dayRange();

                    const next = await tx.queue.findFirst({

where: {
    status: "WAITING",
    appointment: {
        date: { gte: start, lt: end },
        status: "CHECKED_IN",
    },
},

                        orderBy: [{ queueNumber: "asc" }, { id: "asc" }],
                        include: {
                            appointment: {
                                include: {
                                    patient: { select: { firstName: true, lastName: true } },
                                    doctor: { select: { firstName: true, lastName: true } },
                                },
                            },
                        },
                    });

                    if (!next) {
                        throw new ActionError(
                            409,
                            "There are no patients waiting in the queue."
                        );
                    }

                    // Only update the entry if it is still WAITING, so the
                    // same patient can never be called twice.
                    const claimed = await tx.queue.updateMany({
                        where: { id: next.id, status: "WAITING" },
                        data: { status: "CALLED", calledAt: new Date() },
                    });

                    if (claimed.count === 0) {
                        // Someone else called this patient first. Retry, which
                        // picks the next patient who is still waiting.
                        const conflict = new Error("Queue entry changed");
                        conflict.code = "P2034";
                        throw conflict;
                    }

                    return next;
                },
                { isolationLevel: "Serializable" }
            )
        );

                await notifyQueueEvent({
            queue: { ...result, status: "CALLED" },
            type: "PATIENT_CALLED",
            eventKey: `queue-called:${result.id}`,
        });

        res.json({
            message: `Called ${fullName(result.appointment.patient)} (queue ${pad(
                result.queueNumber
            )}) to see ${`Dr. ${fullName(result.appointment.doctor)}`}.`,
            queueNumber: result.queueNumber,
        });
    } catch (error) {
        sendActionError(res, error, "Failed to call the next patient");
    }
};

module.exports = {
    getOverview,
    getAppointments,
    getQueue,
    getPatients,
    checkInAppointment,
    callNextPatient,
};