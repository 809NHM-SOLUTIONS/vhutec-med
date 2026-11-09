const express = require("express");

const authenticate = require("../middleware/auth");
const roleGuard = require("../middleware/roleGuard");

const {
    getConsultationTypes,
    getConsultationTypeById,
    createConsultationType,
    updateConsultationType,
    deactivateConsultationType
} = require("../controllers/consultationTypeController");

const router = express.Router();

// Authenticated users can view active consultation types.
router.get("/", authenticate, getConsultationTypes);
router.get("/:id", authenticate, getConsultationTypeById);

// Only administrators can manage consultation types.
router.post(
    "/",
    authenticate,
    roleGuard("ADMIN"),
    createConsultationType
);

router.put(
    "/:id",
    authenticate,
    roleGuard("ADMIN"),
    updateConsultationType
);

router.delete(
    "/:id",
    authenticate,
    roleGuard("ADMIN"),
    deactivateConsultationType
);

module.exports = router;