const express = require("express");

const {
    getAppointments,
    getMyAppointments,
    getBookedSlots,
    getAppointmentById,
    getMissedAppointments,
    createAppointment,
    updateAppointment,
    deleteAppointment
} = require("../controllers/appointmentController");

const authenticate = require("../middleware/auth");
const roleGuard = require("../middleware/roleGuard");

const router = express.Router();

// Keep /me and /booked-slots before /:id, otherwise Express treats them as an id.
router.get("/me", authenticate, roleGuard("PATIENT"), getMyAppointments);

// Time slots already taken for a doctor on a date (times only, no patient data).
router.get("/booked-slots", authenticate, getBookedSlots);

// Only staff roles can retrieve the full appointment list.
router.get(
    "/",
    authenticate,
    roleGuard("ADMIN", "RECEPTIONIST", "DOCTOR"),
    getAppointments
);
// GET /api/appointments/missed
// ADMIN and RECEPTIONIST: all missed appointments.
// DOCTOR: only appointments assigned to the logged-in doctor.
router.get(
    "/missed",
    authenticate,
    roleGuard("ADMIN", "RECEPTIONIST", "DOCTOR"),
    getMissedAppointments
);

// Individual appointment access must also be checked in the controller.
router.get("/:id", authenticate, getAppointmentById);

router.post(
    "/",
    authenticate,
    roleGuard("PATIENT", "ADMIN", "RECEPTIONIST"),
    createAppointment
);

router.put(
    "/:id",
    authenticate,
    roleGuard("ADMIN", "RECEPTIONIST"),
    updateAppointment
);

router.delete(
    "/:id",
    authenticate,
    roleGuard("ADMIN", "RECEPTIONIST"),
    deleteAppointment
);

module.exports = router;