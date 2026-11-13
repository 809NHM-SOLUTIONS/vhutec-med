
const express = require("express");

const authenticate = require("../middleware/auth");
const roleGuard = require("../middleware/roleGuard");

const {
  getDashboardStats,
} = require("../controllers/adminDashboardController");

const {
  getAdminReport,
  exportAdminReport,
} = require("../controllers/adminReportsController");

const router = express.Router();

// Existing dashboard endpoint - unchanged
router.get(
  "/stats",
  authenticate,
  roleGuard("ADMIN"),
  getDashboardStats
);

// Filtered administration reports
router.get(
  "/reports",
  authenticate,
  roleGuard("ADMIN"),
  getAdminReport
);

// PDF and CSV downloads
router.get(
  "/reports/export",
  authenticate,
  roleGuard("ADMIN"),
  exportAdminReport
);

module.exports = router;
