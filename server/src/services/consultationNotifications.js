// const prisma = require("../prisma");
// const { createNotification } = require("./notificationService");

// const notifyConsultationEvent = async ({ consultation, type, eventKey }) => {
//     try {
//         const appointment = await prisma.appointment.findUnique({
//             where: { id: consultation.appointmentId },
//             select: {
//                 id: true,
//                 date: true,
//                 timeSlot: true,
//                 patient: { select: { userId: true, firstName: true, lastName: true } },
//                 doctor: { select: { userId: true, firstName: true, lastName: true } }
//             }
//         });

//         if (!appointment) return;

//         const receptionists = await prisma.receptionist.findMany({
//             select: { userId: true }
//         });

//         const doctorName = appointment.doctor 
//             ? `Dr. ${appointment.doctor.firstName} ${appointment.doctor.lastName}` 
//             : "The doctor";
        
//         const patientName = appointment.patient
//             ? `${appointment.patient.firstName} ${appointment.patient.lastName}`
//             : "The patient";

//         let title, message, receptionistMessage;

//         if (type === "CONSULTATION_STARTED") {
//             title = "Consultation started";
//             message = "Your consultation has started.";
//             receptionistMessage = `${doctorName} has started a consultation with ${patientName}.`;
//         } else if (type === "CONSULTATION_COMPLETED") {
//             title = "Consultation completed";
//             message = "Your consultation has been completed.";
//             receptionistMessage = `${doctorName} has completed the consultation with ${patientName}. You can now call the next patient.`;
//         } else {
//             return;
//         }

        
//         const recipients = new Map();

//         if (appointment.patient?.userId) {
//             recipients.set(appointment.patient.userId, {
//                 title,
//                 message,
//                 appointmentId: appointment.id,
//                 date: appointment.date,
//                 timeSlot: appointment.timeSlot
//             });
//         }

//         if (appointment.doctor?.userId) {
//             recipients.set(appointment.doctor.userId, {
//                 title,
//                 message,
//                 appointmentId: appointment.id,
//                 date: appointment.date,
//                 timeSlot: appointment.timeSlot
//             });
//         }

//         for (const receptionist of receptionists) {
//             if (receptionist.userId) {
//                 recipients.set(receptionist.userId, {
//                     title,
//                     message: receptionistMessage,
//                     appointmentId: appointment.id,
//                     date: appointment.date,
//                     timeSlot: appointment.timeSlot
//                 });
//             }
//         }

//         if (type === "CONSULTATION_COMPLETED") {
//             const dayStart = new Date(appointment.date);
//             dayStart.setHours(0, 0, 0, 0);

//             const dayEnd = new Date(dayStart);
//             dayEnd.setDate(dayEnd.getDate() + 1);

//             const nextQueue = await prisma.queue.findFirst({
//                 where: {
//                     status: "WAITING",
//                     appointment: {
//                         doctorId: consultation.doctorId,
//                         date: {
//                             gte: dayStart,
//                             lt: dayEnd
//                         }
//                     }
//                 },
//                 orderBy: [
//                     { queueNumber: "asc" },
//                     { createdAt: "asc" }
//                 ],
//                 include: {
//                     appointment: {
//                         select: {
//                             id: true,
//                             date: true,
//                             timeSlot: true,
//                             patient: {
//                                 select: { userId: true }
//                             }
//                         }
//                     }
//                 }
//             });

//             const nextAppointment = nextQueue?.appointment;
//             const nextPatientUserId = nextAppointment?.patient?.userId;

//             if (nextAppointment && nextPatientUserId) {
//                 recipients.set(nextPatientUserId, {
//                     title: "Get Ready",
//                     message: "The previous consultation has ended. You are next in line. Please get ready to enter.",
//                     appointmentId: nextAppointment.id,
//                     date: nextAppointment.date,
//                     timeSlot: nextAppointment.timeSlot
//                 });
//             }
//         }

//         await Promise.all(
//             [...recipients.entries()].map(([userId, content]) =>
//                 createNotification({
//                     userId,
//                     appointmentId: content.appointmentId,
//                     type,
//                     title: content.title,
//                     message: content.message,
//                     data: {
//                         appointmentId: content.appointmentId,
//                         consultationId: consultation.id,
//                         date: content.date.toISOString(),
//                         timeSlot: content.timeSlot
//                     },
//                     dedupeKey: `${eventKey}:user:${userId}`
//                 })
//             )
//         );

