const { PrismaClient } = require('@prisma/client');
const prisma = require('../prisma/client');
const { logActivity } = require('../utils/auditLogger');
const { isDescendant } = require('../middleware/hierarchyMiddleware');

/**
 * Helper to normalize phone numbers
 */
const normalizePhone = (phone) => {
    if (!phone) return null;
    return phone.replace(/\D/g, '');
};

/**
 * Helper to check if two dates are in the same calendar week (Sunday to Saturday)
 */
const isSameWeek = (date1, date2) => {
    const d1 = new Date(date1);
    const d2 = new Date(date2);

    // Get start of week (Sunday)
    const getStartOfWeek = (d) => {
        const date = new Date(d);
        const day = date.getDay();
        const diff = date.getDate() - day;
        return new Date(date.setDate(diff)).setHours(0, 0, 0, 0);
    };

    return getStartOfWeek(d1) === getStartOfWeek(d2);
};

/**
 * Create a new Oracion De Tres group
 */
const createGroup = async (req, res) => {
    try {
        const { fechaInicio, miembros, personas } = req.body;
        const { id: liderDoceId, roles } = req.user;

        // 1. Validate role LIDER_DOCE or ADMIN
        if (!roles.includes('LIDER_DOCE') && !roles.includes('ADMIN')) {
            return res.status(403).json({ error: 'Solo los Líderes de 12 y Administradores pueden crear grupos de Oración de Tres.' });
        }

        // 2. Validate exactly 3 members
        if (!miembros || miembros.length !== 3) {
            return res.status(400).json({ error: 'Un grupo debe tener exactamente 3 discípulos.' });
        }

        // 3. Validate exactly 3 persons
        if (!personas || personas.length !== 3) {
            return res.status(400).json({ error: 'Un grupo debe orar por exactamente 3 personas objetivo.' });
        }

        // 4. Validate all members have role DISCIPULO
        const memberUsers = await prisma.user.findMany({
            where: { id: { in: miembros.map(id => parseInt(id)) } },
            include: { roles: { include: { role: true } } }
        });

        if (memberUsers.length !== 3) {
            return res.status(400).json({ error: 'Uno o más discípulos no fueron encontrados.' });
        }

        for (const u of memberUsers) {
            const userRoles = u.roles.map(r => r.role.name);
            if (!userRoles.includes('DISCIPULO')) {
                return res.status(400).json({ error: `El usuario ${u.email} no tiene el rol de DISCÍPULO.` });
            }
        }

        // 5. Calculate fechaFin (fechaInicio + 1 month)
        const start = new Date(fechaInicio);
        if (isNaN(start.getTime())) {
            return res.status(400).json({ error: 'Fecha de inicio inválida.' });
        }
        const end = new Date(start);
        end.setMonth(start.getMonth() + 1);

        // 6. Create Group with transaction
        const group = await prisma.$transaction(async (tx) => {
            const newGroup = await tx.oracionDeTres.create({
                data: {
                    liderDoceId: liderDoceId,
                    fechaInicio: start,
                    fechaFin: end,
                    estado: 'ACTIVO',
                    miembros: {
                        create: miembros.map(id => ({ discipuloId: parseInt(id) }))
                    },
                    personas: {
                        create: personas.map(p => ({
                            nombre: p.nombre,
                            telefono: normalizePhone(p.telefono)
                        }))
                    }
                },
                include: {
                    miembros: { include: { discipulo: { include: { profile: true } } } },
                    personas: true
                }
            });
            return newGroup;
        });

        await logActivity(liderDoceId, 'CREATE', 'ORACION_DE_TRES', group.id, { fechaInicio: start }, req.ip, req.headers['user-agent']);

        res.json(group);
    } catch (error) {
        console.error('Error creating OracionDeTres:', error);
        res.status(500).json({ error: 'Error al crear el grupo de oración.' });
    }
};

/**
 * Get groups based on user access
 */
