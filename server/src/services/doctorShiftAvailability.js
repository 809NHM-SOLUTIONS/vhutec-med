
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

    const [shifts, exceptions] = await Promise.all([
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
        })
    ]);
    const exceptionMap = new Map(
      exceptions.map((exception) => [
            getDateKey(exception.date),
            exception
        ])
    );

    const periodsForDate = (date, dayOfWeek) => {
        const exception = exceptionMap.get(getDateKey(date));

        const recurring = shifts.filter(
            (shift) => shift.dayOfWeek === dayOfWeek
        );

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
