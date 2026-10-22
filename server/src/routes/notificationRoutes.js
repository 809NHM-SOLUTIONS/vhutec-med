
const express = require("express");
const authenticate = require("../middleware/auth");

const {
    getNotifications,
    getUnreadCount,
    markNotificationRead
} = require("../controllers/notificationController");

const router = express.Router();

router.use(authenticate);

router.get("/unread-count", getUnreadCount);
router.get("/", getNotifications);
router.patch("/:id/read", markNotificationRead);

module.exports = router;