//     } catch (error) {
//         console.error("Consultation notification error:", error.message);
//     }
// };

// module.exports = { notifyConsultationEvent };




const prisma = require("../prisma");
const { createNotification } = require("./notificationService");

const notifyConsultationEvent = async ({ consultation, type, eventKey }) => {
    try {
        const appointment = await prisma.appointment.findUnique({
            where: { id: consultation.appointmentId },
            select: {
                id: true,
                date: true,
                timeSlot: true,
                patient: {
                    select: {
                        userId: true,
                        firstName: true,
                        lastName: true
                    }
                },
                doctor: {
                    select: {
                        userId: true,
                        firstName: true,
                        lastName: true
                    }
                }
            }
        });

        if (!appointment) return;

        const receptionists = await prisma.receptionist.findMany({
            select: { userId: true }
        });

        const doctorName = appointment.doctor
            ? `Dr. ${appointment.doctor.firstName} ${appointment.doctor.lastName}`
            : "The doctor";

        const patientName = appointment.patient
            ? `${appointment.patient.firstName} ${appointment.patient.lastName}`
            : "The patient";

        let title;
        let message;
        let receptionistMessage;

        if (type === "CONSULTATION_STARTED") {
            title = "Consultation started";
            message = "Your consultation has started.";
            receptionistMessage =
                `${doctorName} has started a consultation with ${patientName}.`;
        } else if (type === "CONSULTATION_COMPLETED") {
            title = "Consultation completed";
            message = "Your consultation has been completed.";
            receptionistMessage =
                `${doctorName} has completed the consultation with ${patientName}. You can now call the next patient.`;
        } else {
            return;
        }

        const recipients = new Map();

        const addRecipient = (userId, content) => {
            if (userId) {
                recipients.set(Number(userId), content);
            }
        };

        const currentAppointmentContent = {
            title,
            message,
            appointmentId: appointment.id,
            date: appointment.date,
            timeSlot: appointment.timeSlot
        };

        addRecipient(
            appointment.patient?.userId,
            currentAppointmentContent
        );

        addRecipient(
            appointment.doctor?.userId,
            currentAppointmentContent
        );

        for (const receptionist of receptionists) {
            addRecipient(receptionist.userId, {
                ...currentAppointmentContent,
                message: receptionistMessage
            });
        }

        if (type === "CONSULTATION_COMPLETED") {
            const appointmentDay = new Date(appointment.date);

            const dayStart = new Date(appointmentDay);
            dayStart.setHours(0, 0, 0, 0);

            const dayEnd = new Date(dayStart);
            dayEnd.setDate(dayEnd.getDate() + 1);
            const nextQueue = await prisma.queue.findFirst({
                where: {
                    status: "WAITING",
                    appointment: {
                        doctorId: consultation.doctorId,
                        date: {
                            gte: dayStart,
                            lt: dayEnd
                        }
                    }
                },
                orderBy: [
                    { queueNumber: "asc" },
                    { createdAt: "asc" }
                ],
                include: {
                    appointment: {
                        select: {
                            id: true,
                            date: true,
                            timeSlot: true,
                            patient: {
                                select: { userId: true }
                            }
                        }
                    }
                }
            });

            const nextAppointment = nextQueue?.appointment;
            const nextPatientUserId = nextAppointment?.patient?.userId;

            if (
                nextAppointment &&
                nextPatientUserId &&
                nextAppointment.id !== appointment.id
            ) {
               addRecipient(nextPatientUserId, {
    type: "QUEUE_UPDATED",
    title: "Get Ready",
    message:
        "The previous consultation has ended. You are next in line. Please get ready to enter.",
    appointmentId: nextAppointment.id,
    date: nextAppointment.date,
    timeSlot: nextAppointment.timeSlot
});
            }
        }

     await Promise.all(
    [...recipients.entries()].map(([userId, content]) =>
        createNotification({
            userId,
            appointmentId: content.appointmentId,
            type: content.type || type,
                    title: content.title,
                    message: content.message,
                    data: {
                        appointmentId: content.appointmentId,
                        consultationId: consultation.id,
                        date: content.date.toISOString(),
                        timeSlot: content.timeSlot
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
