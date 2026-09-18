require("dotenv/config");

const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const bcrypt = require("bcryptjs");

const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL
});

const prisma = new PrismaClient({
    adapter
});

async function main() {
    console.log("Starting database seed...");

    // --------------------------------------------------
    // Clear existing test data
    // --------------------------------------------------
    await prisma.consultation.deleteMany();
    await prisma.queue.deleteMany();
    await prisma.appointment.deleteMany();
    await prisma.doctorDepartment.deleteMany();
    await prisma.department.deleteMany();
    await prisma.patient.deleteMany();
    await prisma.doctor.deleteMany();
    await prisma.receptionist.deleteMany();
    await prisma.user.deleteMany();

    // --------------------------------------------------
    // Passwords
    // --------------------------------------------------
    const passwordHash = await bcrypt.hash("Password123!", 10);

    // --------------------------------------------------
    // Users
    // --------------------------------------------------
    const patientUser = await prisma.user.create({
        data: {
            email: "patient@vhutecmed.co.za",
            passwordHash,
            role: "PATIENT"
        }
    });

    const doctorUser = await prisma.user.create({
        data: {
            email: "doctor@vhutecmed.co.za",
            passwordHash,
            role: "DOCTOR"
        }
    });

    const receptionistUser = await prisma.user.create({
        data: {
            email: "receptionist@vhutecmed.co.za",
            passwordHash,
            role: "RECEPTIONIST"
        }
    });

    // --------------------------------------------------
    // Patient
    // --------------------------------------------------
    const patient = await prisma.patient.create({
        data: {
            userId: patientUser.id,
            firstName: "Mthokozisi",
            lastName: "Mtshweni",
            dob: new Date("2000-05-15"),
            phone: "0712345678",
            address: "Johannesburg, Gauteng"
        }
    });

    // --------------------------------------------------
    // Doctor
    // --------------------------------------------------
    const doctor = await prisma.doctor.create({
        data: {
            userId: doctorUser.id,
            firstName: "Thabo",
            lastName: "Mokoena",
            speciality: "General Practitioner",
            licenseNo: "MP123456",
            phone: "0723456789"
        }
    });

    // --------------------------------------------------
    // Receptionist
    // --------------------------------------------------
    await prisma.receptionist.create({
        data: {
            userId: receptionistUser.id,
            firstName: "Lerato",
            lastName: "Nkosi",
            phone: "0734567890"
        }
    });

    // --------------------------------------------------
    // Departments
    // --------------------------------------------------
    const generalDepartment = await prisma.department.create({
        data: {
            name: "General Medicine",
            description: "General medical consultations and primary healthcare services."
        }
    });

    const paediatricDepartment = await prisma.department.create({
        data: {
            name: "Paediatrics",
            description: "Medical care and treatment for children."
        }
    });

    // --------------------------------------------------
    // Doctor - Department relationship
    // --------------------------------------------------
    await prisma.doctorDepartment.create({
        data: {
            doctorId: doctor.id,
            departmentId: generalDepartment.id
        }
    });

    // --------------------------------------------------
    // Appointment
    // --------------------------------------------------
    const appointment = await prisma.appointment.create({
        data: {
            patientId: patient.id,
            doctorId: doctor.id,
            departmentId: generalDepartment.id,
            date: new Date("2026-09-21"),
            timeSlot: "09:00-09:30",
            reason: "General medical consultation",
            status: "CONFIRMED"
        }
    });

    // --------------------------------------------------
    // Queue
    // --------------------------------------------------
    await prisma.queue.create({
        data: {
            appointmentId: appointment.id,
            queueNumber: 1,
            status: "WAITING"
        }
    });

    // --------------------------------------------------
    // Consultation
    // --------------------------------------------------
    await prisma.consultation.create({
        data: {
            appointmentId: appointment.id,
            doctorId: doctor.id,
            notes: "Initial consultation pending.",
            startedAt: null,
            completedAt: null
        }
    });

    console.log("Database seed completed successfully.");
    console.log("");
    console.log("Test accounts:");
    console.log("-----------------------------");
    console.log("Patient:      patient@vhutecmed.co.za");
    console.log("Doctor:       doctor@vhutecmed.co.za");
    console.log("Receptionist: receptionist@vhutecmed.co.za");
    console.log("Password:     Password123!");
    console.log("-----------------------------");
}

main()
    .catch((error) => {
        console.error("Seed failed:", error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });