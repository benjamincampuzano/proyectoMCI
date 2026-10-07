const prisma = require('../utils/database');
const { Prisma } = require('../generated/prisma/client');
const { getUserNetwork, getLiderDoceName, checkCycle } = require('../utils/networkUtils');
const { canManageUser } = require('../middleware/coordinatorAuth');
const { isDescendant } = require('../middleware/hierarchyMiddleware');

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
                    select: {
                        role: { select: { id: true, name: true } }
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
                parents: {
                    select: {
                        parentId: true,
                        childId: true,
                        role: true,
                        parent: { include: { profile: true, roles: { include: { role: true } } } }
                    }
                }
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

        // Include the parents (leaders) of the root user to show in authority line
        const parentIds = rootUser.parents?.map(p => p.parentId) || [];
        parentIds.forEach(id => {
            if (!allIds.includes(id)) {
                allIds.push(id);
            }
        });

        // Also fetch grandparents (pastors of leaders) for deeper authority chain
        const leaderParentEntries = rootUser.parents?.filter(p => ['LIDER_CELULA', 'LIDER_DOCE'].includes(p.role)) || [];
        if (leaderParentEntries.length > 0) {
            const leaderParentIds = leaderParentEntries.map(p => p.parentId);
            const leaderUsers = await prisma.user.findMany({
                where: { id: { in: leaderParentIds } },
                select: {
                    id: true,
                    parents: {
                        where: { role: 'PASTOR' },
                        select: {
                            parentId: true,
                            childId: true,
                            role: true
                        }
                    }
                }
            });
            for (const lu of leaderUsers) {
                for (const p of lu.parents) {
                    if (!allIds.includes(p.parentId)) {
                        allIds.push(p.parentId);
                    }
                }
            }
        }

        // Include spouses for every user already detected in the network scope.
        // This allows couples to be rebuilt consistently even when the spouse is not
        // part of the direct descendant chain returned by the CTE.
        const networkSpouses = await prisma.user.findMany({
            where: {
                id: { in: allIds }
            },
            select: {
                spouseId: true
            }
        });

        for (const user of networkSpouses) {
            if (user.spouseId && !allIds.includes(user.spouseId)) {
                allIds.push(user.spouseId);
            }
        }

        const allUsers = await prisma.user.findMany({
            where: {
                id: { in: allIds }
            },
            select: {
                id: true,
                spouseId: true,
                cellId: true,
                profile: true,
                roles: { select: { role: { select: { id: true, name: true } } } },
                children: {
                    select: {
                        parentId: true,
                        childId: true,
                        role: true,
                        child: {
                            select: {
                                id: true, email: true, spouseId: true, cellId: true,
                                profile: { select: { fullName: true } },
                                roles: { select: { role: { select: { id: true, name: true } } } },
                                cell: { select: { id: true, name: true, liderDoceId: true } },
                                spouse: { select: { id: true, profile: { select: { fullName: true } } } },
                                spouseOf: { select: { id: true, profile: { select: { fullName: true } } } }
                            }
                        }
                    }
                },
                parents: {
                    select: {
                        parentId: true,
                        childId: true,
                        role: true,
                        parent: {
                            select: {
                                id: true, email: true, spouseId: true, cellId: true,
                                profile: { select: { fullName: true } },
                                roles: { select: { role: { select: { id: true, name: true } } } },
                                cell: { select: { id: true, name: true, liderDoceId: true } },
                                spouse: { select: { id: true, profile: { select: { fullName: true } } } },
                                spouseOf: { select: { id: true, profile: { select: { fullName: true } } } }
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

        // Collect indirect pastors from leaders' parents via userMap
        const indirectPastors = [];
        const leaderParents = rootUser.parents?.filter(p => ['LIDER_CELULA', 'LIDER_DOCE'].includes(p.role)) || [];
        for (const entry of leaderParents) {
            const leaderUser = userMap.get(entry.parentId);
            if (leaderUser) {
                for (const parentEntry of (leaderUser.parents || [])) {
                    if (parentEntry.role === 'PASTOR') {
                        const alreadyAdded = indirectPastors.some(p => p.id === parentEntry.parent.id);
                        if (!alreadyAdded) {
                            indirectPastors.push(parentEntry.parent);
                        }
                    }
                }
            }
        }

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

            // Combine children from both members of the couple
            const allChildrenEdges = [...(currentUser.children || []), ...(spouseNode?.children || [])];
            const uniqueChildrenEdgesMap = new Map();
            // Use childId + role as key to avoid duplicate links to the same child for the same role
            allChildrenEdges.forEach(edge => uniqueChildrenEdgesMap.set(`${edge.childId}-${edge.role}`, edge));
            const directChildrenEdges = Array.from(uniqueChildrenEdgesMap.values());

            // Build direct descendants from all hierarchy edges that belong to this node.
            // `processedIds` already prevents duplicate rendering of the same user/couple
            // in another branch, so we avoid filtering spouses here and losing descendants.
            const discipleNodes = directChildrenEdges
                .map(edge => buildNode(edge.childId))
                .filter(Boolean);

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

        // Add indirect pastors from leaders' parents (deduplicated)
        if (tree) {
            if (!tree.pastores) tree.pastores = [];
            for (const pastor of indirectPastors) {
                const pastorExists = tree.pastores.some(p => p.id === pastor.id);
                if (!pastorExists) {
                    tree.pastores.push({
                        id: pastor.id,
                        fullName: pastor.profile?.fullName
                    });
                }
            }
        }

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
                roles: { select: { role: { select: { id: true, name: true } } } },
                parents: {
                    select: {
                        parent: { select: { id: true, profile: { select: { fullName: true } }, roles: { select: { role: { select: { id: true, name: true } } } } } }
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

        const parentId = parseInt(leaderId);
        const childId = parseInt(userId);

        if (isNaN(parentId) || isNaN(childId)) {
            return res.status(400).json({ error: 'ID de líder o usuario inválido' });
        }

        const leader = await prisma.user.findUnique({
            where: { id: parentId },
            include: { roles: { include: { role: true } } }
        });

        if (!leader) return res.status(404).json({ error: 'Leader not found' });

        // Determine hierarchy role based on leader's primary role
        const leaderRoles = leader.roles.map(r => r.role.name);
        let hierarchyRole = 'DISCIPULO';
        if (leaderRoles.includes('PASTOR')) hierarchyRole = 'PASTOR';
        else if (leaderRoles.includes('LIDER_DOCE')) hierarchyRole = 'LIDER_DOCE';
        else if (leaderRoles.includes('LIDER_CELULA')) hierarchyRole = 'LIDER_CELULA';

        // Verificar que el líder tenga un rol válido en la jerarquía
        const validHierarchyRoles = ['ADMIN', 'PASTOR', 'LIDER_DOCE', 'LIDER_CELULA'];
        if (!leaderRoles.some(r => validHierarchyRoles.includes(r))) {
            return res.status(400).json({ error: 'El líder asignado no tiene un rol válido en la jerarquía' });
        }

        // Verificar que el solicitante puede gestionar al usuario destino
        const targetUserRoles = await prisma.userRole.findMany({
            where: { userId: childId },
            include: { role: true }
        });
        const targetRole = targetUserRoles[0]?.role.name || 'DISCIPULO';

        const requesterRoles = req.user.roles || [];
        const isAdmin = requesterRoles.includes('ADMIN') || requesterRoles.includes('PASTOR');

        if (!isAdmin) {
            const manageCheck = await canManageUser(req.user, targetRole, null, null, childId);
            if (!manageCheck.canManage) {
                return res.status(403).json({ error: manageCheck.reason || 'No tienes permisos para gestionar este usuario' });
            }

            // Verificar que el líder está en la jerarquía del solicitante o es el mismo solicitante
            if (parentId !== req.user.id) {
                const leaderManageCheck = await canManageUser(req.user, leaderRoles[0], null, null, parentId);
                if (!leaderManageCheck.canManage) {
                    return res.status(403).json({ error: 'No tienes permisos para asignar este líder' });
                }
            }
        }

        // Verificar que no se cree un ciclo en la jerarquía
        if (await isDescendant(childId, parentId)) {
            return res.status(400).json({ error: 'No se puede asignar: crearía un ciclo en la jerarquía' });
        }

        // Use Service for centralized logic
        await assignHierarchy({
            parentId,
            childId,
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
        const targetUserId = parseInt(userId);
        const requesterId = Number(req.user?.id);
        const requesterRoles = req.user.roles || [];
        const isAdmin = requesterRoles.includes('ADMIN');

        if (Number.isNaN(targetUserId) || Number.isNaN(requesterId)) {
            return res.status(400).json({ error: 'Invalid user id' });
        }

        const requester = await prisma.user.findUnique({
            where: { id: requesterId },
            select: { spouseId: true },
        });

        const requesterNetworkIds = isAdmin ? [] : await getUserNetwork(requesterId);
        const isSameUser = targetUserId === requesterId;
        const isSpouse = requester?.spouseId ? Number(requester.spouseId) === targetUserId : false;
        const isInRequesterNetwork = requesterNetworkIds.includes(targetUserId);

        if (!isAdmin && !isSameUser && !isSpouse && !isInRequesterNetwork) {
            return res.status(403).json({ error: 'No tienes permisos para remover este usuario de la red' });
        }

        await prisma.userHierarchy.deleteMany({
            where: { childId: targetUserId }
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
                phone: true,
                profile: { select: { fullName: true } },
                roles: { select: { role: { select: { id: true, name: true } } } },
                spouse: {
                    select: {
                        id: true,
                        phone: true,
                        profile: { select: { fullName: true } },
                        roles: { select: { role: { select: { id: true, name: true } } } }
                    }
                },
                spouseOf: {
                    select: {
                        id: true,
                        phone: true,
                        profile: { select: { fullName: true } },
                        roles: { select: { role: { select: { id: true, name: true } } } }
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
                            { id: pastor.id, fullName: pastor.profile?.fullName, phone: pastor.phone },
                            { id: spouse.id, fullName: spouse.profile?.fullName, phone: spouse.phone }
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
                    phone: pastor.phone,
                    roles: pastor.roles.map(r => r.role.name),
                    isCouple: false,
                    partners: [{ id: pastor.id, fullName: pastor.profile?.fullName, phone: pastor.phone }]
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
        const isAdmin = requesterRoles.includes('ADMIN');

        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
        const skip = (page - 1) * limit;

        // Mismos segmentadores tipo Power BI del dashboard unificado
        const { startDate, endDate, liderDoceId, role } = req.query;
        const search = typeof req.query.search === 'string' ? req.query.search.trim().slice(0, 60) : '';

        // Ventana de fechas (por defecto últimos 90 días)
        const end = endDate ? new Date(endDate) : new Date();
        if (endDate) end.setHours(23, 59, 59, 999);
        const start = startDate ? new Date(startDate) : new Date(end.getTime() - 90 * 24 * 60 * 60 * 1000);
        if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
            return res.status(400).json({ error: 'Rango de fechas inválido' });
        }
        const dateRange = { gte: start, lte: end };
        const ventana = `${start.toISOString().split('T')[0]} → ${end.toISOString().split('T')[0]}`;
        const meta = {
            ventana,
            appliedFilters: {
                startDate: startDate || null,
                endDate: endDate || null,
                liderDoceId: liderDoceId || null,
                role: role || null,
                search: search || null
            }
        };

        // Red solicitada (?liderDoceId=): líder + descendencia + cónyuge
        let redIds = null;
        if (liderDoceId) {
            const lId = parseInt(liderDoceId, 10);
            if (!Number.isNaN(lId)) {
                const lider = await prisma.user.findUnique({
                    where: { id: lId },
                    select: { spouseId: true }
                }).catch(() => null);
                redIds = [lId, ...(await getUserNetwork(lId))];
                if (lider?.spouseId) {
                    redIds = [...redIds, lider.spouseId, ...(await getUserNetwork(lider.spouseId))];
                }
                redIds = [...new Set(redIds)];
            }
        }

        const likePattern = search ? `%${search}%` : null;

        let targetUserIds = [];

        if (isAdmin) {
            // Admin ve todos los usuarios no-admin, con filtros opcionales de red/rol/búsqueda.
            // NOTA: excluye ADMIN de forma consistente con el resto del reporte.
            const conditions = [
                Prisma.sql`u."isDeleted" = false`,
                Prisma.sql`NOT EXISTS (
                    SELECT 1 FROM "UserRole" ur
                    JOIN "Role" r ON r.id = ur."roleId"
                    WHERE ur."userId" = u.id AND r.name = 'ADMIN'
                )`
            ];
            if (redIds) conditions.push(Prisma.sql`u.id = ANY(${redIds})`);
            if (role) conditions.push(Prisma.sql`EXISTS (
                SELECT 1 FROM "UserRole" ur
                JOIN "Role" r ON r.id = ur."roleId"
                WHERE ur."userId" = u.id AND r.name = ${role}
            )`);
            const joinProfile = likePattern
                ? Prisma.sql`JOIN "UserProfile" up ON up."userId" = u.id`
                : Prisma.empty;
            if (likePattern) conditions.push(Prisma.sql`(up."fullName" ILIKE ${likePattern} OR u.email ILIKE ${likePattern})`);
            const whereSql = Prisma.join(conditions, ' AND ');

            const [{ totalCount }] = await prisma.$queryRaw`
                SELECT COUNT(*)::int AS "totalCount"
                FROM "User" u
                ${joinProfile}
                WHERE ${whereSql}
            `;

            if (totalCount === 0) {
                return res.json({ data: [], pagination: { page, limit, total: 0, pages: 0 }, meta });
            }

            const pagedUsers = await prisma.$queryRaw`
                SELECT u.id
                FROM "User" u
                ${joinProfile}
                WHERE ${whereSql}
                ORDER BY u.id DESC
                OFFSET ${skip}
                LIMIT ${limit}
            `;

            targetUserIds = pagedUsers.map(u => u.id);

            // Now fetch full data only for the paged users
            const users = await prisma.user.findMany({
                where: { id: { in: targetUserIds } },
                include: {
                    profile: true,
                    roles: { include: { role: true } },
                    _count: {
                        select: {
                            invitedGuests: { where: { createdAt: dateRange } },
                            hostedCells: true,
                            churchAttendances: { where: { status: 'PRESENTE', date: dateRange } },
                            cellAttendances: { where: { status: 'PRESENTE', date: dateRange } },
                            encuentroRegistrations: { where: { status: 'ATTENDED', createdAt: dateRange } },
                            conventionRegistrations: { where: { status: 'ATTENDED', createdAt: dateRange } }
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
                    classAttendances: {
                        where: { createdAt: dateRange },
                        select: {
                            enrollmentId: true,
                            classNumber: true,
                            grade: true,
                            notes: true,
                            status: true,
                            enrollment: {
                                select: {
                                    module: { select: { name: true } }
                                }
                            }
                        }
                    },
                    seminarEnrollments: {
                        include: { module: { select: { name: true } } }
                    },
                    auditLogs: {
                        where: { action: 'LOGIN', createdAt: dateRange },
                        orderBy: { createdAt: 'desc' },
                        take: 1
                    }
                }
            });

            const activityList = buildActivityList(users, ventana);
            return res.json({
                data: activityList,
                pagination: { page, limit, total: totalCount, pages: Math.ceil(totalCount / limit) },
                meta
            });
        }

        // Non-admin path: get leader's network, intersected with red/search/role filters
        const networkIds = await getUserNetwork(currentUserId);
        targetUserIds = [...new Set([...networkIds, currentUserId])];

        if (redIds) {
            const redSet = new Set(redIds);
            targetUserIds = targetUserIds.filter((uid) => redSet.has(uid));
        }

        if (role || likePattern) {
            const matched = await prisma.user.findMany({
                where: {
                    id: { in: targetUserIds.length > 0 ? targetUserIds : [-1] },
                    ...(role ? { roles: { some: { role: { name: role } } } } : {}),
                    ...(likePattern ? {
                        OR: [
                            { profile: { fullName: { contains: search, mode: 'insensitive' } } },
                            { email: { contains: search, mode: 'insensitive' } }
                        ]
                    } : {})
                },
                select: { id: true }
            });
            targetUserIds = matched.map((m) => m.id);
        }

        if (targetUserIds.length === 0) {
            return res.json({ data: [], pagination: { page, limit, total: 0, pages: 0 } });
        }

        const [{ totalCount }] = await prisma.$queryRaw`
            SELECT COUNT(*)::int AS "totalCount"
            FROM unnest(${targetUserIds}::int[]) AS ids(id)
        `;

        const pagedIds = targetUserIds.slice(skip, skip + limit);
        if (pagedIds.length === 0) {
            return res.json({ data: [], pagination: { page, limit, total: totalCount, pages: Math.ceil(totalCount / limit) } });
        }

        const users = await prisma.user.findMany({
            where: { id: { in: pagedIds } },
            include: {
                profile: true,
                roles: { include: { role: true } },
                _count: {
                    select: {
                        invitedGuests: { where: { createdAt: dateRange } },
                        hostedCells: true,
                        churchAttendances: { where: { status: 'PRESENTE', date: dateRange } },
                        cellAttendances: { where: { status: 'PRESENTE', date: dateRange } },
                        encuentroRegistrations: { where: { status: 'ATTENDED', createdAt: dateRange } },
                        conventionRegistrations: { where: { status: 'ATTENDED', createdAt: dateRange } }
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
                classAttendances: {
                    where: { createdAt: dateRange },
                    select: {
                        enrollmentId: true,
                        classNumber: true,
                        grade: true,
                        notes: true,
                        status: true,
                        enrollment: {
                            select: {
                                module: { select: { name: true } }
                            }
                        }
                    }
                },
                seminarEnrollments: {
                    include: { module: { select: { name: true } } }
                },
                auditLogs: {
                    where: { action: 'LOGIN', createdAt: dateRange },
                    orderBy: { createdAt: 'desc' },
                    take: 1
                }
            }
        });

        const activityList = buildActivityList(users, ventana);
        res.json({
            data: activityList,
            pagination: { page, limit, total: totalCount, pages: Math.ceil(totalCount / limit) },
            meta
        });
    } catch (error) {
        console.error('Error in getUserActivityList:', error);
        res.status(500).json({ error: 'Error al obtener el listado de actividad: ' + error.message });
    }
};

/**
 * Build activity list from user records
 */
const buildActivityList = (users, ventana = '90 días') => {
    return users.map(u => {
        const churchCount = u._count.churchAttendances;
        const cellCount = u._count.cellAttendances;
        const schoolCount = u.classAttendances.filter(ca => ca.status === 'ASISTE').length;
        const encuentroCount = u._count.encuentroRegistrations;
        const conventionCount = u._count.conventionRegistrations;
        const ganarReports = u._count.invitedGuests;

        const classes = u.seminarEnrollments.map(enrol => {
            const classNotes = u.classAttendances
                .filter(ca => ca.enrollmentId === enrol.id)
                .map(ca => ({
                    class: ca.classNumber,
                    grade: ca.grade,
                    notes: ca.notes
                }));
            return {
                moduleName: enrol.module?.name || 'Desconocido',
                finalGrade: enrol.finalGrade,
                status: enrol.status,
                notes: classNotes
            };
        });

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
                ganar: ganarReports,
                ventana
            },
            clases: classes,
            celula: {
                nombre: u.cell?.name || 'No registrada',
                isAnfitrion: u._count.hostedCells > 0,
                hostedCount: u._count.hostedCells
            },
            encuentrosAsistidos: encuentroCount,
            convencionesAsistidas: conventionCount,
            ultimoAcceso: u.auditLogs[0]?.createdAt || null
        };
    });
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
