
const prisma = require("../prisma");
const { getNotificationIO } = require("../sockets/notification.socket");

/**
 * Persist a notification and emit it to the recipient's authenticated
 * Socket.IO room when a connection is available.
 */
const createNotification = async ({
    userId,
    appointmentId = null,
    type,
    title,
    message,
    data = null,
    dedupeKey = null
}) => {
    if (!Number.isInteger(Number(userId)) || Number(userId) <= 0) {
        throw new Error("A valid notification recipient is required");
    }

    const notificationData = {
        userId: Number(userId),
        type,
        title,
        message,
        ...(appointmentId !== null
            ? { appointmentId: Number(appointmentId) }
            : {}),
        ...(data !== null ? { data } : {}),
        ...(dedupeKey ? { dedupeKey } : {})
    };

    let notification;

    try {
        notification = await prisma.notification.create({
            data: notificationData
        });
    } catch (error) {
        // A unique dedupeKey prevents the same event being saved twice.
        if (error.code === "P2002" && dedupeKey) {
            return prisma.notification.findUnique({
                where: { dedupeKey }
            });
        }

        throw error;
    }

    try {
        const io = getNotificationIO();

        if (io) {
            io.to(`user:${notification.userId}`).emit(
                "notification:new",
                notification
            );
        }
    } catch (error) {
        // A failed live delivery does not undo the saved notification.
        console.error("Notification live delivery failed:", error.message);
    }

    return notification;
};

module.exports = { createNotification };
