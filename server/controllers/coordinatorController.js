const { PrismaClient } = require('@prisma/client');

const prisma = require('../prisma/client');

/**
 * Get module coordinators
 * Returns users with isCoordinator flag set to true and LIDER_DOCE role
 * Optionally filtered by module
 */
const getModuleCoordinators = async (req, res) => {
    try {
        const { module } = req.query;

        const where = {
            isCoordinator: true,
            isDeleted: false,
            roles: {
                some: {
                    role: { name: 'LIDER_DOCE' }
                }
            }
        };

        const coordinators = await prisma.user.findMany({
            where,
            select: {
                id: true,
                email: true,
                profile: {
                    select: {
                        fullName: true
                    }
                },
                roles: {
                    select: {
                        role: {
                            select: {
                                name: true
                            }
                        }
                    }
                }
            },
            orderBy: {
                profile: {
                    fullName: 'asc'
                }
            }
        });

        const formatted = coordinators.map(c => ({
            id: c.id,
            email: c.email,
            fullName: c.profile?.fullName || 'Sin Nombre',
            role: c.roles[0]?.role.name
        }));

        res.json(formatted);
    } catch (error) {
        console.error('Error fetching coordinators:', error);
        res.status(500).json({ message: 'Server error fetching coordinators' });
    }
};

/**
 * Get default coordinator for a module
 * Returns the first active coordinator (LIDER_DOCE role with isCoordinator flag)
 */
const getDefaultModuleCoordinator = async (req, res) => {
    try {
        const { module } = req.params;

        const coordinator = await prisma.user.findFirst({
            where: {
                isCoordinator: true,
                isDeleted: false,
                roles: {
                    some: {
                        role: { name: 'LIDER_DOCE' }
                    }
                }
            },
            select: {
                id: true,
                email: true,
                profile: {
                    select: {
                        fullName: true
                    }
                }
            },
            orderBy: {
                profile: {
                    fullName: 'asc'
                }
            }
        });

        if (!coordinator) {
            return res.json(null);
        }

        res.json({
            id: coordinator.id,
            email: coordinator.email,
            fullName: coordinator.profile?.fullName || 'Sin Nombre'
        });
    } catch (error) {
        console.error('Error fetching default coordinator:', error);
        res.status(500).json({ message: 'Server error fetching coordinator' });
    }
};

module.exports = {
    getModuleCoordinators,
    getDefaultModuleCoordinator
};
