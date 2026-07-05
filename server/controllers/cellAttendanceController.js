const prisma = require('../utils/database');
const { getUserNetwork } = require('../utils/networkUtils');
const { hasAdminAccessOnModule } = require('../middleware/coordinatorAuth');

// Helper function to get all users in a leader's network (disciples and sub-disciples)
const hasFullEnviarAccess = (user) => hasAdminAccessOnModule(user, 'enviar');

// Record cell attendance
const recordCellAttendance = async (req, res) => {
    try {
        const { date, cellId, attendances } = req.body; // attendances: [{ userId, status }]

        if (!date || !cellId || !attendances || !Array.isArray(attendances)) {
            return res.status(400).json({ error: 'Date, cellId, and attendances array required' });
        }

        // Check if user is authorized (cell leader or admin)
        const cell = await prisma.cell.findUnique({
            where: { id: parseInt(cellId) },
            select: { leaderId: true }
        });

        if (!cell) {
            return res.status(404).json({ error: 'Cell not found' });
        }

        const userRoles = req.user.roles || [];
        const userId = req.user.id;
        const isAdmin = userRoles.includes('ADMIN');
        const isPastor = userRoles.includes('PASTOR');
        const isLiderDoce = userRoles.includes('LIDER_DOCE');
        const isDiscipulo = userRoles.includes('DISCIPULO') || userRoles.includes('MIEMBRO');

        const isAuthorized = hasFullEnviarAccess(req.user) || isAdmin || isLiderDoce || isPastor || cell.leaderId === userId;

        if (!isAuthorized) {
            // If they are not leadership, they MUST be a DISCIPULO/MIEMBRO recording ONLY THEIR OWN attendance
            const isSelfRecording = isDiscipulo &&
                attendances.length === 1 &&
                attendances[0].userId === userId;

            if (!isSelfRecording) {
                return res.status(403).json({ error: 'Not authorized to record attendance for this cell' });
            }

            // Also verify they are actually members of the cell
            const isMember = await prisma.user.findFirst({
                where: {
                    id: userId,
                    cellId: parseInt(cellId)
                }
            });

            if (!isMember) {
                return res.status(403).json({ error: 'Not authorized to record attendance for this cell (not a member)' });
            }
        }

        // Separate USER and GUEST attendances
        const userAttendances = attendances.filter(a => a.type === 'USER');
        const guestAttendances = attendances.filter(a => a.type === 'GUEST');

        // Validate USER ids
        if (userAttendances.length > 0) {
            const userIds = userAttendances.map(a => {
                const id = parseInt(a.userId);
                if (isNaN(id)) return null;
                return id;
            });

            const validUserIds = userIds.filter(id => id !== null);

            if (validUserIds.length !== userAttendances.length) {
                return res.status(400).json({ error: 'Invalid userId value in attendances' });
            }

            const existingUsers = await prisma.user.findMany({
                where: { id: { in: validUserIds } },
                select: { id: true }
            });
            const existingUserIds = new Set(existingUsers.map(u => u.id));
            const invalidUserIds = validUserIds.filter(id => !existingUserIds.has(id));

            if (invalidUserIds.length > 0) {
                return res.status(400).json({
                    error: 'Some users do not exist',
                    invalidUserIds
                });
            }
        }

        // Validate GUEST ids
        if (guestAttendances.length > 0) {
            const guestIds = guestAttendances.map(a => {
                const id = parseInt(a.userId);
                if (isNaN(id)) return null;
                return id;
            });

            const validGuestIds = guestIds.filter(id => id !== null);

            if (validGuestIds.length !== guestAttendances.length) {
                return res.status(400).json({ error: 'Invalid guestId value in attendances' });
            }

            const existingGuests = await prisma.guest.findMany({
                where: { id: { in: validGuestIds }, cellId: parseInt(cellId) },
                select: { id: true }
            });
            const existingGuestIds = new Set(existingGuests.map(g => g.id));
            const invalidGuestIds = validGuestIds.filter(id => !existingGuestIds.has(id));

            if (invalidGuestIds.length > 0) {
                return res.status(400).json({
                    error: 'Some guests do not exist or are not assigned to this cell',
                    invalidGuestIds
                });
            }
        }

        // Use a transaction to atomically clear and re-insert
        await prisma.$transaction(async (tx) => {
            await tx.cellAttendance.deleteMany({
                where: {
                    date: new Date(date),
                    cellId: parseInt(cellId)
                }
            });

            const createData = [];
            userAttendances.forEach(({ userId, status }) => {
                createData.push({
                    date: new Date(date),
                    cellId: parseInt(cellId),
                    userId: parseInt(userId),
                    status
                });
            });
            guestAttendances.forEach(({ userId: guestId, status }) => {
                createData.push({
                    date: new Date(date),
                    cellId: parseInt(cellId),
                    guestId: parseInt(guestId),
                    status
                });
            });

            if (createData.length > 0) {
                await tx.cellAttendance.createMany({ data: createData });
            }
        });

        res.json({ message: 'Cell attendance recorded successfully', count: attendances.length });
    } catch (error) {
        console.error('Error recording cell attendance:', error);
        res.status(500).json({ error: 'Error recording cell attendance' });
    }
};

