
const prisma = require("../prisma");
const { createNotification } = require("./notificationService");

const notifyAppointmentStakeholders = async ({
    appointment,
    type,
    title,
    message,
    eventKey
}) => {
    try {
        const [patient, doctor, receptionists] = await Promise.all([
            prisma.patient.findUnique({
                where: { id: appointment.patientId },
                select: { userId: true }
            }),
            prisma.doctor.findUnique({
                where: { id: appointment.doctorId },
                select: { userId: true }
            }),
            prisma.receptionist.findMany({
                select: { userId: true }
            })
        ]);

        const recipients = [
            patient?.userId,
            doctor?.userId,
            ...receptionists.map((item) => item.userId)
        ];

        const uniqueRecipients = [...new Set(recipients.filter(Boolean))];

        await Promise.all(
            uniqueRecipients.map((userId) =>
                createNotification({
                    userId,
                    appointmentId: appointment.id,
                    type,
                    title,
                    message,
                    data: {
                        appointmentId: appointment.id,
                        date: appointment.date.toISOString(),
                        timeSlot: appointment.timeSlot,
                        status: appointment.status
                    },
                    dedupeKey: `${eventKey}:user:${userId}`
                })
            )
        );
    } catch (error) {
        // The appointment operation should not fail just because notification
        // delivery encountered an issue. Log this for investigation.
        console.error("Appointment notification error:", error);
    }
};

module.exports = { notifyAppointmentStakeholders };
