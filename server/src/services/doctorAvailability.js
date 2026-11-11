// Doctor availability: the single place that decides which days and times a
// doctor can be booked. The doctor screens, the patient slot list and the
// booking validation all use these functions, so they can never disagree.

// ---------------------------------------------------------------------------
// Defaults (used for any doctor who has not saved their own availability)
// ---------------------------------------------------------------------------
// startTime is the first appointment of the day and endTime is the LAST
// appointment time (inclusive), so the default day offers 08:00, 09:00 ...
// 15:00 and a patient can still book the 15:00 slot.
const DEFAULT_AVAILABILITY = Object.freeze({
    startTime: "08:00",
    endTime: "15:00",
    slotMinutes: 60,
    // 0 = Sunday ... 6 = Saturday.  Mon-Fri.
    workingDays: Object.freeze([1, 2, 3, 4, 5])
});

const ALLOWED_SLOT_MINUTES = [15, 20, 30, 45, 60];

// Cancelled appointments free their slot; everything else holds it.
// (Same rule as SLOT_HOLDING in appointmentController.js.)
const SLOT_HOLDING = { notIn: ["CANCELLED", "MISSED"] };

// Appointments that a doctor still has to attend.
const OPEN_STATUSES = ["PENDING", "CONFIRMED", "CHECKED_IN"];

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

// ---------------------------------------------------------------------------
// Pure helpers (no database)
// ---------------------------------------------------------------------------
const toMinutes = (hhmm) => {
    const [h, m] = String(hhmm).split(":").map(Number);
    return h * 60 + m;
};

