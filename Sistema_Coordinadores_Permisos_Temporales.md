# Sistema de Coordinadores con Permisos Temporales

**Versión:** 2.1 (Última actualización: 2026-03-30)

## Problema Actual

Los coordinadores de módulos tienen permisos de `LIDER_DOCE` que les da acceso solo a su propia red. Cuando son coordinadores de un módulo, necesitan poder gestionar usuarios **LIDER_CELULA, DISCIPULOS o INVITADOS** de otros LIDER_DOCE (no solo los de su propia red), pero **NO** deben poder modificar usuarios con roles superiores (ADMIN, PASTOR, LIDER_DOCE).

## Solución Propuesta

Implementar un sistema de permisos jerárquico donde:
- Un coordinador de módulo puede gestionar usuarios de roles **inferiores** (LIDER_CELULA, DISCIPULOS, INVITADOS) de **cualquier** red
- Un coordinador de módulo **NO puede** gestionar usuarios con roles ADMIN, PASTOR o LIDER_DOCE
- Un LIDER_DOCE **normal** (sin ser coordinador) solo puede gestionar usuarios de su **propia red**
- Los permisos son temporales: mientras sea coordinador activo, tiene estos privilegios; al removerlo, vuelve a su acceso normal de red

## Jerarquía de Roles

```
ADMIN          → Máximo nivel (nadie puede modificarlo)
PASTOR         → Segundo nivel (nadie puede modificarlo)
LIDER_DOCE     → Tercer nivel (nadie puede modificarlo)
───────────────────────── línea de separación ──────────────────────────
LIDER_CELULA   → Puede ser gestionado por: ADMIN, PASTOR, LIDER_DOCE de su red, COORDINADOR_MODULO (cualquier red)
DISCIPULO      → Puede ser gestionado por: ADMIN, PASTOR, LIDER_DOCE de su red, COORDINADOR_MODULO (cualquier red)
INVITADO       → Puede ser gestionado por: ADMIN, PASTOR, LIDER_DOCE de su red, COORDINADOR_MODULO (cualquier red)
```

## Reglas de Acceso por Tipo de Usuario

| Tipo | Puede ver/editar red | Puede ver/editar roles |
|------|---------------------|----------------------|
| ADMIN | Todas | Todos excepto ADMIN |
| PASTOR | Todas | Todos excepto ADMIN |
| LIDER_DOCE (normal) | Solo su propia red | LIDER_CELULA, DISCIPULOS, INVITADOS de su red |
| LIDER_DOCE + COORDINADOR | Todas | LIDER_CELULA, DISCIPULOS, INVITADOS de cualquier red |

## Arquitectura de la Solución

### 1. Nuevo Middleware para Coordinadores de Módulo

**Archivo: `server/middleware/coordinatorAuth.js`**

```javascript
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

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

        // Si ya tiene rol protegido, no necesita privilegios de coordinador
        // (los roles superiores ya tienen acceso amplio)
        const hasProtectedRole = req.user.roles.some(role => LEADERSHIP_ROLES.includes(role));
        if (hasProtectedRole) {
            req.user.isModuleCoordinator = false;
            return next();
        }

        // Verificar si es coordinador activo de algún módulo
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
        select: { networkId: true }
    });
    return user?.networkId;
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
    // ADMIN y PASTOR pueden gestionar a cualquiera (excepto ADMIN)
    if (requester.roles.includes('ADMIN') || requester.roles.includes('PASTOR')) {
        if (targetUserRole === 'ADMIN') {
            return { canManage: false, reason: 'Cannot manage ADMIN users' };
        }
        return { canManage: true };
    }

    // COORDINADOR_MODULO (LIDER_DOCE + es coordinador)
    if (requester.isModuleCoordinator) {
        if (PROTECTED_ROLES.includes(targetUserRole)) {
            return { canManage: false, reason: `Cannot manage ${targetUserRole} users` };
        }
        if (!MANAGABLE_ROLES.includes(targetUserRole)) {
            return { canManage: false, reason: `Cannot manage users with role: ${targetUserRole}` };
        }
        return { canManage: true };
    }

    // LIDER_DOCE normal - solo puede gestionar usuarios de su propia red
    if (requester.roles.includes('LIDER_DOCE')) {
        if (PROTECTED_ROLES.includes(targetUserRole)) {
            return { canManage: false, reason: `Cannot manage ${targetUserRole} users` };
        }

        // Verificar que el usuario destino esté en la misma red
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
```

