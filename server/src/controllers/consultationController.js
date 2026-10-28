const prisma = require("../prisma");
const {
    notifyConsultationEvent
} = require("../services/consultationNotifications");

const consultationWorkflowError = (message) => {
    const error = new Error(message);
    error.statusCode = 409;
    return error;
};

const getDoctorIdForUser = async (userId) => {
    const doctor = await prisma.doctor.findUnique({
        where: { userId: Number(userId) },
        select: { id: true }
    });

    return doctor?.id ?? null;
};

// GET /api/consultations
// GET /api/consultations
const getConsultations = async (req, res) => {
    try {
        let where = {};

        if (req.user.role === "DOCTOR") {
            const doctorId = await getDoctorIdForUser(
                req.user.userId
            );

            if (!doctorId) {
                return res.status(403).json({
                    success: false,
                    message: "Doctor profile not found"
                });
            }

            where = { doctorId };
        }

        const consultations = await prisma.consultation.findMany({
            where,
            include: {
                appointment: {
                    include: {
                        patient: true,
                        doctor: true,
                        department: true
                    }
                },
                doctor: true
            },
            orderBy: { id: "asc" }
        });

        return res.json({
            success: true,
            data: consultations
        });
    } catch (error) {
        console.error("Get consultations error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to retrieve consultations"
        });
    }
};

// GET /api/consultations/:id
const getConsultationById = async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (Number.isNaN(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid consultation ID"
            });
        }

        const consultation = await prisma.consultation.findUnique({
            where: { id },
            include: {
                appointment: {
                    include: {
                        patient: true,
                        doctor: true,
                        department: true
                    }
                },
                doctor: true
            }
        });

        if (!consultation) {
            return res.status(404).json({
                success: false,
                message: "Consultation not found"
            });
        }

        if (req.user.role === "DOCTOR") {
    const doctorId = await getDoctorIdForUser(
        req.user.userId
    );

    if (
        !doctorId ||
        consultation.doctorId !== doctorId ||
        consultation.appointment.doctorId !== doctorId
    ) {
        return res.status(403).json({
            success: false,
            message: "You do not have access to this consultation"
        });
    }
}

        res.json({
            success: true,
            data: consultation
        });
    } catch (error) {
        console.error("Get consultation error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to retrieve consultation"
        });
    }
};

// POST /api/consultations
const createConsultation = async (req, res) => {
    try {
        const {
            appointmentId,
            doctorId,
            notes,
            startedAt,
            completedAt
        } = req.body;

        const parsedAppointmentId = Number(appointmentId);
        const parsedDoctorId = Number(doctorId);

        if (Number.isNaN(parsedAppointmentId)) {
            return res.status(400).json({
                success: false,
                message: "appointmentId must be a valid number"
            });
        }

        if (Number.isNaN(parsedDoctorId)) {
            return res.status(400).json({
                success: false,
                message: "doctorId must be a valid number"
            });
        }

        if (!notes) {
            return res.status(400).json({
                success: false,
                message: "notes is required"
            });
        }

        // Check appointment
        const appointment = await prisma.appointment.findUnique({
            where: {
                id: parsedAppointmentId
            }
        });

        if (!appointment) {
            return res.status(404).json({
                success: false,
                message: "Appointment not found"
            });
        }

        if (req.user.role === "DOCTOR") {
    const authenticatedDoctorId = await getDoctorIdForUser(
        req.user.userId
    );

    if (!authenticatedDoctorId) {
        return res.status(403).json({
            success: false,
            message: "Doctor profile not found"
        });
    }

    if (
        parsedDoctorId !== authenticatedDoctorId ||
        appointment.doctorId !== authenticatedDoctorId
    ) {
        return res.status(403).json({
            success: false,
            message: "You can only create consultations for your assigned appointments"
        });
    }
}

        // Check doctor
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

        // Make sure the consultation doctor matches the appointment doctor
        if (appointment.doctorId !== parsedDoctorId) {
            return res.status(400).json({
                success: false,
                message: "Consultation doctor must match the appointment doctor"
            });
        }

        // Check if appointment already has a consultation
        const existingConsultation =
            await prisma.consultation.findUnique({
                where: {
                    appointmentId: parsedAppointmentId
                }
            });

        if (existingConsultation) {
            return res.status(409).json({
                success: false,
                message: "A consultation already exists for this appointment"
            });
        }

       // Consultations must be created before they are started or completed.
// These timestamps are set later through updateConsultation.
        if (
            (startedAt !== undefined && startedAt !== null && startedAt !== "") ||
            (completedAt !== undefined && completedAt !== null && completedAt !== "")
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Create the consultation first, then update it when it starts or completes."
            });
        }

        const parsedStartedAt = null;
        const parsedCompletedAt = null;

        const consultation = await prisma.consultation.create({
            data: {
                appointmentId: parsedAppointmentId,
                doctorId: parsedDoctorId,
                notes,
                startedAt: parsedStartedAt,
                completedAt: parsedCompletedAt
            },
            include: {
                appointment: {
                    include: {
                        patient: true,
                        doctor: true,
                        department: true
                    }
                },
                doctor: true
            }
        });

        res.status(201).json({
            success: true,
            data: consultation
        });
    } catch (error) {
        console.error("Create consultation error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to create consultation"
        });
    }
};

