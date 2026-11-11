const prisma = require("../prisma");
const {
    getDoctorShiftPeriods
} = require("../services/doctorShiftAvailability");
const { notifyAppointmentStakeholders } = require("../services/appointmentNotifications");
const { checkDoctorSlot } = require("../services/doctorAvailability");


// ---------------------------------------------------------------------------
// Time-slot availability
// ---------------------------------------------------------------------------

// Cancelled appointments free their slot again; everything else holds it.
const SLOT_HOLDING = {
    notIn: ["CANCELLED", "MISSED"]
};

// The calendar-day window used for slot conflicts. Appointment dates are stored
// as midnight UTC of the booked YYYY-MM-DD, so the day is taken in UTC, exactly
// like the conflict checks in createAppointment and updateAppointment below.
const utcDayRange = (date) => {
    const start = new Date(
        Date.UTC(
            date.getUTCFullYear(),
            date.getUTCMonth(),
            date.getUTCDate()
        )
    );

    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);

    return { start, end };
};


const getAppointmentInterval = (date, timeSlot, durationMinutes) => {
    const startTime = parseShiftTime(timeSlot);

    if (startTime === null) return null;

    const dayStart = utcDayRange(date).start;
    const start = dayStart.getTime() / 60000 + startTime;
    const duration = durationMinutes ?? 60;

    if (!Number.isInteger(duration) || duration <= 0) {
        return null;
    }

    return {
        start,
        end: start + duration
    };
};

const hasAppointmentOverlap = async (
    tx,
    {
        doctorId,
        date,
        timeSlot,
        durationMinutes,
        excludeAppointmentId
    }
) => {
    const requested = getAppointmentInterval(
        date,
        timeSlot,
        durationMinutes ?? 60
    );

    if (!requested) {
        const error = new Error("Invalid appointment time or duration.");
        error.code = "INVALID_APPOINTMENT_TIME";
        throw error;
    }

    const dayStart = utcDayRange(date).start;

    const previousDay = new Date(dayStart);
    previousDay.setUTCDate(previousDay.getUTCDate() - 1);

    const afterNextDay = new Date(dayStart);
    afterNextDay.setUTCDate(afterNextDay.getUTCDate() + 2);

    const existingAppointments = await tx.appointment.findMany({
        where: {
            doctorId,
            date: {
                gte: previousDay,
                lt: afterNextDay
            },
            status: SLOT_HOLDING,
            ...(excludeAppointmentId !== undefined
                ? { id: { not: excludeAppointmentId } }
                : {})
        },
        select: {
            date: true,
            timeSlot: true,
            durationMinutes: true
        }
    });

    return existingAppointments.some((appointment) => {
        const existing = getAppointmentInterval(
            appointment.date,
            appointment.timeSlot,
            appointment.durationMinutes ?? 60
        );

        // Fail safely if a legacy record has an invalid time.
        if (!existing) return true;

        return (
            existing.start < requested.end &&
            existing.end > requested.start
        );
    });
};


// ---------------------------------------------------------------------------
// Doctor shift availability
// ---------------------------------------------------------------------------

const parseShiftTime = (value) => {
    if (typeof value !== "string" || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) {
        return null;
    }

    const [hours, minutes] = value.split(":").map(Number);
    return hours * 60 + minutes;
};

const getIsoDayOfWeek = (date) => {
    const day = date.getUTCDay();
    return day === 0 ? 7 : day;
};

const getDateKey = (date) => date.toISOString().slice(0, 10);


const ensureDoctorShiftAvailability = async (
    tx,
    doctorId,
    appointmentDate,
    timeSlot,
    durationMinutes = 60
) => {
    const appointmentTime = parseShiftTime(timeSlot);

    if (appointmentTime === null) {
        const error = new Error("Appointment time must use HH:mm format.");
        error.code = "INVALID_APPOINTMENT_TIME";
        throw error;
    }

    if (
        !Number.isInteger(durationMinutes) ||
        durationMinutes <= 0
    ) {
        const error = new Error(
            "Appointment duration must be a positive number of minutes."
        );
        error.code = "INVALID_APPOINTMENT_DURATION";
        throw error;
    }

    // Retrieve the effective recurring shifts and exceptions.
    const {
        dayStart,
        previousDay,
        currentPeriods,
        previousPeriods
    } = await getDoctorShiftPeriods(
        tx,
        doctorId,
        appointmentDate
    );

    // Convert the requested appointment into absolute UTC minutes.
    const appointmentStart =
        dayStart.getTime() / 60000 + appointmentTime;

    const appointmentEnd = appointmentStart + durationMinutes;

    // A consultation must fit completely inside one continuous
    // availability period.
    const fitsInsidePeriod = (period, periodDate) => {
        const start = parseShiftTime(period.startTime);
        const end = parseShiftTime(period.endTime);

        if (start === null || end === null || start === end) {
            return false;
        }

        const periodStart =
            periodDate.getTime() / 60000 + start;

        const periodEnd =
            periodDate.getTime() / 60000 +
            (end < start ? end + 1440 : end);

        return (
            appointmentStart >= periodStart &&
            appointmentEnd <= periodEnd
        );
    };

    const availableToday = currentPeriods.some((period) =>
        fitsInsidePeriod(period, dayStart)
    );

    const availableFromPreviousDay = previousPeriods.some((period) =>
        fitsInsidePeriod(period, previousDay)
    );

    if (!availableToday && !availableFromPreviousDay) {
        const error = new Error(
            "The doctor is not available for the full consultation duration during the selected date and time."
        );

        error.code = "DOCTOR_SHIFT_UNAVAILABLE";
        throw error;
    }
};
// GET /api/appointments/booked-slots?doctorId=1&date=2026-11-02
// Returns ONLY the time slots already taken for that doctor on that day
// (e.g. ["09:00", "10:00"]). No patient details are ever returned.

