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
            // Get the requester's network from their profile
            const userWithProfile = await prisma.user.findUnique({
                where: { id: req.user.id },
                include: { profile: { select: { network: true } } }
            });
            
            const userNetwork = userWithProfile?.profile?.network;
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

        const canSeeSensitiveData = req.user.roles.includes('ADMIN') || req.user.roles.includes('PASTOR');

        const formatted = coordinators.map(c => ({
            id: c.id,
            fullName: c.profile?.fullName || 'Sin Nombre',
            role: c.roles?.[0]?.role?.name || 'LIDER_DOCE',
            isCurrentlyCoordinating: c.moduleCoordinations.length > 0,
            ...(canSeeSensitiveData && {
                email: c.email,
                network: c.profile?.network || 'Sin Red',
                coordinatedModules: [...new Set(c.moduleCoordinations.map(mc => mc.moduleName))]
            })
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
                moduleName: normalizeModuleName(module),
                isDeleted: false
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

        // Verify user has valid role (LIDER_DOCE, LIDER_CELULA, DISCIPULO)
        const user = await prisma.user.findFirst({
            where: {
                id: userId,
                isDeleted: false,
                roles: {
                    some: {
                        role: { 
                            name: { in: ['LIDER_DOCE', 'LIDER_CELULA', 'DISCIPULO'] }
                        }
                    }
                }
            }
        });
        if (!user) {
            return res.status(400).json({ message: 'User must be a LIDER_DOCE, LIDER_CELULA, or DISCIPULO' });
        }

        // Hallazgo #9: Prevenir auto-asignación
        if (userId === req.user.id) {
            return res.status(400).json({ message: 'Cannot assign yourself as coordinator' });
        }

        const normalizedModule = normalizeModuleName(module);
        const isAdminOrPastor = req.user.roles.includes('ADMIN') || req.user.roles.includes('PASTOR');

        // Validación de duplicados: Evitar que un usuario sea coordinador de múltiples módulos simultáneamente
        const existingCoordinatorRoles = await prisma.moduleCoordinator.findMany({
            where: {
                userId: userId,
                isDeleted: false
            },
            select: {
                moduleName: true
            }
        });

        if (existingCoordinatorRoles.length > 0 && !isAdminOrPastor) {
            const currentModules = existingCoordinatorRoles.map(role => role.moduleName).join(', ');
            return res.status(400).json({ 
                message: `User is already coordinator of: ${currentModules}. Cannot assign to multiple modules simultaneously.` 
            });
        }

        // Hallazgo #4: Prevenir rotación circular de cargos en Coordinadores (30 días de espera)
        const recentAssignment = await prisma.moduleCoordinator.findFirst({
            where: {
                moduleName: normalizedModule,
                createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // 30 días
            }
        });

        if (recentAssignment && !isAdminOrPastor) {
            return res.status(400).json({
                message: 'Coordinator was recently assigned. Wait 30 days before changing.'
            });
        }

        // Hallazgo #2: Verificar múltiples cargos en el mismo módulo
        const existingRoles = await Promise.all([
            prisma.moduleSubCoordinator.findFirst({ where: { userId, moduleName: normalizedModule, isDeleted: false } }),
            prisma.moduleTreasurer.findFirst({ where: { userId, moduleName: normalizedModule, isDeleted: false } })
        ]);

        if (existingRoles.some(r => r !== null)) {
            return res.status(400).json({ message: 'User already has a role in this module' });
        }

        // Hallazgo #11: Validar red en asignaciones
        const requesterNetworkUser = await prisma.user.findUnique({
            where: { id: req.user.id },
            include: { profile: { select: { network: true } } }
        });
        const requesterNetwork = requesterNetworkUser?.profile?.network;
        const moduleNetworkMap = {
            'ganar': 'HOMBRES',
            'consolidar': 'HOMBRES',
            'enviar': 'HOMBRES',
            'discipular': 'HOMBRES',
            'kids': 'KIDS'
        };
        const moduleNetwork = moduleNetworkMap[normalizedModule];
        
        if (moduleNetwork && requesterNetwork !== moduleNetwork && !isAdminOrPastor) {
            return res.status(403).json({ message: 'Cannot assign coordinators outside your network' });
        }

        // Hallazgo #10: Soft Delete instead of deleteMany
        const oldCoordinators = await prisma.moduleCoordinator.findMany({
            where: { moduleName: normalizedModule, isDeleted: false }
        });
        
        if (oldCoordinators.length > 0) {
            await prisma.moduleCoordinator.updateMany({
                where: { moduleName: normalizedModule, isDeleted: false },
                data: { isDeleted: true, deletedAt: new Date() }
            });
            
            // Hallazgo #7: AuditLog
            for (const oldCoord of oldCoordinators) {
                await prisma.auditLog.create({
                    data: {
                        userId: req.user.id,
                        action: 'DELETE',
                        entityType: 'MODULE_COORDINATOR',
                        entityId: oldCoord.userId,
                        details: {
                            moduleName: normalizedModule,
                            action: 'REMOVE_COORDINATOR',
                            removedBy: req.user.id,
                            timestamp: new Date().toISOString()
                        },
                        ipAddress: req.ip,
                        userAgent: req.get('user-agent')
                    }
                });
            }
        }

        // Assign new coordinator
        const coordinator = await prisma.moduleCoordinator.create({
            data: {
                userId,
                moduleName: normalizedModule
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

        // Hallazgo #7: AuditLog
        await prisma.auditLog.create({
            data: {
                userId: req.user.id,
                action: 'UPDATE',
                entityType: 'MODULE_COORDINATOR',
                entityId: userId,
                details: {
                    moduleName: normalizedModule,
                    action: 'ASSIGN_COORDINATOR',
                    assignedBy: req.user.id,
                    timestamp: new Date().toISOString()
                },
                ipAddress: req.ip,
                userAgent: req.get('user-agent')
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

        const normalizedModule = normalizeModuleName(module);
        
        const oldCoordinators = await prisma.moduleCoordinator.findMany({
            where: { moduleName: normalizedModule, isDeleted: false }
        });

        if (oldCoordinators.length > 0) {
            await prisma.moduleCoordinator.updateMany({
                where: { moduleName: normalizedModule, isDeleted: false },
                data: { isDeleted: true, deletedAt: new Date() }
            });

            // Hallazgo #7: AuditLog
            for (const oldCoord of oldCoordinators) {
                await prisma.auditLog.create({
                    data: {
                        userId: req.user.id,
                        action: 'DELETE',
                        entityType: 'MODULE_COORDINATOR',
                        entityId: oldCoord.userId,
                        details: {
                            moduleName: normalizedModule,
                            action: 'REMOVE_COORDINATOR',
                            removedBy: req.user.id,
                            timestamp: new Date().toISOString()
                        },
                        ipAddress: req.ip,
                        userAgent: req.get('user-agent')
                    }
                });
            }
        }

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
            where: { moduleName: normalizeModuleName(module), isDeleted: false },
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

        // Check if user has admin access on this module (coordinator, subcoordinator, or treasurer)
        const isAdminOrPastor = req.user.roles.includes('ADMIN') || req.user.roles.includes('PASTOR');
        const isMainCoordinator = req.user.moduleCoordinations?.includes(normalizedModule);
        const isElevatedRole = req.user.moduleSubCoordinations?.includes(normalizedModule) ||
                              req.user.moduleTreasurers?.includes(normalizedModule);
        
        // Solo coordinadores principales pueden asignar subcoordinadores
        if (!isMainCoordinator && !isAdminOrPastor) {
            return res.status(403).json({ message: 'Only main coordinators or admin can assign a subcoordinator' });
        }

        // Hallazgo #11: Validar red en asignaciones
        const requesterNetworkUser = await prisma.user.findUnique({
            where: { id: req.user.id },
            include: { profile: { select: { network: true } } }
        });
        const requesterNetwork = requesterNetworkUser?.profile?.network;
        const moduleNetworkMap = {
            'ganar': 'HOMBRES',
            'consolidar': 'HOMBRES',
            'enviar': 'HOMBRES',
            'discipular': 'HOMBRES',
            'kids': 'KIDS'
        };
        const moduleNetwork = moduleNetworkMap[normalizedModule];
        
        if (moduleNetwork && requesterNetwork !== moduleNetwork && !isAdminOrPastor) {
            return res.status(403).json({ message: 'Cannot assign subcoordinators outside your network' });
        }

        // Verify the target user exists
        const user = await prisma.user.findFirst({
            where: { id: userId, isDeleted: false }
        });
        if (!user) return res.status(404).json({ message: 'User not found' });

        // Hallazgo #9: Prevenir auto-asignación
        if (userId === req.user.id) {
            return res.status(400).json({ message: 'Cannot assign yourself as subcoordinator' });
        }

        // Hallazgo #2: Verificar múltiples cargos en el mismo módulo
        const existingRoles = await Promise.all([
            prisma.moduleCoordinator.findFirst({ where: { userId, moduleName: normalizedModule, isDeleted: false } }),
            prisma.moduleSubCoordinator.findFirst({ where: { userId, moduleName: normalizedModule, isDeleted: false } }),
            prisma.moduleTreasurer.findFirst({ where: { userId, moduleName: normalizedModule, isDeleted: false } })
        ]);

        if (existingRoles.some(r => r !== null)) {
            return res.status(400).json({ message: 'User already has a role in this module' });
        }

        // Hallazgo #10: Soft Delete
        const oldSubCoordinators = await prisma.moduleSubCoordinator.findMany({
            where: { moduleName: normalizedModule, isDeleted: false }
        });

        if (oldSubCoordinators.length > 0) {
            await prisma.moduleSubCoordinator.updateMany({
                where: { moduleName: normalizedModule, isDeleted: false },
                data: { isDeleted: true, deletedAt: new Date() }
            });
            
            // Hallazgo #7: AuditLog
            for (const old of oldSubCoordinators) {
                await prisma.auditLog.create({
                    data: {
                        userId: req.user.id,
                        action: 'DELETE',
                        entityType: 'MODULE_SUBCOORDINATOR',
                        entityId: old.userId,
                        details: {
                            moduleName: normalizedModule,
                            action: 'REMOVE_SUBCOORDINATOR',
                            removedBy: req.user.id,
                            timestamp: new Date().toISOString()
                        },
                        ipAddress: req.ip,
                        userAgent: req.get('user-agent')
                    }
                });
            }
        }

        const subCoord = await prisma.moduleSubCoordinator.create({
            data: {
                userId,
                moduleName: normalizedModule,
                coordinatorId: assignerIsCoordinator ? req.user.id : null // or keep req.user.id
            },
            include: {
                user: { select: { id: true, email: true, profile: { select: { fullName: true } } } }
            }
        });

        // Hallazgo #7: AuditLog
        await prisma.auditLog.create({
            data: {
                userId: req.user.id,
                action: 'UPDATE',
                entityType: 'MODULE_SUBCOORDINATOR',
                entityId: userId,
                details: {
                    moduleName: normalizedModule,
                    action: 'ASSIGN_SUBCOORDINATOR',
                    assignedBy: req.user.id,
                    timestamp: new Date().toISOString()
                },
                ipAddress: req.ip,
                userAgent: req.get('user-agent')
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
        
        // Check if user has admin access on this module (coordinator, subcoordinator, or treasurer)
        const isAdminOrPastor = req.user.roles.includes('ADMIN') || req.user.roles.includes('PASTOR');
        const isMainCoordinator = req.user.moduleCoordinations?.includes(normalizedModule);
        const isElevatedRole = req.user.moduleSubCoordinations?.includes(normalizedModule) ||
                              req.user.moduleTreasurers?.includes(normalizedModule);
        
        // Solo coordinadores principales pueden eliminar subcoordinadores
        if (!isMainCoordinator && !isAdminOrPastor) {
            return res.status(403).json({ message: 'Only main coordinators or admin can remove a subcoordinator' });
        }

        const oldSubCoordinators = await prisma.moduleSubCoordinator.findMany({
            where: { moduleName: normalizedModule, isDeleted: false }
        });

        if (oldSubCoordinators.length > 0) {
            await prisma.moduleSubCoordinator.updateMany({
                where: { moduleName: normalizedModule, isDeleted: false },
                data: { isDeleted: true, deletedAt: new Date() }
            });

            // Hallazgo #7: AuditLog
            for (const old of oldSubCoordinators) {
                await prisma.auditLog.create({
                    data: {
                        userId: req.user.id,
                        action: 'DELETE',
                        entityType: 'MODULE_SUBCOORDINATOR',
                        entityId: old.userId,
                        details: {
                            moduleName: normalizedModule,
                            action: 'REMOVE_SUBCOORDINATOR',
                            removedBy: req.user.id,
                            timestamp: new Date().toISOString()
                        },
                        ipAddress: req.ip,
                        userAgent: req.get('user-agent')
                    }
                });
            }
        }
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
            // Fallback: For ADMIN/PASTOR, get all active users; for others, get users in network
            if (req.user.roles.includes('ADMIN') || req.user.roles.includes('PASTOR')) {
                // No restriction for ADMIN and PASTOR - they can see all users
            } else {
                const userNetwork = await getUserNetwork(req.user.id);
                if (userNetwork && userNetwork.length > 0) {
                    where.id = { in: userNetwork };
                }
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

/**
 * Get Treasurer for a module
 */
const getModuleTreasurer = async (req, res) => {
    try {
        const { module } = req.params;
        const normalizedModule = normalizeModuleName(module);

        const treasurer = await prisma.moduleTreasurer.findFirst({
            where: { moduleName: normalizedModule, isDeleted: false },
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

        if (!treasurer) return res.json(null);

        res.json({
            id: treasurer.user.id,
            email: treasurer.user.email,
            fullName: treasurer.user.profile?.fullName || 'Sin Nombre'
        });
    } catch (error) {
        console.error('Error getting treasurer:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * Assign Treasurer to a module
 */
const assignModuleTreasurer = async (req, res) => {
    try {
        const { module } = req.params;
        const { userId } = req.body;
        const normalizedModule = normalizeModuleName(module);

        // Check if user has admin access on this module (coordinator, subcoordinator, or treasurer)
        const isAdminOrPastor = req.user.roles.includes('ADMIN') || req.user.roles.includes('PASTOR');
        const hasModuleAdmin = req.user.moduleCoordinations?.includes(normalizedModule) ||
                             req.user.moduleSubCoordinations?.includes(normalizedModule) ||
                             req.user.moduleTreasurers?.includes(normalizedModule);
        
        if (!hasModuleAdmin && !isAdminOrPastor) {
            return res.status(403).json({ message: 'Only module coordinators, subcoordinators, treasurers or admin can assign a treasurer' });
        }

        // Hallazgo #11: Validar red en asignaciones
        const requesterNetworkUser = await prisma.user.findUnique({
            where: { id: req.user.id },
            include: { profile: { select: { network: true } } }
        });
        const requesterNetwork = requesterNetworkUser?.profile?.network;
        const moduleNetworkMap = {
            'ganar': 'HOMBRES',
            'consolidar': 'HOMBRES',
            'enviar': 'HOMBRES',
            'discipular': 'HOMBRES',
            'kids': 'KIDS'
        };
        const moduleNetwork = moduleNetworkMap[normalizedModule];
        
        if (moduleNetwork && requesterNetwork !== moduleNetwork && !isAdminOrPastor) {
            return res.status(403).json({ message: 'Cannot assign treasurers outside your network' });
        }

        // Verify user existence and valid role (LIDER_DOCE, LIDER_CELULA, DISCIPULO)
        const user = await prisma.user.findFirst({
            where: { 
                id: userId, 
                isDeleted: false,
                roles: {
                    some: {
                        role: { 
                            name: { in: ['LIDER_DOCE', 'LIDER_CELULA', 'DISCIPULO'] }
                        }
                    }
                }
            }
        });

        if (!user) {
            return res.status(400).json({ message: 'User must be a LIDER_DOCE, LIDER_CELULA, or DISCIPULO' });
        }

        // Hallazgo #9: Prevenir auto-asignación
        if (userId === req.user.id) {
            return res.status(400).json({ message: 'Cannot assign yourself as treasurer' });
        }

        // Hallazgo #2: Verificar múltiples cargos en el mismo módulo
        const existingRoles = await Promise.all([
            prisma.moduleCoordinator.findFirst({ where: { userId, moduleName: normalizedModule, isDeleted: false } }),
            prisma.moduleSubCoordinator.findFirst({ where: { userId, moduleName: normalizedModule, isDeleted: false } }),
            prisma.moduleTreasurer.findFirst({ where: { userId, moduleName: normalizedModule, isDeleted: false } })
        ]);

        if (existingRoles.some(r => r !== null)) {
            return res.status(400).json({ message: 'User already has a role in this module' });
        }

        // Hallazgo #10: Soft Delete
        const oldTreasurers = await prisma.moduleTreasurer.findMany({
            where: { moduleName: normalizedModule, isDeleted: false }
        });

        if (oldTreasurers.length > 0) {
            await prisma.moduleTreasurer.updateMany({
                where: { moduleName: normalizedModule, isDeleted: false },
                data: { isDeleted: true, deletedAt: new Date() }
            });

            // Hallazgo #7: AuditLog
            for (const old of oldTreasurers) {
                await prisma.auditLog.create({
                    data: {
                        userId: req.user.id,
                        action: 'DELETE',
                        entityType: 'MODULE_TREASURER',
                        entityId: old.userId,
                        details: {
                            moduleName: normalizedModule,
                            action: 'REMOVE_TREASURER',
                            removedBy: req.user.id,
                            timestamp: new Date().toISOString()
                        },
                        ipAddress: req.ip,
                        userAgent: req.get('user-agent')
                    }
                });
            }
        }

        const treasurer = await prisma.moduleTreasurer.create({
            data: {
                userId,
                moduleName: normalizedModule,
            },
            include: {
                user: { select: { id: true, email: true, profile: { select: { fullName: true } } } }
            }
        });

        // Hallazgo #7: AuditLog
        await prisma.auditLog.create({
            data: {
                userId: req.user.id,
                action: 'UPDATE',
                entityType: 'MODULE_TREASURER',
                entityId: userId,
                details: {
                    moduleName: normalizedModule,
                    action: 'ASSIGN_TREASURER',
                    assignedBy: req.user.id,
                    timestamp: new Date().toISOString()
                },
                ipAddress: req.ip,
                userAgent: req.get('user-agent')
            }
        });

        res.json({
            id: treasurer.user.id,
            email: treasurer.user.email,
            fullName: treasurer.user.profile?.fullName || 'Sin Nombre'
        });
    } catch (error) {
        console.error('Error assigning treasurer:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * Remove Treasurer
 */
const removeModuleTreasurer = async (req, res) => {
    try {
        const { module } = req.params;
        const normalizedModule = normalizeModuleName(module);

        // Check if user has admin access on this module (coordinator, subcoordinator, or treasurer)
        const isAdminOrPastor = req.user.roles.includes('ADMIN') || req.user.roles.includes('PASTOR');
        const hasModuleAdmin = req.user.moduleCoordinations?.includes(normalizedModule) ||
                             req.user.moduleSubCoordinations?.includes(normalizedModule) ||
                             req.user.moduleTreasurers?.includes(normalizedModule);
        
        if (!hasModuleAdmin && !isAdminOrPastor) {
            return res.status(403).json({ message: 'Only module coordinators, subcoordinators, treasurers or admin can remove a treasurer' });
        }

        const oldTreasurers = await prisma.moduleTreasurer.findMany({
            where: { moduleName: normalizedModule, isDeleted: false }
        });

        if (oldTreasurers.length > 0) {
            await prisma.moduleTreasurer.updateMany({
                where: { moduleName: normalizedModule, isDeleted: false },
                data: { isDeleted: true, deletedAt: new Date() }
            });

            // Hallazgo #7: AuditLog
            for (const old of oldTreasurers) {
                await prisma.auditLog.create({
                    data: {
                        userId: req.user.id,
                        action: 'DELETE',
                        entityType: 'MODULE_TREASURER',
                        entityId: old.userId,
                        details: {
                            moduleName: normalizedModule,
                            action: 'REMOVE_TREASURER',
                            removedBy: req.user.id,
                            timestamp: new Date().toISOString()
                        },
                        ipAddress: req.ip,
                        userAgent: req.get('user-agent')
                    }
                });
            }
        }
        res.json({ message: 'Treasurer removed successfully' });
    } catch (error) {
        console.error('Error removing treasurer:', error);
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
    getModuleCandidates,
    getModuleTreasurer,
    assignModuleTreasurer,
    removeModuleTreasurer
};
