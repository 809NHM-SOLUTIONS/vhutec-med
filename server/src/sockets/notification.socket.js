
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");

let notificationIO = null;

const initializeNotificationSocket = (httpServer) => {
    notificationIO = new Server(httpServer, {
        cors: {
            origin: process.env.FRONTEND_URL || "http://localhost:5173",
            methods: ["GET", "POST"]
        }
    });

    notificationIO.use((socket, next) => {
        try {
            const token =
                socket.handshake.auth?.token ||
                socket.handshake.headers.authorization
                    ?.replace(/^Bearer\s+/i, "");

            if (!token || !process.env.JWT_SECRET) {
                return next(new Error("Authentication required"));
            }

            const user = jwt.verify(token, process.env.JWT_SECRET);

            if (!user.userId || !user.role) {
                return next(new Error("Invalid authentication token"));
            }

            socket.data.user = {
                userId: Number(user.userId),
                role: user.role
            };

            next();
        } catch {
            next(new Error("Invalid or expired authentication token"));
        }
    });

    notificationIO.on("connection", (socket) => {
        // The room is derived from the verified token, never from client input.
        socket.join(`user:${socket.data.user.userId}`);

        console.log(
            `Notification socket connected for user ${socket.data.user.userId}`
        );
    });

    return notificationIO;
};

const getNotificationIO = () => notificationIO;

module.exports = {
    initializeNotificationSocket,
    getNotificationIO
};
