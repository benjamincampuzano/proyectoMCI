const prisma = require('../utils/database');

const buildDateFilter = (filters = {}, field = 'createdAt') => {
    const { startDate, endDate } = filters || {};
    if (!startDate && !endDate) return {};
    const range = {};
    if (startDate) range.gte = new Date(startDate);
    if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        range.lte = end;
    }
    return { [field]: range };
};

/**
 * Estadísticas del módulo Ganar (Invitados)
 */
const getGanarStats = async (scopeIds = null, filters = {}) => {
    try {
        const guestFilter = {
            isDeleted: false,
            ...buildDateFilter(filters, 'createdAt'),
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
const getConsolidarStats = async (scopeIds = null, filters = {}) => {
    try {
        const attendanceFilter = {
            status: 'PRESENTE',
            ...buildDateFilter(filters, 'date'),
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
const getDiscipularStats = async (scopeIds = null, filters = {}) => {
    try {
        const activeModules = await prisma.seminarModule.count({
            where: { isDeleted: false }
        });

        const enrollmentFilter = {
            ...buildDateFilter(filters, 'createdAt'),
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

const PRESENT_CELL_STATUSES = ['PRESENTE', 'VIRTUAL', 'TARDE'];

/**
 * Estadísticas del módulo Enviar (Células)
 */
const getEnviarStats = async (scopeIds = null, filters = {}) => {
    const cellFilter = {
        isDeleted: false,
        ...(scopeIds && scopeIds.length > 0 ? {
            OR: [
                { leaderId: { in: scopeIds } },
                { liderDoceId: { in: scopeIds } }
            ]
        } : {})
    };

    // Stock del sistema: total de células creadas (no se recorta por fecha;
    // los filtros de fecha aplican solo a la asistencia). El scope RBAC/red sí aplica.
    let totalCells = 0;
    let activeLeaders = 0;
    try {
        totalCells = await prisma.cell.count({ where: cellFilter });
        const distinctLeaders = await prisma.cell.groupBy({
            by: ['leaderId'],
            where: cellFilter
        });
        activeLeaders = distinctLeaders.length;
    } catch (error) {
        console.error('Error in getEnviarStats (cells):', error);
    }

    let recentAttendance = 0;
    let attendanceHistory = [];
    try {
        const baseWhere = {
            ...buildDateFilter(filters, 'date'),
            status: { in: PRESENT_CELL_STATUSES },
            ...(scopeIds && scopeIds.length > 0 ? { cell: cellFilter } : {})
        };
        const latest = await prisma.cellAttendance.findFirst({
            where: baseWhere,
            orderBy: { date: 'desc' },
            select: { date: true }
        });
        if (latest?.date) {
            recentAttendance = await prisma.cellAttendance.count({
                where: { ...baseWhere, date: latest.date }
            });
        }
        const groups = await prisma.cellAttendance.groupBy({
            by: ['date'],
            where: baseWhere,
            _count: { id: true },
            orderBy: { date: 'desc' },
            take: 6
        });
        attendanceHistory = groups
            .map((g) => ({
                date: g.date ? g.date.toISOString().split('T')[0] : 'N/A',
                count: g._count.id
            }))
            .reverse();
    } catch (error) {
        console.error('Error in getEnviarStats (attendance):', error);
    }

    return {
        totalCells,
        recentAttendance,
        activeLeaders,
        attendanceHistory
    };
};

/**
 * Estadísticas del módulo Encuentros
 */
const getEncuentrosStats = async (scopeIds = null, filters = {}) => {
    try {
        const activeEncuentros = await prisma.encuentro.count({
            where: {
                isDeleted: false,
                ...buildDateFilter(filters, 'startDate'),
            }
        });

        const regFilter = {
            status: { not: 'CANCELLED' },
            ...buildDateFilter(filters, 'createdAt'),
            ...(scopeIds && scopeIds.length > 0 ? { userId: { in: scopeIds } } : {})
        };

        const registeredCount = await prisma.encuentroRegistration.count({
            where: regFilter
        });

        const baptizedCount = await prisma.encuentroRegistration.count({
            where: { ...regFilter, isBaptized: true }
        });

        // Pagos pendientes (saldo > 0 según costos del encuentro, misma fórmula del módulo)
        const registrations = await prisma.encuentroRegistration.findMany({
            where: regFilter,
            select: {
                discountPercentage: true,
                needsTransport: true,
                needsAccommodation: true,
                payments: {
                    select: { amount: true }
                },
                encuentro: {
                    select: { cost: true, transportCost: true, accommodationCost: true }
                }
            }
        });

        let pendingPayments = 0;
        for (const reg of registrations) {
            const paid = reg.payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
            const baseCost = Number(reg.encuentro?.cost || 0) * (1 - (Number(reg.discountPercentage || 0) / 100));
            const transportCost = reg.needsTransport ? Number(reg.encuentro?.transportCost || 0) : 0;
            const accommodationCost = reg.needsAccommodation ? Number(reg.encuentro?.accommodationCost || 0) : 0;
            if (baseCost + transportCost + accommodationCost - paid > 0) {
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
const getConvencionesStats = async (scopeIds = null, filters = {}) => {
    try {
        const activeConventions = await prisma.convention.count({
            where: {
                isDeleted: false,
                ...buildDateFilter(filters, 'startDate'),
            }
        });

        const regFilter = {
            status: { not: 'CANCELLED' },
            ...buildDateFilter(filters, 'createdAt'),
            ...(scopeIds && scopeIds.length > 0 ? { userId: { in: scopeIds } } : {})
        };

        const registeredCount = await prisma.conventionRegistration.count({
            where: regFilter
        });

        // Pagos pendientes (saldo > 0 según tarifa y costos de la convención, misma fórmula del módulo)
        const registrations = await prisma.conventionRegistration.findMany({
            where: regFilter,
            select: {
                discountPercentage: true,
                ticketType: true,
                needsTransport: true,
                needsAccommodation: true,
                payments: {
                    select: { amount: true }
                },
                convention: {
                    select: { cost: true, vipPlateaCost: true, generalCost: true, transportCost: true, accommodationCost: true }
                }
            }
        });

        const baseCostFor = (conv, reg) => {
            if (reg.ticketType === 'VIP_PLATEA' && Number(conv?.vipPlateaCost) > 0) return Number(conv.vipPlateaCost);
            if (reg.ticketType === 'GENERAL' && Number(conv?.generalCost) > 0) return Number(conv.generalCost);
            return Number(conv?.cost || 0);
        };

        let pendingPayments = 0;
        for (const reg of registrations) {
            const paid = reg.payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
            const baseCost = baseCostFor(reg.convention, reg) * (1 - (Number(reg.discountPercentage || 0) / 100));
            const transportCost = reg.needsTransport ? Number(reg.convention?.transportCost || 0) : 0;
            const accommodationCost = reg.needsAccommodation ? Number(reg.convention?.accommodationCost || 0) : 0;
            if (baseCost + transportCost + accommodationCost - paid > 0) {
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
 * Estadísticas del módulo Escuela de Artes
 */
const getArtesStats = async (scopeIds = null, filters = {}) => {
    try {
        const classFilter = {
            isDeleted: false,
            ...buildDateFilter(filters, 'createdAt'),
        };
        const totalClasses = await prisma.artClass.count({ where: classFilter });

        const enrollmentFilter = {
            ...buildDateFilter(filters, 'createdAt'),
            ...(scopeIds && scopeIds.length > 0 ? { userId: { in: scopeIds } } : {})
        };
        const enrolledCount = await prisma.artEnrollment.count({ where: enrollmentFilter });

        const enrollments = await prisma.artEnrollment.findMany({
            where: enrollmentFilter,
            select: {
                finalCost: true,
                payments: { select: { amount: true } }
            }
        });
        let collected = 0;
        let pending = 0;
        let pendingCount = 0;
        for (const e of enrollments) {
            const paid = e.payments.reduce((s, p) => s + Number(p.amount || 0), 0);
            collected += paid;
            const balance = Number(e.finalCost || 0) - paid;
            if (balance > 0) {
                pending += balance;
                pendingCount++;
            }
        }

        return { totalClasses, enrolledCount, collected, pending, pendingCount };
    } catch (error) {
        console.error('Error in getArtesStats:', error);
        return { totalClasses: 0, enrolledCount: 0, collected: 0, pending: 0, pendingCount: 0 };
    }
};

/**
 * Actividad reciente desde AuditLog
 */
const getRecentActivity = async (scopeIds = null, limit = 8, filters = {}) => {
    try {
        const logs = await prisma.auditLog.findMany({
            where: {
                AND: [
                    scopeIds && scopeIds.length > 0 ? { userId: { in: scopeIds } } : {},
                    buildDateFilter(filters, 'createdAt'),
                    // Omitir acciones ejecutadas por ADMIN; conservar eventos del sistema (userId null)
                    {
                        OR: [
                            { userId: null },
                            { user: { roles: { none: { role: { name: 'ADMIN' } } } } }
                        ]
                    }
                ]
            },
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
    getArtesStats,
    getRecentActivity
};
