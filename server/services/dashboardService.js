const prisma = require('../utils/database');

/**
 * Estadísticas del módulo Ganar (Invitados)
 */
const getGanarStats = async (scopeIds = null) => {
    try {
        const guestFilter = {
            isDeleted: false,
            ...(scopeIds && scopeIds.length > 0 ? {
                OR: [
                    { invitedById: { in: scopeIds } },
                    { assignedToId: { in: scopeIds } }
                ]
            } : {})
        };

        const totalGuests = await prisma.guest.count({ where: guestFilter });
        const [nuevoCount, contactadoCount, consolidadoCount, ganadoCount] = await Promise.all([
            prisma.guest.count({ where: { ...guestFilter, status: 'NUEVO' } }),
            prisma.guest.count({ where: { ...guestFilter, status: 'CONTACTADO' } }),
            prisma.guest.count({ where: { ...guestFilter, status: 'CONSOLIDADO' } }),
            prisma.guest.count({ where: { ...guestFilter, status: 'GANADO' } })
        ]);

        const conversionRate = totalGuests > 0
            ? Number(((ganadoCount / totalGuests) * 100).toFixed(1))
            : 0;

        return {
            totalGuests,
            newGuests: nuevoCount,
            contactedGuests: contactadoCount,
            consolidatedGuests: consolidadoCount,
            ganadosGuests: ganadoCount,
            conversionRate
        };
    } catch (error) {
        console.error('Error in getGanarStats:', error);
        return {
            totalGuests: 0,
            newGuests: 0,
            contactedGuests: 0,
            consolidatedGuests: 0,
            ganadosGuests: 0,
            conversionRate: 0
        };
    }
};

/**
 * Estadísticas del módulo Consolidar (Asistencia a la Iglesia)
 */
const getConsolidarStats = async (scopeIds = null) => {
    try {
        const attendanceFilter = {
            status: 'PRESENTE',
            ...(scopeIds && scopeIds.length > 0 ? { userId: { in: scopeIds } } : {})
        };

        // Obtener fechas distintas recientes ordenadas descendente
        const recentDates = await prisma.churchAttendance.groupBy({
            by: ['date'],
            where: attendanceFilter,
            _count: { id: true },
            orderBy: { date: 'desc' },
            take: 6
        });

        const attendanceHistory = recentDates
            .map(item => ({
                date: item.date ? item.date.toISOString().split('T')[0] : 'N/A',
                count: item._count.id
            }))
            .reverse();

        const recentAttendance = recentDates.length > 0 ? recentDates[0]._count.id : 0;
        const totalRecent = recentDates.reduce((acc, curr) => acc + curr._count.id, 0);
        const averageWeekly = recentDates.length > 0 ? Math.round(totalRecent / recentDates.length) : 0;

        return {
            recentAttendance,
            averageWeekly,
            attendanceHistory
        };
    } catch (error) {
        console.error('Error in getConsolidarStats:', error);
        return {
            recentAttendance: 0,
            averageWeekly: 0,
            attendanceHistory: []
        };
    }
};

/**
 * Estadísticas del módulo Discipular (Escuela de Líderes / Seminario)
 */
const getDiscipularStats = async (scopeIds = null) => {
    try {
        const activeModules = await prisma.seminarModule.count({
            where: { isDeleted: false }
        });

        const enrollmentFilter = {
            isDeleted: false,
            ...(scopeIds && scopeIds.length > 0 ? { userId: { in: scopeIds } } : {})
        };

        const [enrolledStudents, graduatedStudents] = await Promise.all([
            prisma.seminarEnrollment.count({
                where: { ...enrollmentFilter, status: 'INSCRITO' }
            }),
            prisma.seminarEnrollment.count({
                where: { ...enrollmentFilter, status: 'COMPLETADO' }
            })
        ]);

        const totalHandled = enrolledStudents + graduatedStudents;
        const completionRate = totalHandled > 0
            ? Number(((graduatedStudents / totalHandled) * 100).toFixed(1))
            : 0;

        return {
            activeModules,
            enrolledStudents,
            graduatedStudents,
            completionRate
        };
    } catch (error) {
        console.error('Error in getDiscipularStats:', error);
        return {
            activeModules: 0,
            enrolledStudents: 0,
            graduatedStudents: 0,
            completionRate: 0
        };
    }
};

/**
 * Estadísticas del módulo Enviar (Células)
 */