// GET /api/appointments/booked-slots?doctorId=1&date=2026-11-02
// Returns booked slots and the doctor's effective shift availability.
const getBookedSlots = async (req, res) => {
    try {
        const doctorId = Number(req.query.doctorId);
        const dateParam = String(req.query.date || "");
        const day = new Date(`${dateParam}T00:00:00.000Z`);

        if (
            !Number.isInteger(doctorId) ||
            doctorId <= 0 ||
            !/^\d{4}-\d{2}-\d{2}$/.test(dateParam) ||
            Number.isNaN(day.getTime()) ||
            day.toISOString().slice(0, 10) !== dateParam
        ) {
            return res.status(400).json({
                success: false,
                message: "doctorId and a valid date (YYYY-MM-DD) are required"
            });
        }

        const { start, end } = utcDayRange(day);

        // Retrieve booked appointment slots.
        const rows = await prisma.appointment.findMany({
            where: {
                doctorId,
                date: { gte: start, lt: end },
                status: SLOT_HOLDING
            },
            select: { timeSlot: true }
        });

        const bookedSlots = [
            ...new Set(rows.map((row) => row.timeSlot))
        ];

        // Retrieve effective recurring shifts and exceptions.
        const {
            currentPeriods,
            previousPeriods,
            currentException
        } = await getDoctorShiftPeriods(prisma, doctorId, day);

        // Validate period times before exposing them as availability.
        const isValidPeriod = (period) => {
            const validTime = (value) =>
                typeof value === "string" &&
                /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);

            return (
                validTime(period.startTime) &&
                validTime(period.endTime) &&
                period.startTime !== period.endTime
            );
        };

        // Current-day periods always intersect their own calendar day.
        const hasCurrentDayAvailability =
            currentPeriods.some(isValidPeriod);

        // A previous-day period only extends into this day when overnight.
        const hasPreviousDayOvernightAvailability =
            previousPeriods.some((period) =>
                isValidPeriod(period) &&
                period.endTime < period.startTime
            );

        const isAvailable =
            hasCurrentDayAvailability ||
            hasPreviousDayOvernightAvailability;

        let unavailableReason = null;

        if (!isAvailable) {
            unavailableReason =
                currentException?.mode === "REPLACE"
                    ? "DOCTOR_SHIFT_EXCEPTION"
                    : "NO_WORKING_HOURS";
        }

        return res.json({
            success: true,
            data: bookedSlots,
            availability: {
                isAvailable,
                reason: unavailableReason,
                exception: currentException
                    ? {
                        mode: currentException.mode,
                        reason: currentException.reason
                    }
                    : null,
                periods: {
                    currentDay: currentPeriods.filter(isValidPeriod),
                    previousDay: previousPeriods.filter(
                        (period) =>
                            isValidPeriod(period) &&
                            period.endTime < period.startTime
                    )
                }
            }
        });
    } catch (error) {
        console.error("Get booked slots error:", error);

        if (error.code === "DOCTOR_NOT_FOUND") {
            return res.status(404).json({
                success: false,
                message: "Doctor profile not found"
            });
        }

        return res.status(500).json({
            success: false,
            message: "Unable to check available times"
        });
    }
};

// Creates an appointment only if its slot is still free, checking and creating
// in ONE serializable transaction. Two patients pressing "Request Appointment"
// for the same slot at the same moment can no longer both succeed: one gets
// SLOT_TAKEN (or a write conflict, P2034, which is retried and then reports
// SLOT_TAKEN once it can see the other booking).

