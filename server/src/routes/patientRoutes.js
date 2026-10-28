const express = require("express");

const {
    getPatients,
    getPatientById,
    createPatient,
    updatePatient,
    deletePatient,
    getMyProfile
} = require("../controllers/patientController");

const { getMyQueue } = require("../controllers/patientQueueController");

const authenticate = require("../middleware/auth");
const roleGuard = require("../middleware/roleGuard");

const router = express.Router();

// Patient portal: patients can view their own profile.
router.get(
    "/me",
    authenticate,
    roleGuard("PATIENT"),
    getMyProfile
);

// Patient portal: patients can view their own live queue status.
router.get(
    "/me/queue",
    authenticate,
    roleGuard("PATIENT"),
    getMyQueue
);

// Patient directory: authorised staff can view patient records.
router.get(
    "/",
    authenticate,
    roleGuard("ADMIN", "DOCTOR", "RECEPTIONIST"),
    getPatients
);

router.get(
    "/:id",
    authenticate,
    roleGuard("ADMIN", "DOCTOR", "RECEPTIONIST"),
    getPatientById
);

// Administrator-only management operations.
router.post(
    "/",
    authenticate,
    roleGuard("ADMIN"),
    createPatient
);

router.put(
    "/:id",
    authenticate,
    roleGuard("ADMIN"),
    updatePatient
);

router.delete(
    "/:id",
    authenticate,
    roleGuard("ADMIN"),
    deletePatient
);

module.exports = router;