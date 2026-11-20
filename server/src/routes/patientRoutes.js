const express = require("express");

const {
    getPatients,
    getPatientById,
    createPatient,
    updatePatient,
    deletePatient,
    getMyProfile,
    updateMyProfile
} = require("../controllers/patientController");

const { getMyQueue } = require("../controllers/patientQueueController");

const authenticate = require("../middleware/auth");
const roleGuard = require("../middleware/roleGuard");

const router = express.Router();

const { register } = require("../controllers/auth.controller");


// Patient portal: patients can view their own profile.
router.get(
    "/me",
    authenticate,
    roleGuard("PATIENT"),
    getMyProfile
);

// Patient portal: patients can update their own contact details.
// Must stay above "PUT /:id", otherwise Express would treat "me" as an id.
router.put(
    "/me",
    authenticate,
    roleGuard("PATIENT"),
    updateMyProfile
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

// Receptionist and administrator patient registration.
router.post(
    "/register",
    authenticate,
    roleGuard("ADMIN", "RECEPTIONIST"),
    register
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