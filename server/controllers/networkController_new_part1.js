const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { getUserNetwork } = require('../utils/networkUtils');

/**
 * Get all users with role LIDER_DOCE
 */
const getLosDoce = async (req, res) => {
    try {
        const losDoce = await prisma.user.findMany({
            where: {
                roles: {
                    some: {
                        role: { name: 'LIDER_DOCE' }
                    }
                },
                isDeleted: false
            },
            select: {
                id: true,
                email: true,
                profile: { select: { fullName: true } }
            },
            orderBy: {
                profile: { fullName: 'asc' }
            }
        });

        const formatted = losDoce.map(d => ({
            id: d.id,
            fullName: d.profile?.fullName || 'Sin Nombre',
            email: d.email,
            role: 'LIDER_DOCE'
        }));

        res.json(formatted);
    } catch (error) {
        console.error('Error fetching Los Doce:', error);
        res.status(500).json({ error: 'Error fetching Los Doce' });
    }
};

/**
 * Get the discipleship network for a specific user using hierarchical structure
 */
const getNetwork = async (req, res) => {
    try {
        const { userId } = req.params;
        const rootId = parseInt(userId);

        const rootUser = await prisma.user.findUnique({
            where: { id: rootId },
            include: { profile: true }
        });

        if (!rootUser) return res.status(404).json({ error: 'User not found' });

        const allDescendantIds = await getUserNetwork(rootId);
        const allIds = [rootId, ...allDescendantIds];

        const allUsers = await prisma.user.findMany({
            where: {
                id: { in: allIds },
                isDeleted: false
            },
            include: {
                profile: true,
                roles: { include: { role: true } },
                children: { include: { child: true } },
                parents: { include: { parent: { include: { profile: true } } } }
            }
        });

        const userMap = new Map();
        allUsers.forEach(u => userMap.set(u.id, u));

        const buildNode = (currentId) => {
            const user = userMap.get(currentId);
            if (!user) return null;

            const discipleNodes = (user.children || [])
                .filter(edge => userMap.has(edge.childId))
                .map(edge => buildNode(edge.childId))
                .filter(n => n !== null);

            return {
                id: user.id,
                fullName: user.profile?.fullName || 'Sin Nombre',
                email: user.email,
                roles: user.roles.map(r => r.role.name),
                disciples: discipleNodes
            };
        };

        const tree = buildNode(rootId);
        res.json(tree);

    } catch (error) {
        console.error('Error fetching network:', error);
        res.status(500).json({ error: 'Error fetching network' });
    }
};

/**
 * Get available users that can be assigned to a leader
 */
const getAvailableUsers = async (req, res) => {
    try {
        const { leaderId } = req.params;

        // Return all users except the leader themselves and super admins
        const users = await prisma.user.findMany({
            where: {
                id: { not: parseInt(leaderId) },
                isDeleted: false,
                roles: {
                    none: { role: { name: 'ADMIN' } }
                }
            },
            select: {
                id: true,
                email: true,
                profile: { select: { fullName: true } },
                roles: { include: { role: true } }
            },
            orderBy: { profile: { fullName: 'asc' } },
            take: 100
        });

        const formatted = users.map(u => ({
            id: u.id,
            fullName: u.profile?.fullName || 'Sin Nombre',
            email: u.email,
            roles: u.roles.map(r => r.role.name)
        }));

        res.json(formatted);
    } catch (error) {
        console.error('Error fetching available users:', error);
        res.status(500).json({ error: 'Error al obtener usuarios disponibles' });
    }
};

module.exports = {
    getLosDoce,
    getNetwork,
    getAvailableUsers
};
