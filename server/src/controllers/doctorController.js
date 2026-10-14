
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
            orderBy: { id: "asc" }
        });

        return res.json({
            success: true,
            data: doctors
        });
    } catch (error) {
        console.error("Get doctors error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to retrieve doctors"
        });
    }
};

// GET /api/doctors/:id
const getDoctorById = async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isSafeInteger(id) || id <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid doctor ID"
            });
        }

        const doctor = await prisma.doctor.findUnique({
            where: { id },
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

        return res.json({
            success: true,
            data: doctor
        });
    } catch (error) {
        console.error("Get doctor error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to retrieve doctor"
        });
    }
};

// POST /api/doctors
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
            userId === undefined ||
            !Number.isSafeInteger(Number(userId)) ||
            Number(userId) <= 0 ||
            ![firstName, lastName, speciality, licenseNo, phone]
                .every(value =>
                    typeof value === "string" && value.trim().length > 0
                )
        ) {
            return res.status(400).json({
                success: false,
                message: "Valid user ID and all doctor fields are required"
            });
        }

        const numericUserId = Number(userId);
        const cleanLicense = licenseNo.trim();

        const user = await prisma.user.findUnique({
            where: { id: numericUserId }
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
            where: { userId: numericUserId }
        });

        if (existingDoctor) {
            return res.status(409).json({
                success: false,
                message: "Doctor profile already exists for this user"
            });
        }

        const existingLicense = await prisma.doctor.findUnique({
            where: { licenseNo: cleanLicense }
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
                firstName: firstName.trim(),
                lastName: lastName.trim(),
                speciality: speciality.trim(),
                licenseNo: cleanLicense,
                phone: phone.trim()
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

        return res.status(201).json({
            success: true,
            message: "Doctor created successfully",
            data: doctor
        });
    } catch (error) {
        console.error("Create doctor error:", error);

        if (error.code === "P2002") {
            return res.status(409).json({
                success: false,
                message: "A doctor with these unique details already exists"
            });
        }

        return res.status(500).json({
            success: false,
            message: "Failed to create doctor"
        });
    }
};

// PUT /api/doctors/:id
const updateDoctor = async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isSafeInteger(id) || id <= 0) {
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

        const fields = [
            "firstName",
            "lastName",
            "speciality",
            "licenseNo",
            "phone"
        ];

        const data = {};

        for (const field of fields) {
            if (req.body[field] !== undefined) {
                const value = req.body[field];

                if (typeof value !== "string" || !value.trim()) {
                    return res.status(400).json({
                        success: false,
                        message: `${field} must be a non-empty string`
                    });
                }

                data[field] = value.trim();
            }
        }

        if (Object.keys(data).length === 0) {
            return res.status(400).json({
                success: false,
                message: "Provide at least one field to update"
            });
        }

        if (
            data.licenseNo &&
            data.licenseNo !== existingDoctor.licenseNo
        ) {
            const existingLicense = await prisma.doctor.findUnique({
                where: { licenseNo: data.licenseNo }
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
            data,
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

        return res.json({
            success: true,
            message: "Doctor updated successfully",
            data: doctor
        });
    } catch (error) {
        console.error("Update doctor error:", error);

        if (error.code === "P2002") {
            return res.status(409).json({
                success: false,
                message: "A unique doctor field already exists"
            });
        }

        return res.status(500).json({
            success: false,
            message: "Failed to update doctor"
        });
    }
};

// DELETE /api/doctors/:id
const deleteDoctor = async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isSafeInteger(id) || id <= 0) {
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

        const [appointmentCount, consultationCount] =
            await Promise.all([
                prisma.appointment.count({
                    where: { doctorId: id }
                }),
                prisma.consultation.count({
                    where: { doctorId: id }
                })
            ]);

        if (appointmentCount > 0 || consultationCount > 0) {
            return res.status(409).json({
                success: false,
                message:
                    "This doctor has appointment or consultation records and cannot be deleted."
            });
        }

        await prisma.$transaction(async (tx) => {
            await tx.doctorDepartment.deleteMany({
                where: { doctorId: id }
            });

            await tx.doctor.delete({
                where: { id }
            });
        });

        return res.json({
            success: true,
            message: "Doctor deleted successfully"
        });
    } catch (error) {
        console.error("Delete doctor error:", error);

        if (error.code === "P2003" || error.code === "P2014") {
            return res.status(409).json({
                success: false,
                message: "This doctor has linked records and cannot be deleted."
            });
        }

        return res.status(500).json({
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