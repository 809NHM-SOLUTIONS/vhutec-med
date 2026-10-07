const express = require("express");

const authenticate = require("../middleware/auth");
const roleGuard = require("../middleware/roleGuard");

const {
    createDoctor,
    createReceptionist
} = require("../controllers/adminStaffController");

const router = express.Router();



router.post(
    "/doctor",
    authenticate,
    roleGuard("ADMIN"),
    createDoctor
);

router.post(
    "/receptionist",
    authenticate,
    roleGuard("ADMIN"),
    createReceptionist
);




module.exports = router;