### 2. Modificar Middleware de Autenticación Existente

**Archivo: `server/middleware/auth.js` (modificación)**

```javascript
const jwt = require('jsonwebtoken');
const { isModuleCoordinator } = require('./coordinatorAuth');

// Middleware para verificar token JWT (sin cambios)
const authenticate = (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];

        if (!token) {
            return res.status(401).json({ message: 'No token provided' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = {
            id: decoded.id || decoded.userId,
            roles: decoded.roles || (decoded.role ? [decoded.role] : [])
        };
        next();
    } catch (error) {
        return res.status(401).json({ message: 'Invalid or expired token' });
    }
};

// Middleware para verificar si el usuario es administrador
const isAdmin = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ message: 'Authentication required' });
    }

    if (!req.user.roles.includes('ADMIN')) {
        return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
    }

    next();
};

// Middleware para verificar roles específicos
const authorize = (allowedRoles = []) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: 'Authentication required' });
        }

        const hasAuthorizedRole = allowedRoles.length === 0 ||
            req.user.roles.some(role => allowedRoles.includes(role));

        if (!hasAuthorizedRole) {
            return res.status(403).json({ message: 'Access denied. You do not have the required permissions.' });
        }

        next();
    };
};

/**
 * Middleware que verifica si el usuario es coordinador activo
 * DEBE ejecutarse DESPUÉS de authenticate
 */
const checkCoordinatorStatus = async (req, res, next) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Authentication required' });
        }

        await isModuleCoordinator(req, res, next);
    } catch (error) {
        console.error('Error in checkCoordinatorStatus:', error);
        res.status(500).json({ message: 'Error checking coordinator status' });
    }
};

module.exports = {
    authenticate,
    isAdmin,
    authorize,
    checkCoordinatorStatus,
    isModuleCoordinator
};
```

### 3. Actualizar Controlador de Usuarios

**Archivo: `server/controllers/userController.js` (modificación parcial)**

