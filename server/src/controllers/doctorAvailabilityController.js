const prisma = require("../prisma");
const {
    DEFAULT_AVAILABILITY,
    ALLOWED_SLOT_MINUTES,
    parseDateKey,
    dateKeyOf,
    todayKey,
    resolveAvailability,
    validateAvailabilityInput,
    buildDaySlots,
    loadBookedTimeSlots,
    findUnavailableDate,
    findAffectedAppointments
} = require("../services/doctorAvailability");

// How far ahead unavailable dates are listed to the booking page.
const LOOKAHEAD_DAYS = 180;

// The logged-in doctor's profile id (doctors only ever manage their own availability).
const getOwnDoctorId = async (req) => {
    const doctor = await prisma.doctor.findUnique({
        where: { userId: Number(req.user?.userId) },
        select: { id: true }
    });
    return doctor?.id ?? null;
};

const listUnavailableDates = async (doctorId, days = LOOKAHEAD_DAYS) => {
    const from = parseDateKey(todayKey());
    const to = new Date(from);
    to.setUTCDate(to.getUTCDate() + days);

    const rows = await prisma.doctorUnavailableDate.findMany({
        where: { doctorId, date: { gte: from, lt: to } },
        orderBy: { date: "asc" }
    });

    return rows.map((r) => ({ id: r.id, date: dateKeyOf(r.date), reason: r.reason }));
};

const settingsPayload = async (doctorId, row) => ({
    doctorId,
    ...resolveAvailability(row),
    isDefault: !row,
    defaults: { ...DEFAULT_AVAILABILITY, workingDays: [...DEFAULT_AVAILABILITY.workingDays] },
    allowedSlotMinutes: ALLOWED_SLOT_MINUTES,
    unavailableDates: await listUnavailableDates(doctorId)
});

// GET /api/doctors/me/availability
const getMyAvailability = async (req, res) => {
    try {
        const doctorId = await getOwnDoctorId(req);
        if (!doctorId) {
            return res.status(404).json({ success: false, message: "Doctor profile not found" });
        }

        const row = await prisma.doctorAvailability.findUnique({ where: { doctorId } });

        return res.json({ success: true, data: await settingsPayload(doctorId, row) });
    } catch (error) {
        console.error("Get my availability error:", error);
        return res.status(500).json({ success: false, message: "Failed to load your availability" });
    }
};

// PUT /api/doctors/me/availability
// Saves working hours and working days. Existing appointments are never changed:
// any that no longer fit are returned in `affectedAppointments` as a warning.
const updateMyAvailability = async (req, res) => {
    try {
        const doctorId = await getOwnDoctorId(req);
        if (!doctorId) {
            return res.status(404).json({ success: false, message: "Doctor profile not found" });
        }

        const existing = await prisma.doctorAvailability.findUnique({ where: { doctorId } });
        const { errors, value } = validateAvailabilityInput(req.body, resolveAvailability(existing));

        if (errors.length) {
            return res.status(400).json({ success: false, message: errors[0], errors });
        }

        const row = await prisma.doctorAvailability.upsert({
            where: { doctorId },
            create: { doctorId, ...value },
            update: value
        });

        const affectedAppointments = await findAffectedAppointments(prisma, doctorId, resolveAvailability(row));

        return res.json({
            success: true,
            message: "Availability saved",
            data: await settingsPayload(doctorId, row),
            affectedAppointments
        });
    } catch (error) {
        console.error("Update my availability error:", error);
        return res.status(500).json({ success: false, message: "Failed to save your availability" });
    }
};

