const prisma = require("../prisma");

// GET /api/doctors
const getDoctors = async (req, res) => {
    try {
        const doctors = await prisma.doctor.findMany({
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        role: true
                    }
                },
                departments: {
                    include: {
                        department: true
                    }
                }
            },
            orderBy: {
                id: "asc"
            }
        });

        res.json({
            success: true,
            data: doctors
        });
    } catch (error) {
        console.error("Get doctors error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to retrieve doctors"
        });
    }
};

// GET /api/doctors/:id
const getDoctorById = async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (Number.isNaN(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid doctor ID"
            });
        }

        const doctor = await prisma.doctor.findUnique({
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
                },
                departments: {
                    include: {
                        department: true
                    }
                }
            }
        });

        if (!doctor) {
            return res.status(404).json({
                success: false,
                message: "Doctor not found"
            });
        }

        res.json({
            success: true,
            data: doctor
        });
    } catch (error) {
        console.error("Get doctor error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to retrieve doctor"
        });
    }
};

const createDoctor = async (req, res) => {
    try {
        const {
            userId,
            firstName,
            lastName,
            speciality,
            licenseNo,
            phone
        } = req.body;

        if (
            !userId ||
            !firstName ||
            !lastName ||
            !speciality ||
            !licenseNo ||
            !phone
        ) {
            return res.status(400).json({
                success: false,
                message: "All doctor fields are required"
            });
        }

        const numericUserId = Number(userId);

        const user = await prisma.user.findUnique({
            where: {
                id: numericUserId
            }
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        if (user.role !== "DOCTOR") {
            return res.status(400).json({
                success: false,
                message: "User must have DOCTOR role"
            });
        }

        const existingDoctor = await prisma.doctor.findUnique({
            where: {
                userId: numericUserId
            }
        });

        if (existingDoctor) {
            return res.status(409).json({
                success: false,
                message: "Doctor profile already exists for this user"
            });
        }

        const existingLicense = await prisma.doctor.findUnique({
            where: {
                licenseNo
            }
        });

        if (existingLicense) {
            return res.status(409).json({
                success: false,
                message: "License number already exists"
            });
        }

        const doctor = await prisma.doctor.create({
            data: {
                userId: numericUserId,
                firstName,
                lastName,
                speciality,
                licenseNo,
                phone
            }
        });

        res.status(201).json({
            success: true,
            message: "Doctor created successfully",
            data: doctor
        });
    } catch (error) {
        console.error("Create doctor error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to create doctor"
        });
    }
};


const updateDoctor = async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (Number.isNaN(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid doctor ID"
            });
        }

        const {
            firstName,
            lastName,
            speciality,
            licenseNo,
            phone
        } = req.body;

        const existingDoctor = await prisma.doctor.findUnique({
            where: { id }
        });

        if (!existingDoctor) {
            return res.status(404).json({
                success: false,
                message: "Doctor not found"
            });
        }

        if (licenseNo !== undefined && licenseNo !== existingDoctor.licenseNo) {
            const existingLicense = await prisma.doctor.findUnique({
                where: { licenseNo }
            });

            if (existingLicense) {
                return res.status(409).json({
                    success: false,
                    message: "License number already exists"
                });
            }
        }

        const doctor = await prisma.doctor.update({
            where: { id },
            data: {
                ...(firstName !== undefined && { firstName }),
                ...(lastName !== undefined && { lastName }),
                ...(speciality !== undefined && { speciality }),
                ...(licenseNo !== undefined && { licenseNo }),
                ...(phone !== undefined && { phone })
            }
        });

        res.json({
            success: true,
            message: "Doctor updated successfully",
            data: doctor
        });
    } catch (error) {
        console.error("Update doctor error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to update doctor"
        });
    }
};

const deleteDoctor = async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (Number.isNaN(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid doctor ID"
            });
        }

        const existingDoctor = await prisma.doctor.findUnique({
            where: { id }
        });

        if (!existingDoctor) {
            return res.status(404).json({
                success: false,
                message: "Doctor not found"
            });
        }

        await prisma.doctor.delete({
            where: { id }
        });

        res.json({
            success: true,
            message: "Doctor deleted successfully"
        });
    } catch (error) {
        console.error("Delete doctor error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to delete doctor"
        });
    }
};


module.exports = {
    getDoctors,
    getDoctorById,
    createDoctor,
    updateDoctor,
    deleteDoctor
};