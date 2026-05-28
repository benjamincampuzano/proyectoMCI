const prisma = require('../utils/database');

/**
 * Get all descendant user IDs in the network of a leader (recursive).
 * Uses a recursive CTE for performance.
 * @param {number|string} leaderId 
 * @returns {Promise<number[]>} Array of user IDs
 */
const getUserNetwork = async (leaderId) => {
    const id = parseInt(leaderId);
    if (isNaN(id)) return [];

    try {
        // Recursive CTE con límite de profundidad y detección de ciclos
        const descendants = await prisma.$queryRaw`
            WITH RECURSIVE hierarchy AS (
                SELECT "childId", 1 AS depth, ARRAY["parentId"] AS visited
                FROM "UserHierarchy"
                WHERE "parentId" = ${id}
                UNION ALL
                SELECT uh."childId", h.depth + 1, h.visited || uh."parentId"
                FROM "UserHierarchy" uh
                INNER JOIN hierarchy h ON uh."parentId" = h."childId"
                WHERE h.depth < 50
                  AND NOT uh."childId" = ANY(h.visited)
            )
            SELECT DISTINCT "childId" FROM hierarchy;
        `;

        return descendants.map(d => Number(d.childId));
    } catch (error) {
        console.error('Error in getUserNetwork utils:', error);
        return [];
    }
};

/**
 * Get the "12 Leader" (Lider Doce) for a specific user — single query via UserHierarchy.
 * Replaces the old iterative loop (up to 5 DB queries per call) with a direct lookup.
 * @param {number} userId
 * @returns {Promise<{ name: string } | null>}
 */
const getLiderDoceName = async (userId) => {
    try {
        // ✅ Una sola query en lugar del loop while con hasta 5 queries
        const hierarchy = await prisma.userHierarchy.findFirst({
            where: {
                childId: parseInt(userId),
                role: 'LIDER_DOCE'
            },
            include: {
                parent: {
                    select: {
                        profile: { select: { fullName: true } }
                    }
                }
            }
        });

        if (hierarchy?.parent?.profile?.fullName) {
            return { name: hierarchy.parent.profile.fullName };
        }

        // Fallback: buscar via PASTOR si no hay LIDER_DOCE directo
        const pastorHierarchy = await prisma.userHierarchy.findFirst({
            where: { childId: parseInt(userId), role: 'PASTOR' },
            include: {
                parent: { select: { profile: { select: { fullName: true } } } }
            }
        });

        return pastorHierarchy?.parent?.profile?.fullName
            ? { name: pastorHierarchy.parent.profile.fullName }
            : null;
    } catch (error) {
        console.error('Error in getLiderDoceName:', error);
        return null;
    }
};

module.exports = {
    getUserNetwork,
    getLiderDoceName,
    checkCycle: async (childId, potentialParentId) => {
        // A cycle exists if potentialParentId is already a descendant of childId
        // OR if childId is an ancestor of potentialParentId.
        // We can reuse getUserNetwork to see if potentialParentId is in childId's downstream network.

        // However, a cycle is created if we assign Child -> Parent, but Parent is already IN Child's subtree.
        // So checking if Parent is in Child's network is sufficient.

        const descendants = await getUserNetwork(childId);
        return descendants.includes(parseInt(potentialParentId));
    }
};
