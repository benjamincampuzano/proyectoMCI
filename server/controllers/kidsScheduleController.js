const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.getSchedulesByModule = async (req, res) => {
    try {
        const { moduleId } = req.params;
        const schedules = await prisma.kidsSchedule.findMany({
            where: { moduleId: parseInt(moduleId) },
            include: {
                teacher: {
                    select: { id: true, email: true, profile: { select: { fullName: true } } }
                },
                auxiliary: {
                    select: { id: true, email: true, profile: { select: { fullName: true } } }
                }
            },
            orderBy: { date: 'asc' }
        });

        res.json(schedules);
    } catch (error) {
        console.error('Error fetching kids schedules:', error);
        res.status(500).json({ error: 'Failed to fetch schedules' });
    }
};

exports.createSchedule = async (req, res) => {
    try {
        const { moduleId } = req.params;
        const { unit, date, lesson, bibleReading, memoryVerse, activity, teacherId, auxiliaryId, observations } = req.body;

        const schedule = await prisma.kidsSchedule.create({
            data: {
                moduleId: parseInt(moduleId),
                unit,
                date: new Date(date),
                lesson,
                bibleReading,
                memoryVerse,
                activity,
                teacherId: teacherId ? parseInt(teacherId) : null,
                auxiliaryId: auxiliaryId ? parseInt(auxiliaryId) : null,
                observations
            },
            include: {
                teacher: { select: { id: true, profile: { select: { fullName: true } } } },
                auxiliary: { select: { id: true, profile: { select: { fullName: true } } } }
            }
        });

        // Audit Log
        if (req.user && req.user.id) {
            await prisma.auditLog.create({
                data: {
                    userId: req.user.id,
                    action: 'CREATE',
                    entityType: 'KIDS_SCHEDULE',
                    entityId: schedule.id,
                    details: { scheduleId: schedule.id, moduleId: schedule.moduleId }
                }
            });
        }

        res.status(201).json(schedule);
    } catch (error) {
        console.error('Error creating kids schedule:', error);
        res.status(500).json({ error: 'Failed to create schedule' });
    }
};

exports.updateSchedule = async (req, res) => {
    try {
        const { id } = req.params;
        const { unit, date, lesson, bibleReading, memoryVerse, activity, teacherId, auxiliaryId, observations } = req.body;

        const schedule = await prisma.kidsSchedule.update({
            where: { id: parseInt(id) },
            data: {
                unit,
                date: new Date(date),
                lesson,
                bibleReading,
                memoryVerse,
                activity,
                teacherId: teacherId ? parseInt(teacherId) : null,
                auxiliaryId: auxiliaryId ? parseInt(auxiliaryId) : null,
                observations
            },
            include: {
                teacher: { select: { id: true, profile: { select: { fullName: true } } } },
                auxiliary: { select: { id: true, profile: { select: { fullName: true } } } }
            }
        });

        // Audit Log
        if (req.user && req.user.id) {
            await prisma.auditLog.create({
                data: {
                    userId: req.user.id,
                    action: 'UPDATE',
                    entityType: 'KIDS_SCHEDULE',
                    entityId: schedule.id,
                    details: { scheduleId: schedule.id }
                }
            });
        }

        res.json(schedule);
    } catch (error) {
        console.error('Error updating kids schedule:', error);
        res.status(500).json({ error: 'Failed to update schedule' });
    }
};

exports.deleteSchedule = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.kidsSchedule.delete({
            where: { id: parseInt(id) }
        });

        // Audit Log
        if (req.user && req.user.id) {
            await prisma.auditLog.create({
                data: {
                    userId: req.user.id,
                    action: 'DELETE',
                    entityType: 'KIDS_SCHEDULE',
                    entityId: parseInt(id)
                }
            });
        }

        res.status(204).send();
    } catch (error) {
        console.error('Error deleting kids schedule:', error);
        res.status(500).json({ error: 'Failed to delete schedule' });
    }
};
