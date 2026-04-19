const prisma = require('../utils/database');
const { MODULES, normalizeModuleName } = require('../utils/moduleConstants');

/**
 * Check if user has ADMIN-level permissions for a specific module
 *
 * Permission hierarchy (evaluated in order):
 * 1. Global ADMIN role → full access to all modules
 * 2. Module Coordinator → ADMIN-equivalent access for THAT module only
 * 3. Base role permissions → standard access per role
 *
 * @param {Object} user - User object with roles and moduleCoordinations
 * @param {string} moduleName - Module name to check permissions for
 * @returns {Promise<boolean>} - True if user has ADMIN-level access for the module
 */
const hasModuleAdminAccess = async (user, moduleName) => {
  if (!user) return false;
  if (!moduleName) return false;

  const normalizedModule = normalizeModuleName(moduleName);

  // 1. Global ADMIN has access to everything
  if (user.roles.includes('ADMIN')) {
    return true;
  }

  // 2. Check if user is coordinator for THIS specific module
  const isCoordinator = await prisma.moduleCoordinator.findFirst({
    where: {
      userId: parseInt(user.id),
      moduleName: normalizedModule,
      isDeleted: false,
    },
  });

  if (isCoordinator) {
    return true; // Coordinator has ADMIN-like permissions for their module
  }

  return false;
};

/**
 * Middleware factory to require ADMIN-level access for a specific module
 *
 * Usage:
 *   router.post('/some-action', requireModuleAdmin('ganar'), handler);
 *   router.get('/list', requireModuleAdmin('discipular'), handler);
 *
 * @param {string} moduleName - Module name to check permissions for
 * @returns {Function} - Express middleware function
 */
const requireModuleAdmin = (moduleName) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const hasAccess = await hasModuleAdminAccess(req.user, moduleName);

    if (!hasAccess) {
      return res.status(403).json({
        message: `Access denied. Requires ADMIN or module coordinator permissions for ${moduleName}.`,
      });
    }

    // Add flag to request for downstream middleware/handlers
    req.hasModuleAdminAccess = true;
    next();
  };
};

/**
 * Middleware factory to check if user is coordinator of a specific module
 * Stricter than requireModuleAdmin - only coordinators pass (not ADMIN)
 *
 * @param {string} moduleName - Module name to check
 * @returns {Function} - Express middleware function
 */
const requireModuleCoordinator = (moduleName) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const normalizedModule = normalizeModuleName(moduleName);
    const isCoordinator = await prisma.moduleCoordinator.findFirst({
      where: {
        userId: parseInt(req.user.id),
        moduleName: normalizedModule,
        isDeleted: false,
      },
    });

    if (!isCoordinator) {
      return res.status(403).json({
        message: `Access denied. Requires coordinator permissions for ${moduleName}.`,
      });
    }

    req.isModuleCoordinatorOf = normalizedModule;
    next();
  };
};

/**
 * Check if user has any coordinator role (for any module)
 * Useful for general permission checks
 *
 * @param {Object} user - User object
 * @returns {Promise<boolean>} - True if user is coordinator of any module
 */
const isAnyModuleCoordinator = async (user) => {
  if (!user) return false;

  // Quick check: if already loaded in req.user from middleware
  if (user.moduleCoordinations && user.moduleCoordinations.length > 0) {
    return true;
  }

  // Database check
  const coordination = await prisma.moduleCoordinator.findFirst({
    where: {
      userId: parseInt(user.id),
      isDeleted: false,
    },
  });

  return !!coordination;
};

/**
 * Get all modules where user is coordinator
 *
 * @param {Object} user - User object
 * @returns {Promise<string[]>} - Array of module names
 */
const getUserCoordinatedModules = async (user) => {
  if (!user) return [];

  const coordinations = await prisma.moduleCoordinator.findMany({
    where: {
      userId: parseInt(user.id),
      isDeleted: false,
    },
    select: {
      moduleName: true,
    },
  });

  return coordinations.map((c) => c.moduleName);
};

/**
 * Permission check for module-specific operations
 * Returns detailed permission info instead of just boolean
 *
 * @param {Object} user - User object
 * @param {string} moduleName - Module to check
 * @returns {Promise<Object>} - { hasAccess, reason, accessLevel }
 */
const checkModulePermission = async (user, moduleName) => {
  if (!user) {
    return { hasAccess: false, reason: 'No user authenticated', accessLevel: 'NONE' };
  }

  if (!moduleName) {
    return { hasAccess: false, reason: 'No module specified', accessLevel: 'NONE' };
  }

  const normalizedModule = normalizeModuleName(moduleName);

  // ADMIN: Full access
  if (user.roles.includes('ADMIN')) {
    return {
      hasAccess: true,
      reason: 'Global ADMIN access',
      accessLevel: 'ADMIN',
    };
  }

  // PASTOR: Full access (treated similarly to ADMIN for modules)
  if (user.roles.includes('PASTOR')) {
    return {
      hasAccess: true,
      reason: 'PASTOR access',
      accessLevel: 'ADMIN',
    };
  }

  // Module Coordinator: ADMIN-like access for their module only
  const isCoordinator = await prisma.moduleCoordinator.findFirst({
    where: {
      userId: parseInt(user.id),
      moduleName: normalizedModule,
      isDeleted: false,
    },
  });

  if (isCoordinator) {
    return {
      hasAccess: true,
      reason: `Coordinator of ${normalizedModule}`,
      accessLevel: 'MODULE_ADMIN',
    };
  }

  // No special access
  return {
    hasAccess: false,
    reason: 'No module coordinator or ADMIN role',
    accessLevel: 'NONE',
  };
};

/**
 * Middleware to check module permission and attach result to request
 * Less strict than requireModuleAdmin - use when you need to check but not block
 *
 * @param {string} moduleName - Module name
 * @returns {Function} - Express middleware function
 */
const attachModulePermission = (moduleName) => {
  return async (req, res, next) => {
    if (!req.user) {
      req.modulePermission = { hasAccess: false, reason: 'No user' };
      return next();
    }

    const permission = await checkModulePermission(req.user, moduleName);
    req.modulePermission = permission;
    next();
  };
};

module.exports = {
  hasModuleAdminAccess,
  requireModuleAdmin,
  requireModuleCoordinator,
  isAnyModuleCoordinator,
  getUserCoordinatedModules,
  checkModulePermission,
  attachModulePermission,
};
