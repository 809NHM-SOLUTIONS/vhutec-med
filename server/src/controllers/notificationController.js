
const prisma = require("../prisma");

const getNotifications = async (req, res) => {
    try {
        const userId = Number(req.user.userId);
        const take = Math.min(
            Math.max(Number.parseInt(req.query.limit, 10) || 20, 1),
            100
        );

        const notifications = await prisma.notification.findMany({
            where: { userId },
            orderBy: { createdAt: "desc" },
            take
        });

        return res.json({ success: true, data: notifications });
    } catch (error) {
        console.error("Get notifications error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to retrieve notifications"
        });
    }
};

const getUnreadCount = async (req, res) => {
    try {
        const count = await prisma.notification.count({
            where: {
                userId: Number(req.user.userId),
                readAt: null
            }
        });

        return res.json({ success: true, count });
    } catch (error) {
        console.error("Unread notification count error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to retrieve unread count"
        });
    }
};

const markNotificationRead = async (req, res) => {
    try {
        const id = Number(req.params.id);
        const userId = Number(req.user.userId);

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid notification ID"
            });
        }

        const result = await prisma.notification.updateMany({
            where: {
                id,
                userId,
                readAt: null
            },
            data: { readAt: new Date() }
        });

        if (result.count === 0) {
            const existing = await prisma.notification.findFirst({
                where: { id, userId }
            });

            if (!existing) {
                return res.status(404).json({
                    success: false,
                    message: "Notification not found"
                });
            }

            return res.json({
                success: true,
                message: "Notification was already marked as read",
                data: existing
            });
        }

        const notification = await prisma.notification.findFirst({
            where: { id, userId }
        });

        return res.json({
            success: true,
            data: notification
        });
    } catch (error) {
        console.error("Mark notification read error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to update notification"
        });
    }
};

module.exports = {
    getNotifications,
    getUnreadCount,
    markNotificationRead
};