const getGroups = async (req, res) => {
    try {
        const { id: userId, roles } = req.user;

        let where = {};

        if (roles.includes('ADMIN')) {
            // Admin sees everything
            where = {};
        } else if (roles.includes('LIDER_DOCE')) {
            // Created by them OR they are members (unlikely but possible) OR in their hierarchy
            // For LIDER_DOCE, we show those they created mainly.
            where = {
                OR: [
                    { liderDoceId: userId },
                    { miembros: { some: { discipuloId: userId } } }
                ]
            };
        } else if (roles.includes('LIDER_CELULA')) {
            // Must check hierarchy. This is slow in findMany if not carefully done.
            // Requirement says authorized by hierarchy.
            // We'll fetch all and filter or use a more complex query.
            // Simpler: fetch groups where members are in the leader's network.
            const { getUserNetwork } = require('../utils/networkUtils');
            const networkIds = await getUserNetwork(userId);
            where = {
                OR: [
                    { liderDoceId: userId },
                    { miembros: { some: { discipuloId: { in: networkIds } } } }
                ]
            };
        } else if (roles.includes('DISCIPULO')) {
            // Only those they belong to
            where = {
                miembros: { some: { discipuloId: userId } }
            };
        }

        const groups = await prisma.oracionDeTres.findMany({
            where,
            include: {
                liderDoce: { select: { profile: { select: { fullName: true } } } },
                miembros: { include: { discipulo: { include: { profile: true } } } },
                personas: true,
                _count: { select: { reuniones: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json(groups);
    } catch (error) {
        console.error('Error fetching OracionDeTres:', error);
        res.status(500).json({ error: 'Error al obtener los grupos de oración.' });
    }
};

/**
 * Get a specific group details (with ACL check)
 */
const getGroupById = async (req, res) => {
    try {
        const { id } = req.params;
        const groupId = parseInt(id);
        const { id: userId, roles } = req.user;

        const group = await prisma.oracionDeTres.findUnique({
            where: { id: groupId },
            include: {
                liderDoce: { select: { profile: { select: { fullName: true } } } },
                miembros: { include: { discipulo: { include: { profile: true } } } },
                personas: true,
                reuniones: { orderBy: { fecha: 'desc' } }
            }
        });

        if (!group) return res.status(404).json({ error: 'Grupo no encontrado.' });

        // ACL Check
        let authorized = false;
        if (roles.includes('ADMIN')) authorized = true;
        else if (group.liderDoceId === userId) authorized = true;
        else if (group.miembros.some(m => m.discipuloId === userId)) authorized = true;
        else {
            // Check hierarchy for LIDER_CELULA or others
            // Is any member of the group a descendant of the requester?
            for (const m of group.miembros) {
                if (await isDescendant(userId, m.discipuloId)) {
                    authorized = true;
                    break;
                }
            }
        }

        if (!authorized) {
            return res.status(403).json({ error: 'No tienes permiso para ver este grupo.' });
        }

        res.json(group);
    } catch (error) {
        console.error('Error fetching OracionDeTres details:', error);
        res.status(500).json({ error: 'Error al obtener detalles del grupo.' });
    }
};

/**
 * Add a weekly meeting
 */
const addMeeting = async (req, res) => {
    try {
        const { oracionDeTresId, fecha, hora } = req.body;
        const { id: userId, roles } = req.user;

        const group = await prisma.oracionDeTres.findUnique({
            where: { id: parseInt(oracionDeTresId) },
            include: { miembros: true, reuniones: true }
        });

        if (!group) return res.status(404).json({ error: 'Grupo no encontrado.' });
        if (group.estado !== 'ACTIVO') return res.status(400).json({ error: 'El grupo ya no está activo.' });

        // Permission check: only members, creator or ADMIN can add meetings
        const isMember = group.miembros.some(m => m.discipuloId === userId);
        const isCreator = group.liderDoceId === userId;
        const isAdmin = roles.includes('ADMIN');
        if (!isMember && !isCreator && !isAdmin) {
            return res.status(403).json({ error: 'Solo los miembros del grupo o administradores pueden registrar reuniones.' });
        }

        const meetingDate = new Date(fecha);
        if (isNaN(meetingDate.getTime())) return res.status(400).json({ error: 'Fecha inválida.' });

        // 1. Validate date is within group period
        if (meetingDate < group.fechaInicio || meetingDate > group.fechaFin) {
            return res.status(400).json({ error: 'La fecha de la reunión debe estar dentro del periodo del grupo.' });
        }

        // 2. Validate maximum 1 meeting per week
        const sameWeekMeeting = group.reuniones.find(r => isSameWeek(r.fecha, meetingDate));
        if (sameWeekMeeting) {
            return res.status(400).json({ error: 'Ya existe una reunión registrada para esta semana.' });
        }

        const meeting = await prisma.oracionDeTresReunion.create({
            data: {
                oracionDeTresId: group.id,
                fecha: meetingDate,
                hora: hora
            }
        });

        await logActivity(userId, 'CREATE', 'ORACION_DE_TRES', group.id, { action: 'ADD_MEETING', meetingId: meeting.id }, req.ip, req.headers['user-agent']);

        res.json(meeting);
    } catch (error) {
        console.error('Error adding meeting:', error);
        res.status(500).json({ error: 'Error al registrar la reunión.' });
    }
};

/**
 * Update an existing group
 */
const updateGroup = async (req, res) => {
    try {
        const { id } = req.params;
        const groupId = parseInt(id);
        const { fechaInicio, miembros, personas, estado } = req.body;
        const { id: userId, roles } = req.user;

        const group = await prisma.oracionDeTres.findUnique({
            where: { id: groupId },
            include: { miembros: true }
        });

        if (!group) return res.status(404).json({ error: 'Grupo no encontrado.' });

        // Permission check: Creator or ADMIN
        const isAdmin = roles.includes('ADMIN');
        if (group.liderDoceId !== userId && !isAdmin) {
            return res.status(403).json({ error: 'No tienes permiso para editar este grupo.' });
        }

        // Validate exactly 3 members
        if (miembros && miembros.length !== 3) {
            return res.status(400).json({ error: 'Un grupo debe tener exactamente 3 discípulos.' });
        }

        // Validate exactly 3 persons
        if (personas && personas.length !== 3) {
            return res.status(400).json({ error: 'Un grupo debe orar por exactamente 3 personas objetivo.' });
        }

        // Recalculate dates if fechaInicio changed
        let updateData = {};
        if (fechaInicio) {
            const start = new Date(fechaInicio);
            const end = new Date(start);
            end.setMonth(start.getMonth() + 1);
            updateData.fechaInicio = start;
            updateData.fechaFin = end;
        }

        if (estado) {
            updateData.estado = estado;
        }

        const updatedGroup = await prisma.$transaction(async (tx) => {
            // update main fields
            const g = await tx.oracionDeTres.update({
                where: { id: groupId },
                data: updateData
            });

            // update members if provided
            if (miembros) {
                await tx.oracionDeTresMiembro.deleteMany({ where: { oracionDeTresId: groupId } });
                await tx.oracionDeTresMiembro.createMany({
                    data: miembros.map(mid => ({ oracionDeTresId: groupId, discipuloId: parseInt(mid) }))
                });
            }

            // update persons if provided
            if (personas) {
                await tx.oracionDeTresPersona.deleteMany({ where: { oracionDeTresId: groupId } });
                await tx.oracionDeTresPersona.createMany({
                    data: personas.map(p => ({
                        oracionDeTresId: groupId,
                        nombre: p.nombre,
                        telefono: normalizePhone(p.telefono)
                    }))
                });
            }

            return tx.oracionDeTres.findUnique({
                where: { id: groupId },
                include: {
                    miembros: { include: { discipulo: { include: { profile: true } } } },
                    personas: true
                }
            });
        });

        await logActivity(userId, 'UPDATE', 'ORACION_DE_TRES', groupId, { updateData }, req.ip, req.headers['user-agent']);

        res.json(updatedGroup);
    } catch (error) {
        console.error('Error updating OracionDeTres:', error);
        res.status(500).json({ error: 'Error al actualizar el grupo de oración.' });
    }
};

/**
 * Delete a group
 */
const deleteGroup = async (req, res) => {
    try {
        const { id } = req.params;
        const groupId = parseInt(id);
        const { id: userId, roles } = req.user;

        const group = await prisma.oracionDeTres.findUnique({
            where: { id: groupId }
        });

        if (!group) return res.status(404).json({ error: 'Grupo no encontrado.' });

        // Permission check: Creator or ADMIN
        const isAdmin = roles.includes('ADMIN');
        if (group.liderDoceId !== userId && !isAdmin) {
            return res.status(403).json({ error: 'No tienes permiso para eliminar este grupo.' });
        }

        await prisma.oracionDeTres.delete({
            where: { id: groupId }
        });

        await logActivity(userId, 'DELETE', 'ORACION_DE_TRES', groupId, null, req.ip, req.headers['user-agent']);

        res.json({ message: 'Grupo eliminado correctamente.' });
    } catch (error) {
        console.error('Error deleting OracionDeTres:', error);
        res.status(500).json({ error: 'Error al eliminar el grupo de oración.' });
    }
};

module.exports = {
    createGroup,
    getGroups,
    getGroupById,
    addMeeting,
    updateGroup,
    deleteGroup
};
