// Development/testing defaults only. Existing hospital settings are never updated.
const consultationTypes = [
    { department: "General Medicine", name: "General Consultation" },
    { department: "Paediatrics", name: "Paediatric Consultation" },
    { department: "Cardiology", name: "Cardiology Consultation" }
];

async function configurePhase1ConsultationTypes(prisma) {
    return prisma.$transaction(async (tx) => {
        const departments = await tx.department.findMany({
            where: { name: { in: consultationTypes.map((type) => type.department) } },
            select: { id: true, name: true }
        });

        // Validate every department before writing any configuration.
        for (const type of consultationTypes) {
            if (departments.filter((department) => department.name === type.department).length !== 1) {
                throw new Error(`Expected exactly one department named ${type.department}.`);
            }
        }

        const results = [];
        for (const type of consultationTypes) {
            const department = departments.find((item) => item.name === type.department);
            const existing = await tx.consultationType.findMany({
                where: { departmentId: department.id },
                select: { id: true }
            });

            // An existing type (including an inactive one) represents configuration
            // we must preserve, rather than adding competing provisional defaults.
            if (existing.length > 0) {
                results.push({ department: department.name, result: "preserved existing configuration" });
                continue;
            }

            await tx.consultationType.createMany({
                data: [{
                    departmentId: department.id,
                    name: type.name,
                    description: "Phase 1 provisional consultation for development and testing; pending hospital confirmation.",
                    durationMinutes: 30,
                    isActive: true
                }],
                skipDuplicates: true
            });
            results.push({ department: department.name, result: "configured provisional consultation" });
        }
        return results;
    }, { isolationLevel: "Serializable" });
}

module.exports = { configurePhase1ConsultationTypes };

if (require.main === module) {
    const prisma = require("../src/prisma");
    configurePhase1ConsultationTypes(prisma)
        .then((results) => console.table(results))
        .catch((error) => {
            console.error(error.message);
            process.exitCode = 1;
        })
        .finally(() => prisma.$disconnect());
}
