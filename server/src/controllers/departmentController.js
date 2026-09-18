const prisma = require("../prisma");

// GET /api/departments
const getDepartments = async (req, res) => {
    try {
        const departments = await prisma.department.findMany({
            include: {
                doctors: {
                    include: {
                        doctor: true
                    }
                }
            },
            orderBy: {
                id: "asc"
            }
        });

        res.json({
            success: true,
            data: departments
        });
    } catch (error) {
        console.error("Get departments error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to retrieve departments"
        });
    }
};

// GET /api/departments/:id
const getDepartmentById = async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (Number.isNaN(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid department ID"
            });
        }

        const department = await prisma.department.findUnique({
            where: {
                id
            },
            include: {
                doctors: {
                    include: {
                        doctor: true
                    }
                }
            }
        });

        if (!department) {
            return res.status(404).json({
                success: false,
                message: "Department not found"
            });
        }

        res.json({
            success: true,
            data: department
        });
    } catch (error) {
        console.error("Get department error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to retrieve department"
        });
    }
};

// POST /api/departments
const createDepartment = async (req, res) => {
    try {
        const { name, description } = req.body;

        if (!name || !description) {
            return res.status(400).json({
                success: false,
                message: "Name and description are required"
            });
        }

        const existingDepartment = await prisma.department.findUnique({
            where: {
                name
            }
        });

        if (existingDepartment) {
            return res.status(409).json({
                success: false,
                message: "Department already exists"
            });
        }

        const department = await prisma.department.create({
            data: {
                name,
                description
            }
        });

        res.status(201).json({
            success: true,
            data: department
        });
    } catch (error) {
        console.error("Create department error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to create department"
        });
    }
};


// PUT /api/departments/:id
const updateDepartment = async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (Number.isNaN(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid department ID"
            });
        }

        const { name, description } = req.body;

        if (!name || !description) {
            return res.status(400).json({
                success: false,
                message: "Name and description are required"
            });
        }

        const existingDepartment = await prisma.department.findUnique({
            where: {
                id
            }
        });

        if (!existingDepartment) {
            return res.status(404).json({
                success: false,
                message: "Department not found"
            });
        }

        const duplicateDepartment = await prisma.department.findFirst({
            where: {
                name,
                NOT: {
                    id
                }
            }
        });

        if (duplicateDepartment) {
            return res.status(409).json({
                success: false,
                message: "Another department with this name already exists"
            });
        }

        const department = await prisma.department.update({
            where: {
                id
            },
            data: {
                name,
                description
            }
        });

        res.json({
            success: true,
            data: department
        });
    } catch (error) {
        console.error("Update department error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to update department"
        });
    }
};

// DELETE /api/departments/:id
const deleteDepartment = async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (Number.isNaN(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid department ID"
            });
        }

        const existingDepartment = await prisma.department.findUnique({
            where: {
                id
            }
        });

        if (!existingDepartment) {
            return res.status(404).json({
                success: false,
                message: "Department not found"
            });
        }

        await prisma.department.delete({
            where: {
                id
            }
        });

        res.json({
            success: true,
            message: "Department deleted successfully"
        });
    } catch (error) {
        console.error("Delete department error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to delete department"
        });
    }
};


module.exports = {
    getDepartments,
    getDepartmentById,
    createDepartment,
    updateDepartment,
    deleteDepartment
};