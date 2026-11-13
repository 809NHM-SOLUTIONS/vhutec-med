const { resolveAvailability } = require("./doctorAvailability");

const getIsoDayOfWeek = (date) => {
    const day = date.getUTCDay();
    return day === 0 ? 7 : day;
};

const getDateKey = (date) => date.toISOString().slice(0, 10);

const getDoctorShiftPeriods = async (tx, doctorId, appointmentDate) => {
    const dayStart = new Date(
        Date.UTC(
            appointmentDate.getUTCFullYear(),
            appointmentDate.getUTCMonth(),
            appointmentDate.getUTCDate()
        )
    );

    const previousDay = new Date(dayStart);
    previousDay.setUTCDate(previousDay.getUTCDate() - 1);

    const nextDay = new Date(dayStart);
    nextDay.setUTCDate(nextDay.getUTCDate() + 1);

    const doctor = await tx.doctor.findUnique({
        where: { id: doctorId },
        select: { userId: true }
    });

    if (!doctor) {
        const error = new Error("Doctor profile not found.");
        error.code = "DOCTOR_NOT_FOUND";
        throw error;
    }

    const currentDay = getIsoDayOfWeek(dayStart);
    const previousDayOfWeek = getIsoDayOfWeek(previousDay);

    const [shifts, exceptions, configuredShiftCount] = await Promise.all([
        tx.staffShift.findMany({
            where: {
                userId: doctor.userId,
                isActive: true,
                dayOfWeek: {
                    in: [currentDay, previousDayOfWeek]
                }
            },
            select: {
                dayOfWeek: true,
                startTime: true,
                endTime: true
            }
        }),

        tx.staffShiftException.findMany({
            where: {
                userId: doctor.userId,
                date: {
                    gte: previousDay,
                    lt: nextDay
                }
            },
            include: {
                periods: {
                    select: {
                        startTime: true,
                        endTime: true
                    }
                }
            }
        }),
        // Count inactive and other-day shifts too: neither permits a fallback.
        tx.staffShift.count({ where: { userId: doctor.userId } })
    ]);
    // Legacy doctors manage working hours through DoctorAvailability. Use that
    // existing schedule only until an explicit staff-shift schedule is configured.
    const availability = configuredShiftCount === 0
        ? resolveAvailability(await tx.doctorAvailability.findUnique({ where: { doctorId } }))
        : null;
    const exceptionMap = new Map(
      exceptions.map((exception) => [
            getDateKey(exception.date),
            exception
        ])
    );

    const periodsForDate = (date, dayOfWeek) => {
        const exception = exceptionMap.get(getDateKey(date));

        let recurring = shifts.filter(
            (shift) => shift.dayOfWeek === dayOfWeek
        );

        if (availability) {
            // DoctorAvailability.endTime is the last slot start, not closing time.
            const [hours, minutes] = availability.endTime.split(":").map(Number);
            const closingMinutes = hours * 60 + minutes + availability.slotMinutes;
            const closingTime = `${String(Math.floor(closingMinutes / 60) % 24).padStart(2, "0")}:${String(closingMinutes % 60).padStart(2, "0")}`;
            recurring = availability.workingDays.includes(date.getUTCDay())
                ? [{ startTime: availability.startTime, endTime: closingTime, endDayOffset: Math.floor(closingMinutes / 1440) }]
                : [];
        }

        if (!exception) return recurring;

        if (exception.mode === "REPLACE") {
            return exception.periods;
        }

        return [...recurring, ...exception.periods];
    };

    return {
        doctor,
        dayStart,
        previousDay,
        currentPeriods: periodsForDate(dayStart, currentDay),
        previousPeriods: periodsForDate(
            previousDay,
            previousDayOfWeek
        ),
        currentException: exceptionMap.get(getDateKey(dayStart)) || null
    };
};

module.exports = {
    getDoctorShiftPeriods
};
