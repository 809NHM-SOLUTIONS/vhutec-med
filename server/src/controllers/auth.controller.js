const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { z } = require("zod");

const prisma = require("../prisma");

// --------------------------------------------------
// Validation schemas
// --------------------------------------------------

const registerSchema = z.object({
    firstName: z
        .string()
        .trim()
        .min(2, "First name must be at least 2 characters"),

    lastName: z
        .string()
        .trim()
        .min(2, "Last name must be at least 2 characters"),

    email: z
        .string()
        .trim()
        .email("Please provide a valid email address")
        .transform((email) => email.toLowerCase()),

    phone: z
        .string()
        .trim()
        .min(10, "Phone number must be at least 10 characters"),

    dob: z
        .string()
        .refine(
            (value) => !Number.isNaN(Date.parse(value)),
            "Please provide a valid date of birth"
        ),

    address: z
        .string()
        .trim()
        .min(5, "Address must be at least 5 characters"),

    password: z
        .string()
        .min(8, "Password must be at least 8 characters")
        .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
        .regex(/[a-z]/, "Password must contain at least one lowercase letter")
        .regex(/[0-9]/, "Password must contain at least one number"),

    confirmPassword: z.string()
}).refine(
    (data) => data.password === data.confirmPassword,
    {
        message: "Passwords do not match",
        path: ["confirmPassword"]
    }
);

const loginSchema = z.object({
    email: z
        .string()
        .trim()
        .email("Please provide a valid email address")
        .transform((email) => email.toLowerCase()),

    password: z
        .string()
        .min(1, "Password is required")
});

// --------------------------------------------------
// Register patient
// --------------------------------------------------

const register = async (req, res) => {
    try {
        const validation = registerSchema.safeParse(req.body);

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
            dob,
            address,
            password
        } = validation.data;

        // Check whether email already exists
        const existingUser = await prisma.user.findUnique({
            where: {
                email
            }
        });

        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: "An account with this email address already exists"
            });
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, 12);

        // Create User + Patient in one transaction
        const user = await prisma.$transaction(async (transaction) => {
            const newUser = await transaction.user.create({
                data: {
                    email,
                    passwordHash,
                    role: "PATIENT"
                }
            });

            await transaction.patient.create({
                data: {
                    userId: newUser.id,
                    firstName,
                    lastName,
                    dob: new Date(dob),
                    phone,
                    address
                }
            });

            return newUser;
        });

        return res.status(201).json({
            success: true,
            message: "Patient account created successfully",
            user: {
                id: user.id,
                email: user.email,
                role: user.role
            }
        });

    } catch (error) {
        console.error("Registration error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to create account"
        });
    }
};

// --------------------------------------------------
// Login
// --------------------------------------------------

const login = async (req, res) => {
    try {
        const validation = loginSchema.safeParse(req.body);

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

        const { email, password } = validation.data;

        // Find user
        const user = await prisma.user.findUnique({
            where: {
                email
            },
            include: {
                patient: true,
                doctor: true,
                receptionist: true
            }
        });

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });
        }

        // Compare password
        const passwordMatches = await bcrypt.compare(
            password,
            user.passwordHash
        );

        if (!passwordMatches) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });
        }

        // Make sure JWT secret exists
        if (!process.env.JWT_SECRET) {
            console.error("JWT_SECRET is not configured");

            return res.status(500).json({
                success: false,
                message: "Authentication service is not configured"
            });
        }

        // Create JWT
        const token = jwt.sign(
            {
                userId: user.id,
                role: user.role
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "1d"
            }
        );

        // Never return passwordHash
        return res.status(200).json({
            success: true,
            message: "Login successful",
            token,
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
                patient: user.patient
                    ? {
                        id: user.patient.id,
                        firstName: user.patient.firstName,
                        lastName: user.patient.lastName,
                        phone: user.patient.phone,
                        address: user.patient.address,
                        dob: user.patient.dob
                    }
                    : null,
                doctor: user.doctor
                    ? {
                        id: user.doctor.id,
                        firstName: user.doctor.firstName,
                        lastName: user.doctor.lastName,
                        speciality: user.doctor.speciality
                    }
                    : null,
                receptionist: user.receptionist
                    ? {
                        id: user.receptionist.id,
                        firstName: user.receptionist.firstName,
                        lastName: user.receptionist.lastName,
                        phone: user.receptionist.phone
                    }
                    : null
            }
        });

    } catch (error) {
        console.error("Login error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to login"
        });
    }
};

module.exports = {
    register,
    login
};