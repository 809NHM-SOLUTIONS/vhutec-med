

const express = require("express");

const {
    getOverview,
    getAppointments,
    getQueue,
    getPatients
} = require("../controllers/receptionDashboardController");

const authenticate = require("../middleware/auth");
const roleGuard = require("../middleware/roleGuard");

const router = express.Router();

// Every receptionist route requires a logged-in RECEPTIONIST (or ADMIN).
router.use(authenticate, roleGuard("RECEPTIONIST", "ADMIN"));

router.get("/overview", getOverview);
router.get("/appointments", getAppointments);
router.get("/queue", getQueue);
router.get("/patients", getPatients);

module.exports = router;