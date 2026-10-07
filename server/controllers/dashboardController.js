const {
    getGanarStats,
    getConsolidarStats,
    getDiscipularStats,
    getEnviarStats,
    getEncuentrosStats,
    getConvencionesStats,
    getRecentActivity
} = require('../services/dashboardService');
const { getUserNetwork } = require('../utils/networkUtils');

/**
 * GET /api/dashboard
 * Retorna estadísticas consolidadas de los módulos de la iglesia.
 * Soporta control de acceso basado en roles (RBAC) y scoping por red de discipulado.
 */
const getDashboardData = async (req, res) => {
    try {
        const userRoles = req.user?.roles || [];
        const userId = req.user?.id;

        const isSuperUser = userRoles.includes('ADMIN') || userRoles.includes('PASTOR');
        let scopeIds = null;

        // Si no es ADMIN ni PASTOR, restringir a su red descendente + su propio ID
        if (!isSuperUser && userId) {
            const networkDescendants = await getUserNetwork(userId);
            scopeIds = [userId, ...networkDescendants];
        }

        const [
            ganar,
            consolidar,
            discipular,
            enviar,
            encuentros,
            convenciones,
            recentActivity
        ] = await Promise.all([
            getGanarStats(scopeIds),
            getConsolidarStats(scopeIds),
            getDiscipularStats(scopeIds),
            getEnviarStats(scopeIds),
            getEncuentrosStats(scopeIds),
            getConvencionesStats(scopeIds),
            getRecentActivity(scopeIds, 8)
        ]);

        return res.json({
            ganar,
            consolidar,
            discipular,
            enviar,
            encuentros,
            convenciones,
            recentActivity,
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