```javascript
const prisma = require('../utils/database');
const { canManageUser, getVisibleRoles, getUserNetwork, MANAGABLE_ROLES, PROTECTED_ROLES } = require('../middleware/coordinatorAuth');

/**
 * Obtener todos los usuarios - filtrado por jerarquía y red
 */
const getAllUsers = async (req, res) => {
    try {
        const { role, page = 1, limit = 50 } = req.query;

        // ADMIN y PASTOR ven todos los usuarios (excepto ADMIN)
        if (req.user.roles.includes('ADMIN') || req.user.roles.includes('PASTOR')) {
            const roleFilter = role ? { role: { name: role } } : {};
            const users = await prisma.user.findMany({
                where: {
                    isDeleted: false,
                    role: roleFilter.role ? { name: roleFilter.role.name } : undefined
                },
                include: {
                    roles: { include: { role: true } },
                    profile: true,
                    network: true
                },
                skip: (page - 1) * limit,
                take: limit,
                orderBy: { id: 'desc' }
            });

            // Filtrar excluir ADMIN del resultado
            const filteredUsers = users.filter(u =>
                u.roles?.[0]?.role?.name !== 'ADMIN'
            );

            return res.json(filteredUsers);
        }

        // LIDER_DOCE con privilegios de coordinador - ve usuarios de cualquier red
        if (req.user.isModuleCoordinator) {
            const roleFilter = role ? { role: { name: role } } : {
                role: { name: { in: MANAGABLE_ROLES } }
            };

            const users = await prisma.user.findMany({
                where: {
                    isDeleted: false,
                    ...roleFilter
                },
                include: {
                    roles: { include: { role: true } },
                    profile: true,
                    network: true
                },
                skip: (page - 1) * limit,
                take: limit,
                orderBy: { id: 'desc' }
            });

            return res.json(users);
        }

        // LIDER_DOCE normal - solo ve usuarios de su propia red
        if (req.user.roles.includes('LIDER_DOCE')) {
            const requesterNetworkId = await getUserNetwork(req.user.id);

            if (!requesterNetworkId) {
                return res.json([]);
            }

            const roleFilter = role ? { role: { name: role } } : {
                role: { name: { in: MANAGABLE_ROLES } }
            };

            const users = await prisma.user.findMany({
                where: {
                    isDeleted: false,
                    networkId: requesterNetworkId,
                    ...roleFilter
                },
                include: {
                    roles: { include: { role: true } },
                    profile: true,
                    network: true
                },
                skip: (page - 1) * limit,
                take: limit,
                orderBy: { id: 'desc' }
            });

            return res.json(users);
        }

        // Otros roles - no ven usuarios
        return res.json([]);

    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * Obtener usuario por ID - con verificación de jerarquía y red
 */
const getUserById = async (req, res) => {
    try {
        const userId = parseInt(req.params.id);

        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                roles: { include: { role: true } },
                profile: true,
                network: true
            }
        });

        if (!user || user.isDeleted) {
            return res.status(404).json({ message: 'User not found' });
        }

        const targetRole = user.roles?.[0]?.role?.name;
        const permission = await canManageUser(req.user, targetRole, user.networkId);

        if (!permission.canManage) {
            return res.status(403).json({ message: permission.reason });
        }

        res.json(user);

    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * Actualizar usuario - con verificación de jerarquía y red
 */
const updateUser = async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        const currentUserId = req.user.id;

        if (userId === currentUserId) {
            return res.status(403).json({ message: 'Cannot modify your own account' });
        }

        const targetUser = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                roles: { include: { role: true } },
                network: true
            }
        });

        if (!targetUser || targetUser.isDeleted) {
            return res.status(404).json({ message: 'User not found' });
        }

        const targetRole = targetUser.roles?.[0]?.role?.name;
        const permission = await canManageUser(req.user, targetRole, targetUser.networkId);

        if (!permission.canManage) {
            return res.status(403).json({ message: permission.reason });
        }

        const { email, profile, ...userData } = req.body;

        // Continuar con la actualización...
        // ... (lógica de actualización existente)

        res.json({ message: 'User updated successfully' });

    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * Eliminar usuario - SOLO ADMIN
 */
const deleteUser = async (req, res) => {
    try {
        const userId = parseInt(req.params.id);

        // Solo ADMIN puede eliminar
        if (!req.user.roles.includes('ADMIN')) {
            return res.status(403).json({ message: 'Only administrators can delete users' });
        }

        const targetUser = await prisma.user.findUnique({
            where: { id: userId },
            include: { roles: { include: { role: true } } }
        });

        if (!targetUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (targetUser.roles?.[0]?.role?.name === 'ADMIN') {
            return res.status(403).json({ message: 'Cannot delete admin users' });
        }

        await prisma.user.update({
            where: { id: userId },
            data: { isDeleted: true }
        });

        res.json({ message: 'User deleted successfully' });

    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * Buscar usuarios - con verificación de jerarquía y red
 */
const searchUsers = async (req, res) => {
    try {
        const { q, role, page = 1, limit = 20 } = req.query;

        if (!q || q.length < 2) {
            return res.status(400).json({ message: 'Search query must be at least 2 characters' });
        }

        // Construir filtro base
        let where = {
            isDeleted: false,
            OR: [
                { email: { contains: q, mode: 'insensitive' } },
                { profile: { fullName: { contains: q, mode: 'insensitive' } } }
            ]
        };

        // ADMIN y PASTOR buscan en todas las redes
        if (req.user.roles.includes('ADMIN') || req.user.roles.includes('PASTOR')) {
            if (role) {
                where['role'] = { name: role };
            }
        }
        // LIDER_DOCE + coordinador busca en todas las redes, solo roles menores
        else if (req.user.isModuleCoordinator) {
            where['role'] = { name: { in: MANAGABLE_ROLES } };
            if (role && !MANAGEABLE_ROLES.includes(role)) {
                return res.status(403).json({ message: `You cannot search for role: ${role}` });
            }
            if (role) {
                where['role'] = { name: role };
            }
        }
        // LIDER_DOCE normal busca solo en su red
        else if (req.user.roles.includes('LIDER_DOCE')) {
            const requesterNetworkId = await getUserNetwork(req.user.id);
            if (!requesterNetworkId) {
                return res.json([]);
            }
            where['networkId'] = requesterNetworkId;
            where['role'] = { name: { in: MANAGABLE_ROLES } };
            if (role && !MANAGEABLE_ROLES.includes(role)) {
                return res.status(403).json({ message: `You cannot search for role: ${role}` });
            }
            if (role) {
                where['role'] = { name: role };
            }
        }
        // Otros roles no pueden buscar
        else {
            return res.json([]);
        }

        const users = await prisma.user.findMany({
            where,
            include: {
                roles: { include: { role: true } },
                profile: true,
                network: true
            },
            skip: (page - 1) * limit,
            take: limit
        });

        res.json(users);

    } catch (error) {
        console.error('Error searching users:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
```

