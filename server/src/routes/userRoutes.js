
const express = require("express");

const {
    getUsers,
    getUserById,
    createUser
} = require("../controllers/userController");

const authenticate = require("../middleware/auth");
const roleGuard = require("../middleware/roleGuard");

const router = express.Router();

router.get("/", authenticate, roleGuard("ADMIN"), getUsers);
router.get("/:id", authenticate, roleGuard("ADMIN"), getUserById);
router.post("/", authenticate, roleGuard("ADMIN"), createUser);

module.exports = router;