const createAppointmentIfSlotFree = async (data, include) => {
    for (let attempt = 1; ; attempt += 1) {
        try {
            return await prisma.$transaction(
                async (tx) => {
                    await ensureDoctorShiftAvailability(
                        tx,
                        data.doctorId,
                        data.date,
                        data.timeSlot,
                        data.durationMinutes ?? 60
                    );

                    const clash = await hasAppointmentOverlap(tx, {
                        doctorId: data.doctorId,
                        date: data.date,
                        timeSlot: data.timeSlot,
                        durationMinutes: data.durationMinutes ?? 60
                    });

                    if (clash) {
                        const error = new Error(
                            "That appointment overlaps with an existing booking."
                        );
                        error.code = "SLOT_TAKEN";
                        throw error;
                    }

                    return tx.appointment.create({ data, include });
                },
                { isolationLevel: "Serializable" }
            );
        } catch (error) {
            if (error.code === "P2034" && attempt < 3) continue;

            // The unique index on (doctor, day, time) rejected a duplicate.
            if (error.code === "P2002") {
                const taken = new Error("That time slot is no longer available.");
                taken.code = "SLOT_TAKEN";
                throw taken;
            }

            throw error;
        }
    }
};



// Updates an appointment only if its new slot is available
// and the appointment has not changed since it was first read.

const updateAppointmentIfSlotFree = async (
    id,
    data,
    include,
    expectedUpdatedAt
) => {
    for (let attempt = 1; ; attempt += 1) {
        try {
            return await prisma.$transaction(
                async (tx) => {
                    const currentAppointment =
                        await tx.appointment.findUnique({
                            where: { id },
                            select: {
                                id: true,
                                status: true,
                                updatedAt: true,
                                durationMinutes: true,
                                doctorId: true
                            }
                        });

                    if (!currentAppointment) {
                        const error = new Error("Appointment not found");
                        error.code = "APPOINTMENT_NOT_FOUND";
                        throw error;
                    }

                    if (
                        currentAppointment.updatedAt.getTime() !==
                        expectedUpdatedAt.getTime()
                    ) {
                        const error = new Error(
                            "Appointment was changed by another user"
                        );
                        error.code = "APPOINTMENT_CHANGED";
                        throw error;
                    }

                    if (
                        !["PENDING", "CONFIRMED", "CHECKED_IN"].includes(
                            currentAppointment.status
                        )
                    ) {
                        const error = new Error(
                            "This appointment can no longer be updated"
                        );
                        error.code = "APPOINTMENT_NOT_EDITABLE";
                        throw error;
                    }

                    const effectiveDurationMinutes =
                        data.durationMinutes ??
                        currentAppointment.durationMinutes ??
                        60;

                        const effectiveDoctorId =
                                data.doctorId ?? currentAppointment.doctorId;


                    if (data.status !== "CANCELLED") {
                        await ensureDoctorShiftAvailability(
                            tx,
                            effectiveDoctorId,
                            data.date,
                            data.timeSlot,
                            effectiveDurationMinutes
                        );

                        const clash = await hasAppointmentOverlap(tx, {
                            doctorId: effectiveDoctorId,
                            date: data.date,
                            timeSlot: data.timeSlot,
                            durationMinutes: effectiveDurationMinutes,
                            excludeAppointmentId: id
                        });

                        if (clash) {
                            const error = new Error(
                                "This doctor already has an overlapping appointment."
                            );
                            error.code = "SLOT_TAKEN";
                            throw error;
                        }
                    }

                    return tx.appointment.update({
                        where: { id },
                        data,
                        include
                    });
                },
                { isolationLevel: "Serializable" }
            );
        } catch (error) {
            if (error.code === "P2034" && attempt < 3) {
                continue;
            }

            if (error.code === "P2002") {
                const taken = new Error("That time slot is no longer available.");
                taken.code = "SLOT_TAKEN";
                throw taken;
            }

            throw error;
        }
    }
};

// GET /api/appointments
const getAppointments = async (req, res) => {
    try {
        const appointments = await prisma.appointment.findMany({
            include: {
                patient: true,
                doctor: true,
                department: true,
                queue: true,
                consultation: true
            },
            orderBy: {
                id: "asc"
            }
        });

        res.json({
            success: true,
            data: appointments
        });
    } catch (error) {
        console.error("Get appointments error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to retrieve appointments"
        });
    }
};

// GET /api/appointments/missed
const getMissedAppointments = async (req, res) => {
    try {
        const role = req.user?.role;
        const userId = Number(req.user?.userId);

        const where = {
            status: "MISSED"
        };

        // Restrict doctors to their own assigned appointments.
        if (role === "DOCTOR") {
            const doctor = await prisma.doctor.findUnique({
                where: {
                    userId
                },
                select: {
                    id: true
                }
            });

            if (!doctor) {
                return res.status(404).json({
                    success: false,
                    message: "Doctor profile not found"
                });
            }

            where.doctorId = doctor.id;
        }

        const appointments = await prisma.appointment.findMany({
            where,
            include: {
                patient: true,
                doctor: true,
                department: true,
                queue: true,
                consultation: true
            },
            orderBy: [
                {
                    date: "desc"
                },
                {
                    timeSlot: "asc"
                }
            ]
        });

        return res.status(200).json({
            success: true,
            count: appointments.length,
            data: appointments
        });

    } catch (error) {
        console.error("Get missed appointments error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to retrieve missed appointments"
        });
    }
};



