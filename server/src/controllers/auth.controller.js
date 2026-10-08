const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
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

    idNumber: z
    .string()
    .trim()
    .regex(/^\d{13}$/, "ID number must be exactly 13 digits")
    .refine(
        (value) => isValidSouthAfricanId(value),
        "Please provide a valid South African ID number"
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

const {
    sendPatientWelcomeEmail,
    sendPasswordResetEmail
} = require("../services/emailService");

// --------------------------------------------------
// South African ID number helpers
// --------------------------------------------------

const isValidSouthAfricanId = (idNumber) => {
    // Must contain exactly 13 digits
    if (!/^\d{13}$/.test(idNumber)) {
        return false;
    }

    // Reject IDs consisting of the same digit
    if (/^(\d)\1{12}$/.test(idNumber)) {
        return false;
    }

    // -----------------------------------------
    // Validate date of birth: YYMMDD
    // -----------------------------------------
    const yearPart = Number(idNumber.substring(0, 2));
    const month = Number(idNumber.substring(2, 4));
    const day = Number(idNumber.substring(4, 6));

    const currentYear = new Date().getFullYear();
    const currentTwoDigitYear = currentYear % 100;

    const year =
        yearPart <= currentTwoDigitYear
            ? 2000 + yearPart
            : 1900 + yearPart;

    const date = new Date(Date.UTC(year, month - 1, day));

    if (
        date.getUTCFullYear() !== year ||
        date.getUTCMonth() !== month - 1 ||
        date.getUTCDate() !== day
    ) {
        return false;
    }

    // -----------------------------------------
    // South African ID checksum validation
    // -----------------------------------------

    // Add digits at positions 1,3,5,7,9,11
    // JavaScript indexes: 0,2,4,6,8,10
    let sumOdd = 0;

    for (let i = 0; i < 12; i += 2) {
        sumOdd += Number(idNumber[i]);
    }

    // Take positions 2,4,6,8,10,12
    // JavaScript indexes: 1,3,5,7,9,11
    const evenDigits = idNumber
        .slice(1, 12)
        .split("")
        .filter((_, index) => index % 2 === 0)
        .join("");

    // Multiply by 2
    const multiplied = String(Number(evenDigits) * 2);

    // Add all digits of multiplied value
    let sumEven = 0;

    for (const digit of multiplied) {
        sumEven += Number(digit);
    }

    // Final checksum
    const total = sumOdd + sumEven;
    const checkDigit = (10 - (total % 10)) % 10;

    return checkDigit === Number(idNumber[12]);
};



const getDateOfBirthFromSouthAfricanId = (idNumber) => {
    const yearPart = Number(idNumber.substring(0, 2));
    const month = Number(idNumber.substring(2, 4));
    const day = Number(idNumber.substring(4, 6));

    const currentYear = new Date().getFullYear();
    const currentTwoDigitYear = currentYear % 100;

    const year =
        yearPart <= currentTwoDigitYear
            ? 2000 + yearPart
            : 1900 + yearPart;

    return new Date(Date.UTC(year, month - 1, day));
};

// --------------------------------------------------
// Register patient
// --------------------------------------------------

const register = async (req, res) => {
    try {
        console.log("ID received:", req.body.idNumber);
console.log(
    "ID length:",
    req.body.idNumber?.length
);
console.log(
    "ID validator result:",
    isValidSouthAfricanId(req.body.idNumber)
);

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
            idNumber,
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

        // Check whether ID number already exists
        const existingPatient = await prisma.patient.findUnique({
            where: {
                idNumber
            }
        });

        if (existingPatient) {
            return res.status(409).json({
                success: false,
                message: "An account with this ID number already exists"
            });
        }

        const dob = getDateOfBirthFromSouthAfricanId(idNumber);

        // Hash password
        const passwordHash = await bcrypt.hash(password, 12);

        // Create User + Patient in one transaction
        const registrationResult = await prisma.$transaction(async (transaction) => {
        const newUser = await transaction.user.create({
            data: {
                email,
                passwordHash,
                role: "PATIENT"
            }
        });

        const createdPatient = await transaction.patient.create({
            data: {
                userId: newUser.id,
                firstName,
                lastName,
                idNumber,
                dob,
                phone,
                address
            }
        });

        const currentYear = new Date().getFullYear();

        const patientNumber =
            `VH-${currentYear}-${String(createdPatient.id).padStart(6, "0")}`;

        const updatedPatient = await transaction.patient.update({
            where: {
                id: createdPatient.id
            },
            data: {
                patientNumber
            }
        });

        return {
            user: newUser,
            patient: updatedPatient
        };
    });


    try {
        await sendPatientWelcomeEmail({
            recipientEmail: email,
            firstName,
            patientNumber: registrationResult.patient.patientNumber
        });
    } catch (emailError) {
        console.error(
            "Patient registration email failed:",
            emailError
        );
    }

            return res.status(201).json({
        success: true,
        message: "Patient account created successfully",
        patientNumber: registrationResult.patient.patientNumber,
        user: {
            id: registrationResult.user.id,
            email: registrationResult.user.email,
            role: registrationResult.user.role
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
                    patientNumber: user.patient.patientNumber,
                    firstName: user.patient.firstName,
                    lastName: user.patient.lastName,
                    idNumber: user.patient.idNumber,
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


// --------------------------------------------------
// Forgot password
// --------------------------------------------------

const forgotPassword = async (req, res) => {
    try {
        const email = req.body.email?.trim().toLowerCase();

        if (!email) {
            return res.status(400).json({
                success: false,
                message: "Email address is required"
            });
        }

        const user = await prisma.user.findUnique({
            where: { email },
            include: {
                patient: true
            }
        });

        // Email does not belong to a registered patient
        if (!user || !user.patient) {
            return res.status(404).json({
                success: false,
                registered: false,
                message:
                    "We couldn't find a registered patient account with this email address."
            });
        }

        const resetToken = crypto.randomBytes(32).toString("hex");

        const hashedResetToken = crypto
            .createHash("sha256")
            .update(resetToken)
            .digest("hex");

        const resetTokenExpiry = new Date(
            Date.now() + 30 * 60 * 1000
        );

        await prisma.user.update({
            where: { id: user.id },
            data: {
                resetPasswordToken: hashedResetToken,
                resetPasswordExpiresAt: resetTokenExpiry
            }
        });

        const frontendUrl =
            process.env.FRONTEND_URL || "http://localhost:5173";

        const resetUrl =
            `${frontendUrl}/reset-password?token=${resetToken}`;

        const firstName =
            user.patient.firstName || "there";

        try {
            await sendPasswordResetEmail({
                recipientEmail: user.email,
                firstName,
                resetUrl
            });
        } catch (emailError) {
            console.error(
                "Password reset email failed:",
                emailError
            );

            await prisma.user.update({
                where: { id: user.id },
                data: {
                    resetPasswordToken: null,
                    resetPasswordExpiresAt: null
                }
            });

            return res.status(500).json({
                success: false,
                message:
                    "We could not send the password reset email. Please try again."
            });
        }

        return res.status(200).json({
            success: true,
            registered: true,
            message:
                "A password reset link has been sent to your email address."
        });
    } catch (error) {
        console.error("Forgot password error:", error);

        return res.status(500).json({
            success: false,
            message:
                "Unable to process your password reset request."
        });
    }
};


// --------------------------------------------------
// Reset password
// --------------------------------------------------

const resetPassword = async (req, res) => {
    try {
        const { token, password, confirmPassword } = req.body;

        if (!token) {
            return res.status(400).json({
                success: false,
                message: "Password reset token is required"
            });
        }

        if (!password || !confirmPassword) {
            return res.status(400).json({
                success: false,
                message: "Password and confirmation are required"
            });
        }

        if (password !== confirmPassword) {
            return res.status(400).json({
                success: false,
                message: "Passwords do not match"
            });
        }

        // Validate password requirements
        const passwordValidation = z
            .string()
            .min(8, "Password must be at least 8 characters")
            .regex(
                /[A-Z]/,
                "Password must contain at least one uppercase letter"
            )
            .regex(
                /[a-z]/,
                "Password must contain at least one lowercase letter"
            )
            .regex(
                /[0-9]/,
                "Password must contain at least one number"
            )
            .safeParse(password);

        if (!passwordValidation.success) {
            return res.status(400).json({
                success: false,
                message: passwordValidation.error.issues[0].message
            });
        }

        // Hash the token received from the reset URL
        const hashedResetToken = crypto
            .createHash("sha256")
            .update(token)
            .digest("hex");

        const user = await prisma.user.findFirst({
            where: {
                resetPasswordToken: hashedResetToken,
                resetPasswordExpiresAt: {
                    gt: new Date()
                }
            }
        });

        if (!user) {
            return res.status(400).json({
                success: false,
                message:
                    "This password reset link is invalid or has expired."
            });
        }

        // Hash the new password
        const passwordHash = await bcrypt.hash(password, 12);

        // Update password and invalidate the reset token
        await prisma.user.update({
            where: {
                id: user.id
            },
            data: {
                passwordHash,
                resetPasswordToken: null,
                resetPasswordExpiresAt: null
            }
        });

        return res.status(200).json({
            success: true,
            message:
                "Your password has been reset successfully. You can now log in."
        });

    } catch (error) {
        console.error("Reset password error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to reset password"
        });
    }
};

module.exports = {
    register,
    login,
    forgotPassword,
    resetPassword
};