const prisma = require("../prisma");

const {
    notifyQueueEvent
} = require("../services/queueNotifications");

const getDoctorIdForUser = async (userId) => {
    const doctor = await prisma.doctor.findUnique({
        where: { userId },
        select: { id: true }
    });

    return doctor?.id ?? null;
};

const VALID_QUEUE_STATUSES = [
    "WAITING",
    "CALLED",
    "IN_CONSULTATION",
    "COMPLETED"
];


// GET /api/queue
const getQueues = async (req, res) => {
    try {
        let where = {};

        if (req.user.role === "DOCTOR") {
            const doctorId = await getDoctorIdForUser(
                Number(req.user.userId)
            );

            if (!doctorId) {
                return res.status(403).json({
                    success: false,
                    message: "Doctor profile not found"
                });
            }

            where = {
                appointment: {
                    doctorId
                }
            };
        }

        const queues = await prisma.queue.findMany({
            where,
            include: {
                appointment: {
                    include: {
                        patient: true,
                        doctor: true,
                        department: true
                    }
                }
            },
            orderBy: { id: "asc" }
        });

        return res.json({
            success: true,
            data: queues
        });
    } catch (error) {
        console.error("Get queues error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to retrieve queues"
        });
    }
};

// GET /api/queue/:id
const getQueueById = async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (Number.isNaN(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid queue ID"
            });
        }

        const queue = await prisma.queue.findUnique({
            where: { id },
            include: {
                appointment: {
                    include: {
                        patient: true,
                        doctor: true,
                        department: true
                    }
                }
            }
        });

        if (!queue) {
            return res.status(404).json({
                success: false,
                message: "Queue record not found"
            });
        }

        if (req.user.role === "DOCTOR") {
    const doctorId = await getDoctorIdForUser(
        Number(req.user.userId)
    );

    if (!doctorId || queue.appointment.doctorId !== doctorId) {
        return res.status(403).json({
            success: false,
            message: "You do not have access to this queue record"
        });
    }
}

        res.json({
            success: true,
            data: queue
        });
    } catch (error) {
        console.error("Get queue error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to retrieve queue"
        });
    }
};


// POST /api/queue
const createQueue = async (req, res) => {
    try {
        const {
            appointmentId,
            queueNumber,
            status
        } = req.body;

        const parsedAppointmentId = Number(appointmentId);
        const parsedQueueNumber = Number(queueNumber);

        if (!Number.isInteger(parsedAppointmentId) || parsedAppointmentId <= 0) {
    return res.status(400).json({
        success: false,
        message: "appointmentId must be a positive integer"
    });
}

        if (!Number.isInteger(parsedQueueNumber) || parsedQueueNumber <= 0) {
            return res.status(400).json({
                success: false,
                message: "queueNumber must be a positive integer"
            });
        }

        if (!VALID_QUEUE_STATUSES.includes(status)) {
            return res.status(400).json({
                success: false,
                message: "Invalid queue status"
            });
        }
        

        const appointment = await prisma.appointment.findUnique({
            where: {
                id: parsedAppointmentId
            }
        });

        if (!appointment) {
            return res.status(404).json({
                success: false,
                message: "Appointment not found"
            });
        }

        const existingQueue = await prisma.queue.findUnique({
            where: {
                appointmentId: parsedAppointmentId
            }
        });

        if (existingQueue) {
            return res.status(409).json({
                success: false,
                message: "A queue record already exists for this appointment"
            });
        }

        const queue = await prisma.queue.create({
            data: {
                appointmentId: parsedAppointmentId,
                queueNumber: parsedQueueNumber,
                status
            },
            include: {
                appointment: {
                    include: {
                        patient: true,
                        doctor: true,
                        department: true
                    }
                }
            }
        });

        res.status(201).json({
            success: true,
            data: queue
        });
    } catch (error) {
        console.error("Create queue error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to create queue record"
        });
    }
};

// PUT /api/queue/:id
const updateQueue = async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (Number.isNaN(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid queue ID"
            });
        }

        const existingQueue = await prisma.queue.findUnique({
            where: { id }
        });

        if (!existingQueue) {
            return res.status(404).json({
                success: false,
                message: "Queue record not found"
            });
        }

        const {
            queueNumber,
            status,
            checkedInAt,
            calledAt
        } = req.body;

        const parsedQueueNumber =
            queueNumber !== undefined
                ? Number(queueNumber)
                : existingQueue.queueNumber;

        if (!Number.isInteger(parsedQueueNumber) || parsedQueueNumber <= 0) {
    return res.status(400).json({
        success: false,
        message: "queueNumber must be a positive integer"
    });
}

if (
    status !== undefined &&
    !VALID_QUEUE_STATUSES.includes(status)
) {
    return res.status(400).json({
        success: false,
        message: "Invalid queue status"
    });
}
        let parsedCheckedInAt = existingQueue.checkedInAt;
        let parsedCalledAt = existingQueue.calledAt;

        if (checkedInAt !== undefined) {
            parsedCheckedInAt = checkedInAt
                ? new Date(checkedInAt)
                : null;

            if (
                parsedCheckedInAt &&
                Number.isNaN(parsedCheckedInAt.getTime())
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid checkedInAt date"
                });
            }
        }

        if (calledAt !== undefined) {
            parsedCalledAt = calledAt
                ? new Date(calledAt)
                : null;

            if (
                parsedCalledAt &&
                Number.isNaN(parsedCalledAt.getTime())
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid calledAt date"
                });
            }
        }

        const queue = await prisma.queue.update({
            where: { id },

            data: {
                queueNumber: parsedQueueNumber,

                status:
                    status !== undefined
                        ? status
                        : existingQueue.status,

                checkedInAt: parsedCheckedInAt,
                calledAt: parsedCalledAt
            },

            include: {
                appointment: {
                    include: {
                        patient: true,
                        doctor: true,
                        department: true
                    }
                }
            }
        });

        // Notify when a patient checks in for the first time.
if (!existingQueue.checkedInAt && queue.checkedInAt) {
    await notifyQueueEvent({
        queue,
        type: "PATIENT_CHECKED_IN",
        eventKey: `queue-checked-in:${queue.id}`
    });
}

// Notify when the queue status genuinely changes.
if (existingQueue.status !== queue.status) {
    const type =
        queue.status === "CALLED"
            ? "PATIENT_CALLED"
            : "QUEUE_UPDATED";

    await notifyQueueEvent({
        queue,
        type,
        eventKey: queue.status === "CALLED" && queue.calledAt
    ? `queue-called:${queue.id}:${queue.calledAt.toISOString()}`
    : `queue-status:${queue.id}:${queue.status}`
    });
}

        res.json({
            success: true,
            data: queue
        });
    } catch (error) {
        console.error("Update queue error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to update queue"
        });
    }
};


// DELETE /api/queue/:id
const deleteQueue = async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (Number.isNaN(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid queue ID"
            });
        }

        const existingQueue = await prisma.queue.findUnique({
            where: { id }
        });

        if (!existingQueue) {
            return res.status(404).json({
                success: false,
                message: "Queue record not found"
            });
        }

        await prisma.queue.delete({
            where: { id }
        });

        res.json({
            success: true,
            message: "Queue record deleted successfully"
        });
    } catch (error) {
        console.error("Delete queue error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to delete queue record"
        });
    }
};

module.exports = {
    getQueues,
    getQueueById,
    createQueue,
    updateQueue,
    deleteQueue
};