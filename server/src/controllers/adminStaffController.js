const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const { z } = require("zod");

const prisma = require("../prisma");
const { sendStaffWelcomeEmail } = require("../services/emailService");

// --------------------------------------------------
// Helpers
// --------------------------------------------------

const generateTemporaryPassword = () => {
    return crypto.randomBytes(9).toString("base64url");
};

// --------------------------------------------------
// Doctor validation
// --------------------------------------------------

const doctorSchema = z.object({
    firstName: z.string().trim().min(2, "First name must be at least 2 characters"),
    lastName: z.string().trim().min(2, "Last name must be at least 2 characters"),

    email: z
        .string()
        .trim()
        .email("Please provide a valid email address")
        .transform((email) => email.toLowerCase()),

    phone: z
        .string()
        .trim()
        .min(10, "Phone number must be at least 10 characters"),

    speciality: z
        .string()
        .trim()
        .min(2, "Speciality is required"),

    licenseNo: z
        .string()
        .trim()
        .min(2, "License number is required"),

    departmentId: z.coerce
        .number()
        .int()
        .positive("Please select a department")
});

// --------------------------------------------------
// Receptionist validation
// --------------------------------------------------

const receptionistSchema = z.object({
    firstName: z.string().trim().min(2, "First name must be at least 2 characters"),

    lastName: z.string().trim().min(2, "Last name must be at least 2 characters"),

    email: z
        .string()
        .trim()
        .email("Please provide a valid email address")
        .transform((email) => email.toLowerCase()),

    phone: z
        .string()
        .trim()
        .min(10, "Phone number must be at least 10 characters")
});

// --------------------------------------------------
// Create Doctor
// --------------------------------------------------

const createDoctor = async (req, res) => {
    try {
        const validation = doctorSchema.safeParse(req.body);

        if (!validation.success) {
            return res.status(400).json({
                success: false,
                message: "Validation failed",
                errors: validation.error.issues.map((issue) => ({
                    field: issue.path.join("."),
                    message: issue.message
                }))
            });
        }

        const {
            firstName,
            lastName,
            email,
            phone,
            speciality,
            licenseNo,
            departmentId
        } = validation.data;

        const existingUser = await prisma.user.findUnique({
            where: { email }
        });

        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: "An account with this email address already exists"
            });
        }

        const existingDoctor = await prisma.doctor.findUnique({
            where: { licenseNo }
        });

        if (existingDoctor) {
            return res.status(409).json({
                success: false,
                message: "A doctor with this license number already exists"
            });
        }

        const department = await prisma.department.findUnique({
            where: {
                id: departmentId
            }
        });

        if (!department) {
            return res.status(404).json({
                success: false,
                message: "Selected department was not found"
            });
        }

        const temporaryPassword = generateTemporaryPassword();

        const passwordHash = await bcrypt.hash(
            temporaryPassword,
            12
        );

        const doctor = await prisma.$transaction(async (transaction) => {
            const user = await transaction.user.create({
                data: {
                    email,
                    passwordHash,
                    role: "DOCTOR"
                }
            });

            const newDoctor = await transaction.doctor.create({
                data: {
                    userId: user.id,
                    firstName,
                    lastName,
                    speciality,
                    licenseNo,
                    phone
                }
            });

            await transaction.doctorDepartment.create({
                data: {
                    doctorId: newDoctor.id,
                    departmentId
                }
            });

            return newDoctor;
        });

        try {
            await sendStaffWelcomeEmail({
                recipientEmail: email,
                firstName,
                role: "DOCTOR",
                temporaryPassword
            });
                } catch (emailError) {
            console.error(
                "Doctor account email failed:",
                emailError
            );

            if (process.env.NODE_ENV === "development") {
                return res.status(201).json({
                    success: true,
                    emailSent: false,
                    development: true,
                    message:
                        "Doctor account created. Email delivery is unavailable in development mode.",
                    data: {
                        id: doctor.id,
                        email,
                        role: "DOCTOR",
                        temporaryPassword
                    }
                });
            }

            return res.status(201).json({
                success: true,
                emailSent: false,
                message:
                    "Doctor account created, but the login email could not be sent.",
                data: {
                    id: doctor.id,
                    email,
                    role: "DOCTOR"
                }
            });
        }

        return res.status(201).json({
            success: true,
            emailSent: true,
            message:
                "Doctor account created and login details sent successfully.",
            data: {
                id: doctor.id,
                email,
                role: "DOCTOR"
            }
        });

    } catch (error) {
        console.error("Create doctor error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to create doctor account"
        });
    }
};

// --------------------------------------------------
// Create Receptionist
// --------------------------------------------------

const createReceptionist = async (req, res) => {
    try {
        const validation = receptionistSchema.safeParse(req.body);

        if (!validation.success) {
            return res.status(400).json({
                success: false,
                message: "Validation failed",
                errors: validation.error.issues.map((issue) => ({
                    field: issue.path.join("."),
                    message: issue.message
                }))
            });
        }

        const {
            firstName,
            lastName,
            email,
            phone
        } = validation.data;

        const existingUser = await prisma.user.findUnique({
            where: { email }
        });

        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: "An account with this email address already exists"
            });
        }

        const temporaryPassword = generateTemporaryPassword();

        const passwordHash = await bcrypt.hash(
            temporaryPassword,
            12
        );

        const receptionist = await prisma.$transaction(async (transaction) => {
            const user = await transaction.user.create({
                data: {
                    email,
                    passwordHash,
                    role: "RECEPTIONIST"
                }
            });

            const newReceptionist =
                await transaction.receptionist.create({
                    data: {
                        userId: user.id,
                        firstName,
                        lastName,
                        phone
                    }
                });

            return newReceptionist;
        });

        try {
            await sendStaffWelcomeEmail({
                recipientEmail: email,
                firstName,
                role: "RECEPTIONIST",
                temporaryPassword
            });
        } catch (emailError) {
            console.error(
                "Receptionist account email failed:",
                emailError
            );

            if (process.env.NODE_ENV === "development") {
                return res.status(201).json({
                    success: true,
                    emailSent: false,
                    development: true,
                    message:
                        "Receptionist account created. Email delivery is unavailable in development mode.",
                    data: {
                        id: receptionist.id,
                        email,
                        role: "RECEPTIONIST",
                        temporaryPassword
                    }
                });
            }

            return res.status(201).json({
                success: true,
                emailSent: false,
                message:
                    "Receptionist account created, but the login email could not be sent.",
                data: {
                    id: receptionist.id,
                    email,
                    role: "RECEPTIONIST"
                }
            });
        }

        return res.status(201).json({
            success: true,
            emailSent: true,
            message:
                "Receptionist account created and login details sent successfully.",
            data: {
                id: receptionist.id,
                email,
                role: "RECEPTIONIST"
            }
        });

    } catch (error) {
        console.error(
            "Create receptionist error:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Unable to create receptionist account"
        });
    }
};

module.exports = {
    createDoctor,
    createReceptionist
};