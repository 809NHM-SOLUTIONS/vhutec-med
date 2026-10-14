const prisma = require("../prisma");

// GET /api/patients
const getPatients = async (req, res) => {
    try {
        const patients = await prisma.patient.findMany({
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        role: true
                    }
                }
            },
            orderBy: {
                id: "asc"
            }
        });

        res.json({
            success: true,
            data: patients
        });
    } catch (error) {
        console.error("Get patients error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to retrieve patients"
        });
    }
};

// GET /api/patients/me
// Returns the full Patient record (+ account email/role) for the
// currently authenticated user, derived from the verified JWT —
// never from a client-supplied id.
const getMyProfile = async (req, res) => {
    try {
        // authController signs jwt.sign({ userId: user.id, role }, ...),
        // so authenticate's req.user = { userId, role, iat, exp }.
        const userId = req.user.userId;

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Authentication required"
            });
        }

        const patient = await prisma.patient.findUnique({
            where: {
                userId: Number(userId)
            },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        role: true
                    }
                }
            }
        });

        if (!patient) {
            return res.status(404).json({
                success: false,
                message: "Patient profile not found for this account"
            });
        }

        res.json({
            success: true,
            data: patient
        });
    } catch (error) {
        console.error("Get my profile error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to retrieve patient profile"
        });
    }
};

// GET /api/patients/:id
const getPatientById = async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (Number.isNaN(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid patient ID"
            });
        }

        const patient = await prisma.patient.findUnique({
            where: {
                id
            },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        role: true
                    }
                }
            }
        });

        if (!patient) {
            return res.status(404).json({
                success: false,
                message: "Patient not found"
            });
        }

        res.json({
            success: true,
            data: patient
        });
    } catch (error) {
        console.error("Get patient error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to retrieve patient"
        });
    }
};

const createPatient = async (req, res) => {
    try {
        const {
            userId,
            firstName,
            lastName,
            dob,
            phone,
            address
        } = req.body;

        if (
            !userId ||
            !firstName ||
            !lastName ||
            !dob ||
            !phone ||
            !address
        ) {
            return res.status(400).json({
                success: false,
                message: "All patient fields are required"
            });
        }

        const user = await prisma.user.findUnique({
            where: {
                id: Number(userId)
            }
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        if (user.role !== "PATIENT") {
            return res.status(400).json({
                success: false,
                message: "User must have PATIENT role"
            });
        }

        const existingPatient = await prisma.patient.findUnique({
            where: {
                userId: Number(userId)
            }
        });

        if (existingPatient) {
            return res.status(409).json({
                success: false,
                message: "Patient profile already exists for this user"
            });
        }

        const patient = await prisma.patient.create({
            data: {
                userId: Number(userId),
                firstName,
                lastName,
                dob: new Date(dob),
                phone,
                address
            }
        });

        res.status(201).json({
            success: true,
            message: "Patient created successfully",
            data: patient
        });
    } catch (error) {
        console.error("Create patient error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to create patient"
        });
    }
};


const updatePatient = async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isSafeInteger(id) || id <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid patient ID"
            });
        }

        const {
            firstName,
            lastName,
            dob,
            phone,
            address
        } = req.body;

        const existingPatient = await prisma.patient.findUnique({
            where: { id }
        });

        if (!existingPatient) {
            return res.status(404).json({
                success: false,
                message: "Patient not found"
            });
        }

        const data = {};

        const textFields = {
            firstName,
            lastName,
            phone,
            address
        };

        for (const [field, value] of Object.entries(textFields)) {
            if (value !== undefined) {
                if (typeof value !== "string" || !value.trim()) {
                    return res.status(400).json({
                        success: false,
                        message: `${field} must be a non-empty string`
                    });
                }

                data[field] = value.trim();
            }
        }

        if (dob !== undefined) {
            if (
                typeof dob !== "string" ||
                !/^\d{4}-\d{2}-\d{2}$/.test(dob)
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Date of birth must use YYYY-MM-DD format"
                });
            }

            const parsedDate = new Date(`${dob}T00:00:00.000Z`);

            if (
                Number.isNaN(parsedDate.getTime()) ||
                parsedDate.toISOString().slice(0, 10) !== dob ||
                parsedDate > new Date()
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Please provide a valid date of birth"
                });
            }

            data.dob = parsedDate;
        }

        if (Object.keys(data).length === 0) {
            return res.status(400).json({
                success: false,
                message: "Provide at least one valid field to update"
            });
        }

        const patient = await prisma.patient.update({
            where: { id },
            data,
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        role: true
                    }
                }
            }
        });

        return res.json({
            success: true,
            message: "Patient updated successfully",
            data: patient
        });
    } catch (error) {
        console.error("Update patient error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to update patient"
        });
    }
};


const deletePatient = async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isSafeInteger(id) || id <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid patient ID"
            });
        }

        const existingPatient = await prisma.patient.findUnique({
            where: { id }
        });

        if (!existingPatient) {
            return res.status(404).json({
                success: false,
                message: "Patient not found"
            });
        }

        // Preserve patient records linked to appointments.
        const appointmentCount = await prisma.appointment.count({
            where: { patientId: id }
        });

        if (appointmentCount > 0) {
            return res.status(409).json({
                success: false,
                message:
                    "This patient has appointment records and cannot be deleted. Preserve the medical history instead."
            });
        }

        await prisma.patient.delete({
            where: { id }
        });

        return res.json({
            success: true,
            message: "Patient deleted successfully"
        });
    } catch (error) {
        console.error("Delete patient error:", error);

        // Foreign-key protection: never force-delete related records.
        if (error.code === "P2003" || error.code === "P2014") {
            return res.status(409).json({
                success: false,
                message:
                    "This patient has linked records and cannot be deleted."
            });
        }

        return res.status(500).json({
            success: false,
            message: "Failed to delete patient"
        });
    }
};


module.exports = {
    getPatients,
    getMyProfile,
    getPatientById,
    createPatient,
    updatePatient,
    deletePatient
};