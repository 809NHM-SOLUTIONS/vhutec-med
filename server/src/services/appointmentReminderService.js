
const prisma = require("../prisma");
const { createNotification } = require("./notificationService");

// VHUTEC-MED uses South African local appointment times.
const CHECK_INTERVAL_MS = 60 * 1000;
const MISSED_GRACE_PERIOD_MS = 60 * 60 * 1000;

let reminderTimer = null;
let checkInProgress = false;

const getAppointmentInstant = (appointment) => {
    const date = appointment.date;

    // Slots may be a start time or a range; missed grace uses the start time.
    const timeMatch = /^(\d{1,2}):(\d{2})(?:\s*-\s*\d{1,2}:\d{2})?$/.exec(
        appointment.timeSlot || ""
    );

    if (!date || !timeMatch) {
        return null;
    }

    const hours = Number(timeMatch[1]);
    const minutes = Number(timeMatch[2]);

    if (hours > 23 || minutes > 59) {
        return null;
    }

    // Stored appointment date represents the selected calendar date.
    // South Africa is UTC+02:00 and does not observe DST.
    const localDateAsUtc = Date.UTC(
        date.getUTCFullYear(),
        date.getUTCMonth(),
        date.getUTCDate(),
        hours,
        minutes
    );

    return new Date(localDateAsUtc - 2 * 60 * 60 * 1000);
};

// Automatically mark unattended appointments and their queue records as MISSED.
const checkMissedAppointments = async (now = new Date()) => {
    try {
        const appointments = await prisma.appointment.findMany({
            where: {
                status: {
                    in: ["PENDING", "CONFIRMED"]
                }
            },
            select: {
                id: true,
                date: true,
                timeSlot: true,
                patient: {
                    select: {
                        userId: true
                    }
                },
                doctor: {
                    select: {
                        userId: true
                    }
                }
            }
        });

        let missedCount = 0;

        for (const appointment of appointments) {
            const appointmentInstant = getAppointmentInstant(appointment);

            if (!appointmentInstant) {
                continue;
            }

            const missedAt = new Date(
                appointmentInstant.getTime() + MISSED_GRACE_PERIOD_MS
            );

            if (now < missedAt) {
                continue;
            }

            // Update the appointment and queue together.
            const updated = await prisma.$transaction(async (tx) => {
                const result = await tx.appointment.updateMany({
                    where: {
                        id: appointment.id,
                        status: {
                            in: ["PENDING", "CONFIRMED"]
                        }
                    },
                    data: {
                        status: "MISSED"
                    }
                });

                // Another process may already have handled this appointment.
                if (result.count === 0) {
                    return null;
                }

                const queueResult = await tx.queue.updateMany({
                    where: {
                        appointmentId: appointment.id,
                        status: {
                            in: ["WAITING", "CALLED"]
                        }
                    },
                    data: {
                        status: "MISSED"
                    }
                });

                return {
                    appointmentUpdated: true,
                    queueUpdatedCount: queueResult.count
                };
            });

            // Do not send notifications if this process did not update it.
            if (!updated) {
                continue;
            }

            missedCount++;

            console.log(
                `Appointment ${appointment.id} marked as MISSED. Queue records updated: ${updated.queueUpdatedCount}.`
            );

            const appointmentDate = appointment.date
                .toISOString()
                .slice(0, 10);

            const notificationRecipients = [
                {
                    userId: appointment.patient?.userId,
                    title: "Appointment marked as missed",
                    message: `Your appointment scheduled for ${appointmentDate} at ${appointment.timeSlot} has been marked as missed. Please contact the hospital if you need assistance.`,
                    recipientType: "patient"
                },
                {
                    userId: appointment.doctor?.userId,
                    title: "Patient missed appointment",
                    message: `The patient scheduled for ${appointmentDate} at ${appointment.timeSlot} did not attend. The appointment has been marked as missed.`,
                    recipientType: "doctor"
                }
            ];

            // Notify the patient and assigned doctor separately.
            for (const recipient of notificationRecipients) {
                if (!recipient.userId) {
                    continue;
                }

                try {
                    await createNotification({
                        userId: recipient.userId,
                        appointmentId: appointment.id,
                        type: "APPOINTMENT_MISSED",
                        title: recipient.title,
                        message: recipient.message,
                        data: {
                            appointmentId: appointment.id,
                            date: appointmentDate,
                            timeSlot: appointment.timeSlot,
                            status: "MISSED"
                        },
                        dedupeKey: `appointment-missed:${appointment.id}:${recipient.recipientType}:${recipient.userId}`
                    });

                    console.log(
                        `Missed appointment notification processed for ${recipient.recipientType}, user ${recipient.userId}.`
                    );
                } catch (error) {
                    console.error(
                        `Missed appointment notification failed for ${recipient.recipientType}, user ${recipient.userId}:`,
                        error.message
                    );
                }
            }
        }
        const missedAppointments = await prisma.appointment.findMany({
            where: {
                status: "MISSED"
            },
            select: {
                id: true,
                date: true,
                timeSlot: true,
                patient: {
                    select: {
                        userId: true
                    }
                },
                doctor: {
                    select: {
                        userId: true
                    }
                },
                notifications: {
                    where: {
                        type: "APPOINTMENT_MISSED"
                    },
                    select: {
                        dedupeKey: true
                    }
                }
            }
        });

        let retryCount = 0;

        for (const appointment of missedAppointments) {
            const appointmentDate = appointment.date
                .toISOString()
                .slice(0, 10);

            const existingKeys = new Set(
                appointment.notifications
                    .map(notification => notification.dedupeKey)
                    .filter(Boolean)
            );

            const recipients = [
                {
                    userId: appointment.patient?.userId,
                    recipientType: "patient",
                    title: "Appointment marked as missed",
                    message: `Your appointment scheduled for ${appointmentDate} at ${appointment.timeSlot} has been marked as missed. Please contact the hospital if you need assistance.`
                },
                {
                    userId: appointment.doctor?.userId,
                    recipientType: "doctor",
                    title: "Patient missed appointment",
                    message: `The patient scheduled for ${appointmentDate} at ${appointment.timeSlot} did not attend. The appointment has been marked as missed.`
                }
            ];

            for (const recipient of recipients) {
                if (!recipient.userId) continue;

                const dedupeKey =
                    `appointment-missed:${appointment.id}:${recipient.recipientType}:${recipient.userId}`;

                // Skip recipients who already have a saved notification.
                if (existingKeys.has(dedupeKey)) {
                    continue;
                }

                try {
                    await createNotification({
                        userId: recipient.userId,
                        appointmentId: appointment.id,
                        type: "APPOINTMENT_MISSED",
                        title: recipient.title,
                        message: recipient.message,
                        data: {
                            appointmentId: appointment.id,
                            date: appointmentDate,
                            timeSlot: appointment.timeSlot,
                            status: "MISSED"
                        },
                        dedupeKey
                    });

                    existingKeys.add(dedupeKey);
                    retryCount++;

                    console.log(
                        `Recovered missed-appointment notification for ${recipient.recipientType}, user ${recipient.userId}.`
                    );
                } catch (error) {
                    console.error(
                        `Missed notification retry failed for appointment ${appointment.id}, ${recipient.recipientType}:`,
                        error.message
                    );
                }
            }
        }

        if (retryCount > 0) {
            console.log(
                `Missed notification recovery completed: ${retryCount} notification(s) recovered.`
            );
        }
        if (missedCount > 0) {
            console.log(
                `Missed appointment check completed: ${missedCount} appointment(s) updated.`
            );
        }
    } catch (error) {
        console.error(
            "Missed appointment check failed:",
            error.message
        );
    }
};

