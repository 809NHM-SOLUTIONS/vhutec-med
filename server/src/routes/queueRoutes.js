const express = require("express");

const {
    getQueues,
    getQueueById,
    createQueue,
    updateQueue,
    deleteQueue
} = require("../controllers/queueController");

const router = express.Router();

router.get("/", getQueues);
router.get("/:id", getQueueById);
router.post("/", createQueue);
router.put("/:id", updateQueue);
router.delete("/:id", deleteQueue);

module.exports = router;