// GET /api/appointments/me
// Returns only the appointments belonging to the currently authenticated patient.
const getMyAppointments = async (req, res) => {
    try {
        const userId = req.user?.userId;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Authentication required"
            });
        }

        const patient = await prisma.patient.findUnique({
            where: { userId: Number(userId) }
        });

        if (!patient) {
            return res.status(404).json({
                success: false,
                message: "Patient profile not found for this account"
            });
        }

        const appointments = await prisma.appointment.findMany({
            where: {
                patientId: patient.id
            },
            include: {
                doctor: true,
                department: true,
                queue: true,
                consultation: true
            },
            orderBy: {
                date: "desc"
            }
        });

        res.json({
            success: true,
            data: appointments
        });
    } catch (error) {
        console.error("Get my appointments error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to retrieve your appointments"
        });
    }
};


// GET /api/appointments/:id
const getAppointmentById = async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (Number.isNaN(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid appointment ID"
            });
        }

        const appointment = await prisma.appointment.findUnique({
            where: {
                id
            },
            include: {
                patient: true,
                doctor: true,
                department: true,
                queue: true,
                consultation: true
            }
        });

        if (!appointment) {
            return res.status(404).json({
                success: false,
                message: "Appointment not found"
            });
        }

        const role = req.user?.role;
const userId = Number(req.user?.userId);

if (role === "PATIENT") {
    const patient = await prisma.patient.findUnique({
        where: { userId },
        select: { id: true }
    });

    if (!patient || patient.id !== appointment.patientId) {
        return res.status(403).json({
            success: false,
            message: "You are not allowed to view this appointment"
        });
    }
} else if (role === "DOCTOR") {
    const doctor = await prisma.doctor.findUnique({
        where: { userId },
        select: { id: true }
    });

    if (!doctor || doctor.id !== appointment.doctorId) {
        return res.status(403).json({
            success: false,
            message: "You are not allowed to view this appointment"
        });
    }
} else if (!["ADMIN", "RECEPTIONIST"].includes(role)) {
    return res.status(403).json({
        success: false,
        message: "You are not allowed to view this appointment"
    });
}

        res.json({
            success: true,
            data: appointment
        });
    } catch (error) {
        console.error("Get appointment error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to retrieve appointment"
        });
    }
};


