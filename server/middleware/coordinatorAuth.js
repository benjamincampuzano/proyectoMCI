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
 * Módulos disponibles en el sistema
 */
const AVAILABLE_MODULES = [
    'ganar',
    'consolidar',
    'enviar',
    'discipular',
    'kids',
    'escuela-de-artes',
    'arts',
    'encuentro',
    'convencion'
];

/**
 * Normaliza el nombre del módulo
 */
const normalizeModuleName = (name) => {
    if (!name) return '';
    return name.toLowerCase().trim().replace(/\s+/g, '-');
};

/**
 * Obtiene el módulo actual desde req (params, query o path)
 */
const getCurrentModule = (req) => {
    const path = req.path || '';
    const moduleFromParams = req.params.module;
    const moduleFromQuery = req.query.module;
    
    // Extraer de la ruta: /api/:module/... -> :module
    for (const mod of AVAILABLE_MODULES) {
        if (path.includes(`/${mod}`) || path.includes(`/${mod}/`)) {
            return mod;
        }
    }
    
    if (moduleFromParams) return normalizeModuleName(moduleFromParams);
    if (moduleFromQuery) return normalizeModuleName(moduleFromQuery);
    
    return normalizeModuleName(path.split('/')[2] || '');
};

/**
 * Middleware para verificar si el usuario es coordinador activo de algún módulo
 * y establecer permisos específicos por módulo actual
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
                where: { userId: parseInt(req.user.id), isDeleted: false },
                select: { moduleName: true }
            }),
            prisma.moduleSubCoordinator.findMany({
                where: { userId: parseInt(req.user.id), isDeleted: false },
                select: { moduleName: true }
            }),
            prisma.moduleTreasurer.findMany({
                where: { userId: parseInt(req.user.id), isDeleted: false },
                select: { moduleName: true }
            })
        ]);

        const coordFromDB = coordinations.map(c => normalizeModuleName(c.moduleName));
        const subCoordFromDB = subCoordinations.map(sc => normalizeModuleName(sc.moduleName));
        const treasFromDB = treasurers.map(t => normalizeModuleName(t.moduleName));

        // Combinar con datos del token JWT (si existen) para redundancia
        const tokenCoords = req.user.moduleCoordinationsFromToken || {};
        
        req.user.moduleCoordinations = [...new Set([...coordFromDB, ...(tokenCoords.coordinating || [])])];
        req.user.moduleSubCoordinations = [...new Set([...subCoordFromDB, ...(tokenCoords.subCoordinating || [])])];
        req.user.moduleTreasurers = [...new Set([...treasFromDB, ...(tokenCoords.treasuring || [])])];

        // Obtener el módulo actual de la request
        const currentModule = getCurrentModule(req);
        
        // ═══════════════════════════════════════════════════════════════
        // PERMISOS ESPECÍFICOS POR MÓDULO
        // ═══════════════════════════════════════════════════════
        
        // Permisos globales (sin módulo específico)
        req.user.isModuleCoordinator = req.user.moduleCoordinations.length > 0 || req.user.moduleSubCoordinations.length > 0;
        req.user.isModuleTreasurer = req.user.moduleTreasurers.length > 0 || isAdminOrPastor;
        
        // Permisos para el MÓDULO ACTUAL de la request
        req.user.currentModule = currentModule;
        
        if (currentModule) {
            // Coordinator del módulo actual
            const isCoordinatorOfCurrent = 
                req.user.moduleCoordinations.includes(currentModule) || 
                req.user.moduleSubCoordinations.includes(currentModule);
            
            // Tesorero del módulo actual
            const isTreasurerOfCurrent = req.user.moduleTreasurers.includes(currentModule);
            
            // ADMIN/PASTOR tiene permisos completos en cualquier módulo
            const isAdminOfCurrent = isAdminOrPastor;
            
            // Establecer permisos para el módulo actual
            req.user.isModuleCoordinatorOfCurrent = isCoordinatorOfCurrent || isAdminOfCurrent;
            req.user.isModuleTreasurerOfCurrent = isTreasurerOfCurrent || isAdminOfCurrent;
            req.user.isAdminOfCurrent = isAdminOfCurrent;
            
            // Permiso completo en el módulo actual = coordinator + ADMIN/PASTOR
            req.user.hasFullAccessOnCurrentModule = isCoordinatorOfCurrent || isAdminOfCurrent;
            
            // Si no es coordinator del módulo actual, solo tiene permisos base de su rol en sistema
            // Los permisos elevados solo aplican si es coordinator del módulo específico
        } else {
            // Sin módulo específico en la request
            req.user.isModuleCoordinatorOfCurrent = isAdminOrPastor;
            req.user.isModuleTreasurerOfCurrent = isAdminOrPastor;
            req.user.isAdminOfCurrent = isAdminOrPastor;
            req.user.hasFullAccessOnCurrentModule = isAdminOrPastor;
        }

        // For backward compatibility (deprecated)
        req.user.coordinatedModule = req.user.moduleCoordinations[0] || req.user.moduleSubCoordinations[0] || req.user.moduleTreasurers[0];

        return next();

    } catch (error) {
        console.error('Error in isModuleCoordinator middleware:', error);
        return res.status(500).json({ message: 'Error checking coordinator status' });
    }
};

/**
 * Middleware para requerir coordinator del módulo específico
 * Si no es coordinator, tiene permisos base según su rol de sistema
 */
