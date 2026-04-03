const { PrismaClient } = require('@prisma/client');
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

        const hasProtectedRole = req.user.roles.some(role => LEADERSHIP_ROLES.includes(role));
        if (hasProtectedRole) {
            req.user.isModuleCoordinator = false;
            return next();
        }

        const coordinator = await prisma.moduleCoordinator.findFirst({
            where: {
                userId: parseInt(req.user.id)
            },
            select: {
                id: true,
                moduleName: true
            }
        });

        if (coordinator) {
            req.user.isModuleCoordinator = true;
            req.user.coordinatedModule = coordinator.moduleName;
            console.log(`User ${req.user.id} is active coordinator for module: ${coordinator.moduleName}`);
            return next();
        }

        const subCoordinator = await prisma.moduleSubCoordinator.findFirst({
            where: {
                userId: parseInt(req.user.id)
            },
            select: {
                id: true,
                moduleName: true
            }
        });

        if (subCoordinator) {
            req.user.isModuleCoordinator = true;
            req.user.coordinatedModule = subCoordinator.moduleName;
            req.user.isSubCoordinator = true;
            console.log(`User ${req.user.id} is active sub-coordinator for module: ${subCoordinator.moduleName}`);
            return next();
        }

        req.user.isModuleCoordinator = false;
        return next();

    } catch (error) {
        console.error('Error in isModuleCoordinator middleware:', error);
        return res.status(500).json({ message: 'Error checking coordinator status' });
    }
};

/**
 * Obtiene la red del usuario
 */
const getUserNetwork = async (userId) => {
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

        const requesterNetworkId = await getUserNetwork(requester.id);
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
            const targetUserNetworkId = targetUser.networkId;

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

module.exports = {
    isModuleCoordinator,
    canManageUser,
    canManageTargetUser,
    getVisibleRoles,
    getUserNetwork,
    MANAGABLE_ROLES,
    PROTECTED_ROLES,
    LEADERSHIP_ROLES
};