### 4. Actualizar Rutas de Usuarios

**Archivo: `server/routes/userRoutes.js` (modificación)**

```javascript
const express = require('express');
const router = express.Router();
const {
    getProfile,
    updateProfile,
    changePassword,
    getAllUsers,
    getUserById,
    updateUser,
    createUser,
    deleteUser,
    assignLeader,
    getMyNetwork,
    searchUsers
} = require('../controllers/userController');
const { authenticate, isAdmin, authorize, checkCoordinatorStatus } = require('../middleware/auth');

router.use(authenticate);
router.use(checkCoordinatorStatus); // Establece req.user.isModuleCoordinator

// Profile routes (authenticated users)
router.get('/profile', getProfile);
router.put('/profile', updateProfile);
router.put('/password', changePassword);

// Buscar usuarios - con filtros de jerarquía
router.get('/search', searchUsers);

// Obtener todos los usuarios - filtrado por rol y red
router.get('/', getAllUsers);

// Obtener usuario por ID - con verificación de jerarquía y red
router.get('/:id', getUserById);

// Crear usuario - ADMIN, PASTOR, LIDER_DOCE
router.post('/', authorize(['ADMIN', 'PASTOR', 'LIDER_DOCE']), createUser);

// Actualizar usuario - con verificación de jerarquía y red
router.put('/:id', updateUser);

// Eliminar usuario - SOLO ADMIN
router.delete('/:id', isAdmin, deleteUser);

// Asignar líder - ADMIN, PASTOR, LIDER_DOCE
router.post('/assign-leader/:id', authorize(['ADMIN', 'PASTOR', 'LIDER_DOCE']), assignLeader);

router.get('/my-network/all', getMyNetwork);

module.exports = router;
```

### 5. Actualizar coordinatorRoutes.js

**Archivo: `server/routes/coordinatorRoutes.js` (modificación)**

```javascript
const express = require('express');
const router = express.Router();
const {
    getModuleCoordinators,
    getDefaultModuleCoordinator,
    assignModuleCoordinator,
    removeModuleCoordinator
} = require('../controllers/coordinatorController');
const { authenticate, isAdmin, checkCoordinatorStatus } = require('../middleware/auth');

router.use(authenticate);
router.use(checkCoordinatorStatus);

// Get coordinators - ADMIN y PASTOR ven todos, LIDER_DOCE solo ve los de su red
router.get('/', getModuleCoordinators);

// Get default coordinator for module - abierto
router.get('/module/:module', getDefaultModuleCoordinator);

// Assign/Remove coordinator - SOLO ADMIN
router.post('/module/:module', isAdmin, assignModuleCoordinator);
router.delete('/module/:module', isAdmin, removeModuleCoordinator);

module.exports = router;
```

### 6. Actualizar schoolRoutes.js

**Archivo: `server/routes/schoolRoutes.js` (modificación)**

