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

// IMPORTANT: "/me" must be registered BEFORE "/:id",
// otherwise Express matches "me" as the :id param.
router.get("/me", authenticate, roleGuard("PATIENT"), getMyAppointments);

router.get("/", getAppointments);
router.get("/:id", getAppointmentById);

// Booking must be authenticated so createAppointment can securely derive
// the patient from req.user when the caller is a PATIENT. Also open to
// ADMIN/RECEPTIONIST, who pass patientId explicitly in the body.
router.post(
    "/",
    authenticate,
    roleGuard("PATIENT", "ADMIN", "RECEPTIONIST"),
    createAppointment
);

router.put("/:id", updateAppointment);
router.delete("/:id", deleteAppointment);

module.exports = router;