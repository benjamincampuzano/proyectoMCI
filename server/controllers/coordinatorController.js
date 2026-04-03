const { PrismaClient } = require('@prisma/client');

const prisma = require('../utils/database');
const { getUserNetwork } = require('../utils/networkUtils');

/**
 * Normaliza el nombre del módulo para consistencia (lowercase, hyphenated)
 */
const normalizeModuleName = (name) => {
    if (!name) return '';
    return name.toLowerCase().trim().replace(/\s+/g, '-');
};

/**
 * Get module coordinators
 * ADMIN/PASTOR ven todos, LIDER_DOCE solo ve los de su red
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

        if (!req.user.roles.includes('ADMIN') && !req.user.roles.includes('PASTOR')) {
            const userNetwork = await getUserNetwork(req.user.id);

            if (userNetwork) {
                where.profile = { network: userNetwork };
            }
        }

        if (module) {
            where.moduleCoordinations = {
                some: { moduleName: normalizeModuleName(module) }
            };
        }

        const coordinators = await prisma.user.findMany({
            where,
            select: {
                id: true,
                email: true,
                profile: { 
                    select: { 
                        fullName: true,
                        network: true
                    } 
                },
                roles: { include: { role: { select: { name: true } } } },
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
            network: c.profile?.network || 'Sin Red',
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
 * Get default coordinator for a module
 * Returns first active coordinator for the specific module
 */
