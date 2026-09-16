require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");

const app = express();

app.use(cors());
app.use(helmet());
app.use(express.json());

app.get("/api/health", (req, res) => {
    res.json({
        success: true,
        message: "Vhutec Med API is running"
    });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Vhutec Med server running on http://localhost:${PORT}`);
});