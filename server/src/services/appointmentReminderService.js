
const prisma = require("../prisma");
const { createNotification } = require("./notificationService");

// VHUTEC-MED uses South African local appointment times.

const CHECK_INTERVAL_MS = 60 * 1000;

let reminderTimer = null;
let checkInProgress = false;

const getAppointmentInstant = (appointment) => {
    const date = appointment.date;
    const timeMatch = /^(\d{1,2}):(\d{2})$/.exec(
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

    // The stored Date represents the selected calendar date.
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

        for (const appointment of appointments) {
            const appointmentInstant = getAppointmentInstant(appointment);

            if (!appointmentInstant) continue;

            const reminderAt = new Date(
                appointmentInstant.getTime() - 10 * 60 * 1000
            );

            // Send once when the 10-minute reminder time falls
            // inside the current polling window.
            // Send when the reminder time has arrived, provided the
            // appointment itself has not started yet.
           // Allow a small grace period for delayed polling or a brief restart.
            const gracePeriodStart = new Date(
                now.getTime() - 2 * CHECK_INTERVAL_MS
            );

            // Skip reminders that are too early or were missed by more than
            // the allowed grace period. Never remind for a started appointment.
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
    } catch (error) {
        console.error("Appointment reminder check failed:", error.message);
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

    // Keep the timer from preventing graceful process exit.
    reminderTimer.unref();

    console.log("Appointment reminder service started.");
};

module.exports = {
    startAppointmentReminderService,
    checkAppointmentReminders
};
