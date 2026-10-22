
const express = require("express");

const {
    getAppointments,
    getMyAppointments,
    getAppointmentById,
    createAppointment,
    updateAppointment,
    deleteAppointment
} = require("../controllers/appointmentController");

const authenticate = require("../middleware/auth");
const roleGuard = require("../middleware/roleGuard");

const router = express.Router();

// Keep /me before /:id.
router.get("/me", authenticate, roleGuard("PATIENT"), getMyAppointments);

// Only staff roles can retrieve the full appointment list.
router.get(
    "/",
    authenticate,
    roleGuard("ADMIN", "RECEPTIONIST", "DOCTOR"),
    getAppointments
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
