const express = require("express");

const {
    getConsultations,
    getConsultationById,
    createConsultation,
    updateConsultation,
    deleteConsultation
} = require("../controllers/consultationController");

const router = express.Router();

router.get("/", getConsultations);
router.get("/:id", getConsultationById);
router.post("/", createConsultation);
router.put("/:id", updateConsultation);
router.delete("/:id", deleteConsultation);

module.exports = router;