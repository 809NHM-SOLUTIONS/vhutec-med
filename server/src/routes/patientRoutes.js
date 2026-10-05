const express = require("express");

const {
    getPatients,
    getPatientById,
    createPatient,
    updatePatient,
    deletePatient,
    getMyProfile
} = require("../controllers/patientController");

const authenticate = require("../middleware/auth");
const roleGuard = require("../middleware/roleGuard");

const router = express.Router();

// IMPORTANT: "/me" must be registered BEFORE "/:id",
// otherwise Express matches "me" as the :id param.
router.get("/me", authenticate, roleGuard("PATIENT"), getMyProfile);

router.get("/", getPatients);
router.get("/:id", getPatientById);
router.post("/", createPatient);
router.put("/:id", updatePatient);
router.delete("/:id", deletePatient);

module.exports = router;