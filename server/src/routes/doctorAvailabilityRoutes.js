const express = require("express");

const {
    getMyAvailability,
    updateMyAvailability,
    addMyUnavailableDate,
    removeMyUnavailableDate,
    getDoctorAvailability
} = require("../controllers/doctorAvailabilityController");

const authenticate = require("../middleware/auth");
const roleGuard = require("../middleware/roleGuard");

const router = express.Router();

// Doctor manages their own availability.
router.get("/me/availability", authenticate, roleGuard("DOCTOR"), getMyAvailability);
router.put("/me/availability", authenticate, roleGuard("DOCTOR"), updateMyAvailability);
router.post("/me/unavailable-dates", authenticate, roleGuard("DOCTOR"), addMyUnavailableDate);
router.delete("/me/unavailable-dates/:date", authenticate, roleGuard("DOCTOR"), removeMyUnavailableDate);

// Slots for the patient booking page (any logged-in user).
router.get("/:id/availability", authenticate, getDoctorAvailability);

module.exports = router;
