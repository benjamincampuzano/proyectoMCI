const prisma = require('../utils/database');
const { getUserNetwork } = require('../utils/networkUtils');

// Create or update church attendance for a specific date
const recordAttendance = async (req, res) => {
    try {
        const { date, attendances } = req.body; // attendances: [{ userId?, guestId?, status }]

        if (!date || !attendances || !Array.isArray(attendances)) {
            return res.status(400).json({ error: 'Date and attendances array required' });
        }

        const parsedDate = new Date(date);
        const results = await prisma.$transaction(
            attendances.map(({ userId, guestId, status }) => {
                if (status === null) {
                    if (guestId) {
                        return prisma.churchAttendance.deleteMany({
                            where: { date: parsedDate, guestId: parseInt(guestId) }
                        });
                    }
                    return prisma.churchAttendance.deleteMany({
                        where: { date: parsedDate, userId: parseInt(userId) }
                    });
                }

                if (guestId) {
                    return prisma.churchAttendance.upsert({
                        where: {
                            date_guestId: {
                                date: parsedDate,
                                guestId: parseInt(guestId)
                            }
                        },
                        update: { status },
                        create: {
                            date: parsedDate,
                            guestId: parseInt(guestId),
                            status
                        }
                    });
                }
                return prisma.churchAttendance.upsert({
                    where: {
                        date_userId: {
                            date: parsedDate,
                            userId: parseInt(userId)
                        }
                    },
                    update: { status },
                    create: {
                        date: parsedDate,
                        userId: parseInt(userId),
                        status
                    }
                });
            })
        );

        res.json({ message: 'Asistencia registrada', count: results.length });
    } catch (error) {
        console.error('Error recording church attendance:', error);
        res.status(500).json({ error: 'Error recording attendance' });
    }
};

// Get attendance for a specific date
const getAttendanceByDate = async (req, res) => {
    try {
        const { date } = req.params;

        // Validate date
        const parsedDate = new Date(date);
        if (isNaN(parsedDate.getTime())) {
            return res.status(400).json({ error: 'Invalid date format' });
        }

        const attendances = await prisma.churchAttendance.findMany({
            where: {
                date: parsedDate
            },
            include: {
                user: {
                    include: {
                        profile: true,
                        roles: {
                            include: { role: true }
                        }
                    }
                },
                guest: true
            }
        });

        const formattedAttendances = attendances.map(a => {
            if (a.guest) {
                return {
                    ...a,
                    user: null,
                    guest: {
                        id: a.guest.id,
                        fullName: a.guest.name,
                        email: a.guest.phone,
                        role: 'INVITADO'
                    }
                };
            }
            return {
                ...a,
                user: {
                    ...a.user,
                    fullName: a.user?.profile?.fullName || 'Sin Nombre',
                    role: a.user?.roles?.map(r => r.role?.name).join(', ') || ''
                },
                guest: null
            };
        });

        // Sort by full name
        formattedAttendances.sort((a, b) => {
            const nameA = a.user?.fullName || a.guest?.fullName || '';
            const nameB = b.user?.fullName || b.guest?.fullName || '';
            return nameA.localeCompare(nameB);
        });

        res.json(formattedAttendances);
    } catch (error) {
        console.error('Error fetching church attendance:', error);
        res.status(500).json({ error: 'Error fetching attendance' });
    }
};