// PUT /api/consultations/:id
const updateConsultation = async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (Number.isNaN(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid consultation ID"
            });
        }

        const existingConsultation =
            await prisma.consultation.findUnique({
                where: { id }
            });

        if (!existingConsultation) {
            return res.status(404).json({
                success: false,
                message: "Consultation not found"
            });
        }

        if (req.user.role === "DOCTOR") {
    const authenticatedDoctorId = await getDoctorIdForUser(
        req.user.userId
    );

    if (!authenticatedDoctorId) {
        return res.status(403).json({
            success: false,
            message: "Doctor profile not found"
        });
    }

    if (existingConsultation.doctorId !== authenticatedDoctorId) {
        return res.status(403).json({
            success: false,
            message: "You can only update your own consultations"
        });
    }

    if (
        req.body.doctorId !== undefined &&
        Number(req.body.doctorId) !== authenticatedDoctorId
    ) {
        return res.status(403).json({
            success: false,
            message: "You cannot reassign a consultation to another doctor"
        });
    }

    if (
        req.body.appointmentId !== undefined &&
        Number(req.body.appointmentId) !== existingConsultation.appointmentId
    ) {
        return res.status(403).json({
            success: false,
            message: "You cannot change the appointment linked to a consultation"
        });
    }
}

        const {
            appointmentId,
            doctorId,
            notes,
            startedAt,
            completedAt
        } = req.body;

        const parsedAppointmentId =
            appointmentId !== undefined
                ? Number(appointmentId)
                : existingConsultation.appointmentId;

        const parsedDoctorId =
            doctorId !== undefined
                ? Number(doctorId)
                : existingConsultation.doctorId;

        if (Number.isNaN(parsedAppointmentId)) {
            return res.status(400).json({
                success: false,
                message: "appointmentId must be a valid number"
            });
        }

        if (Number.isNaN(parsedDoctorId)) {
            return res.status(400).json({
                success: false,
                message: "doctorId must be a valid number"
            });
        }

        if (notes !== undefined && !notes) {
            return res.status(400).json({
                success: false,
                message: "notes cannot be empty"
            });
        }

        // Check appointment
        const appointment = await prisma.appointment.findUnique({
            where: {
                id: parsedAppointmentId
            }
        });

        if (!appointment) {
            return res.status(404).json({
                success: false,
                message: "Appointment not found"
            });
        }

        // Check doctor
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

        // Make sure doctor matches appointment doctor
        if (appointment.doctorId !== parsedDoctorId) {
            return res.status(400).json({
                success: false,
                message: "Consultation doctor must match the appointment doctor"
            });
        }

        // If appointment is being changed, make sure it does not
        // already belong to another consultation.
        if (
            parsedAppointmentId !==
            existingConsultation.appointmentId
        ) {
            const appointmentConsultation =
                await prisma.consultation.findUnique({
                    where: {
                        appointmentId: parsedAppointmentId
                    }
                });

            if (
                appointmentConsultation &&
                appointmentConsultation.id !== id
            ) {
                return res.status(409).json({
                    success: false,
                    message: "A consultation already exists for this appointment"
                });
            }
        }

        let parsedStartedAt = existingConsultation.startedAt;
        let parsedCompletedAt = existingConsultation.completedAt;

        if (startedAt !== undefined) {
            parsedStartedAt = startedAt
                ? new Date(startedAt)
                : null;
            if (
                parsedStartedAt &&
                Number.isNaN(parsedStartedAt.getTime())
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid startedAt date"
                });
            }
        }

        if (completedAt !== undefined) {
            parsedCompletedAt = completedAt
                ? new Date(completedAt)
                : null;

            if (
                parsedCompletedAt &&
                Number.isNaN(parsedCompletedAt.getTime())
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid completedAt date"
                });
            }
        }

        
        // A consultation must start before it can be completed.
        if (parsedCompletedAt && !parsedStartedAt) {
            return res.status(400).json({
                success: false,
                message: "A consultation must be started before it can be completed"
            });
        }

        // Completion cannot occur before the start time.
        if (
            parsedStartedAt &&
            parsedCompletedAt &&
            parsedCompletedAt < parsedStartedAt
        ) {
            return res.status(400).json({
                success: false,
                message: "completedAt cannot be earlier than startedAt"
            });
        }

        // Once a consultation starts, its start timestamp cannot be cleared.
        if (existingConsultation.startedAt && !parsedStartedAt) {
            return res.status(400).json({
                success: false,
                message: "A started consultation cannot have its start time cleared"
            });
        }
        // Once completed, a consultation cannot be reopened by clearing its completion time.
        if (existingConsultation.completedAt && !parsedCompletedAt) {
            return res.status(400).json({
                success: false,
                message: "A completed consultation cannot be reopened"
            });
        }

               // Update consultation, appointment and queue atomically.
        const result = await prisma.$transaction(async (tx) => {
            const consultation = await tx.consultation.update({
                where: { id },
                data: {
                    appointmentId: parsedAppointmentId,
                    doctorId: parsedDoctorId,
                    notes: notes !== undefined
                        ? notes
                        : existingConsultation.notes,
                    startedAt: parsedStartedAt,
                    completedAt: parsedCompletedAt
                },
                include: {
                    appointment: {
                        include: {
                            patient: true,
                            doctor: true,
                            department: true
                        }
                    },
                    doctor: true
                }
            });
            // Starting a consultation updates the appointment and queue.
            if (!existingConsultation.startedAt && parsedStartedAt) {
                const queue = await tx.queue.findUnique({
                    where: { appointmentId: parsedAppointmentId }
                });

                if (!queue) {
                    throw consultationWorkflowError(
                        "Cannot start consultation: queue record not found"
                    );
                }

                if (!["CALLED", "IN_CONSULTATION"].includes(queue.status)) {
                    throw consultationWorkflowError(
                        "Cannot start consultation: patient must be called first"
                    );
                }

                await tx.appointment.update({
                    where: { id: parsedAppointmentId },
                    data: { status: "IN_PROGRESS" }
                });

                await tx.queue.update({
                    where: { appointmentId: parsedAppointmentId },
                    data: { status: "IN_CONSULTATION" }
                });
            }
            // Completing a consultation updates the appointment and queue.
            if (!existingConsultation.completedAt && parsedCompletedAt) {
                const queue = await tx.queue.findUnique({
                    where: { appointmentId: parsedAppointmentId }
                });

                if (!queue || queue.status !== "IN_CONSULTATION") {
                    throw consultationWorkflowError(
                        "Cannot complete consultation: patient is not in consultation"
                    );
                }

                await tx.appointment.update({
                    where: { id: parsedAppointmentId },
                    data: { status: "COMPLETED" }
                });

                await tx.queue.update({
                    where: { appointmentId: parsedAppointmentId },
                    data: { status: "COMPLETED" }
                });
            }


            return consultation;
        });

        // Notify only after the database transaction commits.
        if (!existingConsultation.startedAt && parsedStartedAt) {
            await notifyConsultationEvent({
                consultation: result,
                type: "CONSULTATION_STARTED",
                eventKey: `consultation-started:${result.id}`
            });
        }

        if (!existingConsultation.completedAt && parsedCompletedAt) {
            await notifyConsultationEvent({
                consultation: result,
                type: "CONSULTATION_COMPLETED",
                eventKey: `consultation-completed:${result.id}`
            });
        }

        const consultation = result;


        res.json({
            success: true,
            data: consultation
        });
        } catch (error) {
        console.error("Update consultation error:", error);

        const statusCode = error.statusCode || 500;

        res.status(statusCode).json({
            success: false,
            message: statusCode === 409
                ? error.message
                : "Failed to update consultation"
        });
    }
};

// DELETE /api/consultations/:id
const deleteConsultation = async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (Number.isNaN(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid consultation ID"
            });
        }

        const existingConsultation =
            await prisma.consultation.findUnique({
                where: { id }
            });

        if (!existingConsultation) {
            return res.status(404).json({
                success: false,
                message: "Consultation not found"
            });
        }

        await prisma.consultation.delete({
            where: { id }
        });

        res.json({
            success: true,
            message: "Consultation deleted successfully"
        });
    } catch (error) {
        console.error("Delete consultation error:", error);

        const statusCode = error.statusCode || 500;

        res.status(statusCode).json({
            success: false,
            message: "Failed to delete consultation"
        });
    }
};


module.exports = {
    getConsultations,
    getConsultationById,
    createConsultation,
    updateConsultation,
    deleteConsultation
};