
const express = require("express");

const {
    getReceptionists,
    getReceptionistById,
    updateReceptionist,
    deleteReceptionist
} = require("../controllers/receptionistController");

const authenticate = require("../middleware/auth");
const roleGuard = require("../middleware/roleGuard");

const router = express.Router();

// Only administrators can manage receptionist records.
router.get(
    "/",
    authenticate,
    roleGuard("ADMIN"),
    getReceptionists
);

router.get(
    "/:id",
    authenticate,
    roleGuard("ADMIN"),
    getReceptionistById
);

router.put(
    "/:id",
    authenticate,
    roleGuard("ADMIN"),
    updateReceptionist
);

router.delete(
    "/:id",
    authenticate,
    roleGuard("ADMIN"),
    deleteReceptionist
);

module.exports = router;