```javascript
const express = require('express');
const router = express.Router();
const { authenticate, authorize, checkCoordinatorStatus } = require('../middleware/auth');
const {
    createModule,
    getModules,
    enrollStudent,
    getModuleMatrix,
    updateMatrixCell,
    deleteModule,
    updateModule,
    unenrollStudent,
    getSchoolStatsByLeader,
    getStudentMatrix,
    getClassMaterials,
    updateClassMaterial
} = require('../controllers/schoolController');

router.use(authenticate);
router.use(checkCoordinatorStatus);

// Módulos - lectura para todos los autenticados
router.get('/modules', getModules);
router.get('/modules/:id/matrix', getModuleMatrix);

// Gestión de módulos - ADMIN, PASTOR, LIDER_DOCE
router.post('/modules', authorize(['ADMIN', 'PASTOR', 'LIDER_DOCE']), createModule);
router.put('/modules/:id', authorize(['ADMIN', 'PASTOR', 'LIDER_DOCE']), updateModule);
router.delete('/modules/:id', authorize(['ADMIN', 'PASTOR', 'LIDER_DOCE']), deleteModule);

// Inscripción - ADMIN, PASTOR, LIDER_DOCE (coordinador NO puede inscribir, solo gestiona módulos)
// NOTA: Un coordinador de módulo no necessarily tiene acceso a inscribir estudiantes
// Esto depende de si la institución quiere darle ese privilegio
router.post('/enroll', authorize(['ADMIN', 'PASTOR', 'LIDER_DOCE']), enrollStudent);
router.delete('/enrollments/:enrollmentId', authorize(['ADMIN', 'PASTOR', 'LIDER_DOCE']), unenrollStudent);
router.post('/matrix/update', authorize(['ADMIN', 'PASTOR', 'LIDER_DOCE']), updateMatrixCell);

// Materials - ADMIN, PASTOR, LIDER_DOCE
router.get('/modules/:moduleId/materials', getClassMaterials);
router.post('/modules/:moduleId/materials/:classNumber',
    authorize(['ADMIN', 'PASTOR', 'LIDER_DOCE']),
    updateClassMaterial);

// Stats - ADMIN, PASTOR, LIDER_DOCE
router.get('/stats/leader', authorize(['ADMIN', 'PASTOR', 'LIDER_DOCE']), getSchoolStatsByLeader);

// Student Matrix - ADMIN, PASTOR, LIDER_DOCE
router.get('/student-matrix', authorize(['ADMIN', 'PASTOR', 'LIDER_DOCE']), getStudentMatrix);

module.exports = router;
```

> **NOTA sobre coordinadores de módulo y School:** El rol de coordinador de módulo es para gestionar usuarios dentro de un módulo (por ejemplo, asignar líderes de clase en Kids). La gestión de módulos como creación/eliminación de módulos sigue siendo solo para ADMIN, PASTOR, LIDER_DOCE. Un coordinador de módulo puede editar la información de su módulo (horarios, materiales) pero no puede crear nuevos módulos ni eliminar existentes.

### 7. Actualizar Controlador de Coordinadores

**Archivo: `server/controllers/coordinatorController.js` (modificación)**

