const express = require("express");

const authenticate = require("../middleware/auth");
const roleGuard = require("../middleware/roleGuard");

const {
    createDoctor,
    createReceptionist,
    getAdminUsers
} = require("../controllers/adminStaffController");

const router = express.Router();

router.get(
    "/",
    authenticate,
    roleGuard("ADMIN"),
    getAdminUsers
);


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