// Get cell attendance by date and cell
const getCellAttendance = async (req, res) => {
    try {
        const { cellId, date } = req.params;
        const userRoles = req.user.roles || [];
        const userId = req.user.id;

        // Check authorization
        const cell = await prisma.cell.findUnique({
            where: { id: parseInt(cellId) },
            select: { leaderId: true }
        });

        if (!cell) {
            return res.status(404).json({ error: 'Cell not found' });
        }

        const isMember = await prisma.user.findFirst({
            where: { id: userId, cellId: parseInt(cellId) }
        });

        const isAdmin = userRoles.includes('ADMIN');
        const isPastor = userRoles.includes('PASTOR');
        const isLiderDoce = userRoles.includes('LIDER_DOCE');

        // Check if user is a standard member (DISCIPULO or MIEMBRO) without administrative roles or being the leader
        const isDiscipulo = (userRoles.includes('DISCIPULO') || userRoles.includes('MIEMBRO')) &&
            !isAdmin && !isLiderDoce && !isPastor && cell.leaderId !== userId;

        if (!hasFullEnviarAccess(req.user) && !isAdmin && !isLiderDoce && !isPastor && cell.leaderId !== userId && !isMember) {
            return res.status(403).json({ error: 'Not authorized to view this cell attendance' });
        }

        let whereClause = {
            cellId: parseInt(cellId),
            date: new Date(date)
        };

        // Filter: DISCIPULO only sees their own attendance
        if (isDiscipulo) {
            whereClause.userId = userId;
        }

        const attendances = await prisma.cellAttendance.findMany({
            where: whereClause,
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        profile: {
                            select: {
                                fullName: true
                            }
                        },
                        roles: { include: { role: true } }
                    }
                },
                guest: {
                    select: {
                        id: true,
                        name: true,
                        phone: true
                    }
                }
            },
            orderBy: {
                id: 'asc'
            }
        });

        const formattedAttendances = attendances.map(a => {
            if (a.user) {
                return {
                    ...a,
                    userId: a.user.id,
                    user: {
                        ...a.user,
                        roles: a.user.roles.map(r => r.role.name)
                    }
                };
            }
            return {
                ...a,
                userId: a.guest.id,
                user: {
                    id: a.guest.id,
                    email: a.guest.phone,
                    profile: { fullName: a.guest.name },
                    roles: ['INVITADO']
                }
            };
        });

        res.json(formattedAttendances);
    } catch (error) {
        console.error('Error fetching cell attendance:', error);
        res.status(500).json({ error: 'Error fetching cell attendance' });
    }
};

