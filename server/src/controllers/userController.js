const prisma = require("../prisma");


const getUsers = async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            select: {
                id: true,
                email: true,
                role: true,
                createdAt: true,
                updatedAt: true
            },
            orderBy: {
                id: "asc"
            }
        });

        res.json({
            success: true,
            data: users
        });
    } catch (error) {
        console.error("Get users error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to retrieve users"
        });
    }
};


const getUserById = async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (Number.isNaN(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid user ID"
            });
        }

        const user = await prisma.user.findUnique({
            where: {
                id
            },
            select: {
                id: true,
                email: true,
                role: true,
                createdAt: true,
                updatedAt: true
            }
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        res.json({
            success: true,
            data: user
        });
    } catch (error) {
        console.error("Get user error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to retrieve user"
        });
    }
};

const bcrypt = require("bcryptjs");

const createUser = async (req, res) => {
    try {
        const {
            email,
            password,
            role
        } = req.body;

        if (!email || !password || !role) {
            return res.status(400).json({
                success: false,
                message: "Email, password and role are required"
            });
        }

        const validRoles = [
            "PATIENT",
            "DOCTOR",
            "RECEPTIONIST"
        ];

        if (!validRoles.includes(role)) {
            return res.status(400).json({
                success: false,
                message: "Invalid user role"
            });
        }

        const existingUser = await prisma.user.findUnique({
            where: { email }
        });

        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: "Email already exists"
            });
        }

        const passwordHash = await bcrypt.hash(password, 10);

        const user = await prisma.user.create({
            data: {
                email,
                passwordHash,
                role
            },
            select: {
                id: true,
                email: true,
                role: true,
                createdAt: true,
                updatedAt: true
            }
        });

        res.status(201).json({
            success: true,
            message: "User created successfully",
            data: user
        });
    } catch (error) {
        console.error("Create user error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to create user"
        });
    }
};

module.exports = {
    getUsers,
    getUserById,
    createUser
};