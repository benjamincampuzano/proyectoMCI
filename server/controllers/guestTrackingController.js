const { Prisma } = require('../generated/prisma/client');
const prisma = require('../utils/database');
const { getUserNetwork } = require('../utils/networkUtils');

// Generar un reporte Estadístico de cantidad de personas con y sin llamadas, 
// con y sin visita por lider y por fecha.
const getGuestTrackingStats = async (req, res) => {
    try {
        const { startDate, endDate, liderDoceId } = req.query;
        const userRoles = req.user.roles || [];
        const currentUserId = req.user.id ? parseInt(req.user.id) : null;

        let networkIds = [];
        const isAdmin = userRoles.includes('ADMIN');
        const isPastor = userRoles.includes('PASTOR');
        const isCoordinator = userRoles.includes('COORDINADOR');
        const isModuleCoordinator = req.user.isModuleCoordinator || false;
        const isLeader = userRoles.some(r => ['LIDER_DOCE', 'PASTOR', 'LIDER_CELULA'].includes(r));

        // Check if user is coordinator/sub-coordinator/treasurer of Ganar or Consolidar modules
        const coordinatedModules = req.user.moduleCoordinations || [];
        const subCoordinatedModules = req.user.moduleSubCoordinations || [];
        const treasuredModules = req.user.moduleTreasurers || [];
        const allModuleRoles = [...coordinatedModules, ...subCoordinatedModules, ...treasuredModules];
        const isGuestModuleCoordinator = allModuleRoles.some(m =>
            ['ganar', 'consolidar'].includes(m.toLowerCase())
        );

        const canSeeAllGuests = isAdmin || isPastor || isCoordinator || isGuestModuleCoordinator;

        if (liderDoceId && canSeeAllGuests) {
            // Filter by specific LIDER_DOCE including their spouse's network
            const lId = parseInt(liderDoceId);
            const liderUser = await prisma.user.findUnique({
                where: { id: lId },
                select: { spouseId: true }
            });
            const spouseId = liderUser?.spouseId || null;

            networkIds = await getUserNetwork(lId);
            networkIds.push(lId);
            if (spouseId) {
                const spouseNetwork = await getUserNetwork(spouseId);
                networkIds.push(spouseId);
                networkIds.push(...spouseNetwork);
            }
            networkIds = [...new Set(networkIds)];
        } else if (isLeader && currentUserId && !canSeeAllGuests && !isModuleCoordinator) {
            networkIds = await getUserNetwork(currentUserId);
            networkIds.push(currentUserId);
        }

        // ✅ Default: últimos 12 meses en vez de "all time" (new Date(0))
        const end = endDate ? new Date(endDate) : new Date();
        if (endDate) end.setUTCHours(23, 59, 59, 999);

        const start = startDate ? new Date(startDate) : new Date(new Date().setFullYear(new Date().getFullYear() - 1));
        if (startDate) start.setUTCHours(0, 0, 0, 0);

        // ✅ SQL GROUP BY directo — no más carga masiva a Node.js
        const networkFilter = networkIds.length > 0
            ? Prisma.sql`AND (g."invitedById" = ANY(${networkIds}) OR g."assignedToId" = ANY(${networkIds}))`
            : Prisma.empty;

        // ✅ CTE: Resuelve LIDER_DOCE para ambos casos (el asignado ES lider doce + tiene padre lider doce)
        // Agrupa por PAREJA de LIDER_DOCE
        const statsRaw = await prisma.$queryRaw`
            WITH resolved_leaders AS (
                SELECT
                    g.id AS guest_id,
                    COALESCE(
                        (SELECT uh."parentId" FROM "UserHierarchy" uh
                         WHERE uh."parentId" = g."assignedToId" AND uh.role = 'LIDER_DOCE' LIMIT 1),
                        (SELECT uh."parentId" FROM "UserHierarchy" uh
                         WHERE uh."childId" = g."assignedToId" AND uh.role = 'LIDER_DOCE' LIMIT 1)
                    ) AS lider_doce_id
                FROM "Guest" g
                WHERE g."createdAt" BETWEEN ${start} AND ${end}
                  AND g."isDeleted" = false
                  ${networkFilter}
            )
            SELECT
                CASE
                    WHEN sp."fullName" IS NOT NULL THEN
                        CASE
                            WHEN ld."fullName" < sp."fullName"
                            THEN ld."fullName" || ' & ' || sp."fullName"
                            ELSE sp."fullName" || ' & ' || ld."fullName"
                        END
                    ELSE COALESCE(ld."fullName", 'Sin Asignar')
                END AS leader_name,
                COUNT(DISTINCT rl.guest_id)::int AS total,
                COUNT(DISTINCT CASE WHEN gc.id IS NOT NULL THEN rl.guest_id END)::int AS with_call,
                COUNT(DISTINCT CASE WHEN gv.id IS NOT NULL THEN rl.guest_id END)::int AS with_visit
            FROM resolved_leaders rl
            LEFT JOIN "UserProfile" ld ON ld."userId" = rl.lider_doce_id
            LEFT JOIN "User" ldoce ON ldoce.id = rl.lider_doce_id
            LEFT JOIN "User" spouse ON spouse.id = ldoce."spouseId"
            LEFT JOIN "UserProfile" sp ON sp."userId" = spouse.id
            LEFT JOIN "GuestCall" gc ON gc."guestId" = rl.guest_id
            LEFT JOIN "GuestVisit" gv ON gv."guestId" = rl.guest_id
            GROUP BY leader_name
            ORDER BY total DESC
        `;

        const statsByLeader = statsRaw.map(row => ({
            leaderName: row.leader_name,
            total: Number(row.total),
            withCall: Number(row.with_call),
            withoutCall: Number(row.total) - Number(row.with_call),
            withVisit: Number(row.with_visit),
            withoutVisit: Number(row.total) - Number(row.with_visit)
        }));

        res.status(200).json(statsByLeader);
    } catch (error) {
        console.error('Error fetching guest tracking stats:', error);
        res.status(500).json({ message: 'Server error: ' + error.message });
    }
};

module.exports = {
    getGuestTrackingStats
};