```javascript
const { PrismaClient } = require('@prisma/client');
const prisma = require('../utils/database');

/**
 * Obtener coordinadores de módulo
 * ADMIN/PASTOR ven todos, LIDER_DOCE solo ve los de su red
 */
const getModuleCoordinators = async (req, res) => {
    try {
        const { module } = req.query;

        // Base where clause
        const where = {
            isDeleted: false,
            roles: {
                some: {
                    role: { name: 'LIDER_DOCE' }
                }
            }
        };

        // Si es LIDER_DOCE normal (no admin/pastor), filtrar por su red
        if (!req.user.roles.includes('ADMIN') && !req.user.roles.includes('PASTOR')) {
            const userNetwork = await prisma.user.findUnique({
                where: { id: req.user.id },
                select: { networkId: true }
            });

            if (userNetwork?.networkId) {
                where['networkId'] = userNetwork.networkId;
            }
        }

        if (module) {
            where.moduleCoordinations = {
                some: { moduleName: module }
            };
        }

        const coordinators = await prisma.user.findMany({
            where,
            select: {
                id: true,
                email: true,
                profile: { select: { fullName: true } },
                roles: { include: { role: { select: { name: true } } } },
                network: { select: { name: true } },
                moduleCoordinations: {
                    select: { moduleName: true, createdAt: true }
                }
            },
            orderBy: { profile: { fullName: 'asc' } }
        });

        const formatted = coordinators.map(c => ({
            id: c.id,
            email: c.email,
            fullName: c.profile?.fullName || 'Sin Nombre',
            role: c.roles?.[0]?.role?.name || 'LIDER_DOCE',
            network: c.network?.name || 'Sin Red',
            coordinatedModules: c.moduleCoordinations.map(mc => mc.moduleName),
            isCurrentlyCoordinating: c.moduleCoordinations.length > 0
        }));

        res.json(formatted);
    } catch (error) {
        console.error('Error fetching coordinators:', error);
        res.status(500).json({ message: 'Server error fetching coordinators' });
    }
};

/**
 * Obtener coordinador por defecto de un módulo
 */
const getDefaultModuleCoordinator = async (req, res) => {
    try {
        const { module } = req.params;

        const moduleCoordinator = await prisma.moduleCoordinator.findFirst({
            where: { moduleName: module },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        profile: { select: { fullName: true } }
                    }
                }
            },
            orderBy: { createdAt: 'asc' }
        });

        if (!moduleCoordinator) {
            return res.json(null);
        }

        res.json({
            id: moduleCoordinator.user.id,
            email: moduleCoordinator.user.email,
            fullName: moduleCoordinator.user.profile?.fullName || 'Sin Nombre',
            moduleName: module
        });
    } catch (error) {
        console.error('Error fetching default coordinator:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * Asignar coordinador a un módulo - SOLO ADMIN
 */
const assignModuleCoordinator = async (req, res) => {
    try {
        const { module } = req.params;
        const { userId } = req.body;

        // Verificar que el usuario es LIDER_DOCE
        const user = await prisma.user.findFirst({
            where: {
                id: userId,
                isDeleted: false,
                roles: {
                    some: { role: { name: 'LIDER_DOCE' } }
                }
            },
            include: { profile: { select: { fullName: true } } }
        });

        if (!user) {
            return res.status(400).json({ message: 'User must be a LIDER_DOCE' });
        }

        // Eliminar coordinador existente para este módulo
        await prisma.moduleCoordinator.deleteMany({
            where: { moduleName: module }
        });

        // Asignar nuevo coordinador
        const coordinator = await prisma.moduleCoordinator.create({
            data: { userId, moduleName: module },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        profile: { select: { fullName: true } }
                    }
                }
            }
        });

        console.log(`✅ Coordinator assigned: ${user.profile?.fullName} -> Module: ${module}`);

        res.json({
            id: coordinator.user.id,
            email: coordinator.user.email,
            fullName: coordinator.user.profile?.fullName || 'Sin Nombre',
            moduleName: module,
            message: 'Coordinator assigned successfully. User can now manage lower-role users from any network.'
        });
    } catch (error) {
        console.error('Error assigning coordinator:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * Remover coordinador de un módulo - SOLO ADMIN
 */
const removeModuleCoordinator = async (req, res) => {
    try {
        const { module } = req.params;

        const existingCoordinator = await prisma.moduleCoordinator.findFirst({
            where: { moduleName: module },
            include: {
                user: {
                    select: { profile: { select: { fullName: true } } }
                }
            }
        });

        await prisma.moduleCoordinator.deleteMany({
            where: { moduleName: module }
        });

        if (existingCoordinator) {
            console.log(`❌ Coordinator removed: ${existingCoordinator.user.profile?.fullName} -> Module: ${module}`);
        }

        res.json({
            message: 'Coordinator removed successfully. User privileges reverted to normal network access.',
            moduleName: module
        });
    } catch (error) {
        console.error('Error removing coordinator:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
    getModuleCoordinators,
    getDefaultModuleCoordinator,
    assignModuleCoordinator,
    removeModuleCoordinator
};
```

## Flujo de Implementación

### Paso 1: Crear middleware `coordinatorAuth.js`
1. Definir constantes `MANAGABLE_ROLES`, `PROTECTED_ROLES`, `LEADERSHIP_ROLES`
2. Implementar `isModuleCoordinator()`
3. Implementar `canManageUser()` con verificación de red
4. Implementar `getUserNetwork()`

