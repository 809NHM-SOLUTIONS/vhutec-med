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
    console.log("Starting Vhutec Med team data population...");

    // --------------------------------------------------
    // Password
    // Doctor@123
    // --------------------------------------------------
    const passwordHash = await bcrypt.hash("Doctor@123", 12);

    // --------------------------------------------------
    // 1. Departments
    // --------------------------------------------------

    const departments = {};

    departments.generalMedicine = await prisma.department.upsert({
        where: {
            name: "General Medicine"
        },
        update: {
            description:
                "General check-ups and everyday health concerns."
        },
        create: {
            name: "General Medicine",
            description:
                "General check-ups and everyday health concerns."
        }
    });

    departments.dentalCare = await prisma.department.upsert({
        where: {
            name: "Dental Care"
        },
        update: {
            description:
                "Oral health, cleanings and dental procedures."
        },
        create: {
            name: "Dental Care",
            description:
                "Oral health, cleanings and dental procedures."
        }
    });

    departments.dermatology = await prisma.department.upsert({
        where: {
            name: "Dermatology"
        },
        update: {
            description:
                "Skin, hair and nail conditions."
        },
        create: {
            name: "Dermatology",
            description:
                "Skin, hair and nail conditions."
        }
    });

    departments.cardiology = await prisma.department.upsert({
        where: {
            name: "Cardiology"
        },
        update: {
            description:
                "Heart and cardiovascular health."
        },
        create: {
            name: "Cardiology",
            description:
                "Heart and cardiovascular health."
        }
    });

    departments.paediatrics = await prisma.department.upsert({
        where: {
            name: "Paediatrics"
        },
        update: {
            description:
                "Healthcare for infants, children and adolescents."
        },
        create: {
            name: "Paediatrics",
            description:
                "Healthcare for infants, children and adolescents."
        }
    });

    console.log("✓ Departments created.");

    // --------------------------------------------------
    // 2. Doctor Users
    // --------------------------------------------------

    const nalediUser = await prisma.user.upsert({
        where: {
            email: "naledi.maseko@vhutecmed.com"
        },
        update: {
            role: "DOCTOR"
        },
        create: {
            email: "naledi.maseko@vhutecmed.com",
            passwordHash,
            role: "DOCTOR"
        }
    });

    const kabeloUser = await prisma.user.upsert({
        where: {
            email: "kabelo.dlamini@vhutecmed.com"
        },
        update: {
            role: "DOCTOR"
        },
        create: {
            email: "kabelo.dlamini@vhutecmed.com",
            passwordHash,
            role: "DOCTOR"
        }
    });

    const leratoUser = await prisma.user.upsert({
        where: {
            email: "lerato.nkosi@vhutecmed.com"
        },
        update: {
            role: "DOCTOR"
        },
        create: {
            email: "lerato.nkosi@vhutecmed.com",
            passwordHash,
            role: "DOCTOR"
        }
    });

    console.log("✓ Doctor user accounts created.");

    // --------------------------------------------------
    // 3. Doctor Profiles
    // --------------------------------------------------

    const naledi = await prisma.doctor.upsert({
        where: {
            licenseNo: "LIC-0001"
        },
        update: {
            userId: nalediUser.id,
            firstName: "Naledi",
            lastName: "Maseko",
            speciality: "General Practitioner",
            phone: "0711234567"
        },
        create: {
            userId: nalediUser.id,
            firstName: "Naledi",
            lastName: "Maseko",
            speciality: "General Practitioner",
            licenseNo: "LIC-0001",
            phone: "0711234567"
        }
    });

    const kabelo = await prisma.doctor.upsert({
        where: {
            licenseNo: "LIC-0002"
        },
        update: {
            userId: kabeloUser.id,
            firstName: "Kabelo",
            lastName: "Dlamini",
            speciality: "Dentist",
            phone: "0712345678"
        },
        create: {
            userId: kabeloUser.id,
            firstName: "Kabelo",
            lastName: "Dlamini",
            speciality: "Dentist",
            licenseNo: "LIC-0002",
            phone: "0712345678"
        }
    });

    const lerato = await prisma.doctor.upsert({
        where: {
            licenseNo: "LIC-0003"
        },
        update: {
            userId: leratoUser.id,
            firstName: "Lerato",
            lastName: "Nkosi",
            speciality: "Dermatologist",
            phone: "0713456789"
        },
        create: {
            userId: leratoUser.id,
            firstName: "Lerato",
            lastName: "Nkosi",
            speciality: "Dermatologist",
            licenseNo: "LIC-0003",
            phone: "0713456789"
        }
    });

    console.log("✓ Doctor profiles created.");

    // --------------------------------------------------
    // 4. Doctor <-> Department assignments
    // --------------------------------------------------

    await prisma.doctorDepartment.upsert({
        where: {
            doctorId_departmentId: {
                doctorId: naledi.id,
                departmentId: departments.generalMedicine.id
            }
        },
        update: {},
        create: {
            doctorId: naledi.id,
            departmentId: departments.generalMedicine.id
        }
    });

    await prisma.doctorDepartment.upsert({
        where: {
            doctorId_departmentId: {
                doctorId: kabelo.id,
                departmentId: departments.dentalCare.id
            }
        },
        update: {},
        create: {
            doctorId: kabelo.id,
            departmentId: departments.dentalCare.id
        }
    });

    await prisma.doctorDepartment.upsert({
        where: {
            doctorId_departmentId: {
                doctorId: lerato.id,
                departmentId: departments.dermatology.id
            }
        },
        update: {},
        create: {
            doctorId: lerato.id,
            departmentId: departments.dermatology.id
        }
    });

    console.log("✓ Doctor-department assignments created.");

    // --------------------------------------------------
    // Sanity Check
    // --------------------------------------------------

    const doctorAssignments = await prisma.doctorDepartment.findMany({
        include: {
            doctor: {
                include: {
                    user: true
                }
            },
            department: true
        },
        orderBy: {
            doctorId: "asc"
        }
    });

    console.log("");
    console.log("==========================================");
    console.log("Vhutec Med team data populated successfully");
    console.log("==========================================");
    console.log("");

    doctorAssignments.forEach((assignment) => {
        console.log(
            `${assignment.doctor.id} | ` +
            `${assignment.doctor.firstName} ${assignment.doctor.lastName} | ` +
            `${assignment.doctor.speciality} | ` +
            `${assignment.department.name} | ` +
            `${assignment.doctor.user.email}`
        );
    });

    console.log("");
    console.log("Doctor test password: Doctor@123");
}

main()
    .catch((error) => {
        console.error("Population failed:", error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });