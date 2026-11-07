const {
    getGanarStats,
    getConsolidarStats,
    getDiscipularStats,
    getEnviarStats,
    getEncuentrosStats,
    getConvencionesStats,
    getArtesStats,
    getRecentActivity
} = require('../services/dashboardService');
const { getUserNetwork } = require('../utils/networkUtils');
const prisma = require('../utils/database');

/**
 * Resuelve scope RBAC + filtros Power BI (?startDate&endDate&liderDoceId).
 * Retorna { scopeIds, filters, appliedLiderDoceId, isSuperUser }.
 */
const resolveDashboardScope = async (req) => {
    const userRoles = req.user?.roles || [];
    const userId = req.user?.id;
    const { startDate, endDate, liderDoceId } = req.query || {};
    const filters = { startDate, endDate };

    const isSuperUser = userRoles.includes('ADMIN') || userRoles.includes('PASTOR');
    let scopeIds = null;

    // Si no es ADMIN ni PASTOR, restringir a su red descendente + su propio ID
    if (!isSuperUser && userId) {
        const networkDescendants = await getUserNetwork(userId);
        scopeIds = [userId, ...networkDescendants];
    }

    // Filtro Power BI por Red (Líder Doce): intersectar con el scope RBAC
    let appliedLiderDoceId = null;
    if (liderDoceId) {
        const lId = parseInt(liderDoceId, 10);
        if (!Number.isNaN(lId)) {
            appliedLiderDoceId = lId;
            const liderUser = await prisma.user.findUnique({
                where: { id: lId },
                select: { spouseId: true }
            }).catch(() => null);
            const spouseId = liderUser?.spouseId || null;
            let liderNetwork = await getUserNetwork(lId);
            liderNetwork = [lId, ...liderNetwork];
            if (spouseId) {
                const spouseNetwork = await getUserNetwork(spouseId);
                liderNetwork = [...liderNetwork, spouseId, ...spouseNetwork];
            }
            liderNetwork = [...new Set(liderNetwork)];
            scopeIds = scopeIds ? scopeIds.filter((id) => liderNetwork.includes(id)) : liderNetwork;
        }
    }

    return { scopeIds, filters, appliedLiderDoceId, isSuperUser, userRoles };
};

/**
 * GET /api/dashboard
 * Retorna estadísticas consolidadas de los módulos de la iglesia.
 * Soporta control de acceso basado en roles (RBAC) y scoping por red de discipulado.
 * Query params tipo Power BI: ?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&liderDoceId=123
 */
const getDashboardData = async (req, res) => {
    try {
        const { scopeIds, filters, appliedLiderDoceId, isSuperUser, userRoles } = await resolveDashboardScope(req);
        const { startDate, endDate } = req.query || {};

        const [
            ganar,
            consolidar,
            discipular,
            enviar,
            encuentros,
            convenciones,
            artes,
            recentActivity
        ] = await Promise.all([
            getGanarStats(scopeIds, filters),
            getConsolidarStats(scopeIds, filters),
            getDiscipularStats(scopeIds, filters),
            getEnviarStats(scopeIds, filters),
            getEncuentrosStats(scopeIds, filters),
            getConvencionesStats(scopeIds, filters),
            getArtesStats(scopeIds, filters),
            getRecentActivity(scopeIds, 20, filters)
        ]);

        return res.json({
            ganar,
            consolidar,
            discipular,
            enviar,
            encuentros,
            convenciones,
            artes,
            recentActivity,
            appliedFilters: { startDate: startDate || null, endDate: endDate || null, liderDoceId: appliedLiderDoceId },
            userRole: userRoles[0] || 'DISCIPULO',
            isScoped: !isSuperUser
        });
    } catch (error) {
        console.error('Error fetching dashboard data:', error);
        return res.status(500).json({
            message: 'Error al obtener datos consolidados del dashboard',
            error: error.message
        });
    }
};

