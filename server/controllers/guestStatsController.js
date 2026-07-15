const { Prisma } = require('../generated/prisma/client');
const prisma = require('../utils/database');
const { getUserNetwork } = require('../utils/networkUtils');

// Helper to resolve Lider Doce name for a user (walking up hierarchy)
// optimized to check populated parents
const resolveLiderDoce = (userWithParents) => {
    if (!userWithParents) return 'Sin Asignar';

    // Check if user themselves is LIDER_DOCE
    const roles = userWithParents.roles?.map(r => r.role.name) || [];
    if (roles.includes('LIDER_DOCE')) {
        return userWithParents.profile?.fullName || 'Sin Nombre';
    }

    if (userWithParents.parents && userWithParents.parents.length > 0) {
        for (const p of userWithParents.parents) {
            if (!p.parent) continue;
            const pRoles = p.parent.roles?.map(r => r.role.name) || [];
            if (pRoles.includes('LIDER_DOCE')) {
                return p.parent.profile?.fullName || 'Sin Nombre';
            }
            if (p.parent.parents && p.parent.parents.length > 0) {
                return resolveLiderDoce(p.parent);
            }
        }
    }

    // If not found, maybe they are under a PASTOR directly? 
    if (roles.includes('PASTOR')) return userWithParents.profile?.fullName || 'Sin Nombre';
    if (userWithParents.parents?.some(p => p.parent?.roles?.some(r => r.role.name === 'PASTOR'))) {
        const pastor = userWithParents.parents.find(p => p.parent.roles.some(r => r.role.name === 'PASTOR'));
        return pastor.parent.profile.fullName;
    }

    return 'Sin Asignar';
};

