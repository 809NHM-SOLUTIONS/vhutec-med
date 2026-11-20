"use strict";

// Appointment.date is stored as midnight UTC of the booked YYYY-MM-DD and
// Appointment.timeSlot as "HH:mm" clinic time. The clinic is in South Africa
// (SAST = UTC+02:00, no daylight saving), so the real start of an appointment
// is the booked date + time at +02:00.
const CLINIC_UTC_OFFSET = "+02:00";

// Statuses a patient may still cancel. Anything past these (checked in,
// in progress, completed, missed) belongs to the clinic workflow.
const CANCELLABLE_STATUSES = ["PENDING", "CONFIRMED"];

const TIME_SLOT_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

// Returns the real start time (a Date) or null when date/time are unusable.
const getAppointmentStartsAt = (date, timeSlot) => {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return null;
    if (typeof timeSlot !== "string" || !TIME_SLOT_PATTERN.test(timeSlot)) {
        return null;
    }

    const dateKey = date.toISOString().slice(0, 10);
    const startsAt = new Date(`${dateKey}T${timeSlot}:00${CLINIC_UTC_OFFSET}`);

    return Number.isNaN(startsAt.getTime()) ? null : startsAt;
};

// True when the appointment has already started (or the time is exactly now).
// Unusable legacy values return false, so they never block anything on their own.
const isAppointmentInPast = (date, timeSlot, now = new Date()) => {
    const startsAt = getAppointmentStartsAt(date, timeSlot);
    return startsAt !== null && startsAt.getTime() <= now.getTime();
};

// Returns a patient-facing reason the appointment cannot be cancelled,
// or null when cancelling is allowed.
const getCancellationBlock = (appointment, now = new Date()) => {
    if (!CANCELLABLE_STATUSES.includes(appointment.status)) {
        return "This appointment can no longer be cancelled because it has already been checked in, started, completed or missed.";
    }

    if (isAppointmentInPast(appointment.date, appointment.timeSlot, now)) {
        return "Past appointments cannot be cancelled.";
    }

    return null;
};

module.exports = {
    CLINIC_UTC_OFFSET,
    CANCELLABLE_STATUSES,
    getAppointmentStartsAt,
    isAppointmentInPast,
    getCancellationBlock
};