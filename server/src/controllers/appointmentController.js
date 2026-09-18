const prisma = require("../prisma");

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
const createAppointment = async (req, res) => {
    try {
        const {
            patientId,
            doctorId,
            departmentId,
            date,
            timeSlot,
            reason,
            status
        } = req.body;

        const parsedPatientId = Number(patientId);
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

        const appointment = await prisma.appointment.create({
            data: {
                patientId: parsedPatientId,
                doctorId: parsedDoctorId,
                departmentId: parsedDepartmentId,
                date: appointmentDate,
                timeSlot,
                reason,
                status: status || "PENDING"
            },
            include: {
                patient: true,
                doctor: true,
                department: true
            }
        });

        res.status(201).json({
            success: true,
            data: appointment
        });
    } catch (error) {
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

        const appointment = await prisma.appointment.update({
            where: { id },

            data: {
                patientId: parsedPatientId,
                doctorId: parsedDoctorId,
                departmentId: parsedDepartmentId,
                date: appointmentDate,
                timeSlot:
                    timeSlot !== undefined
                        ? timeSlot
                        : existingAppointment.timeSlot,
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

        await prisma.appointment.delete({
            where: { id }
        });

        res.json({
            success: true,
            message: "Appointment deleted successfully"
        });
    } catch (error) {
        console.error("Delete appointment error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to delete appointment"
        });
    }
};


module.exports = {
    getAppointments,
    getAppointmentById,
    createAppointment,
    updateAppointment,
    deleteAppointment
};