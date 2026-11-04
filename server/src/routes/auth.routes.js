
const express = require("express");



const router = express.Router();

const {
    register,
    login,
    verifyEmail,
    forgotPassword,
    resetPassword,
    adminResetPassword
} = require("../controllers/auth.controller");

const authenticate = require("../middleware/auth");
const roleGuard = require("../middleware/roleGuard");

router.post("/register", register);
router.post("/login", login);
router.get("/verify-email", verifyEmail);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.post(
    "/admin/reset-user-password",
    authenticate,
    roleGuard("ADMIN"),
    adminResetPassword
);
module.exports = router;