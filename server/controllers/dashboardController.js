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
 * GET /api/dashboard
 * Retorna estadísticas consolidadas de los módulos de la iglesia.
 * Soporta control de acceso basado en roles (RBAC) y scoping por red de discipulado.
 * Query params tipo Power BI: ?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&liderDoceId=123
 */
const getDashboardData = async (req, res) => {
    try {
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

module.exports = {
    getDashboardData
};
