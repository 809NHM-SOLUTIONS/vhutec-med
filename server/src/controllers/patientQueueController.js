const prisma = require("../prisma");

const pad = (n) => String(n).padStart(2, "0");

// "Today" is defined exactly as receptionDashboardController.dayRange() does it:
// midnight to midnight in the server's local time zone. Check-in and Call Next
// use that same window, so the patient's position always matches what
// reception sees. Run the server with TZ=Africa/Johannesburg if it isn't
// already running in South African time.
const getTodayWindow = (now = new Date()) => {
    const dayStart = new Date(now);
    dayStart.setHours(0, 0, 0, 0);

    const nextDayStart = new Date(dayStart);
    nextDayStart.setDate(nextDayStart.getDate() + 1);

    const ymd = `${dayStart.getFullYear()}-${pad(dayStart.getMonth() + 1)}-${pad(
        dayStart.getDate()
    )}`;

    return { ymd, dayStart, nextDayStart };
};

// The exact order callNextPatient() uses to pick who is called next
// (lowest queue number first, then id). The queue is one list for the whole
// hospital per day, not one per doctor.
const WAITING_ORDER = [{ queueNumber: "asc" }, { id: "asc" }];

// What the patient sees for one of today's appointments.
const deriveState = (appointment) => {
    if (appointment.status === "CANCELLED") return "CANCELLED";
    if (appointment.status === "COMPLETED") return "COMPLETED";
    if (appointment.queue) {
        // A consultation that has started wins over a stale CALLED/WAITING row.
        if (appointment.status === "IN_PROGRESS" && appointment.queue.status !== "COMPLETED") {
            return "IN_CONSULTATION";
        }
        return appointment.queue.status; // WAITING | CALLED | IN_CONSULTATION | COMPLETED
    }
    return "NOT_CHECKED_IN";
};

// If a patient has several appointments today, show the most relevant one.
const STATE_RANK = {
    IN_CONSULTATION: 0,
    CALLED: 1,
    WAITING: 2,
    NOT_CHECKED_IN: 3,
    COMPLETED: 4,
    CANCELLED: 5
};

// GET /api/patients/me/queue
// Returns queue information for the logged-in patient only. The patient is
// resolved from the verified JWT (req.user.userId), never from client input,
// and nothing about other patients is returned.
const getMyQueue = async (req, res) => {
    try {
        const userId = Number(req.user?.userId);

        if (!Number.isInteger(userId) || userId <= 0) {
            return res.status(401).json({
                success: false,
                message: "Authentication required"
            });
        }

        const patient = await prisma.patient.findUnique({
            where: { userId },
            select: { id: true }
        });

        if (!patient) {
            return res.status(404).json({
                success: false,
                message: "Patient profile not found for this account"
            });
        }

        const { ymd, dayStart, nextDayStart } = getTodayWindow();

        const appointments = await prisma.appointment.findMany({
            where: {
                patientId: patient.id,
                date: { gte: dayStart, lt: nextDayStart }
            },
            include: {
                queue: true,
                doctor: {
                    select: { firstName: true, lastName: true, speciality: true }
                },
                department: { select: { name: true } }
            }
        });

        const base = { date: ymd, serverTime: new Date().toISOString() };

        if (appointments.length === 0) {
            return res.json({
                success: true,
                data: {
                    ...base,
                    state: "NO_APPOINTMENT",
                    appointment: null,
                    queue: null,
                    position: null,
                    ahead: null,
                    waitingTotal: null,
                    otherVisitsToday: 0
                }
            });
        }

        const ranked = appointments
            .map((appointment) => ({ appointment, state: deriveState(appointment) }))
            .sort(
                (a, b) =>
                    STATE_RANK[a.state] - STATE_RANK[b.state] ||
                    String(a.appointment.timeSlot).localeCompare(String(b.appointment.timeSlot))
            );

        const { appointment, state } = ranked[0];

        // Position among today's waiting patients, using the same filter and
        // order as Call Next. Only ids are read, so no other patient's details
        // can leak. (Call Next doesn't skip a cancelled appointment that is
        // still WAITING, so neither does this count; otherwise the position
        // would be wrong by one whenever reception calls that entry.)
        let position = null;
        let ahead = null;
        let waitingTotal = null;

        if (state === "WAITING" && appointment.queue) {
            const waiting = await prisma.queue.findMany({
                where: {
                    status: "WAITING",
                    appointment: {
                        date: { gte: dayStart, lt: nextDayStart }
                    }
                },
                select: { id: true },
                orderBy: WAITING_ORDER
            });

            const index = waiting.findIndex((entry) => entry.id === appointment.queue.id);

            if (index >= 0) {
                position = index + 1;
                ahead = index;
                waitingTotal = waiting.length;
            }
        }

        return res.json({
            success: true,
            data: {
                ...base,
                state,
                appointment: {
                    id: appointment.id,
                    date: appointment.date,
                    timeSlot: appointment.timeSlot,
                    status: appointment.status,
                    doctor: appointment.doctor,
                    department: appointment.department
                },
                queue: appointment.queue
                    ? {
                          queueNumber: appointment.queue.queueNumber,
                          status: appointment.queue.status,
                          checkedInAt: appointment.queue.checkedInAt,
                          calledAt: appointment.queue.calledAt
                      }
                    : null,
                position,
                ahead,
                waitingTotal,
                otherVisitsToday: ranked.length - 1
            }
        });
    } catch (error) {
        console.error("Get my queue error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to retrieve your queue status"
        });
    }
};

module.exports = { getMyQueue, getTodayWindow, WAITING_ORDER };