const getEnviarStats = async (scopeIds = null) => {
    try {
        const cellFilter = {
            isDeleted: false,
            ...(scopeIds && scopeIds.length > 0 ? {
                OR: [
                    { leaderId: { in: scopeIds } },
                    { liderDoceId: { in: scopeIds } }
                ]
            } : {})
        };

        const totalCells = await prisma.cell.count({ where: cellFilter });
        const distinctLeaders = await prisma.cell.groupBy({
            by: ['leaderId'],
            where: cellFilter
        });
        const activeLeaders = distinctLeaders.length;

        // Asistencia reciente en células
        const recentCellAttendances = await prisma.cellAttendance.groupBy({
            by: ['date'],
            where: {
                ...(scopeIds && scopeIds.length > 0 ? {
                    cell: cellFilter
                } : {})
            },
            _sum: {
                presentes: true
            },
            orderBy: { date: 'desc' },
            take: 1
        });

        const recentAttendance = recentCellAttendances.length > 0
            ? (recentCellAttendances[0]._sum.presentes || 0)
            : 0;

        return {
            totalCells,
            recentAttendance,
            activeLeaders
        };
    } catch (error) {
        console.error('Error in getEnviarStats:', error);
        return {
            totalCells: 0,
            recentAttendance: 0,
            activeLeaders: 0
        };
    }
};

/**
 * Estadísticas del módulo Encuentros
 */
const getEncuentrosStats = async (scopeIds = null) => {
    try {
        const activeEncuentros = await prisma.encuentro.count({
            where: { isDeleted: false }
        });

        const regFilter = {
            status: { not: 'CANCELLED' },
            ...(scopeIds && scopeIds.length > 0 ? { userId: { in: scopeIds } } : {})
        };

        const registeredCount = await prisma.encuentroRegistration.count({
            where: regFilter
        });

        const baptizedCount = await prisma.encuentroRegistration.count({
            where: { ...regFilter, isBaptized: true }
        });

        // Pagos pendientes (inscripciones con saldo mayor a 0)
        const registrations = await prisma.encuentroRegistration.findMany({
            where: regFilter,
            select: {
                totalCost: true,
                payments: {
                    select: { amount: true }
                }
            }
        });

        let pendingPayments = 0;
        for (const reg of registrations) {
            const paid = reg.payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
            if (Number(reg.totalCost || 0) > paid) {
                pendingPayments++;
            }
        }

        return {
            activeEncuentros,
            registeredCount,
            baptizedCount,
            pendingPayments
        };
    } catch (error) {
        console.error('Error in getEncuentrosStats:', error);
        return {
            activeEncuentros: 0,
            registeredCount: 0,
            baptizedCount: 0,
            pendingPayments: 0
        };
    }
};

/**
 * Estadísticas del módulo Convenciones
 */
const getConvencionesStats = async (scopeIds = null) => {
    try {
        const activeConventions = await prisma.convention.count({
            where: { isDeleted: false }
        });

        const regFilter = {
            status: { not: 'CANCELLED' },
            ...(scopeIds && scopeIds.length > 0 ? { userId: { in: scopeIds } } : {})
        };

        const registeredCount = await prisma.conventionRegistration.count({
            where: regFilter
        });

        const registrations = await prisma.conventionRegistration.findMany({
            where: regFilter,
            select: {
                totalCost: true,
                payments: {
                    select: { amount: true }
                }
            }
        });

        let pendingPayments = 0;
        for (const reg of registrations) {
            const paid = reg.payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
            if (Number(reg.totalCost || 0) > paid) {
                pendingPayments++;
            }
        }

        return {
            activeConventions,
            registeredCount,
            pendingPayments
        };
    } catch (error) {
        console.error('Error in getConvencionesStats:', error);
        return {
            activeConventions: 0,
            registeredCount: 0,
            pendingPayments: 0
        };
    }
};

/**
 * Actividad reciente desde AuditLog
 */
const getRecentActivity = async (scopeIds = null, limit = 8) => {
    try {
        const logs = await prisma.auditLog.findMany({
            where: scopeIds && scopeIds.length > 0 ? { userId: { in: scopeIds } } : {},
            orderBy: { createdAt: 'desc' },
            take: limit,
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        profile: {
                            select: { fullName: true }
                        }
                    }
                }
            }
        });

        return logs.map(log => ({
            id: log.id,
            action: log.action,
            entityType: log.entityType,
            entityId: log.entityId,
            details: log.details,
            createdAt: log.createdAt,
            userName: log.user?.profile?.fullName || log.user?.email || 'Sistema'
        }));
    } catch (error) {
        console.error('Error in getRecentActivity:', error);
        return [];
    }
};

module.exports = {
    getGanarStats,
    getConsolidarStats,
    getDiscipularStats,
    getEnviarStats,
    getEncuentrosStats,
    getConvencionesStats,
    getRecentActivity
};
