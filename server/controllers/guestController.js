const { PrismaClient } = require('@prisma/client');
const prisma = require('../utils/database');
const { logActivity } = require('../utils/auditLogger');
const { getUserNetwork } = require('../utils/networkUtils');

// Crear nuevo invitado
const createGuest = async (req, res) => {
    try {
        let { name, phone, address, city, prayerRequest, invitedById, assignedToId, called, callObservation, visited, visitObservation, documentType, documentNumber, birthDate, sex, dataPolicyAccepted, dataTreatmentAuthorized, minorConsentAuthorized, servidorCode } = req.body;
        const { roles, id: currentUserId } = req.user;

        if (!name || !phone) {
            return res.status(400).json({ message: 'Name and phone are required' });
        }

        // Si no se proporciona código de servidor, buscar el código del usuario autenticado
        let registrarCode = null;
        if (!servidorCode) {
            // Buscar el código de servidor asignado al usuario autenticado
            registrarCode = await prisma.registrarCode.findFirst({
                where: {
                    userId: currentUserId,
                    isActive: true,
                    isDeleted: false
                }
            });
            if (!registrarCode) {
                return res.status(400).json({ message: 'No tiene un código de servidor asignado. Solicite uno al coordinador del módulo Ganar.' });
            }
        } else {
            // Validar código de servidor proporcionado
            if (servidorCode.length !== 6) {
                return res.status(400).json({ message: 'El código de servidor debe tener 6 dígitos' });
            }
            // Verificar que el código de servidor existe y está activo
            registrarCode = await prisma.registrarCode.findFirst({
                where: {
                    code: servidorCode,
                    isActive: true,
                    isDeleted: false
                }
            });
            if (!registrarCode) {
                return res.status(400).json({ message: 'Código de servidor inválido o inactivo' });
            }
        }

        // Security: PASTOR only consumes network data, doesn't create guests directly (optional historical rule)
        // Allow ADMIN and ADMIN to bypass this
        const isAdmin = roles.includes('ADMIN');
        if (roles.includes('PASTOR') && !isAdmin) {
            return res.status(403).json({
                message: 'Los usuarios con rol PASTOR no pueden crear invitados directamente. Los invitados deben ser creados por LIDER_DOCE, LIDER_CELULA o DISCIPULO.'
            });
        }

        if (roles.some(r => ['LIDER_CELULA', 'DISCIPULO', 'DISCIPULO'].includes(r))) {
            invitedById = currentUserId;
        } else if (!invitedById) {
            invitedById = currentUserId;
        }

        const guest = await prisma.guest.create({
            data: {
                name,
                phone,
                address,
                city,
                prayerRequest,
                invitedById: parseInt(invitedById),
                assignedToId: assignedToId ? parseInt(assignedToId) : null,
                registeredById: registrarCode.userId, // Servidor que proporcionó el código de registro
                called: called || false,
                callObservation,
                visited: visited || false,
                visitObservation,
                documentType: documentType && documentType.trim() !== "" ? documentType : null,
                documentNumber,
                birthDate: birthDate ? new Date(birthDate) : null,
                sex,
                dataPolicyAccepted: dataPolicyAccepted || false,
                dataTreatmentAuthorized: dataTreatmentAuthorized || false,
                minorConsentAuthorized: minorConsentAuthorized || false,
            },
            include: {
                invitedBy: {
                    include: { profile: true }
                },
                assignedTo: {
                    include: { profile: true }
                },
                registeredBy: {
                    include: { profile: true }
                },
            },
        });

        await logActivity(currentUserId, 'CREATE', 'GUEST', guest.id, {
            name: guest.name,
            servidorCode: servidorCode,
            servidorUserId: registrarCode.userId
        }, req.ip, req.headers['user-agent']);

        res.status(201).json({ guest });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Obtener todos los invitados con filtros opcionales
const getAllGuests = async (req, res) => {
    try {
        const { status, invitedById, assignedToId, search, liderDoceId, sex, minBirthDate } = req.query;
        const { roles, id: currentUserId } = req.user;

        let securityFilter = {};

        // Aplicar visibilidad basada en roles
        // Allow ADMIN, PASTOR, COORDINADOR, and Module Coordinators to see all guests
        const isModuleCoordinator = req.user.isModuleCoordinator || false;
        
        if (roles.includes('ADMIN')) {
            securityFilter = {};
        } else if (roles.includes('PASTOR')) {
            // PASTOR can see all guests (like ADMIN)
            securityFilter = {};
        } else if (roles.includes('COORDINADOR') || isModuleCoordinator) {
            // COORDINADOR and Module Coordinators can see all guests
            securityFilter = {};
        } else if (roles.some(r => ['LIDER_DOCE', 'LIDER_CELULA'].includes(r))) {
            // Regular leaders can only see guests from their network hierarchy
            const networkUserIds = await getUserNetwork(currentUserId);
            securityFilter = {
                OR: [
                    { invitedById: { in: [...networkUserIds, currentUserId] } },
                    { assignedToId: { in: [...networkUserIds, currentUserId] } }
                ]
            };
        } else {
            // DISCIPULO and other roles can only see their own guests
            securityFilter = {
                OR: [
                    {
                        AND: [
                            { invitedById: currentUserId },
                            {
                                OR: [
                                    { assignedToId: null },
                                    { assignedToId: currentUserId }
                                ]
                            }
                        ]
                    },
                    { assignedToId: currentUserId }
                ]
            };
        }

        // Construir filtros de consulta
        const queryFilters = {};
        if (status) queryFilters.status = status;
        if (assignedToId) queryFilters.assignedToId = parseInt(assignedToId);
        if (sex) queryFilters.sex = sex;
        if (minBirthDate) {
            queryFilters.birthDate = {
                gt: new Date(minBirthDate)
            };
        }
        if (search) {
            // Filtros rápidos predefinidos
            if (search === '__this_week__') {
                const now = new Date();
                const startOfWeek = new Date(now);
                startOfWeek.setDate(now.getDate() - now.getDay());
                startOfWeek.setHours(0, 0, 0, 0);
                queryFilters.createdAt = { gte: startOfWeek };
            } else if (search === '__this_month__') {
                const now = new Date();
                const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                queryFilters.createdAt = { gte: startOfMonth };
            } else {
                queryFilters.OR = [
                    { name: { contains: search, mode: 'insensitive' } },
                    { phone: { contains: search } },
                ];
            }
        }

        // Lider Doce & Invited By Logic
        if (liderDoceId) {
            const networkIds = await getUserNetwork(liderDoceId);
            const idsToCheck = [...networkIds, parseInt(liderDoceId)];

            if (invitedById) {
                if (!idsToCheck.includes(parseInt(invitedById))) {
                    queryFilters.invitedById = -1;
                } else {
                    queryFilters.invitedById = parseInt(invitedById);
                }
            } else {
                queryFilters.invitedById = { in: idsToCheck };
            }
        } else if (invitedById) {
            queryFilters.invitedById = parseInt(invitedById);
        }

        // Combinar filtros de seguridad y consulta
        const finalWhere = Object.keys(securityFilter).length > 0
            ? { AND: [securityFilter, queryFilters] }
            : queryFilters;

        // Paginación
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        // Obtener total para paginación
        const total = await prisma.guest.count({ where: finalWhere });

        const guests = await prisma.guest.findMany({
            where: finalWhere,
            include: {
                invitedBy: {
                    include: { profile: true }
                },
                assignedTo: {
                    include: { profile: true }
                },
                registeredBy: {
                    include: { profile: true }
                },
                cell: {
                    include: {
                        leader: {
                            include: { profile: true }
                        }
                    }
                },
                calls: {
                    include: {
                        caller: { include: { profile: true } }
                    },
                    orderBy: { date: 'desc' }
                },
                visits: {
                    include: {
                        visitor: { include: { profile: true } }
                    },
                    orderBy: { date: 'desc' }
                },
                encuentroRegistrations: {
                    include: {
                        encuentro: true
                    },
                    orderBy: { createdAt: 'desc' },
                    take: 1
                }
            },
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit
        });

        // Format for frontend
        const formattedGuests = guests.map(g => ({
            ...g,
            invitedBy: g.invitedBy ? { id: g.invitedBy.id, fullName: g.invitedBy.profile?.fullName, email: g.invitedBy.email } : null,
            assignedTo: g.assignedTo ? { id: g.assignedTo.id, fullName: g.assignedTo.profile?.fullName, email: g.assignedTo.email } : null,
            registeredBy: g.registeredBy ? { id: g.registeredBy.id, fullName: g.registeredBy.profile?.fullName, email: g.registeredBy.email } : null,
            cell: g.cell ? {
                id: g.cell.id,
                name: g.cell.name,
                leader: g.cell.leader ? {
                    id: g.cell.leader.id,
                    fullName: g.cell.leader.profile?.fullName
                } : null
            } : null,
            calls: g.calls.map(c => ({ ...c, caller: c.caller ? { fullName: c.caller.profile?.fullName } : null })),
            visits: g.visits.map(v => ({ ...v, visitor: v.visitor ? { fullName: v.visitor.profile?.fullName } : null })),
            encuentroRegistrations: g.encuentroRegistrations?.map(er => ({
                id: er.id,
                status: er.status,
                encuentro: er.encuentro ? {
                    id: er.encuentro.id,
                    name: er.encuentro.name,
                    type: er.encuentro.type,
                    startDate: er.encuentro.startDate
                } : null
            })) || []
        }));

        res.status(200).json({
            guests: formattedGuests,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
                hasMore: skip + guests.length < total
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Obtener invitado específico por ID
const getGuestById = async (req, res) => {
    try {
        const { id } = req.params;

        const guest = await prisma.guest.findUnique({
            where: { id: parseInt(id) },
            include: {
                invitedBy: {
                    include: { profile: true }
                },
                assignedTo: {
                    include: { profile: true }
                },
                calls: {
                    include: {
                        caller: { include: { profile: true } }
                    },
                    orderBy: { date: 'desc' }
                },
                visits: {
                    include: {
                        visitor: { include: { profile: true } }
                    },
                    orderBy: { date: 'desc' }
                }
            },
        });

        if (!guest) {
            return res.status(404).json({ message: 'Guest not found' });
        }

        const formattedGuest = {
            ...guest,
            invitedBy: guest.invitedBy ? { id: guest.invitedBy.id, fullName: guest.invitedBy.profile?.fullName, email: guest.invitedBy.email } : null,
            assignedTo: guest.assignedTo ? { id: guest.assignedTo.id, fullName: guest.assignedTo.profile?.fullName, email: guest.assignedTo.email } : null,
            calls: guest.calls.map(c => ({ ...c, caller: c.caller ? { fullName: c.caller.profile?.fullName } : null })),
            visits: guest.visits.map(v => ({ ...v, visitor: v.visitor ? { fullName: v.visitor.profile?.fullName } : null }))
        };

        res.status(200).json({ guest: formattedGuest });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Actualizar invitado
const updateGuest = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, phone, address, city, prayerRequest, status, invitedById, assignedToId, called, callObservation, visited, visitObservation, documentType, documentNumber, birthDate, sex, dataPolicyAccepted, dataTreatmentAuthorized, minorConsentAuthorized } = req.body;
        const { roles, id: currentUserId } = req.user;

        const existingGuest = await prisma.guest.findUnique({
            where: { id: parseInt(id) }
        });

        if (!existingGuest) {
            return res.status(404).json({ message: 'Guest not found' });
        }

        let updateData = {};
        const isAdminValue = roles.includes('ADMIN');
        const isPastor = roles.includes('PASTOR');
        const isCoordinator = roles.includes('COORDINADOR');
        const isModuleCoordinatorValue = req.user.isModuleCoordinator || false;
        const isNetworkLeader = roles.some(r => ['LIDER_DOCE', 'LIDER_CELULA'].includes(r));

        if (isAdminValue || isPastor || isCoordinator || isModuleCoordinatorValue || (isModuleCoordinatorValue && isNetworkLeader)) {
            // Admin, Pastor, and Coordinators can edit any guest
            // No additional checks needed for these roles
            updateData = {
                ...(name && { name }),
                ...(phone && { phone }),
                ...(address !== undefined && { address }),
                ...(prayerRequest !== undefined && { prayerRequest }),
                ...(status && { status }),
                ...(invitedById && { invitedById: parseInt(invitedById) }),
                ...(assignedToId !== undefined && { assignedToId: assignedToId ? parseInt(assignedToId) : null }),
                ...(called !== undefined && { called: Boolean(called) }),
                ...(callObservation !== undefined && { callObservation }),
                ...(visited !== undefined && { visited: Boolean(visited) }),
                ...(visitObservation !== undefined && { visitObservation }),
                ...(documentType !== undefined && { documentType: documentType && documentType.trim() !== "" ? documentType : null }),
                ...(documentNumber !== undefined && { documentNumber }),
                ...(birthDate !== undefined && { birthDate: birthDate ? new Date(birthDate) : null }),
                ...(sex !== undefined && { sex }),
                ...(city !== undefined && { city }),
                ...(dataPolicyAccepted !== undefined && { dataPolicyAccepted: Boolean(dataPolicyAccepted) }),
                ...(dataTreatmentAuthorized !== undefined && { dataTreatmentAuthorized: Boolean(dataTreatmentAuthorized) }),
                ...(minorConsentAuthorized !== undefined && { minorConsentAuthorized: Boolean(minorConsentAuthorized) }),
            };
        } else if (isNetworkLeader) {
            // Regular leaders can only edit guests in their network
            const networkUserIds = await getUserNetwork(currentUserId);
            const isInNetwork = networkUserIds.includes(existingGuest.invitedById) ||
                (existingGuest.assignedToId && networkUserIds.includes(existingGuest.assignedToId)) ||
                existingGuest.invitedById === currentUserId ||
                existingGuest.assignedToId === currentUserId;

            if (!isInNetwork) {
                return res.status(403).json({ message: 'You can only update guests in your network' });
            }

            updateData = {
                ...(name && { name }),
                ...(phone && { phone }),
                ...(address !== undefined && { address }),
                ...(prayerRequest !== undefined && { prayerRequest }),
                ...(status && { status }),
                ...(invitedById && { invitedById: parseInt(invitedById) }),
                ...(assignedToId !== undefined && { assignedToId: assignedToId ? parseInt(assignedToId) : null }),
                ...(called !== undefined && { called: Boolean(called) }),
                ...(callObservation !== undefined && { callObservation }),
                ...(visited !== undefined && { visited: Boolean(visited) }),
                ...(visitObservation !== undefined && { visitObservation }),
                ...(documentType !== undefined && { documentType: documentType && documentType.trim() !== "" ? documentType : null }),
                ...(documentNumber !== undefined && { documentNumber }),
                ...(birthDate !== undefined && { birthDate: birthDate ? new Date(birthDate) : null }),
                ...(sex !== undefined && { sex }),
                ...(city !== undefined && { city }),
                ...(dataPolicyAccepted !== undefined && { dataPolicyAccepted: Boolean(dataPolicyAccepted) }),
                ...(dataTreatmentAuthorized !== undefined && { dataTreatmentAuthorized: Boolean(dataTreatmentAuthorized) }),
                ...(minorConsentAuthorized !== undefined && { minorConsentAuthorized: Boolean(minorConsentAuthorized) }),
            };
        } else {
            // DISCIPULO and other roles can only edit limited fields of guests they invited or are assigned to
            const canEdit = existingGuest.invitedById === currentUserId || existingGuest.assignedToId === currentUserId;

            if (!canEdit) {
                return res.status(403).json({ message: 'You can only update guests you invited or assigned to you' });
            }

            updateData = {
                ...(status && { status }),
                ...(called !== undefined && { called: Boolean(called) }),
                ...(callObservation !== undefined && { callObservation }),
                ...(visited !== undefined && { visited: Boolean(visited) }),
                ...(visitObservation !== undefined && { visitObservation }),
            };
        }

        const guest = await prisma.guest.update({
            where: { id: parseInt(id) },
            data: updateData,
            include: {
                invitedBy: { include: { profile: true } },
                assignedTo: { include: { profile: true } },
            },
        });

        await logActivity(currentUserId, 'UPDATE', 'GUEST', guest.id, { name: guest.name }, req.ip, req.headers['user-agent']);

        const formattedGuest = {
            ...guest,
            invitedBy: guest.invitedBy ? { id: guest.invitedBy.id, fullName: guest.invitedBy.profile?.fullName, email: guest.invitedBy.email } : null,
            assignedTo: guest.assignedTo ? { id: guest.assignedTo.id, fullName: guest.assignedTo.profile?.fullName, email: guest.assignedTo.email } : null
        };

        res.status(200).json({ guest: formattedGuest });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Eliminar invitado
const deleteGuest = async (req, res) => {
    try {
        const { id } = req.params;
        const { roles, id: currentUserId } = req.user;

        const existingGuest = await prisma.guest.findUnique({
            where: { id: parseInt(id) }
        });

        if (!existingGuest) {
            return res.status(404).json({ message: 'Guest not found' });
        }

        const isAdminValue = roles.includes('ADMIN');
        const isPastor = roles.includes('PASTOR');
        const isCoordinator = roles.includes('COORDINADOR');
        const isModuleCoordinatorValue = req.user.isModuleCoordinator || false;
        const isNetworkLeader = roles.some(r => ['LIDER_DOCE', 'LIDER_CELULA'].includes(r));

        if (isAdminValue || isPastor || isCoordinator || isModuleCoordinatorValue || (isModuleCoordinatorValue && isNetworkLeader)) {
            // Admin, Pastor, and Coordinators can delete any guest
            // No additional checks needed for these roles
        } else if (isNetworkLeader) {
            // Regular leaders can only delete guests in their network
            const networkUserIds = await getUserNetwork(currentUserId);
            const canDelete = networkUserIds.includes(existingGuest.invitedById) ||
                (existingGuest.assignedToId && networkUserIds.includes(existingGuest.assignedToId)) ||
                existingGuest.invitedById === currentUserId ||
                existingGuest.assignedToId === currentUserId;

            if (!canDelete) {
                return res.status(403).json({ message: 'You can only delete guests in your network or that you invited' });
            }
        } else {
            // DISCIPULO and other roles cannot delete guests
            return res.status(403).json({ message: 'DISCIPULO role does not have permission to delete guests' });
        }

        await prisma.guest.delete({
            where: { id: parseInt(id) },
        });

        await logActivity(currentUserId, 'DELETE', 'GUEST', parseInt(id), { name: existingGuest.name }, req.ip, req.headers['user-agent']);

        res.status(200).json({ message: 'Guest deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Asignar invitado a un líder
const assignGuest = async (req, res) => {
    try {
        const { id } = req.params;
        const { assignedToId } = req.body;
        const { id: currentUserId } = req.user;

        if (!assignedToId) {
            return res.status(400).json({ message: 'assignedToId is required' });
        }

        const guest = await prisma.guest.update({
            where: { id: parseInt(id) },
            data: {
                assignedToId: parseInt(assignedToId),
            },
            include: {
                invitedBy: { include: { profile: true } },
                assignedTo: { include: { profile: true } },
            },
        });

        await logActivity(currentUserId, 'UPDATE', 'GUEST', guest.id, { action: 'ASSIGN', assignedToId }, req.ip, req.headers['user-agent']);

        const formattedGuest = {
            ...guest,
            invitedBy: guest.invitedBy ? { id: guest.invitedBy.id, fullName: guest.invitedBy.profile?.fullName, email: guest.invitedBy.email } : null,
            assignedTo: guest.assignedTo ? { id: guest.assignedTo.id, fullName: guest.assignedTo.profile?.fullName, email: guest.assignedTo.email } : null
        };

        res.status(200).json({ guest: formattedGuest });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Convertir invitado a Discípulo (crear cuenta de usuario)
const convertGuestToMember = async (req, res) => {
    try {
        const { id } = req.params;
        const { email, password, phone } = req.body;
        const { id: currentUserId } = req.user;

        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }

        const guest = await prisma.guest.findUnique({
            where: { id: parseInt(id) }
        });

        if (!guest) {
            return res.status(404).json({ message: 'Guest not found' });
        }

        const existingUser = await prisma.user.findUnique({
            where: { email }
        });

        if (existingUser) {
            return res.status(400).json({ message: 'Email already in use' });
        }

        const bcrypt = require('bcryptjs');
        const hashedPassword = await bcrypt.hash(password, 10);

        // Atomic transaction to create user and clean up guest
        const newUser = await prisma.$transaction(async (tx) => {
            // 1. Create User and Profile
            const user = await tx.user.create({
                data: {
                    email,
                    password: hashedPassword,
                    phone: phone || guest.phone,
                    profile: {
                        create: {
                            fullName: guest.name,
                            address: guest.address,
                            city: guest.city,
                            sex: guest.sex,
                            documentType: guest.documentType,
                            documentNumber: guest.documentNumber,
                            birthDate: guest.birthDate,
                            dataPolicyAccepted: guest.dataPolicyAccepted,
                            dataTreatmentAuthorized: guest.dataTreatmentAuthorized,
                            minorConsentAuthorized: guest.minorConsentAuthorized,
                        }
                    }
                },
                include: { profile: true }
            });

            // 2. Assign default DISCIPULO role
            const discipleRole = await tx.role.upsert({
                where: { name: 'DISCIPULO' },
                update: {},
                create: { name: 'DISCIPULO' }
            });

            await tx.userRole.create({
                data: {
                    userId: user.id,
                    roleId: discipleRole.id
                }
            });

            // 3. Establish Discipleship Hierarchy (InvitedBy becomes Parent)
            await tx.userHierarchy.create({
                data: {
                    parentId: guest.invitedById,
                    childId: user.id,
                    role: 'DISCIPULO'
                }
            });

            // 4. Delete the guest record
            await tx.guest.delete({
                where: { id: parseInt(id) }
            });

            return user;
        });

        await logActivity(currentUserId, 'CONSOLIDATE', 'GUEST', parseInt(id), { newUserId: newUser.id }, req.ip, req.headers['user-agent']);

        res.status(201).json({
            message: 'Guest consolidated to member successfully',
            user: {
                id: newUser.id,
                email: newUser.email,
                fullName: newUser.profile.fullName,
                roles: ['DISCIPULO']
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Agregar llamada a invitado
const addCall = async (req, res) => {
    try {
        const { id } = req.params;
        const { date, observation } = req.body;
        const { id: userId } = req.user;

        if (!observation) {
            return res.status(400).json({ message: 'Observation is required' });
        }

        const call = await prisma.guestCall.create({
            data: {
                guestId: parseInt(id),
                date: date ? new Date(date) : new Date(),
                observation,
                callerId: userId
            }
        });

        await prisma.guest.update({
            where: { id: parseInt(id) },
            data: { status: 'CONTACTADO', called: true }
        });

        await logActivity(userId, 'CREATE', 'GUEST_CALL', call.id, { guestId: parseInt(id) }, req.ip, req.headers['user-agent']);

        res.status(201).json({ call });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Agregar visita a invitado
const addVisit = async (req, res) => {
    try {
        const { id } = req.params;
        const { date, observation } = req.body;
        const { id: userId } = req.user;

        if (!observation) {
            return res.status(400).json({ message: 'Observation is required' });
        }

        const visit = await prisma.guestVisit.create({
            data: {
                guestId: parseInt(id),
                date: date ? new Date(date) : new Date(),
                observation,
                visitorId: userId
            }
        });

        await prisma.guest.update({
            where: { id: parseInt(id) },
            data: { status: 'CONSOLIDADO', visited: true }
        });

        await logActivity(userId, 'CREATE', 'GUEST_VISIT', visit.id, { guestId: parseInt(id) }, req.ip, req.headers['user-agent']);

        res.status(201).json({ visit });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Eliminar llamada de invitado
const deleteCall = async (req, res) => {
    try {
        const { id, callId } = req.params;
        const { roles, id: currentUserId } = req.user;

        const guest = await prisma.guest.findUnique({
            where: { id: parseInt(id) }
        });

        if (!guest) {
            return res.status(404).json({ message: 'Guest not found' });
        }

        const call = await prisma.guestCall.findUnique({
            where: { id: parseInt(callId) }
        });

        if (!call) {
            return res.status(404).json({ message: 'Call not found' });
        }

        // Check permissions: ADMIN or module coordinator can delete
        const isAdmin = roles.includes('ADMIN');
        const isCoordinator = roles.some(r => ['PASTOR', 'LIDER_DOCE', 'LIDER_CELULA'].includes(r));

        if (!isAdmin && !isCoordinator) {
            return res.status(403).json({ message: 'Only Admin or coordinators can delete calls' });
        }

        // If coordinator, check if the guest is in their network
        if (!isAdmin && isCoordinator) {
            const networkUserIds = await getUserNetwork(currentUserId);
            const isInNetwork = networkUserIds.includes(guest.invitedById) ||
                (guest.assignedToId && networkUserIds.includes(guest.assignedToId)) ||
                guest.invitedById === currentUserId ||
                guest.assignedToId === currentUserId;

            if (!isInNetwork) {
                return res.status(403).json({ message: 'You can only delete calls from guests in your network' });
            }
        }

        await prisma.guestCall.delete({
            where: { id: parseInt(callId) }
        });

        // Update guest status if there are no more calls
        const remainingCalls = await prisma.guestCall.count({
            where: { guestId: parseInt(id) }
        });

        if (remainingCalls === 0) {
            await prisma.guest.update({
                where: { id: parseInt(id) },
                data: { called: false, status: 'NUEVO' }
            });
        }

        await logActivity(currentUserId, 'DELETE', 'GUEST_CALL', parseInt(callId), { guestId: parseInt(id) }, req.ip, req.headers['user-agent']);

        res.status(200).json({ message: 'Call deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Eliminar visita de invitado
const deleteVisit = async (req, res) => {
    try {
        const { id, visitId } = req.params;
        const { roles, id: currentUserId } = req.user;

        const guest = await prisma.guest.findUnique({
            where: { id: parseInt(id) }
        });

        if (!guest) {
            return res.status(404).json({ message: 'Guest not found' });
        }

        const visit = await prisma.guestVisit.findUnique({
            where: { id: parseInt(visitId) }
        });

        if (!visit) {
            return res.status(404).json({ message: 'Visit not found' });
        }

        // Check permissions: ADMIN or module coordinator can delete
        const isAdmin = roles.includes('ADMIN');
        const isCoordinator = roles.some(r => ['PASTOR', 'LIDER_DOCE', 'LIDER_CELULA'].includes(r));

        if (!isAdmin && !isCoordinator) {
            return res.status(403).json({ message: 'Only Admin or coordinators can delete visits' });
        }

        // If coordinator, check if the guest is in their network
        if (!isAdmin && isCoordinator) {
            const networkUserIds = await getUserNetwork(currentUserId);
            const isInNetwork = networkUserIds.includes(guest.invitedById) ||
                (guest.assignedToId && networkUserIds.includes(guest.assignedToId)) ||
                guest.invitedById === currentUserId ||
                guest.assignedToId === currentUserId;

            if (!isInNetwork) {
                return res.status(403).json({ message: 'You can only delete visits from guests in your network' });
            }
        }

        await prisma.guestVisit.delete({
            where: { id: parseInt(visitId) }
        });

        // Update guest status if there are no more visits
        const remainingVisits = await prisma.guestVisit.count({
            where: { guestId: parseInt(id) }
        });

        if (remainingVisits === 0) {
            await prisma.guest.update({
                where: { id: parseInt(id) },
                data: { visited: false, status: guest.called ? 'CONTACTADO' : 'NUEVO' }
            });
        }

        await logActivity(currentUserId, 'DELETE', 'GUEST_VISIT', parseInt(visitId), { guestId: parseInt(id) }, req.ip, req.headers['user-agent']);

        res.status(200).json({ message: 'Visit deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Crear invitado público (desde página de login)
const createPublicGuest = async (req, res) => {
    try {
        const { name, phone, address, city, prayerRequest, invitedById, sex, documentType, documentNumber, birthDate, dataPolicyAccepted, dataTreatmentAuthorized, minorConsentAuthorized, assignedToId, servidorCode } = req.body;

        if (!name || !phone || !invitedById) {
            return res.status(400).json({ message: 'Name, phone and inviter are required' });
        }

        // Validar código de servidor obligatorio
        if (!servidorCode || servidorCode.length !== 6) {
            return res.status(400).json({ message: 'El código de servidor es obligatorio y debe tener 6 dígitos' });
        }

        // Verificar que el código de servidor existe y está activo
        const registrarCode = await prisma.registrarCode.findFirst({
            where: {
                code: servidorCode,
                isActive: true,
                isDeleted: false
            }
        });

        if (!registrarCode) {
            return res.status(400).json({ message: 'Código de servidor inválido o inactivo' });
        }

        const guest = await prisma.guest.create({
            data: {
                name,
                phone,
                address: address || null,
                city: city || null,
                prayerRequest: prayerRequest || null,
                invitedById: parseInt(invitedById),
                status: 'NUEVO',
                sex: sex || null,
                documentType: documentType && documentType.trim() !== "" && documentType !== "NO_SPECIFIED" ? documentType : null,
                documentNumber: documentNumber || null,
                birthDate: birthDate ? new Date(birthDate) : null,
                dataPolicyAccepted: dataPolicyAccepted || false,
                dataTreatmentAuthorized: dataTreatmentAuthorized || false,
                minorConsentAuthorized: minorConsentAuthorized || false,
                assignedToId: assignedToId ? parseInt(assignedToId) : null,
                registeredById: registrarCode.userId, // Servidor que proporcionó el código de registro
            }
        });

        // Use a generic system user ID or the inviter ID for the audit log
        // Since it's public, we log that it was a public creation
        await logActivity(null, 'CREATE', 'GUEST', guest.id, {
            name: guest.name,
            type: 'PUBLIC_REGISTRATION',
            servidorCode: servidorCode,
            servidorUserId: registrarCode.userId
        }, req.ip, req.headers['user-agent']);

        res.status(201).json({ guest });
    } catch (error) {
        console.error('Error in createPublicGuest:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
    createGuest,
    getAllGuests,
    getGuestById,
    updateGuest,
    deleteGuest,
    assignGuest,
    convertGuestToMember,
    addCall,
    addVisit,
    deleteCall,
    deleteVisit,
    createPublicGuest,
};
