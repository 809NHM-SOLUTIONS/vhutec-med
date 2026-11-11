const express = require("express");

const {
    getOverview,
    getAppointments,
    getQueue,
    getPatients,
    checkInAppointment,
    callNextPatient,
    callSpecificPatient,
    updateQueueStatus
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

// Actions. They sit behind the same authenticate + roleGuard line above, so
// only a logged-in RECEPTIONIST (or ADMIN) can check in or call patients.
router.post("/appointments/:id/check-in", checkInAppointment);
router.post("/queue/call-next", callNextPatient);

// Manage Queue: call one specific patient, or move a patient to their next
// status (CALLED -> IN_CONSULTATION -> COMPLETED). ":id" is the queue id.
router.post("/queue/:id/call", callSpecificPatient);
router.patch("/queue/:id/status", updateQueueStatus);

module.exports = router;