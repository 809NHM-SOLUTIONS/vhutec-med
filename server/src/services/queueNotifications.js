const prisma = require("../prisma");
const { createNotification } = require("./notificationService");

const notifyQueueEvent = async ({ queue, type, eventKey }) => {
    try {
        const appointment = await prisma.appointment.findUnique({
            where: { id: queue.appointmentId },
            select: {
                id: true,
                patient: { select: { userId: true } },
                // ADDED: We need the doctor's name
                doctor: { select: { firstName: true, lastName: true, userId: true } }
            }
        });

        if (!appointment) return;

        const receptionists = await prisma.receptionist.findMany({
            select: { userId: true }
        });

        const doctorName = appointment.doctor
            ? `Dr. ${appointment.doctor.firstName} ${appointment.doctor.lastName}`
            : "the doctor";

        const messages = {
            PATIENT_CHECKED_IN: {
                patient: ["Check-in received", "Your check-in has been recorded."],
                doctor: ["Patient checked in", "A patient assigned to you has checked in."],
                receptionist: ["Patient checked in", "A patient has checked in."]
            },
            PATIENT_CALLED: {
                // UPDATED: Adds doctor name to the patient's notification
                patient: ["You are being called", `You are called to consult with ${doctorName}. Please proceed to the consultation room.`],
                doctor: ["Patient called", "The queue status has changed to called."],
                receptionist: ["Patient called", "A patient has been called for consultation."]
            },
            QUEUE_UPDATED: {
                patient: ["Queue updated", "Your queue status has been updated."],
                doctor: ["Queue updated", "An assigned patient's queue status has changed."],
                receptionist: ["Queue updated", "A queue status has changed."]
            }
        };

        const templates = messages[type];
        if (!templates) return;

        const recipients = new Map();

        if (appointment.patient?.userId) {
            recipients.set(appointment.patient.userId, templates.patient);
        }

        if (appointment.doctor?.userId) {
            recipients.set(appointment.doctor.userId, templates.doctor);
        }

        for (const receptionist of receptionists) {
            if (receptionist.userId && !recipients.has(receptionist.userId)) {
                recipients.set(receptionist.userId, templates.receptionist);
            }
        }

        await Promise.all(
            [...recipients.entries()].map(([userId, content]) =>
                createNotification({
                    userId,
                    appointmentId: appointment.id,
                    type,
                    title: content[0],
                    message: content[1],
                    data: {
                        appointmentId: appointment.id,
                        queueId: queue.id,
                        queueNumber: queue.queueNumber,
                        status: queue.status
                    },
                    dedupeKey: `${eventKey}:user:${userId}`
                })
            )
        );
    } catch (error) {
        console.error("Queue notification error:", error.message);
    }
};

module.exports = { notifyQueueEvent };