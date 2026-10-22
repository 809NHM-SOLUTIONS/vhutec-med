const express = require("express");
const authenticate = require("../middleware/auth");
const roleGuard = require("../middleware/roleGuard");

const {
    getConsultations,
    getConsultationById,
    createConsultation,
    updateConsultation,
    deleteConsultation
} = require("../controllers/consultationController");

const router = express.Router();

// Authorized clinical staff can view consultation records.
router.get(
    "/",
    authenticate,
    roleGuard("ADMIN", "DOCTOR"),
    getConsultations
);

router.get(
    "/:id",
    authenticate,
    roleGuard("ADMIN", "DOCTOR"),
    getConsultationById
);

// Doctors manage consultations; administrators can manage records.
router.post(
    "/",
    authenticate,
    roleGuard("DOCTOR", "ADMIN"),
    createConsultation
);

router.put(
    "/:id",
    authenticate,
    roleGuard("DOCTOR", "ADMIN"),
    updateConsultation
);

router.delete(
    "/:id",
    authenticate,
    roleGuard("ADMIN"),
    deleteConsultation
);

module.exports = router;