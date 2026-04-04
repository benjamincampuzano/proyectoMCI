const prisma = require('../utils/database');

/**
 * Roles que un coordinador de módulo PUEDE gestionar
 * (roles estrictamente menores que LIDER_DOCE)
 */
const MANAGABLE_ROLES = ['LIDER_CELULA', 'DISCIPULO', 'INVITADO'];

/**
 * Roles que NUNCA pueden ser gestionados por coordinadores
 */
const PROTECTED_ROLES = ['ADMIN', 'PASTOR', 'LIDER_DOCE'];

/**
 * Roles superiores que requieren verificación de red
 */
const LEADERSHIP_ROLES = ['ADMIN', 'PASTOR', 'LIDER_DOCE'];

/**
 * Middleware para verificar si el usuario es coordinador activo de algún módulo
 * y establecer req.user.isModuleCoordinator
 */
const isModuleCoordinator = async (req, res, next) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Authentication required' });
        }

        const isAdminOrPastor = req.user.roles.some(role => ['ADMIN', 'PASTOR'].includes(role));
        
        // Fetch all roles for the user
        const [coordinations, subCoordinations, treasurers] = await Promise.all([
            prisma.moduleCoordinator.findMany({
                where: { userId: parseInt(req.user.id) },
                select: { moduleName: true }
            }),
            prisma.moduleSubCoordinator.findMany({
                where: { userId: parseInt(req.user.id) },
                select: { moduleName: true }
            }),
            prisma.moduleTreasurer.findMany({
                where: { userId: parseInt(req.user.id) },
                select: { moduleName: true }
            })
        ]);

        req.user.moduleCoordinations = coordinations.map(c => c.moduleName.toLowerCase());
        req.user.moduleSubCoordinations = subCoordinations.map(sc => sc.moduleName.toLowerCase());
        req.user.moduleTreasurers = treasurers.map(t => t.moduleName.toLowerCase());

        const currentModule = (req.params.module || req.query.module || '').toLowerCase().trim().replace(/\s+/g, '-');

        req.user.isModuleCoordinator = req.user.moduleCoordinations.length > 0 || req.user.moduleSubCoordinations.length > 0;
        req.user.isModuleTreasurer = req.user.moduleTreasurers.length > 0 || isAdminOrPastor;

        req.user.isModuleCoordinatorOfCurrent = (
            req.user.moduleCoordinations.includes(currentModule) || 
            req.user.moduleSubCoordinations.includes(currentModule) ||
            isAdminOrPastor
        );

        // For backward compatibility (deprecated)
        req.user.coordinatedModule = req.user.moduleCoordinations[0] || req.user.moduleSubCoordinations[0] || req.user.moduleTreasurers[0];

        return next();

    } catch (error) {
        console.error('Error in isModuleCoordinator middleware:', error);
        return res.status(500).json({ message: 'Error checking coordinator status' });
    }
};

/**
 * Obtiene el ID de red del usuario (valor escalar del perfil)
 */
const getUserNetworkId = async (userId) => {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
            profile: {
                select: { network: true }
            }
        }
    });
    return user?.profile?.network;
};

/**
 * Verifica si el solicitante puede gestionar al usuario destino
 * basado en la jerarquía de roles y red
 *
 * @param {Object} requester - Usuario que hace la petición
 * @param {string} targetUserRole - Rol del usuario destino
 * @param {number} targetUserNetworkId - ID de la red del usuario destino
 * @returns {Object} { canManage: boolean, reason?: string }
 */
