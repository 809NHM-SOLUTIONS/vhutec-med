const prisma = require("../prisma");

// POST /api/doctor-departments
const assignDoctorToDepartment = async (req, res) => {
    try {
        const doctorId = Number(req.body.doctorId);
        const departmentId = Number(req.body.departmentId);

        if (Number.isNaN(doctorId) || Number.isNaN(departmentId)) {
            return res.status(400).json({
                success: false,
                message: "doctorId and departmentId must be valid numbers"
            });
        }

        const doctor = await prisma.doctor.findUnique({
            where: {
                id: doctorId
            }
        });

        if (!doctor) {
            return res.status(404).json({
                success: false,
                message: "Doctor not found"
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
                message: "Department not found"
            });
        }

        const existingAssignment =
            await prisma.doctorDepartment.findUnique({
                where: {
                    doctorId_departmentId: {
                        doctorId,
                        departmentId
                    }
                }
            });

        if (existingAssignment) {
            return res.status(409).json({
                success: false,
                message: "Doctor is already assigned to this department"
            });
        }

        const assignment = await prisma.doctorDepartment.create({
            data: {
                doctorId,
                departmentId
            },
            include: {
                doctor: true,
                department: true
            }
        });

        res.status(201).json({
            success: true,
            data: assignment
        });
    } catch (error) {
        console.error("Assign doctor to department error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to assign doctor to department"
        });
    }
};


// GET /api/doctor-departments
const getDoctorDepartments = async (req, res) => {
    try {
        const assignments = await prisma.doctorDepartment.findMany({
            include: {
                doctor: true,
                department: true
            },
            orderBy: [
                {
                    doctorId: "asc"
                },
                {
                    departmentId: "asc"
                }
            ]
        });

        res.json({
            success: true,
            data: assignments
        });
    } catch (error) {
        console.error("Get doctor departments error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to retrieve doctor-department assignments"
        });
    }
};


// GET /api/doctor-departments/:doctorId/:departmentId
const getDoctorDepartment = async (req, res) => {
    try {
        const doctorId = Number(req.params.doctorId);
        const departmentId = Number(req.params.departmentId);

        if (Number.isNaN(doctorId) || Number.isNaN(departmentId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid doctor ID or department ID"
            });
        }

        const assignment = await prisma.doctorDepartment.findUnique({
            where: {
                doctorId_departmentId: {
                    doctorId,
                    departmentId
                }
            },
            include: {
                doctor: true,
                department: true
            }
        });

        if (!assignment) {
            return res.status(404).json({
                success: false,
                message: "Doctor-department assignment not found"
            });
        }

        res.json({
            success: true,
            data: assignment
        });
    } catch (error) {
        console.error("Get doctor department error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to retrieve doctor-department assignment"
        });
    }
};


// DELETE /api/doctor-departments/:doctorId/:departmentId
const removeDoctorFromDepartment = async (req, res) => {
    try {
        const doctorId = Number(req.params.doctorId);
        const departmentId = Number(req.params.departmentId);

        if (Number.isNaN(doctorId) || Number.isNaN(departmentId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid doctor ID or department ID"
            });
        }

        const assignment = await prisma.doctorDepartment.findUnique({
            where: {
                doctorId_departmentId: {
                    doctorId,
                    departmentId
                }
            }
        });

        if (!assignment) {
            return res.status(404).json({
                success: false,
                message: "Doctor-department assignment not found"
            });
        }

        await prisma.doctorDepartment.delete({
            where: {
                doctorId_departmentId: {
                    doctorId,
                    departmentId
                }
            }
        });

        res.json({
            success: true,
            message: "Doctor removed from department successfully"
        });
    } catch (error) {
        console.error("Remove doctor from department error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to remove doctor from department"
        });
    }
};


module.exports = {
    assignDoctorToDepartment,
    getDoctorDepartments,
    getDoctorDepartment,
    removeDoctorFromDepartment
};