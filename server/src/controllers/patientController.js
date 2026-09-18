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

        if (Number.isNaN(id)) {
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

        const patient = await prisma.patient.update({
            where: { id },
            data: {
                ...(firstName !== undefined && { firstName }),
                ...(lastName !== undefined && { lastName }),
                ...(dob !== undefined && { dob: new Date(dob) }),
                ...(phone !== undefined && { phone }),
                ...(address !== undefined && { address })
            }
        });

        res.json({
            success: true,
            message: "Patient updated successfully",
            data: patient
        });
    } catch (error) {
        console.error("Update patient error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to update patient"
        });
    }
};

const deletePatient = async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (Number.isNaN(id)) {
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

        await prisma.patient.delete({
            where: { id }
        });

        res.json({
            success: true,
            message: "Patient deleted successfully"
        });
    } catch (error) {
        console.error("Delete patient error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to delete patient"
        });
    }
};


module.exports = {
    getPatients,
    getPatientById,
    createPatient,
    updatePatient,
    deletePatient
};