const toHHMM = (minutes) =>
    `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;

// "09:30" or "09:30 - 10:00" -> { start, end } in minutes (end may be null).
const parseTimeSlot = (timeSlot) => {
    const matches = [...String(timeSlot || "").matchAll(/(\d{1,2}):(\d{2})/g)];
    if (matches.length === 0) return null;

    const start = Number(matches[0][1]) * 60 + Number(matches[0][2]);
    const end = matches[1] ? Number(matches[1][1]) * 60 + Number(matches[1][2]) : null;

    if (start >= 24 * 60 || (end !== null && end > 24 * 60)) return null;
    return { start, end };
};

// "YYYY-MM-DD" -> Date at midnight UTC, or null when it is not a real date.
const parseDateKey = (dateKey) => {
    if (!DATE_RE.test(String(dateKey || ""))) return null;
    const date = new Date(`${dateKey}T00:00:00.000Z`);
    if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== dateKey) return null;
    return date;
};

const dateKeyOf = (date) => date.toISOString().slice(0, 10);

const todayKey = () => dateKeyOf(new Date());

const weekdayOf = (dateKey) => parseDateKey(dateKey).getUTCDay();

const utcDayRange = (dateKey) => {
    const start = parseDateKey(dateKey);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);
    return { start, end };
};

// Database row (or null) -> a complete availability object.
const resolveAvailability = (row) => ({
    startTime: row?.startTime ?? DEFAULT_AVAILABILITY.startTime,
    endTime: row?.endTime ?? DEFAULT_AVAILABILITY.endTime,
    slotMinutes: row?.slotMinutes ?? DEFAULT_AVAILABILITY.slotMinutes,
    workingDays: [...(row?.workingDays ?? DEFAULT_AVAILABILITY.workingDays)].sort((a, b) => a - b)
});

// Slot start times from the first to the last appointment time (inclusive).
const generateSlots = ({ startTime, endTime, slotMinutes }) => {
    const slots = [];
    const last = toMinutes(endTime);

    for (let t = toMinutes(startTime); t <= last; t += slotMinutes) {
        slots.push(toHHMM(t));
    }

    return slots;
};

// Validates a doctor's availability form. Returns { errors, value }.
const validateAvailabilityInput = (body, current) => {
    const errors = [];
    const startTime = body?.startTime;
    const endTime = body?.endTime;
    const slotMinutes = body?.slotMinutes === undefined ? current.slotMinutes : Number(body.slotMinutes);
    const workingDays = body?.workingDays;

    if (!TIME_RE.test(String(startTime || ""))) errors.push("Start time must be in HH:MM format (for example 08:00).");
    if (!TIME_RE.test(String(endTime || ""))) errors.push("Last appointment time must be in HH:MM format (for example 15:00).");

    if (!ALLOWED_SLOT_MINUTES.includes(slotMinutes)) {
        errors.push(`Appointment length must be one of: ${ALLOWED_SLOT_MINUTES.join(", ")} minutes.`);
    }

    if (
        !Array.isArray(workingDays) ||
        !workingDays.every((d) => Number.isInteger(d) && d >= 0 && d <= 6)
    ) {
        errors.push("Working days must be a list of weekday numbers from 0 (Sunday) to 6 (Saturday).");
    } else if (workingDays.length === 0) {
        errors.push("Select at least one working day.");
    }

    if (errors.length === 0 && toMinutes(endTime) < toMinutes(startTime)) {
        errors.push("The last appointment time cannot be earlier than the start time.");
    }

    return {
        errors,
        value: errors.length
            ? null
            : {
                  startTime,
                  endTime,
                  slotMinutes,
                  workingDays: [...new Set(workingDays)].sort((a, b) => a - b)
              }
    };
};

// Can this time slot be booked on this date? `blocked` is true when the doctor
// marked the date as unavailable. Existing bookings are NOT checked here.
const checkBookable = ({ availability, blocked, dateKey, timeSlot, requireAligned = true }) => {
    if (!parseDateKey(dateKey)) {
        return { ok: false, code: "INVALID_DATE", message: "Invalid appointment date." };
    }

    const parsed = parseTimeSlot(timeSlot);
    if (!parsed) {
        return { ok: false, code: "INVALID_SLOT", message: "Invalid appointment time." };
    }

    if (blocked) {
        return {
            ok: false,
            code: "DOCTOR_UNAVAILABLE_DATE",
            message: "The doctor is not available on this date. Please choose another date."
        };
    }

    if (!availability.workingDays.includes(weekdayOf(dateKey))) {
        return {
            ok: false,
            code: "NOT_A_WORKING_DAY",
            message: "The doctor does not work on this day. Please choose another date."
        };
    }

    const open = toMinutes(availability.startTime);
    const last = toMinutes(availability.endTime);

    if (parsed.start < open || parsed.start > last) {
        return {
            ok: false,
            code: "OUTSIDE_WORKING_HOURS",
            message: "That time is outside the doctor's working hours. Please choose another time."
        };
    }

    // New bookings must start on one of the doctor's real slots. Existing
    // bookings that no longer line up are checked with requireAligned = false.
    if (requireAligned && (parsed.start - open) % availability.slotMinutes !== 0) {
        return {
            ok: false,
            code: "INVALID_SLOT",
            message: "That is not one of the doctor's appointment times. Please choose a listed time."
        };
    }

    return { ok: true };
};

// Builds the slot list a patient sees for one doctor on one date.
const buildDaySlots = ({ availability, blockedReason, blocked, dateKey, bookedTimeSlots }) => {
    const base = {
        date: dateKey,
        startTime: availability.startTime,
        endTime: availability.endTime,
        slotMinutes: availability.slotMinutes
    };

    if (blocked) {
        return { ...base, available: false, reason: "DOCTOR_UNAVAILABLE_DATE", unavailableNote: blockedReason || null, slots: [] };
    }

    if (!availability.workingDays.includes(weekdayOf(dateKey))) {
        return { ...base, available: false, reason: "NOT_A_WORKING_DAY", slots: [] };
    }

    const booked = new Set(
        bookedTimeSlots
            .map(parseTimeSlot)
            .filter(Boolean)
            .map((p) => toHHMM(p.start))
    );

    const slots = generateSlots(availability).map((time) => ({
        time,
        status: booked.has(time) ? "booked" : "available"
    }));

    return {
        ...base,
        available: slots.some((s) => s.status === "available"),
        reason: slots.some((s) => s.status === "available") ? null : "FULLY_BOOKED",
        slots
    };
};

// ---------------------------------------------------------------------------
// Database helpers (db is the Prisma client or a transaction client)
// ---------------------------------------------------------------------------
const loadAvailability = async (db, doctorId) =>
    resolveAvailability(await db.doctorAvailability.findUnique({ where: { doctorId } }));

const findUnavailableDate = (db, doctorId, dateKey) =>
    db.doctorUnavailableDate.findUnique({
        where: { doctorId_date: { doctorId, date: parseDateKey(dateKey) } }
    });

const loadBookedTimeSlots = async (db, doctorId, dateKey) => {
    const { start, end } = utcDayRange(dateKey);
    const rows = await db.appointment.findMany({
        where: { doctorId, date: { gte: start, lt: end }, status: SLOT_HOLDING },
        select: { timeSlot: true }
    });
    return rows.map((r) => r.timeSlot);
};

// Used by createAppointment / updateAppointment before saving a booking.
const checkDoctorSlot = async (db, doctorId, date, timeSlot) => {
    const dateKey = dateKeyOf(date);
    const [availability, blockedRow] = await Promise.all([
        loadAvailability(db, doctorId),
        findUnavailableDate(db, doctorId, dateKey)
    ]);

    return checkBookable({ availability, blocked: Boolean(blockedRow), dateKey, timeSlot });
};

// Upcoming open appointments that no longer fit the doctor's availability.
// They are only REPORTED so the doctor can contact the patients. They are never
// cancelled, moved or edited.
const findAffectedAppointments = async (db, doctorId, availability) => {
    const fromDate = parseDateKey(todayKey());

    const [appointments, blockedRows] = await Promise.all([
        db.appointment.findMany({
            where: { doctorId, date: { gte: fromDate }, status: { in: OPEN_STATUSES } },
            select: {
                id: true,
                date: true,
                timeSlot: true,
                status: true,
                patient: { select: { firstName: true, lastName: true } }
            },
            orderBy: [{ date: "asc" }, { timeSlot: "asc" }]
        }),
        db.doctorUnavailableDate.findMany({ where: { doctorId, date: { gte: fromDate } }, select: { date: true } })
    ]);

    const blocked = new Set(blockedRows.map((r) => dateKeyOf(r.date)));

    return appointments
        .map((a) => {
            const dateKey = dateKeyOf(a.date);
            const result = checkBookable({
                availability,
                blocked: blocked.has(dateKey),
                dateKey,
                timeSlot: a.timeSlot,
                requireAligned: false
            });
            return { a, dateKey, result };
        })
        .filter(({ result }) => !result.ok)
        .map(({ a, dateKey, result }) => ({
            id: a.id,
            date: dateKey,
            timeSlot: a.timeSlot,
            status: a.status,
            patientName: `${a.patient.firstName} ${a.patient.lastName}`.trim(),
            reason: result.code
        }));
};

module.exports = {
    DEFAULT_AVAILABILITY,
    ALLOWED_SLOT_MINUTES,
    SLOT_HOLDING,
    OPEN_STATUSES,
    toMinutes,
    toHHMM,
    parseTimeSlot,
    parseDateKey,
    dateKeyOf,
    todayKey,
    utcDayRange,
    resolveAvailability,
    generateSlots,
    validateAvailabilityInput,
    checkBookable,
    buildDaySlots,
    loadAvailability,
    findUnavailableDate,
    loadBookedTimeSlots,
    checkDoctorSlot,
    findAffectedAppointments
};