// POST /api/appointments
// Patients booking for themselves: patientId is derived from the verified
// JWT (req.user), never trusted from the request body.
// Admin/receptionist (or unauthenticated internal calls, if any still exist)
// may still pass patientId explicitly in the body.
const createAppointment = async (req, res) => {
    try {
const {
    doctorId,
    departmentId,
    consultationTypeId,
    date,
    timeSlot,
    reason
} = req.body;

        // New appointments must always start as PENDING.
        if (
            req.body.status !== undefined &&
            req.body.status !== "PENDING"
        ) {
            return res.status(400).json({
                success: false,
                message: "New appointments must start with PENDING status"
            });
        }
        let parsedPatientId;

        if (req.user?.role === "PATIENT") {
            const patient = await prisma.patient.findUnique({
                where: { userId: Number(req.user.userId) }
            });

            if (!patient) {
                return res.status(404).json({
                    success: false,
                    message: "Patient profile not found for this account"
                });
            }

            parsedPatientId = patient.id;
        } else {
            parsedPatientId = Number(req.body.patientId);
        }

        const parsedDoctorId = Number(doctorId);
        const parsedDepartmentId = Number(departmentId);
        const parsedConsultationTypeId = Number(consultationTypeId);

if (
    !Number.isInteger(parsedConsultationTypeId) ||
    parsedConsultationTypeId <= 0
) {
    return res.status(400).json({
        success: false,
        message: "A valid consultationTypeId is required"
    });
}

        if (
            Number.isNaN(parsedPatientId) ||
            Number.isNaN(parsedDoctorId) ||
            Number.isNaN(parsedDepartmentId)
        ) {
            return res.status(400).json({
                success: false,
                message: "patientId, doctorId and departmentId must be valid numbers"
            });
        }

        if (!date || !timeSlot || !reason) {
            return res.status(400).json({
                success: false,
                message: "date, timeSlot and reason are required"
            });
        }

        const appointmentDate = new Date(date);

        if (Number.isNaN(appointmentDate.getTime())) {
            return res.status(400).json({
                success: false,
                message: "Invalid appointment date"
            });
        }

        const patient = await prisma.patient.findUnique({
            where: {
                id: parsedPatientId
            }
        });

        if (!patient) {
            return res.status(404).json({
                success: false,
                message: "Patient not found"
            });
        }

        const doctor = await prisma.doctor.findUnique({
            where: {
                id: parsedDoctorId
            }
        });

        if (!doctor) {
            return res.status(404).json({
                success: false,
                message: "Doctor not found"
            });
        }

        const department = await prisma.department.findUnique({
            where: {
                id: parsedDepartmentId
            }
        });

        if (!department) {
            return res.status(404).json({
                success: false,
                message: "Department not found"
            });
        }

        const consultationType = await prisma.consultationType.findFirst({
    where: {
        id: parsedConsultationTypeId,
        departmentId: parsedDepartmentId,
        isActive: true
    }
});

if (!consultationType) {
    return res.status(400).json({
        success: false,
        message:
            "The selected consultation type is invalid, inactive, or does not belong to this department."
    });
}

const durationMinutes = consultationType.durationMinutes;

        const doctorDepartment =
            await prisma.doctorDepartment.findUnique({
                where: {
                    doctorId_departmentId: {
                        doctorId: parsedDoctorId,
                        departmentId: parsedDepartmentId
                    }
                }
            });

        if (!doctorDepartment) {
            return res.status(400).json({
                success: false,
                message: "Doctor is not assigned to this department"
            });
        }

        // The doctor must actually be available: a working day, not marked
        // unavailable, and inside their working hours.
        const availabilityCheck = await checkDoctorSlot(
            prisma,
            parsedDoctorId,
            appointmentDate,
            timeSlot
        );

        if (!availabilityCheck.ok) {
            return res.status(409).json({
                success: false,
                code: availabilityCheck.code,
                message: availabilityCheck.message
            });
        }

        // Prevent a doctor from receiving overlapping active appointments.
        // Prevent double-booking for the same doctor, date and time slot.

const dayStart = new Date(
    Date.UTC(
        appointmentDate.getUTCFullYear(),
        appointmentDate.getUTCMonth(),
        appointmentDate.getUTCDate()
    )
);

const nextDayStart = new Date(dayStart);
nextDayStart.setUTCDate(nextDayStart.getUTCDate() + 1);

const conflictingAppointment = await prisma.appointment.findFirst({
    where: {
        doctorId: parsedDoctorId,
        date: {
            gte: dayStart,
            lt: nextDayStart
        },
        timeSlot,
        status: SLOT_HOLDING
    },
    select: {
        id: true
    }
});

if (conflictingAppointment) {
    return res.status(409).json({
        success: false,
        message:
            "This doctor already has an appointment for the selected date and time."
    });
}

        // Final, race-safe check: the slot is re-checked and the appointment
        // created in one transaction (see createAppointmentIfSlotFree).
        const appointment = await createAppointmentIfSlotFree(
            {
    patientId: parsedPatientId,
    doctorId: parsedDoctorId,
    departmentId: parsedDepartmentId,
    consultationTypeId: parsedConsultationTypeId,
    durationMinutes,
    date: appointmentDate,
    timeSlot,
    reason,
    status: "PENDING"
},
            {
                patient: true,
                doctor: true,
                department: true,
                consultationType: true
            }
        );

        await notifyAppointmentStakeholders({
    appointment,
    type: appointment.status === "CONFIRMED"
        ? "APPOINTMENT_CONFIRMED"
        : "APPOINTMENT_BOOKED",
    title: appointment.status === "CONFIRMED"
        ? "Appointment confirmed"
        : "New appointment booked",
    message: `Appointment scheduled for ${appointment.date.toISOString().slice(0, 10)} at ${appointment.timeSlot}.`,
    eventKey: `appointment-booked:${appointment.id}`
});


        res.status(201).json({
            success: true,
            data: appointment
        });
    } catch (error) {
        // Someone else took the slot between the check and the booking.
        if (error.code === "DOCTOR_SHIFT_UNAVAILABLE") {
    return res.status(409).json({
        success: false,
        message: error.message
    });
}

if (error.code === "INVALID_APPOINTMENT_TIME") {
    return res.status(400).json({
        success: false,
        message: error.message
    });
}

if (error.code === "DOCTOR_NOT_FOUND") {
    return res.status(404).json({
        success: false,
        message: error.message
    });
}
        if (error.code === "SLOT_TAKEN" || error.code === "P2034") {
            return res.status(409).json({
                success: false,
                message:
                    "That time slot is no longer available. Please choose another time."
            });
        }

        console.error("Create appointment error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to create appointment"
        });
    }
};