const getDefaultModuleCoordinator = async (req, res) => {
    try {
        const { module } = req.params;

        const moduleCoordinator = await prisma.moduleCoordinator.findFirst({
            where: {
                moduleName: normalizeModuleName(module)
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
            where: { moduleName: normalizeModuleName(module) }
        });

        // Assign new coordinator
        const coordinator = await prisma.moduleCoordinator.create({
            data: {
                userId,
                moduleName: normalizeModuleName(module)
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
            where: { moduleName: normalizeModuleName(module) }
        });

        res.json({ message: 'Coordinator removed successfully' });
    } catch (error) {
        console.error('Error removing coordinator:', error);
        res.status(500).json({ message: 'Server error removing coordinator' });
    }
};

/**
 * Get SubCoordinator for a module
 */
const getModuleSubCoordinator = async (req, res) => {
    try {
        const { module } = req.params;
        const subCoordinator = await prisma.moduleSubCoordinator.findFirst({
            where: { moduleName: normalizeModuleName(module) },
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
        if (!subCoordinator) return res.json(null);
        res.json({
            id: subCoordinator.user.id,
            email: subCoordinator.user.email,
            fullName: subCoordinator.user.profile?.fullName || 'Sin Nombre'
        });
    } catch (error) {
        console.error('Error getting subcoordinator:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * Assign SubCoordinator to a module
 */
const assignModuleSubCoordinator = async (req, res) => {
    try {
        const { module } = req.params;
        const { userId } = req.body;

        const normalizedModule = normalizeModuleName(module);

        // Check if user is the module coordinator or admin/pastor
        const isCoordinatorOfThisModule = req.user.isModuleCoordinator && normalizeModuleName(req.user.coordinatedModule) === normalizedModule;
        const isAdminOrPastor = req.user.roles.includes('ADMIN') || req.user.roles.includes('PASTOR');
        
        if (!isCoordinatorOfThisModule && !isAdminOrPastor) {
            return res.status(403).json({ message: 'Only the module coordinator or admin can assign a subcoordinator' });
        }

        // Verify the target user exists
        const user = await prisma.user.findFirst({
            where: { id: userId, isDeleted: false }
        });
        if (!user) return res.status(404).json({ message: 'User not found' });

        await prisma.moduleSubCoordinator.deleteMany({ where: { moduleName: normalizedModule } });

        const subCoord = await prisma.moduleSubCoordinator.create({
            data: {
                userId,
                moduleName: normalizedModule,
                coordinatorId: req.user.id
            },
            include: {
                user: { select: { id: true, email: true, profile: { select: { fullName: true } } } }
            }
        });

        res.json({
            id: subCoord.user.id,
            email: subCoord.user.email,
            fullName: subCoord.user.profile?.fullName || 'Sin Nombre'
        });
    } catch (error) {
        console.error('Error assigning subcoordinator:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * Remove SubCoordinator
 */
const removeModuleSubCoordinator = async (req, res) => {
    try {
        const { module } = req.params;
        const normalizedModule = normalizeModuleName(module);
        const isCoordinatorOfThisModule = req.user.isModuleCoordinator && normalizeModuleName(req.user.coordinatedModule) === normalizedModule && !req.user.isSubCoordinator;
        const isAdminOrPastor = req.user.roles.includes('ADMIN') || req.user.roles.includes('PASTOR');
        
        if (!isCoordinatorOfThisModule && !isAdminOrPastor) {
            return res.status(403).json({ message: 'Only the module coordinator or admin can remove a subcoordinator' });
        }

        await prisma.moduleSubCoordinator.deleteMany({ where: { moduleName: normalizedModule } });
        res.json({ message: 'Subcoordinator removed successfully' });
    } catch (error) {
        console.error('Error removing subcoordinator:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * Get Candidates for SubCoordinator
 */
const getModuleCandidates = async (req, res) => {
    try {
        const { module } = req.params;
        const normalizedModule = normalizeModuleName(module);
        const { search } = req.query;

        // Base query to find specific module users or those enrolled/participated
        let candidateIds = [];

        // Try getting from SeminarModule if exists (Discipular, Kids, etc.)
        const seminarModules = await prisma.seminarModule.findMany({
            where: {
                name: { contains: normalizedModule, mode: 'insensitive' }
            },
            include: {
                professors: { select: { id: true } },
                auxiliaries: { select: { id: true } },
                enrollments: { select: { userId: true } }
            }
        });

        if (seminarModules.length > 0) {
            seminarModules.forEach(sm => {
                sm.professors.forEach(p => candidateIds.push(p.id));
                sm.auxiliaries.forEach(a => candidateIds.push(a.id));
                sm.enrollments.forEach(e => { if (e.userId) candidateIds.push(e.userId); });
            });
        }

        // Add ArtEnrollment users for EscuelaDeArtes
        const isArtModule = normalizedModule.replace(/\s/g, '').includes('art') || 
                          normalizedModule.includes('escuela-de-artes') ||
                          normalizedModule.includes('escuela de artes');
        
        if (isArtModule) {
            const artClasses = await prisma.artClass.findMany({
                include: {
                    professor: { select: { id: true } },
                    enrollments: { select: { userId: true } }
                }
            });
            artClasses.forEach(ac => {
                if(ac.professorId) candidateIds.push(ac.professorId);
                ac.enrollments.forEach(e => { if (e.userId) candidateIds.push(e.userId); });
            });
        }

        // Add Encuentro users
        if (normalizedModule.includes('encuentro')) {
            const encuentross = await prisma.encuentro.findMany({
                include: {
                    leaders: { select: { userId: true } },
                    registrations: { select: { userId: true } }
                }
            });
            encuentross.forEach(e => {
                e.leaders.forEach(l => candidateIds.push(l.userId));
                e.registrations.forEach(r => { if (r.userId) candidateIds.push(r.userId); });
            });
        }

        // For Ganar, Consolidar, Enviar or if we found no one based on modules, just find users in network
        // Note: For Gastar/Consolidar, typically any active user in the leader's network is a candidate
        
        let where = { isDeleted: false };
        
        if (candidateIds.length > 0) {
            where.id = { in: Array.from(new Set(candidateIds)) };
        } else {
            // Fallback: any user in the leader's network (descendants in hierarchy)
            const userNetwork = await getUserNetwork(req.user.id);
            if (userNetwork && userNetwork.length > 0) {
                where.id = { in: userNetwork };
            }
        }

        if (search) {
            where.OR = [
                { profile: { fullName: { contains: search, mode: 'insensitive' } } },
                { email: { contains: search, mode: 'insensitive' } }
            ];
        }

        const candidates = await prisma.user.findMany({
            where,
            select: {
                id: true,
                email: true,
                profile: { select: { fullName: true } }
            },
            take: 20
        });

        res.json(candidates.map(c => ({
            id: c.id,
            email: c.email,
            fullName: c.profile?.fullName || 'Sin Nombre'
        })));
    } catch (error) {
        console.error('Error fetching candidates:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
    getModuleCoordinators,
    getDefaultModuleCoordinator,
    assignModuleCoordinator,
    removeModuleCoordinator,
    getModuleSubCoordinator,
    assignModuleSubCoordinator,
    removeModuleSubCoordinator,
    getModuleCandidates
};
