
const express = require("express");

const authenticate = require("../middleware/auth");
const roleGuard = require("../middleware/roleGuard");

const {
    getDashboardStats
} = require("../controllers/adminDashboardController");

const router = express.Router();

router.get(
    "/stats",
    authenticate,
    roleGuard("ADMIN"),
    getDashboardStats
);

module.exports = router;