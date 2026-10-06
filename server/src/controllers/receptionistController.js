const prisma = require("../prisma");

// GET /api/receptionists
const getReceptionists = async (req, res) => {
    try {
        const receptionists = await prisma.receptionist.findMany({
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
            data: receptionists
        });
    } catch (error) {
        console.error("Get receptionists error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to retrieve receptionists"
        });
    }
};

// GET /api/receptionists/:id
const getReceptionistById = async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (Number.isNaN(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid receptionist ID"
            });
        }

        const receptionist = await prisma.receptionist.findUnique({
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

        if (!receptionist) {
            return res.status(404).json({
                success: false,
                message: "Receptionist not found"
            });
        }

        res.json({
            success: true,
            data: receptionist
        });
    } catch (error) {
        console.error("Get receptionist error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to retrieve receptionist"
        });
    }
};

module.exports = {
    getReceptionists,
    getReceptionistById
};