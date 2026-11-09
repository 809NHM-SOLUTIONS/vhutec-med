const prisma = require("../prisma");

// -----------------------------------------------------------------------------
// Shared helpers
// -----------------------------------------------------------------------------

const staffInclude = {
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

const getShiftInterval = (dayOfWeek, startTime, endTime) => {
    const startMinutes = parseTime(startTime);
    const endMinutes = parseTime(endTime);

    if (startMinutes === null || endMinutes === null) {
        return null;
    }

    if (startMinutes === endMinutes) {
        return null;
    }

    const weekMinutes = 7 * 24 * 60;
    const start = (dayOfWeek - 1) * 1440 + startMinutes;

    let end = (dayOfWeek - 1) * 1440 + endMinutes;

    // An end time earlier than the start time means an overnight shift.
    if (end <= start) {
        end += 1440;
    }

    return { start, end, weekMinutes };
};

const intervalsOverlap = (first, second) => {
    return first.start < second.end && second.start < first.end;
};

// Checks weekly overlaps, including Sunday/Monday and overnight boundaries.
const hasOverlappingShift = (candidate, existingShifts) => {
    const weekMinutes = 7 * 24 * 60;

    for (const shift of existingShifts) {
        const existing = getShiftInterval(
            shift.dayOfWeek,
            shift.startTime,
            shift.endTime
        );

        if (!existing) continue;

        for (const offset of [-weekMinutes, 0, weekMinutes]) {
            const adjustedExisting = {
                start: existing.start + offset,
                end: existing.end + offset
            };

            if (intervalsOverlap(candidate, adjustedExisting)) {
                return true;
            }
        }
    }

    return false;
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
            message: "Shifts can only be assigned to doctors or receptionists"
        };
    }

    return { valid: true };
};

const validateShiftFields = (dayOfWeek, startTime, endTime) => {
    if (
        !Number.isInteger(dayOfWeek) ||
        dayOfWeek < 1 ||
        dayOfWeek > 7
    ) {
        return "dayOfWeek must be an integer from 1 (Monday) to 7 (Sunday)";
    }

    if (parseTime(startTime) === null) {
        return "startTime must use 24-hour HH:mm format";
    }

    if (parseTime(endTime) === null) {
        return "endTime must use 24-hour HH:mm format";
    }

    if (startTime === endTime) {
        return "Start time and end time cannot be the same";
    }

    return null;
};

// -----------------------------------------------------------------------------
// GET /api/staff-shifts/me
// Doctors and receptionists can view their own shifts.
// -----------------------------------------------------------------------------

const getMyShifts = async (req, res) => {
    try {
        const shifts = await prisma.staffShift.findMany({
            where: {
                userId: req.user.userId
            },
            include: staffInclude,
            orderBy: [
                { dayOfWeek: "asc" },
                { startTime: "asc" }
            ]
        });

        return res.json({
            success: true,
            data: shifts
        });
    } catch (error) {
        console.error("Get own staff shifts error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to retrieve your shifts"
        });
    }
};

// -----------------------------------------------------------------------------
// GET /api/staff-shifts
// ADMIN: view all shifts, with optional filters.
// -----------------------------------------------------------------------------

const getAllShifts = async (req, res) => {
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

        if (req.query.dayOfWeek !== undefined) {
            const dayOfWeek = Number(req.query.dayOfWeek);

            if (
                !Number.isInteger(dayOfWeek) ||
                dayOfWeek < 1 ||
                dayOfWeek > 7
            ) {
                return res.status(400).json({
                    success: false,
                    message: "dayOfWeek must be between 1 and 7"
                });
            }

            where.dayOfWeek = dayOfWeek;
        }

        if (req.query.isActive !== undefined) {
            if (!["true", "false"].includes(req.query.isActive)) {
                return res.status(400).json({
                    success: false,
                    message: "isActive must be true or false"
                });
            }

            where.isActive = req.query.isActive === "true";
        }

        const shifts = await prisma.staffShift.findMany({
            where,
            include: staffInclude,
            orderBy: [
                { userId: "asc" },
                { dayOfWeek: "asc" },
                { startTime: "asc" }
            ]
        });

        return res.json({
            success: true,
            count: shifts.length,
            data: shifts
        });
    } catch (error) {
        console.error("Get all staff shifts error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to retrieve staff shifts"
        });
    }
};

// -----------------------------------------------------------------------------
// POST /api/staff-shifts
// ADMIN: assign a recurring shift.
// -----------------------------------------------------------------------------