const canManageUser = async (requester, targetUserRole, targetUserNetworkId) => {
    if (requester.roles.includes('ADMIN') || requester.roles.includes('PASTOR')) {
        if (targetUserRole === 'ADMIN') {
            return { canManage: false, reason: 'Cannot manage ADMIN users' };
        }
        return { canManage: true };
    }

    if (requester.isModuleCoordinator) {
        if (PROTECTED_ROLES.includes(targetUserRole)) {
            return { canManage: false, reason: `Cannot manage ${targetUserRole} users` };
        }
        if (!MANAGABLE_ROLES.includes(targetUserRole)) {
            return { canManage: false, reason: `Cannot manage users with role: ${targetUserRole}` };
        }
        return { canManage: true };
    }

    if (requester.roles.includes('LIDER_DOCE')) {
        if (PROTECTED_ROLES.includes(targetUserRole)) {
            return { canManage: false, reason: `Cannot manage ${targetUserRole} users` };
        }

        const requesterNetworkId = await getUserNetworkId(requester.id);
        if (targetUserNetworkId !== requesterNetworkId) {
            return { canManage: false, reason: 'Cannot manage users outside your network' };
        }

        return { canManage: true };
    }

    return { canManage: false, reason: 'Insufficient permissions' };
};

/**
 * Middleware que verifica si el usuario puede gestionar un usuario específico
 * Se usa en rutas que acceden a usuarios por ID
 */
const canManageTargetUser = (getTargetUser) => {
    return async (req, res, next) => {
        try {
            const targetUserId = parseInt(req.params.id);

            if (req.user.id === targetUserId) {
                return res.status(403).json({ message: 'Cannot modify your own account' });
            }

            const targetUser = await getTargetUser(targetUserId);

            if (!targetUser) {
                return res.status(404).json({ message: 'User not found' });
            }

            const targetUserRole = targetUser.roles?.[0]?.role?.name || targetUser.role;
            const targetUserNetworkId = targetUser.profile?.network;

            const permission = await canManageUser(req.user, targetUserRole, targetUserNetworkId);

            if (!permission.canManage) {
                return res.status(403).json({
                    message: permission.reason || 'Access denied'
                });
            }

            next();
        } catch (error) {
            console.error('Error in canManageTargetUser middleware:', error);
            return res.status(500).json({ message: 'Error checking permissions' });
        }
    };
};

/**
 * Obtener roles que el usuario puede ver/administrar
 */
const getVisibleRoles = (user) => {
    if (user.roles.includes('ADMIN') || user.roles.includes('PASTOR')) {
        return ['LIDER_DOCE', 'LIDER_CELULA', 'DISCIPULO', 'INVITADO'];
    }

    if (user.isModuleCoordinator) {
        return MANAGABLE_ROLES;
    }

    if (user.roles.includes('LIDER_DOCE')) {
        return MANAGABLE_ROLES;
    }

    return [];
};

/**
 * Middleware para restringir acciones a tesoreros o coordinadores de un módulo específico
 */
const canManageTreasurerActions = (moduleName) => {
    return async (req, res, next) => {
        try {
            // Asegurarnos de que isModuleCoordinator se haya ejecutado
            if (req.user.isModuleTreasurer === undefined) {
                await isModuleCoordinator(req, res, () => {});
            }

            const isAdminOrPastor = req.user.roles.some(role => ['ADMIN', 'PASTOR'].includes(role));
            if (isAdminOrPastor) return next();

            const isTreasurer = req.user.moduleTreasurers?.includes(moduleName.toLowerCase());
            const isCoordinator = req.user.moduleCoordinations?.includes(moduleName.toLowerCase()) || 
                                 req.user.moduleSubCoordinations?.includes(moduleName.toLowerCase());

            if (isTreasurer || isCoordinator) {
                return next();
            }

            return res.status(403).json({ 
                message: `Acceso denegado. Se requiere ser Tesorero o Coordinador de ${moduleName}.` 
            });
        } catch (error) {
            console.error('Error in canManageTreasurerActions:', error);
            return res.status(500).json({ message: 'Error checking treasurer permissions' });
        }
    };
};

module.exports = {
    isModuleCoordinator,
    canManageUser,
    canManageTargetUser,
    getVisibleRoles,
    getUserNetworkId,
    canManageTreasurerActions,
    MANAGABLE_ROLES,
    PROTECTED_ROLES,
    LEADERSHIP_ROLES
};
