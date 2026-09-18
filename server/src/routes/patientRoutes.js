const express = require("express");

const {
    getPatients,
    getPatientById,
    createPatient,
    updatePatient,
   deletePatient
} = require("../controllers/patientController");

const router = express.Router();

router.get("/", getPatients);
router.get("/:id", getPatientById);
router.post("/", createPatient);
router.put("/:id", updatePatient);
router.delete("/:id", deletePatient);

module.exports = router;