// Get members for attendance marking (filtered by role)
const getAllMembers = async (req, res) => {
    try {
        const { id, roles } = req.user;
        const userId = parseInt(id);
        const userRoles = roles || [];
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const skip = (page - 1) * limit;
        const searchTerm = req.query.searchTerm || '';
        const liderDoceId = req.query.liderDoceId ? parseInt(req.query.liderDoceId) : null;
        const liderCelulaId = req.query.liderCelulaId ? parseInt(req.query.liderCelulaId) : null;
        const rolFilter = req.query.rol || '';
        const redFilter = req.query.red || '';

        let where = {};

        if (userRoles.includes('LIDER_DOCE') || userRoles.includes('PASTOR')) {
            const networkIds = await getUserNetwork(userId);
            where = {
                id: { in: [...networkIds, userId] }
            };
        } else if (userRoles.includes('LIDER_CELULA')) {
            const networkIds = await getUserNetwork(userId);
            const cellMembers = await prisma.user.findMany({
                where: { cell: { leaderId: userId } },
                select: { id: true }
            });
            const cellMemberIds = cellMembers.map(u => u.id);
            const allIds = [...new Set([...networkIds, ...cellMemberIds, userId])];
            where = { id: { in: allIds } };
        } else if (!userRoles.includes('ADMIN') && !userRoles.includes('ADMIN')) {
            where = { id: userId };
        }

        if (searchTerm) {
            where.profile = { ...where.profile, fullName: { contains: searchTerm, mode: 'insensitive' } };
        }
        if (liderDoceId) where.liderDoceId = liderDoceId;
        if (liderCelulaId) where.cellId = liderCelulaId;
        if (rolFilter) {
            where.roles = { some: { role: { name: rolFilter } } };
        }
        if (redFilter) {
            where.profile = { ...where.profile, network: redFilter };
        }

        // Build guest where clause based on network permissions
        let guestWhere = { isDeleted: false };
        if (userRoles.includes('ADMIN')) {
            // Admin sees all guests
        } else if (userRoles.includes('LIDER_DOCE') || userRoles.includes('PASTOR') || userRoles.includes('LIDER_CELULA')) {
            const networkIds = await getUserNetwork(userId);
            const idsToCheck = [...networkIds, userId];
            guestWhere.OR = [
                { invitedById: { in: idsToCheck } },
                { assignedToId: { in: idsToCheck } }
            ];
        } else {
            guestWhere.OR = [
                { invitedById: userId },
                { assignedToId: userId }
            ];
        }

        if (searchTerm) {
            guestWhere.name = { contains: searchTerm, mode: 'insensitive' };
        }

        if (liderDoceId) {
            guestWhere.AND = guestWhere.AND || [];
            guestWhere.AND.push({
                OR: [
                    { invitedBy: { liderDoceId } },
                    { assignedTo: { liderDoceId } }
                ]
            });
        }

        if (redFilter) {
            guestWhere.AND = guestWhere.AND || [];
            guestWhere.AND.push({
                OR: [
                    { invitedBy: { profile: { network: redFilter } } },
                    { assignedTo: { profile: { network: redFilter } } }
                ]
            });
        }

        const [members, total, guests, guestTotal] = await Promise.all([
            prisma.user.findMany({
                where,
                select: {
                    id: true,
                    profile: { select: { fullName: true, network: true } },
                    email: true,
                    roles: { include: { role: true } },
                    cell: {
                        select: {
                            id: true, name: true,
                            leader: { select: { id: true, profile: { select: { fullName: true } } } },
                            liderDoce: { select: { id: true, profile: { select: { fullName: true } } } }
                        }
                    },
                    parents: {
                        where: { role: 'LIDER_DOCE' },
                        select: { parent: { select: { id: true, profile: { select: { fullName: true } } } } }
                    }
                },
                orderBy: { profile: { fullName: 'asc' } },
                skip, take: limit
            }),
            prisma.user.count({ where }),
            prisma.guest.findMany({
                where: guestWhere,
                include: {
                    invitedBy: { include: { profile: true } },
                    assignedTo: { include: { profile: true } }
                },
                orderBy: { name: 'asc' },
                skip, take: limit
            }),
            prisma.guest.count({ where: guestWhere })
        ]);

        const formattedMembers = members.map(m => {
            const liderDoceFromCell = m.cell?.liderDoce;
            const liderDoceFromHierarchy = m.parents?.[0]?.parent;
            const liderDoce = liderDoceFromCell || liderDoceFromHierarchy;
            return {
                id: m.id,
                fullName: m.profile?.fullName || 'Sin Nombre',
                email: m.email,
                role: m.roles.map(r => r.role.name).join(', '),
                roles: m.roles.map(r => r.role.name),
                liderDoceId: liderDoce?.id || null,
                liderDoceName: liderDoce?.profile?.fullName || null,
                liderCelulaId: m.cell?.leader?.id || null,
                liderCelulaName: m.cell?.leader?.profile?.fullName || null,
                red: m.profile?.network || null,
                cellId: m.cell?.id || null,
                cellName: m.cell?.name || null,
                type: 'MEMBER'
            };
        });

        const formattedGuests = guests.map(g => ({
            id: g.id,
            fullName: g.name,
            email: g.phone,
            role: 'INVITADO',
            roles: ['INVITADO'],
            liderDoceId: null,
            liderDoceName: null,
            liderCelulaId: null,
            liderCelulaName: null,
            red: null,
            cellId: null,
            cellName: null,
            type: 'GUEST',
            invitedByName: g.invitedBy?.profile?.fullName || g.invitedBy?.email || null,
            assignedToName: g.assignedTo?.profile?.fullName || g.assignedTo?.email || null
        }));

        const combined = [...formattedMembers, ...formattedGuests];
        combined.sort((a, b) => a.fullName.localeCompare(b.fullName));

        res.json({
            members: combined,
            pagination: { page, limit, total: total + guestTotal, totalPages: Math.ceil((total + guestTotal) / limit) }
        });
    } catch (error) {
        console.error('Error fetching members:', error);
        res.status(500).json({ error: 'Error fetching members' });
    }
};

