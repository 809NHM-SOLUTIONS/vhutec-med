require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");

const prisma = require("./prisma");

const userRoutes = require("./routes/userRoutes");
const patientRoutes = require("./routes/patientRoutes");
const doctorRoutes = require("./routes/doctorRoutes");
const departmentRoutes = require("./routes/departmentRoutes");
const doctorDepartmentRoutes = require("./routes/doctorDepartmentRoutes");
const appointmentRoutes = require("./routes/appointmentRoutes");
const queueRoutes = require("./routes/queueRoutes");
const consultationRoutes = require("./routes/consultationRoutes");

const app = express();

app.use(cors());
app.use(helmet());
app.use(express.json());

app.use("/api/users", userRoutes);
app.use("/api/patients", patientRoutes);
app.use("/api/doctors", doctorRoutes);
app.use("/api/departments", departmentRoutes);
app.use("/api/doctor-departments", doctorDepartmentRoutes);
app.use("/api/appointments", appointmentRoutes);
app.use("/api/queue", queueRoutes);
app.use("/api/consultations", consultationRoutes);

app.get("/api/health", (req, res) => {
    res.json({
        success: true,
        message: "Vhutec Med API is running"
    });
});

app.get("/api/health/db", async (req, res) => {
    try {
        await prisma.$queryRaw`SELECT 1`;

        res.json({
            success: true,
            message: "Vhutec Med database connection is working"
        });
    } catch (error) {
        console.error("Database connection error:", error);

        res.status(500).json({
            success: false,
            message: "Database connection failed"
        });
    }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Vhutec Med server running on http://localhost:${PORT}`);
});