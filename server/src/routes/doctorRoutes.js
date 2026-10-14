
const express = require("express");

const {
    getDoctors,
    getDoctorById,
    createDoctor,
    updateDoctor,
    deleteDoctor
} = require("../controllers/doctorController");

const {
    getMyDoctorDashboard
} = require("../controllers/doctorDashboardController");

const authenticate = require("../middleware/auth");
const roleGuard = require("../middleware/roleGuard");



const router = express.Router();



// Authenticated users who need doctor information for hospital workflows.
router.get(
    "/",
    authenticate,
    roleGuard("ADMIN", "PATIENT", "DOCTOR", "RECEPTIONIST"),
    getDoctors
);

router.get(
    "/:id",
    authenticate,
    roleGuard("ADMIN", "PATIENT", "DOCTOR", "RECEPTIONIST"),
    getDoctorById
);


router.get(
    "/me/dashboard",
    authenticate,
    roleGuard("DOCTOR"),
    getMyDoctorDashboard
);


// Only administrators can manage doctor profiles through these endpoints.
router.post(
    "/",
    authenticate,
    roleGuard("ADMIN"),
    createDoctor
);

router.put(
    "/:id",
    authenticate,
    roleGuard("ADMIN"),
    updateDoctor
);

router.delete(
    "/:id",
    authenticate,
    roleGuard("ADMIN"),
    deleteDoctor
);



module.exports = router;