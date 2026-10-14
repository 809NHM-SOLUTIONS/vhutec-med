
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
            orderBy: { id: "asc" }
        });

        return res.json({
            success: true,
            data: receptionists
        });
    } catch (error) {
        console.error("Get receptionists error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to retrieve receptionists"
        });
    }
};

// GET /api/receptionists/:id
const getReceptionistById = async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isSafeInteger(id) || id <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid receptionist ID"
            });
        }

        const receptionist = await prisma.receptionist.findUnique({
            where: { id },
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

        return res.json({
            success: true,
            data: receptionist
        });
    } catch (error) {
        console.error("Get receptionist error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to retrieve receptionist"
        });
    }
};

// PUT /api/receptionists/:id
const updateReceptionist = async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isSafeInteger(id) || id <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid receptionist ID"
            });
        }

        const existing = await prisma.receptionist.findUnique({
            where: { id }
        });

        if (!existing) {
            return res.status(404).json({
                success: false,
                message: "Receptionist not found"
            });
        }

        const data = {};

        for (const field of ["firstName", "lastName", "phone"]) {
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
                message: "Provide at least one valid field to update"
            });
        }

        const receptionist = await prisma.receptionist.update({
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
            message: "Receptionist updated successfully",
            data: receptionist
        });
    } catch (error) {
        console.error("Update receptionist error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to update receptionist"
        });
    }
};

// DELETE /api/receptionists/:id
const deleteReceptionist = async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isSafeInteger(id) || id <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid receptionist ID"
            });
        }

        const existing = await prisma.receptionist.findUnique({
            where: { id },
            select: {
                id: true,
                userId: true
            }
        });

        if (!existing) {
            return res.status(404).json({
                success: false,
                message: "Receptionist not found"
            });
        }

        await prisma.$transaction(async (tx) => {
            await tx.receptionist.delete({
                where: { id }
            });

            await tx.user.delete({
                where: { id: existing.userId }
            });
        });

        return res.json({
            success: true,
            message: "Receptionist and associated account deleted successfully"
        });
    } catch (error) {
        console.error("Delete receptionist error:", error);

        if (error.code === "P2003" || error.code === "P2014") {
            return res.status(409).json({
                success: false,
                message:
                    "This receptionist has linked records and cannot be deleted."
            });
        }

        return res.status(500).json({
            success: false,
            message: "Failed to delete receptionist"
        });
    }
};

module.exports = {
    getReceptionists,
    getReceptionistById,
    updateReceptionist,
    deleteReceptionist
};