### Paso 2: Modificar `auth.js`
1. Agregar `checkCoordinatorStatus` middleware
2. Actualizar exports

### Paso 3: Modificar `userController.js`
1. Actualizar `getAllUsers()` con filtros de red y jerarquía
2. Actualizar `getUserById()` con verificación de jerarquía y red
3. Actualizar `updateUser()` con verificación de jerarquía y red
4. Implementar `searchUsers()` con filtros correctos

### Paso 4: Modificar `userRoutes.js`
1. Agregar `router.use(checkCoordinatorStatus)`
2. Simplificar rutas ya que la verificación está en el controlador

### Paso 5: Actualizar `coordinatorRoutes.js`
1. Proteger rutas POST/DELETE con `isAdmin`
2. Actualizar `getModuleCoordinators` para filtrar por red

### Paso 6: Actualizar `schoolRoutes.js`
1. Agregar `checkCoordinatorStatus`
2. Agregar `authorize()` a rutas de escritura

### Paso 7: Pruebas
1. Verificar que LIDER_DOCE normal solo ve su red
2. Verificar que coordinador ve usuarios LIDER_CELULA/DISCIPULOS/INVITADOS de otras redes
3. Verificar que coordinador NO ve/editar usuarios ADMIN, PASTOR, LIDER_DOCE
4. Verificar revocación elimina privilegios
5. Verificar que searchUsers filtra correctamente

## Resumen de Cambios

| Archivo | Cambio | Prioridad |
|---------|--------|-----------|
| `server/middleware/coordinatorAuth.js` | **NUEVO** - lógica de permisos jerárquicos con red | 1 |
| `server/middleware/auth.js` | Agregar `checkCoordinatorStatus` | 2 |
| `server/controllers/userController.js` | Agregar verificación de jerarquía y red | 1 |
| `server/routes/userRoutes.js` | Agregar `checkCoordinatorStatus`, simplificar | 1 |
| `server/routes/coordinatorRoutes.js` | Proteger rutas con `isAdmin`, filtrar por red | 2 |
| `server/routes/schoolRoutes.js` | Agregar `authorize()` y `checkCoordinatorStatus` | 2 |

## Escenarios de Uso (Corregidos)

### Escenario 1: LIDER_DOCE Normal
```
1. Pedro es LIDER_DOCE de "Red Norte"
2. Pedro solo puede ver/editar usuarios LIDER_CELULA, DISCIPULOS, INVITADOS en "Red Norte"
3. Pedro NO puede ver usuarios de "Red Sur"
4. Pedro NO puede ver ADMIN, PASTOR ni otros LIDER_DOCE
5. Pedro NO puede ver/editarse a sí mismo
```

### Escenario 2: Coordinador de Módulo
```
1. María es LIDER_DOCE de "Red Sur" + coordinadora del módulo "Kids"
2. María puede ver/editar usuarios LIDER_CELULA, DISCIPULOS, INVITADOS de CUALQUIER red
3. María NO puede ver/editar ADMIN, PASTOR, ni otros LIDER_DOCE
4. María NO puede ver/editarse a sí misma
```

### Escenario 3: Revocación de Coordinador
```
1. Admin revoca a María como coordinadora de "Kids"
2. María vuelve a ser solo LIDER_DOCE de "Red Sur"
3. María solo puede gestionar usuarios de "Red Sur"
4. María pierde acceso a usuarios de otras redes
```

### Escenario 4: Intento de Acceso No Autorizado
```
1. Juan (LIDER_DOCE de "Red Norte") intenta editar a Ana (LIDER_CELULA de "Red Sur")
2. Sistema verifica: targetUserNetworkId !== requesterNetworkId
3. Sistema deniega: "Cannot manage users outside your network"
```

### Escenario 5: Coordinator intenta acceder a rol protegido
```
1. María (coordinadora de "Kids") intenta editar a Admin
2. Sistema verifica: PROTECTED_ROLES.includes('ADMIN')
3. Sistema deniega: "Cannot manage ADMIN users"
```

