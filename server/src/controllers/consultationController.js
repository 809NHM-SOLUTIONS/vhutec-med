const prisma = require("../prisma");

// GET /api/consultations
const getConsultations = async (req, res) => {
    try {
        const consultations = await prisma.consultation.findMany({
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
            orderBy: {
                id: "asc"
            }
        });

        res.json({
            success: true,
            data: consultations
        });
    } catch (error) {
        console.error("Get consultations error:", error);

        res.status(500).json({
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

        // Parse optional dates
        let parsedStartedAt = null;
        let parsedCompletedAt = null;

        if (startedAt !== undefined && startedAt !== null && startedAt !== "") {
            parsedStartedAt = new Date(startedAt);

            if (Number.isNaN(parsedStartedAt.getTime())) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid startedAt date"
                });
            }
        }

        if (
            completedAt !== undefined &&
            completedAt !== null &&
            completedAt !== ""
        ) {
            parsedCompletedAt = new Date(completedAt);

            if (Number.isNaN(parsedCompletedAt.getTime())) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid completedAt date"
                });
            }
        }

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

        const consultation =
            await prisma.consultation.update({
                where: { id },

                data: {
                    appointmentId: parsedAppointmentId,
                    doctorId: parsedDoctorId,

                    notes:
                        notes !== undefined
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

        res.json({
            success: true,
            data: consultation
        });
    } catch (error) {
        console.error("Update consultation error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to update consultation"
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

        res.status(500).json({
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