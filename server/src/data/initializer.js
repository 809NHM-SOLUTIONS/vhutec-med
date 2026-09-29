const bcrypt = require("bcryptjs");
const prisma = require("../prisma");

const initializeDefaultAdmin = async () => {
    try {
        const adminEmail =
            process.env.DEFAULT_ADMIN_EMAIL ||
            "admin@vhutecmed.co.za";

        const adminPassword =
            process.env.DEFAULT_ADMIN_PASSWORD ||
            "Admin123!";

        // Check whether an ADMIN already exists
        const existingAdmin = await prisma.user.findFirst({
            where: {
                role: "ADMIN"
            }
        });

        if (existingAdmin) {
            console.log("Default ADMIN account already exists.");
            return;
        }

        
        const passwordHash = await bcrypt.hash(adminPassword, 12);

        
        const admin = await prisma.user.create({
            data: {
                email: adminEmail,
                passwordHash,
                role: "ADMIN"
            }
        });

        console.log("Default ADMIN account created successfully.");
        console.log(`Admin email: ${admin.email}`);

    } catch (error) {
        console.error(
            "Failed to initialize default ADMIN account:",
            error
        );
    }
};

module.exports = initializeDefaultAdmin;