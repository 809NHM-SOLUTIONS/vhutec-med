const express = require("express");

const {
    getMyShifts,
    getAllShifts,
    createShift,
    updateShift,
    deactivateShift
} = require("../controllers/staffShiftController");

const authenticate = require("../middleware/auth");
const roleGuard = require("../middleware/roleGuard");

const router = express.Router();

// Staff can view their own shifts.
router.get(
    "/me",
    authenticate,
    roleGuard("DOCTOR", "RECEPTIONIST"),
    getMyShifts
);

// Only administrators can view all shifts.
router.get(
    "/",
    authenticate,
    roleGuard("ADMIN"),
    getAllShifts
);

// Only administrators can assign shifts.
router.post(
    "/",
    authenticate,
    roleGuard("ADMIN"),
    createShift
);

// Only administrators can update shifts.
router.put(
    "/:id",
    authenticate,
    roleGuard("ADMIN"),
    updateShift
);

// Deactivate a shift instead of deleting its history.
router.delete(
    "/:id",
    authenticate,
    roleGuard("ADMIN"),
    deactivateShift
);

module.exports = router;