// Get cells (filtered by role)
const getCells = async (req, res) => {
    try {
        const userRoles = req.user.roles || [];
        const userId = req.user.id;

        let where = {};

        // Check if user is module coordinator of enviar module
        const isEnviarCoordinator = hasFullEnviarAccess(req.user);

        // Get user's spouse if exists
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { spouseId: true }
        });
        const spouseId = user?.spouseId;

        if (isEnviarCoordinator || userRoles.includes('ADMIN')) {
            // ADMIN and enviar module coordinators see all cells (no filter)
            where = {};
        } else if (userRoles.includes('LIDER_DOCE') || userRoles.includes('PASTOR')) {
            // LIDER_DOCE y PASTOR pueden ver todas las células de su red
            // O aquellas donde son explícitamente el lider doce asignado
            // También incluyen células donde su pareja es el lider doce asignado
            const networkUserIds = await getUserNetwork(userId);
            
            // Build liderDoceId conditions to include both user and spouse
            const liderDoceConditions = [{ liderDoceId: userId }];
            if (spouseId) {
                liderDoceConditions.push({ liderDoceId: spouseId });
            }

            where.OR = [
                { leaderId: { in: networkUserIds } },
                ...liderDoceConditions
            ];
        } else if (userRoles.includes('LIDER_CELULA')) {
            // LIDER_CELULA can only see their own cells
            where.leaderId = userId;
        } else {
            // Members/Discipulos can only see cells they belong to
            const userData = await prisma.user.findUnique({
                where: { id: userId },
                select: { cellId: true }
            });
            where.id = userData?.cellId || -1;
        }

        const cells = await prisma.cell.findMany({
            where,
            select: {
                id: true,
                name: true,
                address: true,
                city: true,
                barrio: true,
                network: true,
                spiritualMappingUrl: true,
                fastingDate: true,
                rhemaWord: true,
                pastorsMeeting: true,
                latitude: true,
                longitude: true,
                dayOfWeek: true,
                time: true,
                leaderId: true,
                hostId: true,
                liderDoceId: true,
                cellType: true,
                leader: {
                    select: {
                        id: true,
                        profile: { select: { fullName: true } },
                        email: true
                    }
                },
                host: {
                    select: {
                        id: true,
                        profile: { select: { fullName: true } },
                        email: true
                    }
                },
                liderDoce: {
                    select: {
                        id: true,
                        profile: { select: { fullName: true } },
                        email: true
                    }
                },
                guests: {
                    select: { id: true }
                },
                _count: {
                    select: {
                        guests: true
                    }
                }
            },
            orderBy: {
                name: 'asc'
            }
        });

        // Flatten nested objects for easier frontend consumption
        let formattedCells = cells.map(cell => ({
            ...cell,
            members: [],
            leader: cell.leader ? { ...cell.leader, fullName: cell.leader.profile?.fullName } : null,
            host: cell.host ? { ...cell.host, fullName: cell.host.profile?.fullName } : null,
            liderDoce: cell.liderDoce ? { ...cell.liderDoce, fullName: cell.liderDoce.profile?.fullName } : null,
        }));

        // Populate members and counts from User.cellId (the actual relation used)
        const cellIds = cells.map(c => c.id);
        if (cellIds.length > 0) {
            const memberUsers = await prisma.user.findMany({
                where: { cellId: { in: cellIds }, isDeleted: false },
                select: { id: true, cellId: true }
            });
            const membersByCell = {};
            memberUsers.forEach(u => {
                if (!membersByCell[u.cellId]) membersByCell[u.cellId] = [];
                membersByCell[u.cellId].push(u.id);
            });
            formattedCells = formattedCells.map(cell => ({
                ...cell,
                members: membersByCell[cell.id] || [],
                _count: { ...cell._count, members: (membersByCell[cell.id] || []).length }
            }));
        }

        res.json(formattedCells);
    } catch (error) {
        console.error('Error fetching cells:', error);
        res.status(500).json({ error: 'Error fetching cells: ' + error.message });
    }
};

// Get cell members
const getCellMembers = async (req, res) => {
    try {
        const { cellId } = req.params;
        const userRoles = req.user.roles || [];
        const userId = req.user.id;

        // Check if user is module coordinator of enviar module
        const isEnviarCoordinator = hasFullEnviarAccess(req.user);

        const cell = await prisma.cell.findUnique({
            where: { id: parseInt(cellId) },
            select: {
                leaderId: true,
                guests: {
                    select: {
                        id: true,
                        name: true,
                        phone: true
                    }
                }
            }
        });

        if (!cell) {
            return res.status(404).json({ error: 'Cell not found' });
        }

        // Query members via User.cellId (the relation that is actually populated)
        const cellUsers = await prisma.user.findMany({
            where: {
                OR: [
                    { cellId: parseInt(cellId) },
                    { ledCells: { some: { id: parseInt(cellId) } } }
                ],
                isDeleted: false
            },
            select: {
                id: true,
                profile: { select: { fullName: true } },
                email: true,
                roles: { include: { role: true } }
            }
        });

        const isMember = cellUsers.some(m => m.id === userId);
        const isAuthorized = userRoles.some(r => ['ADMIN', 'LIDER_DOCE', 'PASTOR'].includes(r)) || isEnviarCoordinator;

        if (!isAuthorized && cell.leaderId !== userId && !isMember) {
            return res.status(403).json({ error: 'Not authorized to view this cell' });
        }

        const formattedMembers = cellUsers.map(m => ({
            id: m.id,
            fullName: m.profile?.fullName,
            email: m.email,
            roles: m.roles.map(r => r.role.name),
            type: 'USER'
        }));

        const formattedGuests = cell.guests.map(g => ({
            id: g.id,
            fullName: g.name,
            email: g.phone,
            roles: ['INVITADO'],
            type: 'GUEST'
        }));

        // Filter: DISCIPULO/MIEMBRO only sees themselves
        const isDiscipulo = (userRoles.includes('DISCIPULO') || userRoles.includes('MIEMBRO')) &&
            !isAuthorized && cell.leaderId !== userId;
        if (isDiscipulo) {
            const currentUser = cellUsers.find(m => m.id === userId);
            if (currentUser) {
                return res.json([{
                    id: currentUser.id,
                    fullName: currentUser.profile?.fullName,
                    email: currentUser.email,
                    roles: currentUser.roles.map(r => r.role.name),
                    type: 'USER'
                }]);
            } else {
                return res.json([]);
            }
        }

        const allMembers = [...formattedMembers, ...formattedGuests];
        res.json(allMembers);
    } catch (error) {
        console.error('Error fetching cell members:', error);
        res.status(500).json({ error: 'Error fetching cell members' });
    }
};

