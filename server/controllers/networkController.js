const { PrismaClient } = require('@prisma/client');
const prisma = require('../utils/database');
const { getUserNetwork, getLiderDoceName, checkCycle } = require('../utils/networkUtils');

/**
 * Get all users with role LIDER_DOCE
 */
const getLosDoce = async (req, res) => {
    try {
        const losDoce = await prisma.user.findMany({
            where: {
                roles: {
                    some: {
                        role: {
                            name: 'LIDER_DOCE'
                        }
                    },
                    none: {
                        role: { name: 'ADMIN' }
                    }
                }
            },
            select: {
                id: true,
                email: true,
                profile: {
                    select: { fullName: true }
                },
                roles: {
                    include: {
                        role: true
                    }
                }
            },
            orderBy: {
                profile: {
                    fullName: 'asc'
                }
            }
        });

        const formattedLosDoce = losDoce.map(d => ({
            id: d.id,
            fullName: d.profile?.fullName || 'Sin Nombre',
            email: d.email,
            roles: d.roles.map(r => r.role.name)
        }));

        res.json(formattedLosDoce);
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

        // Fetch the user to confirm existence
        const rootUser = await prisma.user.findUnique({
            where: { id: rootId },
            include: {
                profile: true,
                roles: { include: { role: true } },
                parents: { include: { parent: { include: { profile: true, roles: { include: { role: true } } } } } }
            }
        });

        if (!rootUser) return res.status(404).json({ error: 'User not found' });

        // Helper to recursively build tree
        // Note: Doing deep recursion with single query is hard. 
        // We will fetch all descendants first (using our CTE util) and then structure them in memory.
        const allDescendantIds = await getUserNetwork(rootId);

        // Fetch all descendants with their children details
        // We need to fetch 'parents' to link them back to the tree
        // OR we can fetch 'children' on everyone? 
        // Efficient way: Fetch all involved users (root + descendants + spouse).
        const allIds = [rootId, ...allDescendantIds];
        
        // Include the spouse of the root user if exists
        if (rootUser.spouseId) {
            allIds.push(rootUser.spouseId);
        }

        const allUsers = await prisma.user.findMany({
            where: {
                id: { in: allIds },
                roles: {
                    none: {
                        role: { name: 'ADMIN' }
                    }
                }
            },
            select: {
                id: true,
                spouseId: true,
                cellId: true,
                profile: true,
                roles: { include: { role: true } },
                children: { // Get direct children for linkage
                    include: {
                        child: true // We just need ID mainly, but full details helps validation
                    }
                },
                parents: { // To know who is their parent in THIS sub-network
                    include: {
                        parent: {
                            include: {
                                profile: true,
                                roles: { include: { role: true } },
                                spouse: { include: { profile: true } }
                            }
                        }
                    }
                },
                spouse: { select: { id: true, profile: { select: { fullName: true } } } },
                spouseOf: { select: { id: true, profile: { select: { fullName: true } } } },
                _count: { select: { invitedGuests: true, assignedGuests: true } },
                invitedGuests: {
                    where: { assignedToId: null }, // Only show under inviter if not assigned to someone else
                    select: {
                        id: true,
                        name: true,
                        status: true
                    }
                },
                assignedGuests: {
                    select: {
                        id: true,
                        name: true,
                        status: true,
                        invitedBy: {
                            select: { profile: { select: { fullName: true } } }
                        }
                    }
                },
                cell: { // Include cell data to get liderDoceId if needed
                    select: {
                        id: true,
                        liderDoceId: true,
                        liderDoce: {
                            select: {
                                id: true,
                                profile: {
                                    select: { fullName: true }
                                }
                            }
                        }
                    }
                }
            }
        });

        const userMap = new Map();
        allUsers.forEach(u => userMap.set(u.id, u));

        // Role specificity ranking (higher is more specific)
        const ROLE_RANK = {
            'LIDER_CELULA': 3,
            'LIDER_DOCE': 2,
            'PASTOR': 1,
            'DISCIPULO': 0
        };

        const processedIds = new Set();

        // Function to build node
        const buildNode = (currentUserId) => {
            if (processedIds.has(currentUserId)) return null;

            const currentUser = userMap.get(currentUserId);
            if (!currentUser) return null;

            processedIds.add(currentUserId);

            // Check if there is a spouse and if they are in this network
            let spouseNode = null;
            const targetSpouseId = currentUser.spouseId || (currentUser.spouseOf ? currentUser.spouseOf.id : null);
            if (targetSpouseId && userMap.has(targetSpouseId) && !processedIds.has(targetSpouseId)) {
                spouseNode = userMap.get(targetSpouseId);
                processedIds.add(targetSpouseId);
            }

            // Resolve immediate hierarchy info (parents)
            // If it's a couple, we might want to show parents of both? 
            // For now, let's keep it simple and use primary user's parents or combined.
            const allParentEntries = [...(currentUser.parents || []), ...(spouseNode?.parents || [])];
            const uniqueParentsMap = new Map();
            allParentEntries.forEach(p => uniqueParentsMap.set(`${p.parentId}-${p.role}`, p));
            const parentEntries = Array.from(uniqueParentsMap.values());

            const leaders = {
                pastores: parentEntries.filter(p => p.role === 'PASTOR').map(p => p.parent),
                lideresDoce: parentEntries.filter(p => p.role === 'LIDER_DOCE').map(p => p.parent),
                lideresCelula: parentEntries.filter(p => p.role === 'LIDER_CELULA').map(p => p.parent)
            };
            
            // If no LIDER_DOCE found in hierarchy, try to get it from cell
            if (leaders.lideresDoce.length === 0 && currentUser.cell && currentUser.cell.liderDoce) {
                leaders.lideresDoce.push(currentUser.cell.liderDoce);
            }
            
            // console.log('networkController - parentEntries:', parentEntries);
            // console.log('networkController - leaders.pastores:', leaders.pastores);
            // console.log('networkController - leaders.lideresDoce:', leaders.lideresDoce);
            // console.log('networkController - leaders.lideresCelula:', leaders.lideresCelula);

            // Combine children from both members of the couple
            const allChildrenEdges = [...(currentUser.children || []), ...(spouseNode?.children || [])];
            const uniqueChildrenEdgesMap = new Map();
            // Use childId + role as key to avoid duplicate links to the same child for the same role
            allChildrenEdges.forEach(edge => uniqueChildrenEdgesMap.set(`${edge.childId}-${edge.role}`, edge));
            const directChildrenEdges = Array.from(uniqueChildrenEdgesMap.values());

            // Filter children so they only appear under their MOST SPECIFIC leader
            const discipleNodes = directChildrenEdges
                .filter(edge => {
                    const child = userMap.get(edge.childId);
                    if (!child) return false;

                    const childParents = (child.parents || [])
                        .filter(p => userMap.has(p.parentId));

                    if (childParents.length <= 1) return true;

                    const maxRank = Math.max(...childParents.map(p => ROLE_RANK[p.role] || 0));
                    return ROLE_RANK[edge.role] === maxRank;
                })
                .map(edge => buildNode(edge.childId))
                .filter(n => n !== null);

            // Combine guests
            const assignedGuests = [...(currentUser.assignedGuests || []), ...(spouseNode?.assignedGuests || [])];
            const uniqueAssignedGuests = Array.from(new Map(assignedGuests.map(g => [g.id, g])).values());

            const invitedGuests = [...(currentUser.invitedGuests || []), ...(spouseNode?.invitedGuests || [])];
            const uniqueInvitedGuests = Array.from(new Map(invitedGuests.map(g => [g.id, g])).values());

            return {
                id: currentUser.id,
                fullName: spouseNode 
                    ? `${currentUser.profile?.fullName} & ${spouseNode.profile?.fullName}` 
                    : (currentUser.profile?.fullName || 'Sin Nombre'),
                isCouple: !!spouseNode,
                spouseId: currentUser.spouseId,
                email: currentUser.email,
                roles: Array.from(new Set([...currentUser.roles.map(r => r.role.name), ...(spouseNode?.roles.map(r => r.role.name) || [])])),
                assignedGuests: uniqueAssignedGuests.map(g => ({
                    ...g,
                    invitedByNames: g.invitedBy?.profile?.fullName || 'N/A'
                })),
                invitedGuests: uniqueInvitedGuests || [],
                pastores: leaders.pastores.map(p => ({ id: p.id, fullName: p.profile?.fullName })),
                lideresDoce: leaders.lideresDoce.map(ld => ({ id: ld.id, fullName: ld.profile?.fullName })),
                lideresCelula: leaders.lideresCelula.map(lc => ({ id: lc.id, fullName: lc.profile?.fullName })),
                pastor: leaders.pastores[0] ? { id: leaders.pastores[0].id, fullName: leaders.pastores[0].profile?.fullName } : null,
                liderDoce: leaders.lideresDoce[0] ? { id: leaders.lideresDoce[0].id, fullName: leaders.lideresDoce[0].profile?.fullName } : null,
                liderCelula: leaders.lideresCelula[0] ? { id: leaders.lideresCelula[0].id, fullName: leaders.lideresCelula[0].profile?.fullName } : null,
                partners: spouseNode ? [
                    { id: currentUser.id, fullName: currentUser.profile?.fullName, roles: currentUser.roles.map(r => r.role.name) },
                    { id: spouseNode.id, fullName: spouseNode.profile?.fullName, roles: spouseNode.roles.map(r => r.role.name) }
                ] : [
                    { id: currentUser.id, fullName: currentUser.profile?.fullName, roles: currentUser.roles.map(r => r.role.name) }
                ],
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
        const requesterId = req.user.id;
        const requesterRole = req.user.role; // This logic might fail if req.user.role is not populated? 
        // Auth middleware populates roles array `req.user.roles`
        const userRoles = req.user.roles || [];
        // Determine primary role for logic (simplification)
        const primaryRole = userRoles.includes('ADMIN') ? 'ADMIN' :
            userRoles.includes('PASTOR') ? 'PASTOR' :
                userRoles.includes('LIDER_DOCE') ? 'LIDER_DOCE' :
                    userRoles.includes('LIDER_CELULA') ? 'LIDER_CELULA' : 'DISCIPULO';

        // ... logic for availability ...
        // Simplification: Return all users not in hierarchy of leader?
        // This is complex. For now, let's return all users except leader and self, 
        // possibly filtered by network if not admin.

        let whereClause = {
            id: { not: parseInt(leaderId) }
        };

        if (primaryRole !== 'ADMIN' && primaryRole !== 'PASTOR') {
            // Constrain to network
            const networkIds = await getUserNetwork(requesterId);
            whereClause.id.in = [...networkIds];
        }

        const users = await prisma.user.findMany({
            where: whereClause,
            select: {
                id: true,
                profile: { select: { fullName: true } },
                roles: { include: { role: true } },
                parents: {
                    include: {
                        parent: { select: { id: true, profile: { select: { fullName: true } }, roles: { include: { role: true } } } }
                    }
                }
            },
            take: 100, // Limit
            orderBy: { profile: { fullName: 'asc' } }
        });

        const formatted = users.map(u => {
            // Resolve leaders
            const p = u.parents.find(p => p.role === 'PASTOR')?.parent;
            const ld = u.parents.find(p => p.role === 'LIDER_DOCE')?.parent;
            const lc = u.parents.find(p => p.role === 'LIDER_CELULA')?.parent;

            return {
                id: u.id,
                fullName: u.profile?.fullName,
                roles: u.roles.map(r => r.role.name),
                pastor: p ? { id: p.id, fullName: p.profile?.fullName } : null,
                liderDoce: ld ? { id: ld.id, fullName: ld.profile?.fullName } : null,
                liderCelula: lc ? { id: lc.id, fullName: lc.profile?.fullName } : null
            };
        });

        res.json(formatted);
    } catch (error) {
        console.error('Error fetching available users:', error);
        res.status(500).json({ error: 'Error al obtener usuarios disponibles' });
    }
};

const { assignHierarchy } = require('../services/hierarchyService');

// ...

/**
 * Assign a user to a leader's network using hierarchical structure
 */
const assignUserToLeader = async (req, res) => {
    try {
        const { userId, leaderId } = req.body;

        const leader = await prisma.user.findUnique({
            where: { id: parseInt(leaderId) },
            include: { roles: { include: { role: true } } }
        });

        if (!leader) return res.status(404).json({ error: 'Leader not found' });

        // Determine hierarchy role based on leader's primary role
        const leaderRoles = leader.roles.map(r => r.role.name);
        let hierarchyRole = 'DISCIPULO';
        if (leaderRoles.includes('PASTOR')) hierarchyRole = 'PASTOR';
        else if (leaderRoles.includes('LIDER_DOCE')) hierarchyRole = 'LIDER_DOCE';
        else if (leaderRoles.includes('LIDER_CELULA')) hierarchyRole = 'LIDER_CELULA';

        // Use Service for centralized logic
        await assignHierarchy({
            parentId: parseInt(leaderId),
            childId: parseInt(userId),
            role: hierarchyRole
        });

        res.json({ message: 'Usuario asignado exitosamente' });
    } catch (error) {
        console.error('Error assigning user to leader:', error);
        res.status(500).json({ error: error.message || 'Error al asignar usuario al líder' });
    }
};

/**
 * Remove a user from their leader's network
 */
const removeUserFromNetwork = async (req, res) => {
    try {
        const { userId } = req.params;
        // In hierarchical system, "removing from network" means removing the link to the parent.
        // But which parent? The request implies context.
        // For simplicity, we remove *all* hierarchical links? No, that orphans them.
        // Usually UI allows identifying which link.
        // If we don't have that info, we might check requester permissions.
        // If requester is LIDER_CELULA, remove LIDER_CELULA link.

        const requesterRoles = req.user.roles || [];
        let targetRole = 'DISCIPULO';
        if (requesterRoles.includes('LIDER_CELULA')) targetRole = 'LIDER_CELULA';
        else if (requesterRoles.includes('LIDER_DOCE')) targetRole = 'LIDER_DOCE';
        else if (requesterRoles.includes('PASTOR')) targetRole = 'PASTOR';
        else if (requesterRoles.includes('ADMIN')) {
            // Admin can remove anything, maybe pass as query param?
            // For now, remove all? Dangerous.
            // Let's assume we remove all parents for now to "reset" assignment.
            await prisma.userHierarchy.deleteMany({
                where: { childId: parseInt(userId) }
            });
            return res.json({ message: 'Usuario removido de toda red' });
        }

        await prisma.userHierarchy.deleteMany({
            where: {
                childId: parseInt(userId),
                role: targetRole
            }
        });

        res.json({ message: 'Usuario removido exitosamente de la red' });
    } catch (error) {
        console.error('Error removing user from network:', error);
        res.status(500).json({ error: 'Error al remover usuario de la red' });
    }
};
// Helper functions for network checking 
// (Removed as we used simpler logic above or networkUtils)

/**
 * Get all users with role PASTOR
 */
const getPastores = async (req, res) => {
    try {
        // Get all pastors including their spouse information
        const pastores = await prisma.user.findMany({
            where: {
                roles: { 
                    some: { role: { name: 'PASTOR' } },
                    none: { role: { name: 'ADMIN' } }
                }
            },
            select: {
                id: true,
                email: true,
                profile: { select: { fullName: true } },
                roles: { include: { role: true } },
                spouse: {
                    select: {
                        id: true,
                        profile: { select: { fullName: true } },
                        roles: { include: { role: true } }
                    }
                },
                spouseOf: {
                    select: {
                        id: true,
                        profile: { select: { fullName: true } },
                        roles: { include: { role: true } }
                    }
                },
                spouseId: true
            },
            orderBy: { profile: { fullName: 'asc' } }
        });

        // Group pastors by couples
        const processedIds = new Set();
        const formattedPastores = [];

        pastores.forEach(pastor => {
            if (processedIds.has(pastor.id)) return;

            // Check if spouse is also a pastor
            const spouse = pastor.spouse || pastor.spouseOf;
            const spouseIsPastor = spouse && spouse.roles.some(r => r.role.name === 'PASTOR');
            
            if (spouseIsPastor) {
                // This is a pastor couple - create a combined entry
                // Make sure we process this couple only once by checking if spouse has already been processed
                if (!processedIds.has(spouse.id)) {
                    formattedPastores.push({
                        id: pastor.id, // Use one ID as the primary
                        fullName: `${pastor.profile?.fullName} & ${spouse.profile?.fullName}`,
                        email: pastor.email,
                        roles: ['PASTOR'],
                        isCouple: true,
                        spouseId: pastor.spouseId || spouse.id,
                        partners: [
                            { id: pastor.id, fullName: pastor.profile?.fullName },
                            { id: spouse.id, fullName: spouse.profile?.fullName }
                        ]
                    });
                    processedIds.add(pastor.id);
                    processedIds.add(spouse.id);
                } else {
                    // Spouse was already processed, skip this pastor
                    processedIds.add(pastor.id);
                }
            } else {
                // Single pastor
                formattedPastores.push({
                    id: pastor.id,
                    fullName: pastor.profile?.fullName || 'Sin Nombre',
                    email: pastor.email,
                    roles: pastor.roles.map(r => r.role.name),
                    isCouple: false,
                    partners: [{ id: pastor.id, fullName: pastor.profile?.fullName }]
                });
                processedIds.add(pastor.id);
            }
        });

        res.json(formattedPastores);
    } catch (error) {
        console.error('Error fetching Pastores:', error);
        res.status(500).json({ error: 'Error fetching Pastores' });
    }
};

/**
 * Get an aggregated list of activity for users in a leader's network
 */
const getUserActivityList = async (req, res) => {
    try {
        const { id: requesterId, roles: requesterRoles } = req.user;
        const currentUserId = parseInt(requesterId);
        const isSuperAdmin = requesterRoles.includes('ADMIN');

        let targetUserIds = [];

        if (isSuperAdmin) {
            // Admin can see all non-admin users
            const allUsers = await prisma.user.findMany({
                where: {
                    roles: { none: { role: { name: 'ADMIN' } } },
                    isDeleted: false
                },
                select: { id: true }
            });
            targetUserIds = allUsers.map(u => u.id);
        } else {
            // Get leader's network
            const networkIds = await getUserNetwork(currentUserId);
            // Include themselves
            targetUserIds = [...new Set([...networkIds, currentUserId])];
        }

        if (targetUserIds.length === 0) {
            return res.json([]);
        }

        // Fetch user basic info and activity-related relations
        const users = await prisma.user.findMany({
            where: { id: { in: targetUserIds } },
            include: {
                profile: true,
                roles: { include: { role: true } },
                _count: {
                    select: {
                        invitedGuests: true,
                        hostedCells: true
                    }
                },
                cell: { select: { name: true } },
                parents: {
                    include: {
                        parent: {
                            include: {
                                profile: { select: { fullName: true } }
                            }
                        }
                    }
                },
                oracionesMiembro: {
                    include: {
                        oracionDeTres: true
                    }
                },
                churchAttendances: {
                    where: { status: 'PRESENTE' }
                },
                cellAttendances: {
                    where: { status: 'PRESENTE' }
                },
                classAttendances: {
                    include: {
                        enrollment: {
                            include: { module: true }
                        }
                    }
                },
                seminarEnrollments: {
                    include: { module: true }
                },
                encuentroRegistrations: {
                    where: { status: 'ATTENDED' },
                    include: { encuentro: true }
                },
                conventionRegistrations: {
                    where: { status: 'ATTENDED' },
                    include: { convention: true }
                },
                guestCalls: true,
                guestVisits: true,
                auditLogs: {
                    where: { action: 'LOGIN' },
                    orderBy: { createdAt: 'desc' },
                    take: 1
                }
            }
        });

        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

        const activityList = users.map(u => {

            // Attendance counters
            const churchCount = u.churchAttendances.length;
            const cellCount = u.cellAttendances.length;
            const schoolCount = u.classAttendances.filter(ca => ca.status === 'ASISTE').length;

            // Encuentro attendance: either status is ATTENDED or has class attendances
            // Let's also check for specific EncuentroClassAttendance but for now we use status 'ATTENDED'
            const encuentroCount = u.encuentroRegistrations.length;

            // Ganar Reports: Calls + Visits
            const ganarReports = u.guestCalls.length + u.guestVisits.length;

            // Class details
            const classes = u.seminarEnrollments.map(enrol => {
                const classNotes = u.classAttendances
                    .filter(ca => ca.enrollmentId === enrol.id)
                    .map(ca => ({
                        class: ca.classNumber,
                        grade: ca.grade,
                        notes: ca.notes
                    }));

                return {
                    moduleName: enrol.module.name,
                    finalGrade: enrol.finalGrade,
                    status: enrol.status,
                    notes: classNotes
                };
            });

            // Lider de 12 logic (Handle multiple)
            const userRoles = u.roles.map(r => r.role.name);
            const isLiderDoce = userRoles.includes('LIDER_DOCE');
            
            let liderDoceName = 'N/A';
            if (isLiderDoce) {
                const pastores = u.parents.filter(p => p.role === 'PASTOR');
                liderDoceName = pastores.length > 0 
                    ? pastores.map(p => p.parent?.profile?.fullName).join(', ') 
                    : 'N/A';
            } else {
                const lideresDoce = u.parents.filter(p => p.role === 'LIDER_DOCE');
                liderDoceName = lideresDoce.length > 0 
                    ? lideresDoce.map(p => p.parent?.profile?.fullName).join(', ') 
                    : 'N/A';
            }

            return {
                id: u.id,
                fullName: u.profile?.fullName || 'Sin Nombre',
                roles: userRoles,
                invitadosCount: u._count.invitedGuests,
                liderDoce: liderDoceName,
                asistencias: {
                    iglesia: churchCount,
                    celula: cellCount,
                    escuela: schoolCount,
                    encuentro: encuentroCount,
                    ganar: ganarReports
                },
                clases: classes,
                celula: {
                    nombre: u.cell?.name || 'No registrada',
                    isAnfitrion: u._count.hostedCells > 0,
                    hostedCount: u._count.hostedCells
                },
                encuentrosAsistidos: encuentroCount,
                convencionesAsistidas: u.conventionRegistrations.length,
                ultimoAcceso: u.auditLogs[0]?.createdAt || null
            };
        });

        res.json(activityList);
    } catch (error) {
        console.error('Error in getUserActivityList:', error);
        res.status(500).json({ error: 'Error al obtener el listado de actividad: ' + error.message });
    }
};

module.exports = {
    getLosDoce,
    getPastores,
    getNetwork,
    getAvailableUsers,
    assignUserToLeader,
    removeUserFromNetwork,
    getUserActivityList
};