// Get attendance statistics
const getAttendanceStats = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const { id, roles } = req.user;
        const userRoles = roles || [];

        const where = {};
        if (startDate && endDate) {
            where.date = { gte: new Date(startDate), lte: new Date(endDate) };
        }

        if (userRoles.includes('LIDER_DOCE') || userRoles.includes('PASTOR') || userRoles.includes('LIDER_CELULA')) {
            const networkIds = await getUserNetwork(id);
            networkIds.push(id);
            where.OR = [
                { userId: { in: networkIds } },
                { guest: { invitedById: { in: networkIds } } },
                { guest: { assignedToId: { in: networkIds } } }
            ];
        } else if (!userRoles.includes('ADMIN')) {
            where.OR = [
                { userId: id },
                { guest: { invitedById: id } },
                { guest: { assignedToId: id } }
            ];
        }

        where.user = { roles: { none: { role: { name: 'ADMIN' } } } };

        const total = await prisma.churchAttendance.count({ where });
        const present = await prisma.churchAttendance.count({
            where: { ...where, status: 'PRESENTE' }
        });

        res.json({
            total, present, absent: total - present, attendanceRate: total > 0 ? ((present / total) * 100) : 0
        });
    } catch (error) {
        console.error('Error fetching attendance stats:', error);
        res.status(500).json({ error: 'Error fetching statistics' });
    }
};

// Delete church attendance for a specific date
const deleteAttendanceByDate = async (req, res) => {
    try {
        const { date } = req.params;
        const parsedDate = new Date(date);
        if (isNaN(parsedDate.getTime())) return res.status(400).json({ error: 'Invalid date format' });

        const { id, roles } = req.user;
        const userRoles = roles || [];
        const isAdmin = userRoles.includes('ADMIN');
        const isLeader = userRoles.some(r => ['LIDER_DOCE', 'PASTOR', 'LIDER_CELULA'].includes(r));

        let where = { date: parsedDate };

        if (isAdmin) {
        } else if (isLeader) {
            const networkIds = await getUserNetwork(parseInt(id));
            networkIds.push(parseInt(id));
            where.OR = [
                { userId: { in: networkIds } },
                { guest: { invitedById: { in: networkIds } } },
                { guest: { assignedToId: { in: networkIds } } }
            ];
        } else {
            where.OR = [
                { userId: parseInt(id) },
                { guest: { invitedById: parseInt(id) } },
                { guest: { assignedToId: parseInt(id) } }
            ];
        }

        const result = await prisma.churchAttendance.deleteMany({ where });

        res.json({ message: 'Attendance records deleted successfully', deletedCount: result.count });
    } catch (error) {
        console.error('Error deleting church attendance:', error);
        res.status(500).json({ error: 'Error deleting attendance records' });
    }
};

// Get daily attendance statistics for chart
const getDailyStats = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const end = endDate ? new Date(endDate) : new Date();
        const start = startDate ? new Date(startDate) : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

        const where = { date: { gte: start, lte: end } };

        const { id, roles } = req.user;
        const userRoles = roles || [];
        if (userRoles.includes('LIDER_DOCE') || userRoles.includes('PASTOR') || userRoles.includes('LIDER_CELULA')) {
            const networkIds = await getUserNetwork(id);
            networkIds.push(id);
            where.OR = [
                { userId: { in: networkIds } },
                { guest: { invitedById: { in: networkIds } } },
                { guest: { assignedToId: { in: networkIds } } }
            ];
        } else if (!userRoles.includes('ADMIN')) {
            where.OR = [
                { userId: id },
                { guest: { invitedById: id } },
                { guest: { assignedToId: id } }
            ];
        }

        where.user = { roles: { none: { role: { name: 'ADMIN' } } } };

        const attendances = await prisma.churchAttendance.findMany({
            where, select: { date: true, status: true }
        });

        const statsMap = {};
        attendances.forEach(att => {
            const dateKey = att.date.toISOString().split('T')[0];
            if (!statsMap[dateKey]) statsMap[dateKey] = { date: dateKey, present: 0, absent: 0 };
            if (att.status === 'PRESENTE') statsMap[dateKey].present++;
            else statsMap[dateKey].absent++;
        });

        const stats = Object.values(statsMap).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        res.json(stats);
    } catch (error) {
        console.error('Error fetching daily stats:', error);
        res.status(500).json({ error: 'Error fetching daily statistics' });
    }
};

module.exports = {
    recordAttendance,
    getAttendanceByDate,
    getAllMembers,
    getAttendanceStats,
    getDailyStats,
    deleteAttendanceByDate
};
