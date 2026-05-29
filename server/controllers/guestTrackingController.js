const { Prisma } = require('@prisma/client');
const prisma = require('../utils/database');
const { getUserNetwork } = require('../utils/networkUtils');

// Generar un reporte Estadístico de cantidad de personas con y sin llamadas, 
// con y sin visita por lider y por fecha.
const getGuestTrackingStats = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const userRoles = req.user.roles || [];
        const currentUserId = req.user.id ? parseInt(req.user.id) : null;

        let networkIds = [];
        const isAdmin = userRoles.includes('ADMIN');
        const isPastor = userRoles.includes('PASTOR');
        const isCoordinator = userRoles.includes('COORDINADOR');
        const isModuleCoordinator = req.user.isModuleCoordinator || false;
        const isLeader = userRoles.some(r => ['LIDER_DOCE', 'PASTOR', 'LIDER_CELULA'].includes(r));
        const canSeeAllGuests = isAdmin || isPastor || isCoordinator;

        if (isLeader && currentUserId && !canSeeAllGuests && !isModuleCoordinator) {
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
            ? Prisma.sql`AND g."invitedById" = ANY(${networkIds})`
            : Prisma.empty;

        const statsRaw = await prisma.$queryRaw`
            SELECT
                COALESCE(up."fullName", 'Sin Asignar') AS leader_name,
                COUNT(g.id)::int AS total,
                COUNT(CASE WHEN gc.id IS NOT NULL THEN 1 END)::int AS with_call,
                COUNT(CASE WHEN gv.id IS NOT NULL THEN 1 END)::int AS with_visit
            FROM "Guest" g
            LEFT JOIN "UserHierarchy" uh ON uh."childId" = g."invitedById" AND uh.role IN ('LIDER_DOCE', 'PASTOR', 'LIDER_CELULA')
            LEFT JOIN "UserProfile" up ON up."userId" = uh."parentId"
            LEFT JOIN "GuestCall" gc ON gc."guestId" = g.id
            LEFT JOIN "GuestVisit" gv ON gv."guestId" = g.id
            WHERE g."createdAt" BETWEEN ${start} AND ${end}
              AND g."isDeleted" = false
              ${networkFilter}
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
