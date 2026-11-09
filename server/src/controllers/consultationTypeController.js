const prisma = require("../prisma");

// GET /api/consultation-types
// Returns active consultation types, optionally filtered by department.
const getConsultationTypes = async (req, res) => {
    try {
        const where = {
            isActive: true
        };

        if (req.query.departmentId !== undefined) {
            const departmentId = Number(req.query.departmentId);

            if (!Number.isInteger(departmentId) || departmentId <= 0) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid department ID"
                });
            }

            where.departmentId = departmentId;
        }

        const consultationTypes = await prisma.consultationType.findMany({
            where,
            include: {
                department: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            },
            orderBy: [
                { departmentId: "asc" },
                { name: "asc" }
            ]
        });

        return res.json({
            success: true,
            count: consultationTypes.length,
            data: consultationTypes
        });
    } catch (error) {
        console.error("Get consultation types error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to retrieve consultation types"
        });
    }
};


// GET /api/consultation-types/:id
const getConsultationTypeById = async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid consultation type ID"
            });
        }

        const consultationType = await prisma.consultationType.findFirst({
            where: {
                id,
                isActive: true
            },
            include: {
                department: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            }
        });

        if (!consultationType) {
            return res.status(404).json({
                success: false,
                message: "Active consultation type not found"
            });
        }

        return res.json({
            success: true,
            data: consultationType
        });
    } catch (error) {
        console.error("Get consultation type error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to retrieve consultation type"
        });
    }
};


// POST /api/consultation-types
const createConsultationType = async (req, res) => {
    try {
        const { departmentId, name, description, durationMinutes } = req.body;

        const parsedDepartmentId = Number(departmentId);

        if (
            !Number.isInteger(parsedDepartmentId) ||
            parsedDepartmentId <= 0
        ) {
            return res.status(400).json({
                success: false,
                message: "A valid department ID is required"
            });
        }

        if (typeof name !== "string" || !name.trim()) {
            return res.status(400).json({
                success: false,
                message: "Consultation type name is required"
            });
        }

        if (typeof description !== "string" || !description.trim()) {
            return res.status(400).json({
                success: false,
                message: "Consultation type description is required"
            });
        }

        if (
            !Number.isInteger(durationMinutes) ||
            durationMinutes <= 0
        ) {
            return res.status(400).json({
                success: false,
                message: "Duration must be a positive whole number of minutes"
            });
        }

        const department = await prisma.department.findUnique({
            where: {
                id: parsedDepartmentId
            }
        });

        if (!department) {
            return res.status(404).json({
                success: false,
                message: "Department not found"
            });
        }

        const cleanName = name.trim();

        const existingType = await prisma.consultationType.findUnique({
            where: {
                departmentId_name: {
                    departmentId: parsedDepartmentId,
                    name: cleanName
                }
            }
        });

        if (existingType) {
            return res.status(409).json({
                success: false,
                message: "This consultation type already exists in the department"
            });
        }

        const consultationType = await prisma.consultationType.create({
            data: {
                departmentId: parsedDepartmentId,
                name: cleanName,
                description: description.trim(),
                durationMinutes
            },
            include: {
                department: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            }
        });

        return res.status(201).json({
            success: true,
            message: "Consultation type created successfully",
            data: consultationType
        });
    } catch (error) {
        if (error.code === "P2002") {
            return res.status(409).json({
                success: false,
                message: "This consultation type already exists in the department"
            });
        }

        console.error("Create consultation type error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to create consultation type"
        });
    }
};


// PUT /api/consultation-types/:id
const updateConsultationType = async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid consultation type ID"
            });
        }

        const existingType = await prisma.consultationType.findUnique({
            where: { id }
        });

        if (!existingType) {
            return res.status(404).json({
                success: false,
                message: "Consultation type not found"
            });
        }

        const {
            departmentId,
            name,
            description,
            durationMinutes,
            isActive
        } = req.body;

        const updateData = {};

        if (departmentId !== undefined) {
            const parsedDepartmentId = Number(departmentId);

            if (
                !Number.isInteger(parsedDepartmentId) ||
                parsedDepartmentId <= 0
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid department ID"
                });
            }

            const department = await prisma.department.findUnique({
                where: {
                    id: parsedDepartmentId
                }
            });

            if (!department) {
                return res.status(404).json({
                    success: false,
                    message: "Department not found"
                });
            }

            updateData.departmentId = parsedDepartmentId;
        }

        if (name !== undefined) {
            if (typeof name !== "string" || !name.trim()) {
                return res.status(400).json({
                    success: false,
                    message: "Consultation type name cannot be empty"
                });
            }

            updateData.name = name.trim();
        }

        if (description !== undefined) {
            if (typeof description !== "string" || !description.trim()) {
                return res.status(400).json({
                    success: false,
                    message: "Consultation type description cannot be empty"
                });
            }

            updateData.description = description.trim();
        }

        if (durationMinutes !== undefined) {
            if (
                !Number.isInteger(durationMinutes) ||
                durationMinutes <= 0
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Duration must be a positive whole number of minutes"
                });
            }

            updateData.durationMinutes = durationMinutes;
        }

        if (isActive !== undefined) {
            if (typeof isActive !== "boolean") {
                return res.status(400).json({
                    success: false,
                    message: "isActive must be true or false"
                });
            }

            updateData.isActive = isActive;
        }

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({
                success: false,
                message: "Provide at least one field to update"
            });
        }

        const finalDepartmentId =
            updateData.departmentId ?? existingType.departmentId;

        const finalName =
            updateData.name ?? existingType.name;

        const duplicateType = await prisma.consultationType.findFirst({
            where: {
                departmentId: finalDepartmentId,
                name: finalName,
                NOT: {
                    id
                }
            }
        });

        if (duplicateType) {
            return res.status(409).json({
                success: false,
                message: "Another consultation type with this name already exists in the department"
            });
        }

        const consultationType = await prisma.consultationType.update({
            where: { id },
            data: updateData,
            include: {
                department: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            }
        });

        return res.json({
            success: true,
            message: "Consultation type updated successfully",
            data: consultationType
        });
    } catch (error) {
        if (error.code === "P2002") {
            return res.status(409).json({
                success: false,
                message: "This consultation type already exists in the department"
            });
        }

        console.error("Update consultation type error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to update consultation type"
        });
    }
};


// DELETE /api/consultation-types/:id
// Soft delete: preserves historical appointment relationships.
const deactivateConsultationType = async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid consultation type ID"
            });
        }

        const existingType = await prisma.consultationType.findUnique({
            where: { id }
        });

        if (!existingType) {
            return res.status(404).json({
                success: false,
                message: "Consultation type not found"
            });
        }

        if (!existingType.isActive) {
            return res.status(400).json({
                success: false,
                message: "Consultation type is already inactive"
            });
        }

        await prisma.consultationType.update({
            where: { id },
            data: {
                isActive: false
            }
        });

        return res.json({
            success: true,
            message: "Consultation type deactivated successfully"
        });
    } catch (error) {
        console.error("Deactivate consultation type error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to deactivate consultation type"
        });
    }
};


module.exports = {
    getConsultationTypes,
    getConsultationTypeById,
    createConsultationType,
    updateConsultationType,
    deactivateConsultationType
};