const checkAppointmentReminders = async () => {
    if (checkInProgress) return;

    checkInProgress = true;

    try {
        const now = new Date();

        const appointments = await prisma.appointment.findMany({
            where: {
                status: {
                    in: ["PENDING", "CONFIRMED"]
                },
                date: {
                    gte: new Date(
                        Date.UTC(
                            now.getUTCFullYear(),
                            now.getUTCMonth(),
                            now.getUTCDate() - 1
                        )
                    )
                }
            },
            select: {
                id: true,
                patientId: true,
                date: true,
                timeSlot: true,
                status: true,
                updatedAt: true,
                patient: {
                    select: {
                        userId: true
                    }
                }
            }
        });

        // Existing appointment reminder functionality.
        for (const appointment of appointments) {
            const appointmentInstant = getAppointmentInstant(appointment);

            if (!appointmentInstant) continue;

            const reminderAt = new Date(
                appointmentInstant.getTime() - 10 * 60 * 1000
            );

            const gracePeriodStart = new Date(
                now.getTime() - 2 * CHECK_INTERVAL_MS
            );

            if (
                reminderAt > now ||
                reminderAt < gracePeriodStart ||
                appointmentInstant <= now
            ) {
                continue;
            }

            if (!appointment.patient?.userId) continue;

            try {
                await createNotification({
                    userId: appointment.patient.userId,
                    appointmentId: appointment.id,
                    type: "APPOINTMENT_REMINDER",
                    title: "Upcoming appointment",
                    message: `Your appointment is scheduled for ${appointment.date.toISOString().slice(0, 10)} at ${appointment.timeSlot}.`,
                    data: {
                        appointmentId: appointment.id,
                        date: appointment.date.toISOString(),
                        timeSlot: appointment.timeSlot
                    },
                    dedupeKey: `appointment-reminder:${appointment.id}:${appointment.date.toISOString().slice(0, 10)}:${appointment.timeSlot}`
                });
            } catch (error) {
                console.error(
                    `Reminder failed for appointment ${appointment.id}:`,
                    error.message
                );
            }
        }

        // Run the missed appointment check using the same scheduler.
        await checkMissedAppointments(now);

    } catch (error) {
        console.error(
            "Appointment reminder check failed:",
            error.message
        );
    } finally {
        checkInProgress = false;
    }
};

const startAppointmentReminderService = () => {
    if (reminderTimer) return;

    // Check immediately on startup, then once per minute.
    checkAppointmentReminders().catch((error) => {
        console.error("Initial reminder check failed:", error.message);
    });

    reminderTimer = setInterval(() => {
        checkAppointmentReminders().catch((error) => {
            console.error("Scheduled reminder check failed:", error.message);
        });
    }, CHECK_INTERVAL_MS);

    reminderTimer.unref();

    console.log(
        "Appointment reminder and missed appointment services started."
    );
};

module.exports = {
    startAppointmentReminderService,
    checkAppointmentReminders,
    checkMissedAppointments
};
