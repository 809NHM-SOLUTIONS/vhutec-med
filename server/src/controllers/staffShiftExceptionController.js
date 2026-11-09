
const prisma = require("../prisma");

// -----------------------------------------------------------------------------
// Shared helpers
// -----------------------------------------------------------------------------

const exceptionInclude = {
    periods: {
        orderBy: { startTime: "asc" }
    },
    user: {
        select: {
            id: true,
            email: true,
            role: true,
            doctor: {
                select: {
                    firstName: true,
                    lastName: true,
                    speciality: true
                }
            },
            receptionist: {
                select: {
                    firstName: true,
                    lastName: true
                }
            }
        }
    }
};

const parseTime = (value) => {
    if (
        typeof value !== "string" ||
        !/^([01]\d|2[0-3]):[0-5]\d$/.test(value)
    ) {
        return null;
    }

    const [hours, minutes] = value.split(":").map(Number);
    return hours * 60 + minutes;
};

const parseDate = (value) => {
    if (
        typeof value !== "string" ||
        !/^\d{4}-\d{2}-\d{2}$/.test(value)
    ) {
        return null;
    }

    const date = new Date(`${value}T00:00:00.000Z`);

    if (
        Number.isNaN(date.getTime()) ||
        date.toISOString().slice(0, 10) !== value
    ) {
        return null;
    }

    return date;
};

const validatePeriods = (periods, mode) => {
    if (!Array.isArray(periods)) {
        return "periods must be an array";
    }

    if (mode === "ADD" && periods.length === 0) {
        return "ADD exceptions must contain at least one period";
    }

        const intervals = [];

    for (const period of periods) {
        if (
            !period ||
            typeof period !== "object" ||
            Array.isArray(period)
        ) {
            return "Each period must be an object";
        }

        const unknownFields = Object.keys(period).filter(
            field => !["startTime", "endTime"].includes(field)
        );

        if (unknownFields.length > 0) {
            return `Unsupported period fields: ${unknownFields.join(", ")}`;
        }

        const start = parseTime(period.startTime);
        const end = parseTime(period.endTime);

        if (start === null) {
            return "Each period startTime must use 24-hour HH:mm format";
        }

        if (end === null) {
            return "Each period endTime must use 24-hour HH:mm format";
        }

        if (start === end) {
            return "A period startTime and endTime cannot be the same";
        }

        intervals.push({
            start,
            end: end <= start ? end + 1440 : end
        });
    }

    // Check same-date and overnight overlaps across midnight.
    for (let i = 0; i < intervals.length; i++) {
        for (let j = i + 1; j < intervals.length; j++) {
            for (const offset of [-1440, 0, 1440]) {
                const first = intervals[i];
                const second = {
                    start: intervals[j].start + offset,
                    end: intervals[j].end + offset
                };

                if (
                    first.start < second.end &&
                    second.start < first.end
                ) {
                    return "Exception periods cannot overlap";
                }
            }
        }
    }
    return null;
};
const validateStaffUser = async (tx, userId) => {
    const user = await tx.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            role: true
        }
    });

    if (!user) {
        return {
            valid: false,
            status: 404,
            message: "Staff user not found"
        };
    }

    if (!["DOCTOR", "RECEPTIONIST"].includes(user.role)) {
        return {
            valid: false,
            status: 400,
            message: "Exceptions can only be assigned to doctors or receptionists"
        };
    }

    return { valid: true };
};

const validateMode = (mode) => {
    return ["REPLACE", "ADD"].includes(mode);
};

const sendError = (res, error, operation) => {
    if (error.status) {
        return res.status(error.status).json({
            success: false,
            message: error.message
        });
    }

    if (error.code === "P2002") {
        return res.status(409).json({
            success: false,
            message: "An exception already exists for this staff member on this date"
        });
    }

    if (error.code === "P2034") {
        return res.status(409).json({
            success: false,
            message: "A concurrent schedule change occurred. Please retry."
        });
    }

    console.error(`${operation}:`, error);

    return res.status(500).json({
        success: false,
        message: "Failed to process staff shift exception"
    });
};

// -----------------------------------------------------------------------------
// GET /api/staff-shift-exceptions/me
// DOCTOR and RECEPTIONIST: view their own exceptions.
// -----------------------------------------------------------------------------