// PUT /api/appointments/:id
const updateAppointment = async (req, res) => {
    try {

        console.log("UPDATE APPOINTMENT AUTH:", {
    role: req.user?.role,
    userId: req.user?.userId,
    user: req.user
});
        const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid appointment ID"
            });
        }

        const existingAppointment = await prisma.appointment.findUnique({
            where: { id }
        });

        if (!existingAppointment) {
            return res.status(404).json({
                success: false,
                message: "Appointment not found"
            });
        }

        // Patient self-service rescheduling.
// Patients may only change the date, time slot and reason of their own
// PENDING or CONFIRMED appointments.
if (req.user?.role === "PATIENT") {
    const userId = Number(req.user.userId);

    const patient = await prisma.patient.findUnique({
        where: { userId },
        select: { id: true }
    });

    if (!patient || patient.id !== existingAppointment.patientId) {
        return res.status(403).json({
            success: false,
            message: "You are not authorised to update this appointment."
        });
    }

    if (!["PENDING", "CONFIRMED"].includes(existingAppointment.status)) {
        return res.status(400).json({
            success: false,
            message: "Only pending or confirmed appointments can be rescheduled."
        });
    }

    // Patients cannot modify ownership, doctor, department or status.
    const restrictedFields = [
        "patientId",
        "doctorId",
        "departmentId",
        "status"
    ];

    const attemptedRestrictedField = restrictedFields.find(
        (field) => Object.prototype.hasOwnProperty.call(req.body, field)
    );

    if (attemptedRestrictedField) {
        return res.status(400).json({
            success: false,
            message: `Patients are not allowed to change ${attemptedRestrictedField}.`
        });
    }

    const appointmentDate = req.body.date !== undefined
        ? new Date(req.body.date)
        : existingAppointment.date;

    if (Number.isNaN(appointmentDate.getTime())) {
        return res.status(400).json({
            success: false,
            message: "Invalid appointment date."
        });
    }

    const effectiveTimeSlot = req.body.timeSlot !== undefined
        ? req.body.timeSlot
        : existingAppointment.timeSlot;

    if (
        typeof effectiveTimeSlot !== "string" ||
        !/^([01]\d|2[0-3]):[0-5]\d$/.test(effectiveTimeSlot)
    ) {
        return res.status(400).json({
            success: false,
            message: "Time slot must use the HH:mm format."
        });
    }

    if (
        req.body.reason !== undefined &&
        (typeof req.body.reason !== "string" || !req.body.reason.trim())
    ) {
        return res.status(400).json({
            success: false,
            message: "Appointment reason must be a non-empty string."
        });
    }

    const updateData = {
        date: appointmentDate,
        timeSlot: effectiveTimeSlot,
        reason: req.body.reason !== undefined
            ? req.body.reason.trim()
            : existingAppointment.reason
    };

    const appointment = await updateAppointmentIfSlotFree(
        id,
        updateData,
        {
            patient: true,
            doctor: true,
            department: true
        },
        existingAppointment.updatedAt
    );

    const scheduleChanged =
    existingAppointment.date.getTime() !== appointment.date.getTime() ||
    existingAppointment.timeSlot !== appointment.timeSlot ||
    existingAppointment.doctorId !== appointment.doctorId ||
    existingAppointment.departmentId !== appointment.departmentId ||
    existingAppointment.consultationTypeId !== appointment.consultationTypeId ||
    existingAppointment.durationMinutes !== appointment.durationMinutes;

    if (scheduleChanged) {
        await notifyAppointmentStakeholders({
            appointment,
            type: "APPOINTMENT_RESCHEDULED",
            title: "Appointment rescheduled",
            message: `The appointment schedule has changed to ${appointment.date.toISOString().slice(0, 10)} at ${appointment.timeSlot}.`,
            eventKey: `appointment-rescheduled:${appointment.id}:${appointment.updatedAt.toISOString()}`
        });
    }

    return res.json({
        success: true,
        message: scheduleChanged
            ? "Appointment rescheduled successfully."
            : "Appointment details updated successfully.",
        data: appointment
    });
}

        const {
    patientId,
    doctorId,
    departmentId,
    date,
    timeSlot,
    reason,
    status,
    consultationTypeId
} = req.body;

