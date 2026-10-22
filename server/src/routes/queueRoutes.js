const express = require("express");
const authenticate = require("../middleware/auth");
const roleGuard = require("../middleware/roleGuard");

const {
    getQueues,
    getQueueById,
    createQueue,
    updateQueue,
    deleteQueue
} = require("../controllers/queueController");

const router = express.Router();

// Viewing queue records: authorized staff only.
router.get(
    "/",
    authenticate,
    roleGuard("ADMIN", "RECEPTIONIST", "DOCTOR"),
    getQueues
);

router.get(
    "/:id",
    authenticate,
    roleGuard("ADMIN", "RECEPTIONIST", "DOCTOR"),
    getQueueById
);

// Receptionists manage check-ins and queue positions.
router.post(
    "/",
    authenticate,
    roleGuard("ADMIN", "RECEPTIONIST"),
    createQueue
);

router.put(
    "/:id",
    authenticate,
    roleGuard("ADMIN", "RECEPTIONIST"),
    updateQueue
);

router.delete(
    "/:id",
    authenticate,
    roleGuard("ADMIN"),
    deleteQueue
);



module.exports = router;