const getMyExceptions = async (req, res) => {
    try {
        const exceptions = await prisma.staffShiftException.findMany({
            where: {
                userId: req.user.userId
            },
            include: exceptionInclude,
            orderBy: { date: "asc" }
        });

        return res.json({
            success: true,
            count: exceptions.length,
            data: exceptions
        });
    } catch (error) {
        return sendError(res, error, "Get own staff shift exceptions error");
    }
};

// -----------------------------------------------------------------------------
// GET /api/staff-shift-exceptions
// ADMIN: view all exceptions, with optional filters.
// -----------------------------------------------------------------------------

const getAllExceptions = async (req, res) => {
    try {
        const where = {};

        if (req.query.userId !== undefined) {
            const userId = Number(req.query.userId);

            if (!Number.isSafeInteger(userId) || userId <= 0) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid userId filter"
                });
            }

            where.userId = userId;
        }

        if (req.query.date !== undefined) {
            const date = parseDate(req.query.date);

            if (!date) {
                return res.status(400).json({
                    success: false,
                    message: "date must use YYYY-MM-DD format"
                });
            }

            where.date = date;
        }

        if (req.query.mode !== undefined) {
            if (!validateMode(req.query.mode)) {
                return res.status(400).json({
                    success: false,
                    message: "mode must be REPLACE or ADD"
                });
            }

            where.mode = req.query.mode;
        }

        const exceptions = await prisma.staffShiftException.findMany({
            where,
            include: exceptionInclude,
            orderBy: [
                { date: "asc" },
                { userId: "asc" }
            ]
        });

        return res.json({
            success: true,
            count: exceptions.length,
            data: exceptions
        });
    } catch (error) {
        return sendError(res, error, "Get all staff shift exceptions error");
    }
};

// -----------------------------------------------------------------------------
// POST /api/staff-shift-exceptions
// ADMIN: create a date-specific exception.
// -----------------------------------------------------------------------------

const createException = async (req, res) => {
    try {
        const userId = Number(req.body.userId);
        const { date, mode, reason, periods } = req.body;

        if (!Number.isSafeInteger(userId) || userId <= 0) {
            return res.status(400).json({
                success: false,
                message: "A valid userId is required"
            });
        }

        const parsedDate = parseDate(date);

        if (!parsedDate) {
            return res.status(400).json({
                success: false,
                message: "date must use a valid YYYY-MM-DD format"
            });
        }

        if (!validateMode(mode)) {
            return res.status(400).json({
                success: false,
                message: "mode must be REPLACE or ADD"
            });
        }

        if (
            reason !== undefined &&
            reason !== null &&
            typeof reason !== "string"
        ) {
            return res.status(400).json({
                success: false,
                message: "reason must be a string or null"
            });
        }

        if (periods === undefined) {
            return res.status(400).json({
                success: false,
                message: "periods is required. Use an empty array for a REPLACE day off."
            });
        }

        const periodsError = validatePeriods(periods, mode);

        if (periodsError) {
            return res.status(400).json({
                success: false,
                message: periodsError
            });
        }

        const exception = await prisma.$transaction(async (tx) => {
            const staffValidation = await validateStaffUser(tx, userId);

            if (!staffValidation.valid) {
                const error = new Error(staffValidation.message);
                error.status = staffValidation.status;
                throw error;
            }

            return tx.staffShiftException.create({
                data: {
                    userId,
                    date: parsedDate,
                    mode,
                    reason: reason?.trim() || null,
                    periods: {
                        create: periods.map(period => ({
                            startTime: period.startTime,
                            endTime: period.endTime
                        }))
                    }
                },
                include: exceptionInclude
            });
        }, {
            isolationLevel: "Serializable"
        });

        return res.status(201).json({
            success: true,
            message: "Staff shift exception created successfully",
            data: exception
        });
    } catch (error) {
        return sendError(res, error, "Create staff shift exception error");
    }
};

// -----------------------------------------------------------------------------
// PUT /api/staff-shift-exceptions/:id
// ADMIN: update an existing exception.
// -----------------------------------------------------------------------------

const updateException = async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isSafeInteger(id) || id <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid exception ID"
            });
        }

        const allowedFields = [
            "userId",
            "date",
            "mode",
            "reason",
            "periods"
        ];

        const unknownFields = Object.keys(req.body).filter(
            field => !allowedFields.includes(field)
        );

        if (unknownFields.length > 0) {
            return res.status(400).json({
                success: false,
                message: `Unsupported fields: ${unknownFields.join(", ")}`
            });
        }

        if (Object.keys(req.body).length === 0) {
            return res.status(400).json({
                success: false,
                message: "Provide at least one field to update"
            });
        }

        const updatedException = await prisma.$transaction(async (tx) => {
            const existing = await tx.staffShiftException.findUnique({
                where: { id },
                include: { periods: true }
            });

            if (!existing) {
                const error = new Error("Staff shift exception not found");
                error.status = 404;
                throw error;
            }

            const userId = req.body.userId !== undefined
                ? Number(req.body.userId)
                : existing.userId;

            const date = req.body.date !== undefined
                ? parseDate(req.body.date)
                : existing.date;

            const mode = req.body.mode !== undefined
                ? req.body.mode
                : existing.mode;

            const reason = req.body.reason !== undefined
                ? req.body.reason
                : existing.reason;

            const periods = req.body.periods !== undefined
                ? req.body.periods
                : existing.periods.map(period => ({
                    startTime: period.startTime,
                    endTime: period.endTime
                }));

            if (!Number.isSafeInteger(userId) || userId <= 0) {
                const error = new Error("Invalid userId");
                error.status = 400;
                throw error;
            }

            if (!date) {
                const error = new Error("date must use a valid YYYY-MM-DD format");
                error.status = 400;
                throw error;
            }

            if (!validateMode(mode)) {
                const error = new Error("mode must be REPLACE or ADD");
                error.status = 400;
                throw error;
            }

            if (
                reason !== null &&
                reason !== undefined &&
                typeof reason !== "string"
            ) {
                const error = new Error("reason must be a string or null");
                error.status = 400;
                throw error;
            }

            const periodsError = validatePeriods(periods, mode);

            if (periodsError) {
                const error = new Error(periodsError);
                error.status = 400;
                throw error;
            }

            const staffValidation = await validateStaffUser(tx, userId);

            if (!staffValidation.valid) {
                const error = new Error(staffValidation.message);
                error.status = staffValidation.status;
                throw error;
            }

            const duplicate = await tx.staffShiftException.findFirst({
                where: {
                    userId,
                    date,
                    id: { not: id }
                }
            });

            if (duplicate) {
                const error = new Error(
                    "An exception already exists for this staff member on this date"
                );
                error.status = 409;
                throw error;
            }

            return tx.staffShiftException.update({
                where: { id },
                data: {
                    userId,
                    date,
                    mode,
                    reason: reason?.trim() || null,
                    periods: {
                        deleteMany: {},
                        create: periods.map(period => ({
                            startTime: period.startTime,
                            endTime: period.endTime
                        }))
                    }
                },
                include: exceptionInclude
            });
        }, {
            isolationLevel: "Serializable"
        });

        return res.json({
            success: true,
            message: "Staff shift exception updated successfully",
            data: updatedException
        });
    } catch (error) {
        return sendError(res, error, "Update staff shift exception error");
    }
};

// -----------------------------------------------------------------------------
// DELETE /api/staff-shift-exceptions/:id
// ADMIN: remove an exception and restore the normal recurring schedule.
// -----------------------------------------------------------------------------

const deleteException = async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isSafeInteger(id) || id <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid exception ID"
            });
        }

        const existing = await prisma.staffShiftException.findUnique({
            where: { id }
        });

        if (!existing) {
            return res.status(404).json({
                success: false,
                message: "Staff shift exception not found"
            });
        }

        await prisma.staffShiftException.delete({
            where: { id }
        });

        return res.json({
            success: true,
            message: "Staff shift exception deleted successfully"
        });
    } catch (error) {
        return sendError(res, error, "Delete staff shift exception error");
    }
};

module.exports = {
    getMyExceptions,
    getAllExceptions,
    createException,
    updateException,
    deleteException
};