// Only allow status transitions that belong to the general
// appointment update workflow.
if (status !== undefined && status !== existingAppointment.status) {
    const allowedStatusTransitions = {
        PENDING: ["CONFIRMED", "CANCELLED"],
        CONFIRMED: ["CANCELLED"]
    };

    const allowedStatuses =
        allowedStatusTransitions[existingAppointment.status] || [];

    if (!allowedStatuses.includes(status)) {
        return res.status(400).json({
            success: false,
            message:
                "Invalid appointment status transition. Use the dedicated workflow for this status change."
        });
    }
}
        const parsedPatientId =
            patientId !== undefined ? Number(patientId) : existingAppointment.patientId;

        const parsedDoctorId =
            doctorId !== undefined ? Number(doctorId) : existingAppointment.doctorId;

        const parsedDepartmentId =
            departmentId !== undefined
                ? Number(departmentId)
                : existingAppointment.departmentId;

        if (
            Number.isNaN(parsedPatientId) ||
            Number.isNaN(parsedDoctorId) ||
            Number.isNaN(parsedDepartmentId)
        ) {
            return res.status(400).json({
                success: false,
                message: "patientId, doctorId and departmentId must be valid numbers"
            });
        }

        const appointmentDate = date
            ? new Date(date)
            : existingAppointment.date;

        if (Number.isNaN(appointmentDate.getTime())) {
            return res.status(400).json({
                success: false,
                message: "Invalid appointment date"
            });
        }

        const patient = await prisma.patient.findUnique({
            where: { id: parsedPatientId }
        });

        if (!patient) {
            return res.status(404).json({
                success: false,
                message: "Patient not found"
            });
        }

        const doctor = await prisma.doctor.findUnique({
            where: { id: parsedDoctorId }
        });

        if (!doctor) {
            return res.status(404).json({
                success: false,
                message: "Doctor not found"
            });
        }

        const department = await prisma.department.findUnique({
            where: { id: parsedDepartmentId }
        });

        if (!department) {
            return res.status(404).json({
                success: false,
                message: "Department not found"
            });
        }

        const doctorDepartment =
            await prisma.doctorDepartment.findUnique({
                where: {
                    doctorId_departmentId: {
                        doctorId: parsedDoctorId,
                        departmentId: parsedDepartmentId
                    }
                }
            });

        if (!doctorDepartment) {
            return res.status(400).json({
                success: false,
                message: "Doctor is not assigned to this department"
            });
        }

        const effectiveTimeSlot =
    timeSlot !== undefined
        ? timeSlot
        : existingAppointment.timeSlot;


        // Validate the consultation type when updating an appointment.
// If staff did not provide a new type, retain the existing one.
// Only validate consultation type when one is supplied,
// or when the existing appointment already has one.
let consultationTypeData = {};

if (
    consultationTypeId !== undefined ||
    existingAppointment.consultationTypeId !== null
) {
    const effectiveConsultationTypeId =
        consultationTypeId !== undefined
            ? Number(consultationTypeId)
            : existingAppointment.consultationTypeId;

    if (
        !Number.isInteger(effectiveConsultationTypeId) ||
        effectiveConsultationTypeId <= 0
    ) {
        return res.status(400).json({
            success: false,
            message: "A valid consultationTypeId is required"
        });
    }

    const consultationType = await prisma.consultationType.findFirst({
        where: {
            id: effectiveConsultationTypeId,
            departmentId: parsedDepartmentId,
            isActive: true
        }
    });

    if (!consultationType) {
        return res.status(400).json({
            success: false,
            message:
                "The selected consultation type is invalid, inactive, or does not belong to this department."
        });
    }

    consultationTypeData = {
        consultationTypeId: effectiveConsultationTypeId,
        durationMinutes: consultationType.durationMinutes
    };
}

        // Only re-check availability when the doctor, date or time is changing.
        // Existing bookings that merely become outside the doctor's new hours
        // are left alone until someone actually reschedules them.
        const scheduleIsChanging =
            existingAppointment.doctorId !== parsedDoctorId ||
            existingAppointment.date.getTime() !== appointmentDate.getTime() ||
            existingAppointment.timeSlot !== effectiveTimeSlot;

        if (scheduleIsChanging && status !== "CANCELLED") {
            const availabilityCheck = await checkDoctorSlot(
                prisma,
                parsedDoctorId,
                appointmentDate,
                effectiveTimeSlot
            );

            if (!availabilityCheck.ok) {
                return res.status(409).json({
                    success: false,
                    code: availabilityCheck.code,
                    message: availabilityCheck.message
                });
            }
        }





        const updateData = {
    patientId: parsedPatientId,
    doctorId: parsedDoctorId,
    departmentId: parsedDepartmentId,
    ...consultationTypeData,
    date: appointmentDate,
    timeSlot: effectiveTimeSlot,
    reason:
        reason !== undefined
            ? reason
            : existingAppointment.reason,
    status:
        status !== undefined
            ? status
            : (
                existingAppointment.status === "CHECKED_IN" &&
                (
                    existingAppointment.date.getTime() !== appointmentDate.getTime() ||
                    existingAppointment.timeSlot !== effectiveTimeSlot ||
                    existingAppointment.doctorId !== parsedDoctorId ||
                    existingAppointment.departmentId !== parsedDepartmentId
                )
            )
                ? "CONFIRMED"
                : existingAppointment.status
};

