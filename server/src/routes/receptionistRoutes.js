const express = require("express");

const {
    getReceptionists,
    getReceptionistById
} = require("../controllers/receptionistController");

const router = express.Router();

router.get("/", getReceptionists);
router.get("/:id", getReceptionistById);

module.exports = router;