const requireModuleCoordinator = async (req, res, next) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Authentication required' });
        }

        // Si ya calculó los permisos en el middleware anterior
        if (req.user.hasFullAccessOnCurrentModule !== undefined) {
            return next();
        }

        // Calcular si no se ha hecho aún
        await isModuleCoordinator(req, res, () => {});
        return next();

    } catch (error) {
        console.error('Error in requireModuleCoordinator:', error);
        return res.status(500).json({ message: 'Error checking module permissions' });
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
 * Roles que un coordinador de módulo PUEDE gestionar
 * (incluye LIDER_DOCE y roles menores - permisos de ADMIN a nivel de módulo)
 */
const COORDINATOR_MANAGABLE_ROLES = ['LIDER_DOCE', 'LIDER_CELULA', 'DISCIPULO', 'INVITADO'];

/**
 * Roles que un coordinador de módulo NO puede gestionar (solo ADMIN global)
 */
const COORDINATOR_PROTECTED_ROLES = ['ADMIN', 'PASTOR'];

/**
 * Roles que Subcoordinadores y Tesoreros elevados pueden gestionar
 * (roles menores - permisos de ADMIN restringidos a nivel de módulo)
 */
const ELEVATED_MODULE_ROLES = ['LIDER_CELULA', 'DISCIPULO', 'INVITADO'];

/**
 * Roles que solo ADMIN global puede gestionar (protegidos para todos los demás)
 */
const GLOBAL_PROTECTED_ROLES = ['ADMIN', 'PASTOR', 'LIDER_DOCE'];

/**
 * Verifica si el usuario tiene acceso de ADMIN en un módulo específico
 * (ya sea por rol global o por ser coordinador/subcoordinador/tesorero de ese módulo)
 *
 * @param {Object} user - Usuario
 * @param {string} moduleName - Nombre del módulo
 * @returns {boolean}
 */
const hasAdminAccessOnModule = (user, moduleName) => {
    if (!user || !moduleName) return false;

    // ADMIN y PASTOR tienen acceso global
    if (user.roles.includes('ADMIN') || user.roles.includes('PASTOR')) {
        return true;
    }

    // Coordinador, Subcoordinador y Tesorero tienen acceso de ADMIN en su módulo asignado
    const normalizedModule = normalizeModuleName(moduleName);
    return user.moduleCoordinations?.includes(normalizedModule) ||
           user.moduleSubCoordinations?.includes(normalizedModule) ||
           user.moduleTreasurers?.includes(normalizedModule);
};

/**
 * Verifica si el solicitante puede gestionar al usuario destino
 * basado en la jerarquía de roles y permisos por módulo
 *
 * @param {Object} requester - Usuario que hace la petición
 * @param {string} targetUserRole - Rol del usuario destino
 * @param {number} targetUserNetworkId - ID de la red del usuario destino
 * @param {string} moduleName - Nombre del módulo (opcional)
 * @returns {Object} { canManage: boolean, reason?: string }
 */
const canManageUser = async (requester, targetUserRole, targetUserNetworkId, moduleName) => {
    // ADMIN Y PASTOR tienen permisos completos en todos los módulos
    if (requester.roles.includes('ADMIN') || requester.roles.includes('PASTOR')) {
        // Los ADMIN pueden gestionar todos los usuarios, incluyendo otros ADMIN
        // Los PASTOR no pueden gestionar ADMIN
        if (requester.roles.includes('PASTOR') && targetUserRole === 'ADMIN') {
            return { canManage: false, reason: 'PASTOR cannot manage ADMIN users' };
        }
        return { canManage: true, level: 'admin' };
    }

    const currentModule = moduleName || requester.currentModule;

    // ═══════════════════════════════════════════════════════════════
    // COORDINADOR DEL MÓDULO ESPECÍFICO - permisos de ADMIN a nivel de módulo
    // ═══════════════════════════════════════════════════════════════
    if (currentModule && hasAdminAccessOnModule(requester, currentModule)) {
        // No puede gestionar roles globales protegidos (solo ADMIN global puede)
        if (GLOBAL_PROTECTED_ROLES.includes(targetUserRole)) {
            return { canManage: false, reason: `Cannot manage ${targetUserRole} users` };
        }

        const normalizedModule = normalizeModuleName(currentModule);
        const isMainCoordinator = requester.moduleCoordinations?.includes(normalizedModule);
        const isElevatedRole = requester.moduleSubCoordinations?.includes(normalizedModule) ||
                              requester.moduleTreasurers?.includes(normalizedModule);

        // Coordinador principal puede gestionar LIDER_DOCE y roles menores
        if (isMainCoordinator) {
            if (!COORDINATOR_MANAGABLE_ROLES.includes(targetUserRole)) {
                return { canManage: false, reason: `Cannot manage users with role: ${targetUserRole}` };
            }
            return { canManage: true, level: 'module_admin', module: currentModule };
        }

        // Subcoordinador/Tesorero elevado solo puede gestionar roles menores
        if (isElevatedRole) {
            if (!ELEVATED_MODULE_ROLES.includes(targetUserRole)) {
                return { canManage: false, reason: `Cannot manage users with role: ${targetUserRole}` };
            }
            return { canManage: true, level: 'elevated_module_admin', module: currentModule };
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // LIDER_DOCE (sin permisos de coordinator)
    // ═══════════════════════════════════════════
    if (requester.roles.includes('LIDER_DOCE')) {
        if (PROTECTED_ROLES.includes(targetUserRole)) {
            return { canManage: false, reason: `Cannot manage ${targetUserRole} users` };
        }

        const requesterNetworkId = await getUserNetworkId(requester.id);
        if (targetUserNetworkId !== requesterNetworkId) {
            return { canManage: false, reason: 'Cannot manage users outside your network' };
        }

        return { canManage: true, level: 'lider_doce' };
    }

    //Sin permisos suficientes
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

    // Coordinadores, Subcoordinadores y Tesoreros con permisos de admin
    if (user.isModuleCoordinator || user.isModuleTreasurer) {
        // Coordinadores principales pueden ver LIDER_DOCE y roles menores
        if (user.moduleCoordinations && user.moduleCoordinations.length > 0) {
            return COORDINATOR_MANAGABLE_ROLES;
        }
        // Subcoordinadores y Tesoreros solo pueden ver roles menores
        return ELEVATED_MODULE_ROLES;
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
            // Si los datos de módulo no están en el token, cargarlos de la base de datos
            if (!req.user.moduleCoordinations || !req.user.moduleSubCoordinations || !req.user.moduleTreasurers) {
                const userId = req.user.id;
                const [coordinations, subCoordinations, treasurers] = await Promise.all([
                    prisma.moduleCoordinator.findMany({
                        where: { userId, isDeleted: false },
                        select: { moduleName: true }
                    }),
                    prisma.moduleSubCoordinator.findMany({
                        where: { userId, isDeleted: false },
                        select: { moduleName: true }
                    }),
                    prisma.moduleTreasurer.findMany({
                        where: { userId, isDeleted: false },
                        select: { moduleName: true }
                    })
                ]);

                // Actualizar el objeto user con los datos de módulo
                req.user.moduleCoordinations = coordinations.map(c => c.moduleName);
                req.user.moduleSubCoordinations = subCoordinations.map(sc => sc.moduleName);
                req.user.moduleTreasurers = treasurers.map(t => t.moduleName);
            }

            const isAdminOrPastor = req.user.roles.some(role => ['ADMIN', 'PASTOR'].includes(role));
            if (isAdminOrPastor) return next();

            const normalizedModuleName = normalizeModuleName(moduleName);
            const isTreasurer = req.user.moduleTreasurers?.includes(normalizedModuleName);
            const isCoordinator = req.user.moduleCoordinations?.includes(normalizedModuleName) || 
                                 req.user.moduleSubCoordinations?.includes(normalizedModuleName);

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
    requireModuleCoordinator,
    getUserNetworkId,
    canManageUser,
    canManageTargetUser,
    getVisibleRoles,
    getCurrentModule,
    hasAdminAccessOnModule,
    canManageTreasurerActions,
    normalizeModuleName,
    AVAILABLE_MODULES,
    MANAGABLE_ROLES,
    PROTECTED_ROLES,
    LEADERSHIP_ROLES,
    COORDINATOR_MANAGABLE_ROLES,
    COORDINATOR_PROTECTED_ROLES,
    ELEVATED_MODULE_ROLES,
    GLOBAL_PROTECTED_ROLES
};
