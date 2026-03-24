const { PrismaClient } = require('@prisma/client');

const prisma = require('../utils/database');

/**
 * Get module coordinators
 * Returns users assigned as coordinators for specific modules
 * Optionally filtered by module
 */
const getModuleCoordinators = async (req, res) => {
    try {
        const { module } = req.query;

        const where = {
            isDeleted: false,
            roles: {
                some: {
                    role: { name: 'LIDER_DOCE' }
                }
            }
        };

        // If module is specified, filter by module coordinations
        if (module) {
            where.moduleCoordinations = {
                some: {
                    moduleName: module
                }
            };
        }

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
 * Returns first active coordinator for the specific module
 */
const getDefaultModuleCoordinator = async (req, res) => {
    try {
        const { module } = req.params;

        const moduleCoordinator = await prisma.moduleCoordinator.findFirst({
            where: {
                moduleName: module
            },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        profile: {
                            select: {
                                fullName: true
                            }
                        }
                    }
                }
            },
            orderBy: {
                createdAt: 'asc'
            }
        });

        if (!moduleCoordinator) {
            return res.json(null);
        }

        res.json({
            id: moduleCoordinator.user.id,
            email: moduleCoordinator.user.email,
            fullName: moduleCoordinator.user.profile?.fullName || 'Sin Nombre'
        });
    } catch (error) {
        console.error('Error fetching default coordinator:', error);
        res.status(500).json({ message: 'Server error fetching coordinator' });
    }
};

/**
 * Assign coordinator to a module
 */
const assignModuleCoordinator = async (req, res) => {
    try {
        const { module } = req.params;
        const { userId } = req.body;

        // Verify user is LIDER_DOCE
        const user = await prisma.user.findFirst({
            where: {
                id: userId,
                isDeleted: false,
                roles: {
                    some: {
                        role: { name: 'LIDER_DOCE' }
                    }
                }
            }
        });

        if (!user) {
            return res.status(400).json({ message: 'User must be a LIDER_DOCE' });
        }

        // Remove existing coordinator for this module
        await prisma.moduleCoordinator.deleteMany({
            where: { moduleName: module }
        });

        // Assign new coordinator
        const coordinator = await prisma.moduleCoordinator.create({
            data: {
                userId,
                moduleName: module
            },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        profile: {
                            select: {
                                fullName: true
                            }
                        }
                    }
                }
            }
        });

        res.json({
            id: coordinator.user.id,
            email: coordinator.user.email,
            fullName: coordinator.user.profile?.fullName || 'Sin Nombre'
        });
    } catch (error) {
        console.error('Error assigning coordinator:', error);
        res.status(500).json({ message: 'Server error assigning coordinator' });
    }
};

/**
 * Remove coordinator from a module
 */
const removeModuleCoordinator = async (req, res) => {
    try {
        const { module } = req.params;

        await prisma.moduleCoordinator.deleteMany({
            where: { moduleName: module }
        });

        res.json({ message: 'Coordinator removed successfully' });
    } catch (error) {
        console.error('Error removing coordinator:', error);
        res.status(500).json({ message: 'Server error removing coordinator' });
    }
};

module.exports = {
    getModuleCoordinators,
    getDefaultModuleCoordinator,
    assignModuleCoordinator,
    removeModuleCoordinator
};
