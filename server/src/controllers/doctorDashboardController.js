
const prisma = require("../prisma");

// GET /api/doctors/me/dashboard
const getMyDoctorDashboard = async (req, res) => {
    try {
        const userId = Number(req.user?.userId);

        if (!Number.isInteger(userId) || userId <= 0) {
            return res.status(401).json({
                success: false,
                message: "A valid login is required."
            });
        }

        // Find the doctor profile linked to the logged-in account.
        const doctor = await prisma.doctor.findUnique({
            where: { userId },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                speciality: true,
                appointments: {
                    orderBy: [
                        { date: "asc" },
                        { timeSlot: "asc" }
                    ],
                    include: {
                        patient: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                                patientNumber: true,
                                dob: true
                            }
                        },
                        department: {
                            select: {
                                id: true,
                                name: true
                            }
                        },
                        queue: true,
                        consultation: true
                    }
                }
            }
        });

        if (!doctor) {
            return res.status(404).json({
                success: false,
                message: "No doctor profile is linked to this account."
            });
        }

        return res.status(200).json({
            success: true,
            data: doctor
        });
    } catch (error) {
        console.error("Get doctor dashboard error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to retrieve doctor dashboard data."
        });
    }
};

module.exports = { getMyDoctorDashboard };