/**
 * GET /api/dashboard/enviar/cells-by-leader
 * Drill-down de "Células creadas": células agrupadas por Líder 12 con
 * inscritos (miembros) e invitados por célula. Respeta RBAC y ?liderDoceId=.
 */
const getCellsByLeader = async (req, res) => {
    try {
        const { scopeIds, appliedLiderDoceId } = await resolveDashboardScope(req);

        const cells = await prisma.cell.findMany({
            where: {
                isDeleted: false,
                ...(scopeIds && scopeIds.length > 0 ? {
                    OR: [
                        { leaderId: { in: scopeIds } },
                        { liderDoceId: { in: scopeIds } }
                    ]
                } : {})
            },
            select: {
                id: true,
                name: true,
                leaderId: true,
                liderDoceId: true,
                dayOfWeek: true,
                time: true,
                leader: { select: { profile: { select: { fullName: true } } } },
                liderDoce: { select: { profile: { select: { fullName: true } } } },
                _count: {
                    select: {
                        members: { where: { isDeleted: false } },
                        guests: { where: { isDeleted: false } }
                    }
                }
            },
            orderBy: { name: 'asc' }
        });

        // Resolver Líder 12 vía jerarquía para células sin liderDoceId directo
        const missingLeaderIds = [...new Set(
            cells.filter((c) => !c.liderDoceId).map((c) => c.leaderId)
        )];
        let hierMap = {};
        if (missingLeaderIds.length > 0) {
            const hiers = await prisma.userHierarchy.findMany({
                where: { childId: { in: missingLeaderIds }, role: 'LIDER_DOCE' },
                select: {
                    childId: true,
                    parentId: true,
                    parent: { select: { profile: { select: { fullName: true } } } }
                }
            });
            hierMap = Object.fromEntries(hiers.map((h) => [
                h.childId,
                { id: h.parentId, name: h.parent?.profile?.fullName || 'Sin nombre' }
            ]));
        }

        const groups = new Map();
        for (const c of cells) {
            const lid = c.liderDoceId ?? hierMap[c.leaderId]?.id ?? null;
            const lname = c.liderDoce?.profile?.fullName ?? hierMap[c.leaderId]?.name ?? 'Sin asignar';
            const key = lid ?? 'none';
            if (!groups.has(key)) {
                groups.set(key, {
                    liderDoceId: lid,
                    liderDoceName: lname,
                    totalCells: 0,
                    totalMembers: 0,
                    totalGuests: 0,
                    cells: []
                });
            }
            const g = groups.get(key);
            const memberCount = c._count.members;
            const guestCount = c._count.guests;
            g.totalCells += 1;
            g.totalMembers += memberCount;
            g.totalGuests += guestCount;
            g.cells.push({
                id: c.id,
                name: c.name,
                leaderName: c.leader?.profile?.fullName || 'Sin asignar',
                memberCount,
                guestCount,
                schedule: [c.dayOfWeek, c.time].filter(Boolean).join(' ') || '—'
            });
        }

        const leaders = [...groups.values()]
            .map((g) => ({
                ...g,
                cells: g.cells.sort((a, b) => b.memberCount - a.memberCount)
            }))
            .sort((a, b) => b.totalMembers - a.totalMembers || b.totalCells - a.totalCells);

        const totals = leaders.reduce((acc, g) => ({
            totalCells: acc.totalCells + g.totalCells,
            totalMembers: acc.totalMembers + g.totalMembers,
            totalGuests: acc.totalGuests + g.totalGuests
        }), { totalCells: 0, totalMembers: 0, totalGuests: 0 });

        return res.json({
            leaders,
            totals: { ...totals, totalLeaders: leaders.length },
            appliedLiderDoceId
        });
    } catch (error) {
        console.error('Error fetching cells by leader:', error);
        return res.status(500).json({
            message: 'Error al obtener células por líder',
            error: error.message
        });
    }
};

module.exports = {
    getDashboardData,
    getCellsByLeader
};