const appointment = await updateAppointmentIfSlotFree(
    id,
    updateData,
    {
        patient: true,
        doctor: true,
        department: true,
        consultationType: true
    },
    existingAppointment.updatedAt
);
    const scheduleChanged =
    existingAppointment.date.getTime() !== appointment.date.getTime() ||
    existingAppointment.timeSlot !== appointment.timeSlot ||
    existingAppointment.doctorId !== appointment.doctorId ||
    existingAppointment.departmentId !== appointment.departmentId;

const statusChanged = existingAppointment.status !== appointment.status;

let notificationEvent = null;

if (
    appointment.status === "CANCELLED" &&
    existingAppointment.status !== "CANCELLED"
) {
    notificationEvent = {
        type: "APPOINTMENT_CANCELLED",
        title: "Appointment cancelled",
        message: "An appointment has been cancelled."
    };
} else if (scheduleChanged) {
    notificationEvent = {
        type: "APPOINTMENT_RESCHEDULED",
        title: "Appointment rescheduled",
        message: `The appointment schedule has changed to ${appointment.date.toISOString().slice(0, 10)} at ${appointment.timeSlot}.`
    };
} else if (
    statusChanged &&
    appointment.status === "CONFIRMED"
) {
    notificationEvent = {
        type: "APPOINTMENT_CONFIRMED",
        title: "Appointment confirmed",
        message: `Appointment is confirmed for ${appointment.date.toISOString().slice(0, 10)} at ${appointment.timeSlot}.`
    };
}

if (notificationEvent) {
    await notifyAppointmentStakeholders({
        appointment,
        ...notificationEvent,
        eventKey: `appointment-update:${appointment.id}:${appointment.updatedAt.toISOString()}`
    });
}

        res.json({
            success: true,
            data: appointment
        });
    } catch (error) {
        console.error("Update appointment error:", error);
        if (error.code === "DOCTOR_SHIFT_UNAVAILABLE") {
    return res.status(409).json({
        success: false,
        message: error.message
    });
}

if (error.code === "INVALID_APPOINTMENT_TIME") {
    return res.status(400).json({
        success: false,
        message: error.message
    });
}

if (error.code === "DOCTOR_NOT_FOUND") {
    return res.status(404).json({
        success: false,
        message: error.message
    });
}
        if (error.code === "SLOT_TAKEN" || error.code === "P2034") {
    return res.status(409).json({
        success: false,
        message:
            "That time slot is no longer available. Please choose another time."
    });
}

    if (error.code === "APPOINTMENT_NOT_FOUND") {
    return res.status(404).json({
        success: false,
        message: "Appointment not found"
    });
}

if (error.code === "APPOINTMENT_CHANGED") {
    return res.status(409).json({
        success: false,
        message: "This appointment was changed by another user. Refresh and try again."
    });
}

if (error.code === "APPOINTMENT_NOT_EDITABLE") {
    return res.status(400).json({
        success: false,
        message: "This appointment can no longer be updated."
    });
}

        res.status(500).json({
            success: false,
            message: "Failed to update appointment"
        });
    }
};

// DELETE /api/appointments/:id

const deleteAppointment = async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid appointment ID"
            });
        }

        const existingAppointment = await prisma.appointment.findUnique({
            where: { id }
        });

        if (!existingAppointment) {
            return res.status(404).json({
                success: false,
                message: "Appointment not found"
            });
        }

        // Patients may only cancel their own appointments.
if (req.user?.role === "PATIENT") {
    const userId = Number(req.user.userId);

    const patient = await prisma.patient.findUnique({
        where: { userId },
        select: { id: true }
    });

    if (!patient || patient.id !== existingAppointment.patientId) {
        return res.status(403).json({
            success: false,
            message: "You are not authorised to cancel this appointment."
        });
    }
}

        if (existingAppointment.status === "CANCELLED") {
    return res.json({
        success: true,
        message: "Appointment is already cancelled"
    });
}

if (!["PENDING", "CONFIRMED"].includes(existingAppointment.status)) {
    return res.status(400).json({
        success: false,
        message:
            "Only PENDING or CONFIRMED appointments can be cancelled. Checked-in and completed workflows cannot be cancelled through this endpoint."
    });
}

        const appointment = await prisma.appointment.update({
            where: { id },
            data: { status: "CANCELLED" }
        });

        await notifyAppointmentStakeholders({
            appointment,
            type: "APPOINTMENT_CANCELLED",
            title: "Appointment cancelled",
            message: "An appointment has been cancelled.",
            eventKey: `appointment-cancelled:${appointment.id}`
        });

        return res.json({
            success: true,
            message: "Appointment cancelled successfully",
            data: appointment
        });
    } catch (error) {
        console.error("Cancel appointment error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to cancel appointment"
        });
    }
};


module.exports = {
    getAppointments,
    getMyAppointments,
    getBookedSlots,
    getAppointmentById,
    getMissedAppointments,
    createAppointment,
    updateAppointment,
    deleteAppointment
};