### Escenario 6: Búsqueda de usuarios
```
1. Pedro (LIDER_DOCE normal) busca "Juan"
2. Sistema filtra: solo usuarios en "Red Norte" + roles menores
3. Pedro recibe solo resultados de su red

1. María (coordinadora) busca "Juan"
2. Sistema filtra: todas las redes + roles menores
3. María recibe resultados de cualquier red
```

---

## Historial de Cambios

| Fecha | Versión | Cambio | Problema Resuelto |
|-------|---------|--------|-------------------|
| 2026-03-30 | 1.0 | Creación inicial del documento | Versión inicial con propuesta básica |
| 2026-03-30 | 1.1 | Corrección de callbacks anidados en `requireCoordinatorOrAdmin` y `authorizeWithCoordinator` | El código tenía anidación de callbacks async que podía causar problemas de flujo |
| 2026-03-30 | 1.2 | Agregada sección `coordinatorRoutes.js` con `isAdmin` | Las rutas de asignar/remover coordinador no estaban protegidas |
| 2026-03-30 | 1.3 | Agregada sección `schoolRoutes.js` con autorización | Rutas de school no tenían middleware de autorización |
| 2026-03-30 | 1.4 | Actualizada tabla de resumen con prioridades | Falta de claridad sobre orden de implementación |

### Version 2.0 - Rediseño Completo (2026-03-30)

| Fecha | Cambio | Problema Resuelto |
|-------|--------|-------------------|
| 2026-03-30 | 2.0 | **Rediseño completo** - Nueva Opción B con rol específico `COORDINADOR_MODULO` |
| 2026-03-30 | 2.0 | Definida jerarquía de roles clara (ADMIN > PASTOR > LIDER_DOCE > LIDER_CELULA > DISCIPULO > INVITADO) |
| 2026-03-30 | 2.0 | Implementada función `canManageUser()` para verificación de permisos |
| 2026-03-30 | 2.0 | Agregada tabla de "Reglas de Acceso por Tipo de Usuario" |

### Version 2.1 - Corrección de Fugas de Seguridad (2026-03-30)

| # | Problema Encontrado | Ubicación | Corrección Aplicada |
|---|---------------------|-----------|---------------------|
| 1 | LIDER_DOCE normal tenía acceso a usuarios de otras redes | `canManageUser()`, `getVisibleRoles()` | Agregada verificación de `networkId` para LIDER_DOCE normal |
| 2 | `getAllUsers()` no filtraba por red | `userController.js:355-399` | Agregado filtro de red según tipo de usuario |
| 3 | `searchUsers` no tenía filtro de jerarquía | `userRoutes.js:457` | Implementado filtro de red y rol en `searchUsers()` |
| 4 | SchoolRoutes no diferenciaba acceso por módulo | `schoolRoutes.js:564-616` | Documentada distinción entre gestión de usuarios vs gestión de módulos |
| 5 | No había validación de network en `updateUser` | `userController.js:256-300` | Agregada verificación de `canManageUser()` con `targetUserNetworkId` |
| 6 | `getUserById` permitía ver usuarios de otras redes | `userRoutes.js:463-487` | Agregada verificación de jerarquía y red |

### Escenarios de Fuga Cerrados

| Escenario | Antes (V2.0) | Después (V2.1) |
|-----------|--------------|----------------|
| LIDER_DOCE normal ve usuarios de otras redes | ❌ Filtraba por rol, no por red | ✅ Bloqueado con "Cannot manage users outside your network" |
| searchUsers expone todas las redes | ❌ Sin filtro de red | ✅ Filtra por red del solicitante |
| getUserById de otra red | ❌ Solo verificaba rol | ✅ Verifica rol + red |
| updateUser de otra red | ❌ Sin verificación de red | ✅ Bloqueado con verificación de red |
| coordinatorRoutes sin protección | ❌ Cualquier usuario autenticado | ✅ Solo ADMIN puede asignar/remover |

---

**Nota**: Esta implementación requiere cambios en los controladores para verificar tanto la jerarquía de roles como la red del usuario en cada operación. No requiere cambios en la base de datos.
