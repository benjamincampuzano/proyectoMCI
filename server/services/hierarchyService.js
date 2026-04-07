const prisma = require('../utils/database');

/**
 * Detects if assigning childId to parentId would create a cycle.
 * Uses a recursive CTE to traverse the hierarchy upwards from the potential parent.
 * @param {number} parentId 
 * @param {number} childId 
 * @returns {Promise<boolean>}
 */
async function createsHierarchyCycle(parentId, childId) {
    if (parentId === childId) return true;

    try {
        const ancestors = await prisma.$queryRaw`
            WITH RECURSIVE ancestors AS (
                SELECT "parentId", "childId"
                FROM "UserHierarchy"
                WHERE "childId" = ${parentId}

                UNION ALL

                SELECT uh."parentId", uh."childId"
                FROM "UserHierarchy" uh
                JOIN ancestors a ON uh."childId" = a."parentId"
            )
            SELECT "parentId" FROM ancestors;
        `;

        return ancestors.some(a => a.parentId === childId);
    } catch (error) {
        console.error('Error detecting hierarchy cycle:', error);
        throw new Error('Error validating hierarchy structure');
    }
}

/**
 * Counts how many leaders a user has for a specific role.
 * @param {number} childId 
 * @param {string} role 
 * @returns {Promise<number>}
 */
async function countLeadersForRole(childId, role) {
    return prisma.userHierarchy.count({
        where: {
            childId: childId,
            role: role
        }
    });
}

/**
 * Validates role coherence rules.
 * @param {string} parentRole 
 * @param {string} childRole 
 * @returns {boolean}
 */
function validateRoleCoherence(parentRole, childRole) {
    // Business Rules:
    // A Disciple (DISCIPULO) cannot lead a Pastor or Lider 12.
    if (parentRole === 'DISCIPULO' && ['PASTOR', 'LIDER_DOCE'].includes(childRole)) {
        return false;
    }
    // Add other rules as needed.
    return true;
}

/**
 * Main service to assign hierarchy with all validations.
 * @param {number} parentId 
 * @param {number} childId 
 * @param {string} role 
 */
async function assignHierarchy({ parentId, childId, role }) {
    // 1. Cycle Detection
    if (await createsHierarchyCycle(parentId, childId)) {
        throw new Error("Jerarquía inválida: se detectó un ciclo");
    }

    // 2. Multi-leader checks
    // Allow up to 2 leaders per role as per new requirement
    const count = await countLeadersForRole(childId, role);
    
    // Check if this specific link already exists
    const alreadyLinked = await prisma.userHierarchy.findFirst({
        where: { parentId, childId, role }
    });
    if (alreadyLinked) return alreadyLinked; // Already assigned

    if (count >= 2) {
        // If already has 2, we might want to throw or handle replacement.
        // For now, let's throw to be safe, or we can implement a specific "replace" if needed.
        throw new Error(`El usuario ya tiene el máximo de 2 líderes para el rol ${role}`);
    }

    // 3. Role Coherence (Requires fetching user roles, which is expensive if not passed)
    // We assume caller might validate roles or we fetch them here.
    const parent = await prisma.user.findUnique({
        where: { id: parentId },
        include: { roles: { include: { role: true } } }
    });
    const child = await prisma.user.findUnique({
        where: { id: childId },
        include: { roles: { include: { role: true } } }
    });

    if (!parent || !child) throw new Error('Usuario no encontrado');

    const parentPrimaryRole = parent.roles[0]?.role?.name || 'DISCIPULO'; // Simplification
    const childPrimaryRole = child.roles[0]?.role?.name || 'DISCIPULO';

    if (!validateRoleCoherence(parentPrimaryRole, childPrimaryRole)) {
        throw new Error("Relación jerárquica inválida por roles");
    }

    return prisma.userHierarchy.create({
        data: {
            parentId,
            childId,
            role
        }
    });
}

/**
 * Gets a user's spouse.
 * @param {number} userId 
 * @returns {Promise<Object|null>}
 */
async function getUserSpouse(userId) {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { 
            spouse: { include: { profile: true } },
            spouseOf: { include: { profile: true } }
        }
    });
    return user?.spouse || user?.spouseOf || null;
}

module.exports = {
    createsHierarchyCycle,
    countLeadersForRole,
    assignHierarchy,
    getUserSpouse
};
