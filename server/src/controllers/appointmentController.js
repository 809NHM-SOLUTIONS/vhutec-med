const prisma = require("../prisma");
const { notifyAppointmentStakeholders } = require("../services/appointmentNotifications");


// ---------------------------------------------------------------------------
// Time-slot availability
// ---------------------------------------------------------------------------

// Cancelled appointments free their slot again; everything else holds it.
const SLOT_HOLDING = { not: "CANCELLED" };

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

// GET /api/appointments/booked-slots?doctorId=1&date=2026-11-02
// Returns ONLY the time slots already taken for that doctor on that day
// (e.g. ["09:00", "10:00"]). No patient details are ever returned.
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

        const rows = await prisma.appointment.findMany({
            where: {
                doctorId,
                date: { gte: start, lt: end },
                status: SLOT_HOLDING
            },
            select: { timeSlot: true }
        });

        return res.json({
            success: true,
            data: [...new Set(rows.map((row) => row.timeSlot))]
        });
    } catch (error) {
        console.error("Get booked slots error:", error);

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
                    const { start, end } = utcDayRange(data.date);

                    const clash = await tx.appointment.findFirst({
                        where: {
                            doctorId: data.doctorId,
                            date: { gte: start, lt: end },
                            timeSlot: data.timeSlot,
                            status: SLOT_HOLDING
                        },
                        select: { id: true }
                    });

                    if (clash) {
                        const taken = new Error("That time slot is no longer available.");
                        taken.code = "SLOT_TAKEN";
                        throw taken;
                    }

                    return tx.appointment.create({ data, include });
                },
                { isolationLevel: "Serializable" }
            );
        } catch (error) {
            if (error.code === "P2034" && attempt < 3) continue;
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
            date,
            timeSlot,
            reason,
            status
        } = req.body;

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
        status: {
            not: "CANCELLED"
        }
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
                date: appointmentDate,
                timeSlot,
                reason,
                status: status || "PENDING"
            },
            {
                patient: true,
                doctor: true,
                department: true
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
        const id = Number(req.params.id);

        if (Number.isNaN(id)) {
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

        const {
            patientId,
            doctorId,
            departmentId,
            date,
            timeSlot,
            reason,
            status
        } = req.body;

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

// Check the selected calendar day.
const dayStart = new Date(
    Date.UTC(
        appointmentDate.getUTCFullYear(),
        appointmentDate.getUTCMonth(),
        appointmentDate.getUTCDate()
    )
);

const nextDayStart = new Date(dayStart);
nextDayStart.setUTCDate(nextDayStart.getUTCDate() + 1);

// Don't check conflicts when the appointment is being cancelled.
const effectiveStatus =
    status !== undefined ? status : existingAppointment.status;

if (effectiveStatus !== "CANCELLED") {
    const conflictingAppointment = await prisma.appointment.findFirst({
        where: {
            id: { not: id },
            doctorId: parsedDoctorId,
            date: {
                gte: dayStart,
                lt: nextDayStart
            },
            timeSlot: effectiveTimeSlot,
            status: {
                not: "CANCELLED"
            }
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
}

        const appointment = await prisma.appointment.update({
            where: { id },

            data: {
                patientId: parsedPatientId,
                doctorId: parsedDoctorId,
                departmentId: parsedDepartmentId,
                date: appointmentDate,
                timeSlot: effectiveTimeSlot,
                reason:
                    reason !== undefined
                        ? reason
                        : existingAppointment.reason,
                status:
                    status !== undefined
                        ? status
                        : existingAppointment.status
            },

            include: {
                patient: true,
                doctor: true,
                department: true
            }
        });

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

        if (existingAppointment.status === "CANCELLED") {
            return res.json({
                success: true,
                message: "Appointment is already cancelled"
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
    createAppointment,
    updateAppointment,
    deleteAppointment
};