// Get attendance statistics for chart
const getAttendanceStats = async (req, res) => {
    try {
        const { startDate, endDate, cellId } = req.query;
        const userRoles = req.user.roles || [];
        const userId = req.user.id;

        // Check if user has full access on the Enviar module
        const isEnviarCoordinator = hasFullEnviarAccess(req.user);

        // Default to last 30 days if no date range provided
        const end = endDate ? new Date(endDate) : new Date();
        const start = startDate ? new Date(startDate) : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

        // Build cell filter based on role
        let cellFilter = {};

        if (cellId) {
            // If specific cell requested, verify access
            const cell = await prisma.cell.findUnique({
                where: { id: parseInt(cellId) },
                select: { leaderId: true }
            });

            if (!cell) {
                return res.status(404).json({ error: 'Cell not found' });
            }

            // Check authorization
            if (userRoles.includes('LIDER_CELULA') && cell.leaderId !== userId && !isEnviarCoordinator) {
                return res.status(403).json({ error: 'Not authorized to view this cell' });
            } else if ((userRoles.includes('LIDER_DOCE') || userRoles.includes('PASTOR')) && !isEnviarCoordinator) {
                const networkUserIds = await getUserNetwork(userId);
                if (!networkUserIds.includes(cell.leaderId)) {
                    return res.status(403).json({ error: 'Not authorized to view this cell' });
                }
            }
            // ADMIN and enviar module coordinators have access

            cellFilter.cellId = parseInt(cellId);
        } else {
            // Filter all cells based on role
            if (isEnviarCoordinator || userRoles.includes('ADMIN')) {
                // Module coordinators and ADMIN see all cells (no filter)
            } else if (userRoles.includes('LIDER_CELULA')) {
                const userCells = await prisma.cell.findMany({
                    where: { leaderId: userId },
                    select: { id: true }
                });
                cellFilter.cellId = { in: userCells.map(c => c.id) };
            } else if (userRoles.includes('LIDER_DOCE') || userRoles.includes('PASTOR')) {
                const networkUserIds = await getUserNetwork(userId);
                const networkCells = await prisma.cell.findMany({
                    where: { leaderId: { in: networkUserIds } },
                    select: { id: true }
                });
                cellFilter.cellId = { in: networkCells.map(c => c.id) };
            }
        }

        // Fetch attendance records within date range
        const attendances = await prisma.cellAttendance.findMany({
            where: {
                ...cellFilter,
                date: {
                    gte: start,
                    lte: end
                }
            },
            select: {
                date: true,
                status: true
            }
        });

        // Group by date and count present/absent
        const statsMap = {};
        attendances.forEach(att => {
            const dateKey = att.date.toISOString().split('T')[0];
            if (!statsMap[dateKey]) {
                statsMap[dateKey] = { date: dateKey, present: 0, absent: 0 };
            }
            if (att.status === 'PRESENTE') {
                statsMap[dateKey].present++;
            } else {
                statsMap[dateKey].absent++;
            }
        });

        // Convert to array and sort by date
        const stats = Object.values(statsMap).sort((a, b) =>
            new Date(a.date).getTime() - new Date(b.date).getTime()
        );

        res.json(stats);
    } catch (error) {
        console.error('Error fetching attendance stats:', error);
        res.status(500).json({ error: 'Error fetching attendance stats ' + error.message });
    }
};

module.exports = {
    recordCellAttendance,
    getCellAttendance,
    getCells,
    getCellMembers,
    getAttendanceStats
};
