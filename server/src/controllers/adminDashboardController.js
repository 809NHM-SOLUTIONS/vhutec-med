
const prisma = require("../prisma");

// GET /api/admin/dashboard/stats
const getDashboardStats = async (req, res) => {
    try {
        const [
            patients,
            doctors,
            receptionists,
            appointments,
            queues,
            appointmentStatuses,
            queueStatuses,
            recentAppointments
        ] = await Promise.all([
            prisma.patient.count(),
            prisma.doctor.count(),
            prisma.receptionist.count(),
            prisma.appointment.count(),
            prisma.queue.count(),

            prisma.appointment.groupBy({
                by: ["status"],
                _count: { _all: true }
            }),

            prisma.queue.groupBy({
                by: ["status"],
                _count: { _all: true }
            }),

            prisma.appointment.findMany({
                take: 5,
                orderBy: { createdAt: "desc" },
                include: {
                    patient: true,
                    doctor: true,
                    department: true,
                    queue: true
                }
            })
        ]);

        const appointmentStatusCounts = Object.fromEntries(
            appointmentStatuses.map((item) => [
                item.status,
                item._count._all
            ])
        );

        const queueStatusCounts = Object.fromEntries(
            queueStatuses.map((item) => [
                item.status,
                item._count._all
            ])
        );

        res.json({
            success: true,
            data: {
                users: patients + doctors + receptionists,
                patients,
                doctors,
                receptionists,
                appointments,
                queues,
                appointmentStatuses: appointmentStatusCounts,
                queueStatuses: queueStatusCounts,
                recentAppointments
            }
        });
    } catch (error) {
        console.error("Get administrator dashboard stats error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to retrieve dashboard statistics"
        });
    }
};

module.exports = {
    getDashboardStats
};