const prisma = require('../utils/database');
const { getUserNetwork } = require('../utils/networkUtils');

/**
 * Checks if targetId is a descendant of ancestorId.
 * Uses getUserNetwork with cycle detection and depth limiting.
 * @param {number} ancestorId 
 * @param {number} targetId 
 * @returns {Promise<boolean>}
 */
async function isDescendant(ancestorId, targetId) {
    const aId = parseInt(ancestorId);
    const tId = parseInt(targetId);
    if (isNaN(aId) || isNaN(tId)) return false;
    if (aId === tId) return true; // Self is always allowed

    try {
        const descendants = await getUserNetwork(aId);
        return descendants.includes(tId);
    } catch (error) {
        console.error('Error checking descendant status:', error);
        return false;
    }
}

/**
 * Middleware to restrict access to resources within the user's hierarchy.
 * @param {string} param - The name of the route parameter containing the target user ID.
 */
function withinHierarchy(param = "userId") {
    return async (req, res, next) => {
        try {
            const targetId = parseInt(req.params[param]);
            if (!req.user || !req.user.id) {
                return res.status(401).json({ error: "No autenticado" });
            }

            const currentUserId = req.user.id;
            const roles = req.user.roles || [];

            // Super Admin bypass
            if (roles.includes('ADMIN') || roles.includes('ADMIN')) {
                return next();
            }

            if (isNaN(targetId)) {
                return res.status(400).json({ error: "ID inválido" });
            }

            const allowed = await isDescendant(currentUserId, targetId);

            if (!allowed) {
                return res.status(403).json({
                    error: "Fuera de tu jerarquía: Solo puedes gestionar usuarios bajo tu red."
                });
            }

            next();
        } catch (error) {
            console.error('Error in hierarchy middleware:', error);
            res.status(500).json({ error: "Error interno de autorización" });
        }
    };
}

module.exports = { withinHierarchy, isDescendant };