const createShift = async (req, res) => {
    try {
        const userId = Number(req.body.userId);
        const { dayOfWeek, startTime, endTime } = req.body;

        if (!Number.isSafeInteger(userId) || userId <= 0) {
            return res.status(400).json({
                success: false,
                message: "A valid userId is required"
            });
        }

        const validationError = validateShiftFields(
            dayOfWeek,
            startTime,
            endTime
        );

        if (validationError) {
            return res.status(400).json({
                success: false,
                message: validationError
            });
        }

        const candidate = getShiftInterval(dayOfWeek, startTime, endTime);

        const shift = await prisma.$transaction(async (tx) => {
            const staffValidation = await validateStaffUser(tx, userId);

            if (!staffValidation.valid) {
                const error = new Error(staffValidation.message);
                error.status = staffValidation.status;
                throw error;
            }

            const existingShifts = await tx.staffShift.findMany({
                where: {
                    userId,
                    isActive: true
                }
            });

            if (hasOverlappingShift(candidate, existingShifts)) {
                const error = new Error(
                    "This shift overlaps with another active shift for this staff member"
                );
                error.status = 409;
                throw error;
            }

            return tx.staffShift.create({
                data: {
                    userId,
                    dayOfWeek,
                    startTime,
                    endTime
                },
                include: staffInclude
            });
        }, {
            isolationLevel: "Serializable"
        });

        return res.status(201).json({
            success: true,
            message: "Staff shift created successfully",
            data: shift
        });
    } catch (error) {
        if (error.status) {
            return res.status(error.status).json({
                success: false,
                message: error.message
            });
        }

        if (error.code === "P2034") {
            return res.status(409).json({
                success: false,
                message: "A concurrent schedule change occurred. Please retry."
            });
        }

        console.error("Create staff shift error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to create staff shift"
        });
    }
};

// -----------------------------------------------------------------------------
// PUT /api/staff-shifts/:id
// ADMIN: update a recurring shift.
// -----------------------------------------------------------------------------

const updateShift = async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isSafeInteger(id) || id <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid shift ID"
            });
        }

        const allowedFields = [
            "userId",
            "dayOfWeek",
            "startTime",
            "endTime",
            "isActive"
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

        if (
            req.body.isActive !== undefined &&
            typeof req.body.isActive !== "boolean"
        ) {
            return res.status(400).json({
                success: false,
                message: "isActive must be a boolean"
            });
        }

        if (
            req.body.userId !== undefined &&
            (!Number.isSafeInteger(Number(req.body.userId)) ||
                Number(req.body.userId) <= 0)
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid userId"
            });
        }

        const updatedShift = await prisma.$transaction(async (tx) => {
            const existing = await tx.staffShift.findUnique({
                where: { id }
            });

            if (!existing) {
                const error = new Error("Staff shift not found");
                error.status = 404;
                throw error;
            }

            const userId = req.body.userId !== undefined
                ? Number(req.body.userId)
                : existing.userId;

            const dayOfWeek = req.body.dayOfWeek !== undefined
                ? req.body.dayOfWeek
                : existing.dayOfWeek;

            const startTime = req.body.startTime !== undefined
                ? req.body.startTime
                : existing.startTime;

            const endTime = req.body.endTime !== undefined
                ? req.body.endTime
                : existing.endTime;

            const isActive = req.body.isActive !== undefined
                ? req.body.isActive
                : existing.isActive;

            const validationError = validateShiftFields(
                dayOfWeek,
                startTime,
                endTime
            );

            if (validationError) {
                const error = new Error(validationError);
                error.status = 400;
                throw error;
            }

            const staffValidation = await validateStaffUser(tx, userId);

            if (!staffValidation.valid) {
                const error = new Error(staffValidation.message);
                error.status = staffValidation.status;
                throw error;
            }

            if (isActive) {
                const candidate = getShiftInterval(
                    dayOfWeek,
                    startTime,
                    endTime
                );

                const existingShifts = await tx.staffShift.findMany({
                    where: {
                        userId,
                        isActive: true,
                        id: { not: id }
                    }
                });

                if (hasOverlappingShift(candidate, existingShifts)) {
                    const error = new Error(
                        "This shift overlaps with another active shift for this staff member"
                    );
                    error.status = 409;
                    throw error;
                }
            }

            return tx.staffShift.update({
                where: { id },
                data: {
                    userId,
                    dayOfWeek,
                    startTime,
                    endTime,
                    isActive
                },
                include: staffInclude
            });
        }, {
            isolationLevel: "Serializable"
        });

        return res.json({
            success: true,
            message: "Staff shift updated successfully",
            data: updatedShift
        });
    } catch (error) {
        if (error.status) {
            return res.status(error.status).json({
                success: false,
                message: error.message
            });
        }

        if (error.code === "P2034") {
            return res.status(409).json({
                success: false,
                message: "A concurrent schedule change occurred. Please retry."
            });
        }

        console.error("Update staff shift error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to update staff shift"
        });
    }
};

// -----------------------------------------------------------------------------
// DELETE /api/staff-shifts/:id
// ADMIN: deactivate a shift without deleting its history.
// -----------------------------------------------------------------------------

const deactivateShift = async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isSafeInteger(id) || id <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid shift ID"
            });
        }

        const existing = await prisma.staffShift.findUnique({
            where: { id }
        });

        if (!existing) {
            return res.status(404).json({
                success: false,
                message: "Staff shift not found"
            });
        }

        if (!existing.isActive) {
            return res.json({
                success: true,
                message: "Staff shift is already inactive"
            });
        }

        const shift = await prisma.staffShift.update({
            where: { id },
            data: { isActive: false },
            include: staffInclude
        });

        return res.json({
            success: true,
            message: "Staff shift deactivated successfully",
            data: shift
        });
    } catch (error) {
        console.error("Deactivate staff shift error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to deactivate staff shift"
        });
    }
};

module.exports = {
    getMyShifts,
    getAllShifts,
    createShift,
    updateShift,
    deactivateShift
};