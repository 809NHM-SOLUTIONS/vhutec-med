
const prisma = require("../prisma");
const { createNotification } = require("./notificationService");

const notifyConsultationEvent = async ({
    consultation,
    type,
    eventKey
}) => {
    try {
        const appointment = await prisma.appointment.findUnique({
            where: { id: consultation.appointmentId },
            select: {
                id: true,
                date: true,
                timeSlot: true,
                patient: {
                    select: { userId: true }
                },
                doctor: {
                    select: { userId: true }
                }
            }
        });

        if (!appointment) {
            console.error(
                "Consultation notification skipped: appointment not found"
            );
            return;
        }

        const receptionists = await prisma.receptionist.findMany({
            select: { userId: true }
        });

        let title;
        let message;

        if (type === "CONSULTATION_STARTED") {
            title = "Consultation started";
            message = "Your consultation has started.";
        } else if (type === "CONSULTATION_COMPLETED") {
            title = "Consultation completed";
            message = "Your consultation has been completed.";
        } else {
            return;
        }

        const recipients = new Set([
            appointment.patient?.userId,
            appointment.doctor?.userId,
            ...receptionists.map((item) => item.userId)
        ]);

        await Promise.all(
            [...recipients]
                .filter(Boolean)
                .map((userId) =>
                    createNotification({
                        userId,
                        appointmentId: appointment.id,
                        type,
                        title,
                        message,
                        data: {
                            appointmentId: appointment.id,
                            consultationId: consultation.id,
                            date: appointment.date.toISOString(),
                            timeSlot: appointment.timeSlot
                        },
                        dedupeKey: `${eventKey}:user:${userId}`
                    })
                )
        );
    } catch (error) {
        console.error(
            "Consultation notification error:",
            error.message
        );
    }
};

module.exports = { notifyConsultationEvent };