// Get guest statistics with date filtering
const getGuestStats = async (req, res) => {
    try {
        const { startDate, endDate, liderDoceId } = req.query;
        const currentUserId = parseInt(req.user.id);
        const userRoles = req.user.roles || [];
        const isAdmin = userRoles.includes('ADMIN');
        const isPastor = userRoles.includes('PASTOR');
        const isLiderDoce = userRoles.includes('LIDER_DOCE');
        const isCoordinator = userRoles.includes('COORDINADOR');

        // Check if user is a module coordinator/sub-coordinator/treasurer of Ganar or Consolidar
        const coordinatedModules = req.user.moduleCoordinations || [];
        const subCoordinatedModules = req.user.moduleSubCoordinations || [];
        const treasuredModules = req.user.moduleTreasurers || [];
        const allModuleRoles = [...coordinatedModules, ...subCoordinatedModules, ...treasuredModules];
        const isGuestModuleCoordinator = allModuleRoles.some(m =>
            ['ganar', 'consolidar'].includes(m.toLowerCase())
        );

        const canSeeAllGuests = isAdmin || isPastor || isCoordinator || isGuestModuleCoordinator;

        // Build date filter
        const dateFilter = {};
        if (startDate || endDate) {
            dateFilter.createdAt = {};
            if (startDate) dateFilter.createdAt.gte = new Date(startDate);
            if (endDate) {
                const end = new Date(endDate);
                end.setUTCHours(23, 59, 59, 999);
                dateFilter.createdAt.lte = end;
            }
        }

        // Build security filter based on role
        let networkIds = [];
        let securityFilter = {};
        if (canSeeAllGuests) {
            securityFilter = {};
        } else if (isLiderDoce) {
            networkIds = await getUserNetwork(currentUserId);
            securityFilter = {
                OR: [
                    { invitedById: { in: [...networkIds, currentUserId] } },
                    { assignedToId: { in: [...networkIds, currentUserId] } }
                ]
            };
        } else {
            securityFilter = {
                OR: [
                    { invitedById: currentUserId },
                    { assignedToId: currentUserId }
                ]
            };
        }

        let whereClause = {
            AND: [securityFilter, dateFilter]
        };

        if (liderDoceId && canSeeAllGuests) {
            const lId = parseInt(liderDoceId);
            whereClause.AND.push({
                OR: [
                    { invitedBy: { liderDoceId: lId } },
                    { assignedTo: { liderDoceId: lId } },
                    { invitedBy: { id: lId } },
                    { assignedTo: { id: lId } }
                ]
            });
            networkIds = await getUserNetwork(lId);
            networkIds.push(lId);
        }

        // Get total guests
        const totalGuests = await prisma.guest.count({ where: whereClause });

        // Get guests by status
        const guestsByStatus = await prisma.guest.groupBy({
            by: ['status'],
            where: whereClause,
            _count: true
        });

        const byStatus = {};
        guestsByStatus.forEach(item => {
            byStatus[item.status] = item._count;
        });

        // Calculate conversion rate
        const ganados = byStatus.GANADO || 0;
        const conversionRate = totalGuests > 0 ? ((ganados / totalGuests) * 100) : 0;

        // Get top inviters (Count only)
        const topInvitersData = await prisma.guest.groupBy({
            by: ['invitedById'],
            where: whereClause,
            _count: true,
            orderBy: {
                _count: {
                    invitedById: 'desc'
                }
            },
            take: 10
        });

        // Fetch inviter details for top inviters
        const inviterIds = topInvitersData.map(item => item.invitedById);
        const inviters = await prisma.user.findMany({
            where: { id: { in: inviterIds } },
            select: { id: true, profile: { select: { fullName: true } } }
        });

        const inviterMap = {};
        inviters.forEach(inv => {
            inviterMap[inv.id] = inv.profile?.fullName || 'Sin Nombre';
        });

        const topInviters = topInvitersData.map(item => ({
            id: item.invitedById,
            name: inviterMap[item.invitedById] || 'Desconocido',
            count: item._count
        }));

        // Calculate invitations by LIDER_DOCE
        // Note: We use networkIds if filtering by a leader network or if they are a leader
        // otherwise we check all
        const networkFilterStats = (networkIds.length > 0)
            ? Prisma.sql`AND (g."invitedById" = ANY(${networkIds}) OR g."assignedToId" = ANY(${networkIds}))`
            : (canSeeAllGuests && !liderDoceId ? Prisma.empty : Prisma.sql`AND (g."invitedById" = ${currentUserId} OR g."assignedToId" = ${currentUserId})`);

        const guestLeaderRaw = await prisma.$queryRaw`
            WITH resolved_leaders AS (
                SELECT
                    g.id AS guest_id,
                    COALESCE(
                        (SELECT uh."parentId" FROM "UserHierarchy" uh
                         WHERE uh."parentId" = g."invitedById" AND uh.role = 'LIDER_DOCE' LIMIT 1),
                        (SELECT uh."parentId" FROM "UserHierarchy" uh
                         WHERE uh."childId" = g."invitedById" AND uh.role = 'LIDER_DOCE' LIMIT 1)
                    ) AS lider_doce_id,
                    TO_CHAR(g."createdAt", 'YYYY-MM') AS month_key
                FROM "Guest" g
                WHERE g."isDeleted" = false
                  ${networkFilterStats}
            )
            SELECT
                COALESCE(up."fullName", 'Sin Asignar') AS leader_name,
                COUNT(rl.guest_id)::int AS count,
                rl.month_key
            FROM resolved_leaders rl
            LEFT JOIN "UserProfile" up ON up."userId" = rl.lider_doce_id
            GROUP BY leader_name, rl.month_key
            ORDER BY count DESC
        `;

        const liderDoceCounts = {};
        const guestsByMonth = {};

        for (const row of guestLeaderRaw) {
            const name = row.leader_name;
            liderDoceCounts[name] = (liderDoceCounts[name] || 0) + Number(row.count);
            const mk = row.month_key;
            guestsByMonth[mk] = (guestsByMonth[mk] || 0) + Number(row.count);
        }

        const invitationsByLiderDoce = Object.entries(liderDoceCounts)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count);

        const monthsCount = Object.keys(guestsByMonth).length || 1;
        const monthlyAverage = (totalGuests / monthsCount);

        const monthlyTrend = Object.entries(guestsByMonth)
            .map(([month, count]) => ({ month, count }))
            .sort((a, b) => a.month.localeCompare(b.month));

        res.status(200).json({
            totalGuests,
            byStatus,
            conversionRate,
            topInviters,
            invitationsByLiderDoce,
            monthlyAverage,
            monthlyTrend
        });
    } catch (error) {
        console.error('Error fetching guest stats:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
    getGuestStats
};
