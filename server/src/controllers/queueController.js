const prisma = require("../prisma");

// GET /api/queue
const getQueues = async (req, res) => {
    try {
        const queues = await prisma.queue.findMany({
            include: {
                appointment: {
                    include: {
                        patient: true,
                        doctor: true,
                        department: true
                    }
                }
            },
            orderBy: {
                id: "asc"
            }
        });

        res.json({
            success: true,
            data: queues
        });
    } catch (error) {
        console.error("Get queues error:", error);

        res.status(500).json({
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

        if (Number.isNaN(parsedAppointmentId)) {
            return res.status(400).json({
                success: false,
                message: "appointmentId must be a valid number"
            });
        }

        if (Number.isNaN(parsedQueueNumber)) {
            return res.status(400).json({
                success: false,
                message: "queueNumber must be a valid number"
            });
        }

        if (!status) {
            return res.status(400).json({
                success: false,
                message: "status is required"
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

        if (Number.isNaN(parsedQueueNumber)) {
            return res.status(400).json({
                success: false,
                message: "queueNumber must be a valid number"
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