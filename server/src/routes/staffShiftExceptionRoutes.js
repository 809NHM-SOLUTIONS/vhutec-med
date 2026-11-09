const express = require("express");

const {
    getMyExceptions,
    getAllExceptions,
    createException,
    updateException,
    deleteException
} = require("../controllers/staffShiftExceptionController");

const authenticate = require("../middleware/auth");
const roleGuard = require("../middleware/roleGuard");

const router = express.Router();

// DOCTOR and RECEPTIONIST: view their own exceptions
router.get(
    "/me",
    authenticate,
    roleGuard("DOCTOR", "RECEPTIONIST"),
    getMyExceptions
);

// ADMIN: view all staff exceptions
router.get(
    "/",
    authenticate,
    roleGuard("ADMIN"),
    getAllExceptions
);

// ADMIN: create an exception
router.post(
    "/",
    authenticate,
    roleGuard("ADMIN"),
    createException
);

// ADMIN: update an exception
router.put(
    "/:id",
    authenticate,
    roleGuard("ADMIN"),
    updateException
);

// ADMIN: delete an exception
router.delete(
    "/:id",
    authenticate,
    roleGuard("ADMIN"),
    deleteException
);

module.exports = router;