// POST /api/doctors/me/unavailable-dates   { date: "YYYY-MM-DD", reason?: string }
const addMyUnavailableDate = async (req, res) => {
    try {
        const doctorId = await getOwnDoctorId(req);
        if (!doctorId) {
            return res.status(404).json({ success: false, message: "Doctor profile not found" });
        }

        const dateKey = String(req.body?.date || "");
        const date = parseDateKey(dateKey);
        const reason = typeof req.body?.reason === "string" ? req.body.reason.trim().slice(0, 200) : "";

        if (!date) {
            return res.status(400).json({ success: false, message: "Choose a valid date (YYYY-MM-DD)." });
        }

        if (dateKey < todayKey()) {
            return res.status(400).json({ success: false, message: "Choose today or a future date." });
        }

        await prisma.doctorUnavailableDate.upsert({
            where: { doctorId_date: { doctorId, date } },
            create: { doctorId, date, reason: reason || null },
            update: { reason: reason || null }
        });

        const row = await prisma.doctorAvailability.findUnique({ where: { doctorId } });
        const affected = await findAffectedAppointments(prisma, doctorId, resolveAvailability(row));

        return res.status(201).json({
            success: true,
            message: "Date marked as unavailable",
            data: await settingsPayload(doctorId, row),
            affectedAppointments: affected.filter((a) => a.date === dateKey)
        });
    } catch (error) {
        console.error("Add unavailable date error:", error);
        return res.status(500).json({ success: false, message: "Failed to mark the date as unavailable" });
    }
};

// DELETE /api/doctors/me/unavailable-dates/:date
const removeMyUnavailableDate = async (req, res) => {
    try {
        const doctorId = await getOwnDoctorId(req);
        if (!doctorId) {
            return res.status(404).json({ success: false, message: "Doctor profile not found" });
        }

        const date = parseDateKey(req.params.date);
        if (!date) {
            return res.status(400).json({ success: false, message: "Invalid date (YYYY-MM-DD)." });
        }

        await prisma.doctorUnavailableDate.deleteMany({ where: { doctorId, date } });

        const row = await prisma.doctorAvailability.findUnique({ where: { doctorId } });

        return res.json({
            success: true,
            message: "Date is available again",
            data: await settingsPayload(doctorId, row)
        });
    } catch (error) {
        console.error("Remove unavailable date error:", error);
        return res.status(500).json({ success: false, message: "Failed to update the date" });
    }
};

// GET /api/doctors/:id/availability[?date=YYYY-MM-DD]
// For the patient booking page. Never returns patient details.
//   - settings: working days / hours, so the calendar can grey out days
//   - unavailableDates: upcoming dates the doctor has blocked
//   - day (only when ?date= is given): every slot for that date, each marked
//     "available" or "booked"; empty with a reason when the doctor is off.
const getDoctorAvailability = async (req, res) => {
    try {
        const doctorId = Number(req.params.id);
        if (!Number.isSafeInteger(doctorId) || doctorId <= 0) {
            return res.status(400).json({ success: false, message: "Invalid doctor ID" });
        }

        const dateKey = req.query.date === undefined ? null : String(req.query.date);
        if (dateKey !== null && !parseDateKey(dateKey)) {
            return res.status(400).json({ success: false, message: "A valid date (YYYY-MM-DD) is required" });
        }

        const doctor = await prisma.doctor.findUnique({ where: { id: doctorId }, select: { id: true } });
        if (!doctor) {
            return res.status(404).json({ success: false, message: "Doctor not found" });
        }

        const row = await prisma.doctorAvailability.findUnique({ where: { doctorId } });
        const availability = resolveAvailability(row);
        const unavailableDates = await listUnavailableDates(doctorId);

        const data = {
            doctorId,
            ...availability,
            unavailableDates: unavailableDates.map(({ date }) => date)
        };

        if (dateKey) {
            const blockedRow = await findUnavailableDate(prisma, doctorId, dateKey);
            const booked = await loadBookedTimeSlots(prisma, doctorId, dateKey);

            data.day = buildDaySlots({
                availability,
                blocked: Boolean(blockedRow),
                blockedReason: blockedRow?.reason,
                dateKey,
                bookedTimeSlots: booked
            });
        }

        return res.json({ success: true, data });
    } catch (error) {
        console.error("Get doctor availability error:", error);
        return res.status(500).json({ success: false, message: "Unable to check available times" });
    }
};

module.exports = {
    getMyAvailability,
    updateMyAvailability,
    addMyUnavailableDate,
    removeMyUnavailableDate,
    getDoctorAvailability
};
