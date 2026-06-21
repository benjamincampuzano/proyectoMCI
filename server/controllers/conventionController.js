const prisma = require('../utils/database');
const { logActivity } = require('../utils/auditLogger');
const { getUserNetwork } = require('../utils/networkUtils');

const ACTIVE_REGISTRATION_STATUSES = ['REGISTERED', 'ATTENDED'];
const PENDING_REGISTRATION_STATUS = 'PENDING';

// Helper to get base cost based on ticket type
const getBaseCostForRegistration = (convention, registration) => {
  if (registration.ticketType === 'VIP_PLATEA' && convention.vipPlateaCost > 0) {
    return convention.vipPlateaCost;
  }
  if (registration.ticketType === 'GENERAL' && convention.generalCost > 0) {
    return convention.generalCost;
  }
  return convention.cost;
};

const isActiveRegistration = (status) => ACTIVE_REGISTRATION_STATUSES.includes(status);

const getRegistrationDisplayName = (registration) => {
    return registration.fullName
        || registration.user?.profile?.fullName
        || registration.user?.email
        || 'Registro sin nombre';
};

const getRegistrationPhone = (registration) => {
    return registration.phone || registration.user?.phone || '';
};

const serializeConventionRegistration = (convention, registration) => {
    const paymentsByType = {
        CONVENTION: 0,
        TRANSPORT: 0,
        ACCOMMODATION: 0
    };

    (registration.payments || []).forEach((payment) => {
        if (paymentsByType[payment.paymentType] !== undefined) {
            paymentsByType[payment.paymentType] += payment.amount;
        }
    });

    const totalPaid = Object.values(paymentsByType).reduce((sum, amount) => sum + amount, 0);
    const ticketBaseCost = getBaseCostForRegistration(convention, registration);
    const baseCost = ticketBaseCost * (1 - ((registration.discountPercentage || 0) / 100));
    const transportCost = registration.needsTransport ? convention.transportCost : 0;
    const accommodationCost = registration.needsAccommodation ? convention.accommodationCost : 0;
    const finalCost = baseCost + transportCost + accommodationCost;
    const balance = finalCost - totalPaid;

    return {
        ...registration,
        fullName: getRegistrationDisplayName(registration),
        phone: getRegistrationPhone(registration),
        user: registration.user
            ? {
                id: registration.user.id,
                fullName: registration.user.profile?.fullName,
                email: registration.user.email,
                phone: registration.user.phone
            }
            : null,
        ticketBaseCost,
        baseCost,
        transportCost,
        accommodationCost,
        totalPaid,
        finalCost,
        balance,
        paymentsByType
    };
};

// Helper to check if user has modification access to a convention
const checkConventionAccess = async (user, conventionId) => {
    if (user.roles.includes('ADMIN')) return true;

    const convention = await prisma.convention.findUnique({
        where: { id: parseInt(conventionId) },
        select: { coordinatorId: true }
    });

    if (!convention) return false;
    return convention.coordinatorId === parseInt(user.id);
};

const getConventions = async (req, res) => {
    try {
        const { year } = req.query;
        // Safeguard req.user access
        const roles = req.user?.roles || [];
        const currentUserId = req.user?.id;

        const where = {};
        if (year) {
            const parsedYear = parseInt(year);
            if (!isNaN(parsedYear)) {
                where.year = parsedYear;
            }
        }

        const conventions = await prisma.convention.findMany({
            where,
            select: {
                id: true,
                type: true,
                year: true,
                theme: true,
                cost: true,
                vipPlateaCost: true,
                generalCost: true,
                transportCost: true,
                accommodationCost: true,
                startDate: true,
                endDate: true,
                coordinatorId: true,
                coordinator: {
                    include: { profile: true }
                },
                registrations: {
                    select: {
                        id: true,
                        status: true,
                        fullName: true,
                        phone: true,
                        userId: true,
                        discountPercentage: true,
                        ticketType: true,
                        needsTransport: true,
                        needsAccommodation: true,
                        user: {
                            include: { profile: true }
                        },
                        payments: {
                            select: { amount: true }
                        }
                    }
                }
            },
            orderBy: {
                startDate: 'asc'
            }
        });

        // Filter for specific roles: Only show conventions they are registered for if they are not leaders/admin
        const isLeaderOrAdmin = roles.some(r => ['ADMIN', 'PASTOR', 'LIDER_DOCE', 'LIDER_CELULA'].includes(r));

        let filteredConventions = conventions;
        if (!isLeaderOrAdmin) {
            if (!currentUserId) {
                // If we don't have a valid user ID, we can't show user specific registrations.
                filteredConventions = [];
            } else {
                const userRegistrations = await prisma.conventionRegistration.findMany({
                    where: { userId: parseInt(currentUserId) },
                    select: { conventionId: true }
                });
                const registeredConventionIds = new Set(userRegistrations.map(r => r.conventionId));
                filteredConventions = conventions.filter(c => registeredConventionIds.has(c.id));
            }
        }

        // Calculate stats
        const conventionsWithStats = filteredConventions.map(conv => {
            const totalCollected = conv.registrations?.reduce((acc, reg) => {
                const paymentsSum = reg.payments?.reduce((sum, p) => sum + p.amount, 0) || 0;
                return acc + paymentsSum;
            }, 0) || 0;

            const expectedIncome = conv.registrations?.reduce((acc, reg) => {
                const baseCost = getBaseCostForRegistration(conv, reg);
                const cost = baseCost * (1 - ((reg.discountPercentage || 0) / 100));
                return acc + cost;
            }, 0) || 0;

            return {
                ...conv,
                coordinator: conv.coordinator ? { id: conv.coordinator.id, fullName: conv.coordinator.profile?.fullName } : null,
                pendingRegistrations: conv.registrations?.filter(r => r.status === PENDING_REGISTRATION_STATUS) || [],
                stats: {
                    registeredCount: conv.registrations?.filter(r => ACTIVE_REGISTRATION_STATUSES.includes(r.status)).length || 0,
                    pendingCount: conv.registrations?.filter(r => r.status === PENDING_REGISTRATION_STATUS).length || 0,
                    totalCollected,
                    expectedIncome
                }
            };
        });

        res.json(conventionsWithStats);
    } catch (error) {
        console.error('Error fetching conventions:', error);
        res.status(500).json({ error: 'Error getting conventions: ' + error.message });
    }
};

// Helper to get network
// Local getNetworkIds removed in favor of centralized getUserNetwork (networkUtils)

const getConventionById = async (req, res) => {
    const { id } = req.params;
    const roles = req.user?.roles || [];
    const currentUserId = req.user?.id;

    try {
        const convention = await prisma.convention.findUnique({
            where: { id: parseInt(id) },
            select: {
                id: true,
                type: true,
                year: true,
                theme: true,
                cost: true,
                vipPlateaCost: true,
                generalCost: true,
                transportCost: true,
                accommodationCost: true,
                startDate: true,
                endDate: true,
                coordinatorId: true,
                coordinator: {
                    include: { profile: true }
                },
                registrations: {
                    select: {
                        id: true,
                        userId: true,
                        fullName: true,
                        phone: true,
                        status: true,
                        discountPercentage: true,
                        ticketType: true,
                        needsTransport: true,
                        needsAccommodation: true,
                        registeredById: true,
                        user: {
                            include: { profile: true }
                        },
                        registeredBy: {
                            include: { profile: true }
                        },
                        payments: {
                            select: {
                                id: true,
                                amount: true,
                                paymentType: true,
                                date: true,
                                notes: true
                            },
                            orderBy: { date: 'desc' }
                        }
                    }
                }
            }
        });

        if (!convention) {
            return res.status(404).json({ error: 'Convention not found' });
        }

        const allRegistrations = convention.registrations || [];
        const activeRegistrations = allRegistrations.filter((reg) => isActiveRegistration(reg.status));
        const pendingRegistrations = allRegistrations.filter((reg) => reg.status === PENDING_REGISTRATION_STATUS);

        const isAdmin = roles.includes('ADMIN');
        const isCoordinator = convention.coordinatorId === parseInt(currentUserId);

        let visibleActiveRegistrations = activeRegistrations;

        if (!(isAdmin || isCoordinator)) {
            if (roles.some(r => ['LIDER_DOCE', 'LIDER_CELULA', 'PASTOR'].includes(r))) {
                if (currentUserId) {
                    const networkIds = await getUserNetwork(currentUserId);
                    const allowedIds = new Set([...networkIds, parseInt(currentUserId)]);
                    visibleActiveRegistrations = activeRegistrations.filter((reg) => reg.userId && allowedIds.has(reg.userId));
                } else {
                    visibleActiveRegistrations = [];
                }
            } else if (currentUserId) {
                visibleActiveRegistrations = activeRegistrations.filter((reg) => reg.userId === parseInt(currentUserId));
            } else {
                visibleActiveRegistrations = [];
            }
        }

        const registrationsWithBalance = visibleActiveRegistrations.map((reg) =>
            serializeConventionRegistration(convention, reg)
        );

        const visiblePendingRegistrations = (isAdmin || isCoordinator)
            ? pendingRegistrations.map((reg) => serializeConventionRegistration(convention, reg))
            : [];

        res.json({
            ...convention,
            coordinator: convention.coordinator ? { id: convention.coordinator.id, fullName: convention.coordinator.profile?.fullName } : null,
            registrations: registrationsWithBalance,
            pendingRegistrations: visiblePendingRegistrations
        });
    } catch (error) {
        console.error('Error fetching convention details:', error);
        res.status(500).json({ error: 'Error getting convention details: ' + error.message });
    }
};

const createConvention = async (req, res) => {
    try {
        const roles = req.user?.roles || [];
        const userId = req.user?.id;

        if (!roles.some(r => ['ADMIN', 'PASTOR', 'LIDER_DOCE'].includes(r))) {
            return res.status(403).json({ error: 'Not authorized' });
        }
        const { type, year, theme, cost, vipPlateaCost, generalCost, transportCost, accommodationCost, startDate, endDate, liderDoceIds, coordinatorId } = req.body;

        const existing = await prisma.convention.findUnique({
            where: {
                type_year: {
                    type,
                    year: parseInt(year)
                }
            },
            select: { id: true }
        });

        if (existing) {
            return res.status(400).json({ error: `Convention ${type} ${year} already exists` });
        }

        const convention = await prisma.convention.create({
            data: {
                type,
                year: parseInt(year),
                theme,
                cost: parseFloat(cost),
                vipPlateaCost: parseFloat(vipPlateaCost || 0),
                generalCost: parseFloat(generalCost || 0),
                transportCost: parseFloat(transportCost || 0),
                accommodationCost: parseFloat(accommodationCost || 0),
                startDate: new Date(startDate),
                endDate: new Date(endDate),
                coordinatorId: coordinatorId ? parseInt(coordinatorId) : null,
                leaders: {
                    create: (liderDoceIds || []).map(id => ({ userId: parseInt(id) }))
                }
            }
        });

        if (userId) {
            await logActivity(userId, 'CREATE', 'CONVENTION', convention.id, { type, year }, req.ip, req.headers['user-agent']);
        }

        res.status(201).json(convention);
    } catch (error) {
        console.error('Error creating convention:', error);
        res.status(500).json({ error: 'Error creating convention' });
    }
};

const updateConvention = async (req, res) => {
    try {
        const { id } = req.params;
        const roles = req.user?.roles || [];
        const userId = req.user?.id;

        // Restriction: Only ADMIN or Coordinator
        const hasAccess = await checkConventionAccess(req.user, id);
        if (!hasAccess) {
            return res.status(403).json({ error: 'No tienes permisos para modificar esta convención. Solo el coordinador asignado o un administrador pueden hacerlo.' });
        }

        const { type, year, theme, cost, vipPlateaCost, generalCost, transportCost, accommodationCost, startDate, endDate, liderDoceIds, coordinatorId } = req.body;

        const updateData = {};
        if (type !== undefined) updateData.type = type;
        if (year !== undefined) updateData.year = parseInt(year);
        if (theme !== undefined) updateData.theme = theme;
        if (cost !== undefined) updateData.cost = parseFloat(cost);
        if (vipPlateaCost !== undefined) updateData.vipPlateaCost = parseFloat(vipPlateaCost);
        if (generalCost !== undefined) updateData.generalCost = parseFloat(generalCost);
        if (transportCost !== undefined) updateData.transportCost = parseFloat(transportCost);
        if (accommodationCost !== undefined) updateData.accommodationCost = parseFloat(accommodationCost);
        if (startDate !== undefined) updateData.startDate = new Date(startDate);
        if (endDate !== undefined) updateData.endDate = new Date(endDate);
        if (coordinatorId !== undefined) updateData.coordinatorId = coordinatorId ? parseInt(coordinatorId) : null;
        if (liderDoceIds !== undefined) {
            updateData.leaders = {
                deleteMany: {},
                create: (liderDoceIds || []).map(id => ({ userId: parseInt(id) }))
            };
        }

        const convention = await prisma.convention.update({
            where: { id: parseInt(id) },
            data: updateData,
            select: { id: true, type: true, year: true }
        });

        if (userId) {
            await logActivity(userId, 'UPDATE', 'CONVENTION', convention.id, { type: convention.type, year: convention.year }, req.ip, req.headers['user-agent']);
        }

        res.json(convention);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error updating convention' });
    }
};

const registerUser = async (req, res) => {
    try {
        const { conventionId } = req.params;
        const { userId, discountPercentage, ticketType, needsTransport, needsAccommodation } = req.body;
        const roles = req.user?.roles || [];
        const currentUserId = req.user?.id;

        // Restriction: Only ADMIN or Coordinator
        const hasAccess = await checkConventionAccess(req.user, conventionId);
        if (!hasAccess) {
            return res.status(403).json({ error: 'No tienes permisos para registrar participantes en esta convención.' });
        }

        const existing = await prisma.conventionRegistration.findUnique({
            where: {
                userId_conventionId: {
                    userId: parseInt(userId),
                    conventionId: parseInt(conventionId)
                }
            },
            select: { id: true }
        });

        if (existing) {
            return res.status(400).json({ error: 'El usuario ya está registrado en esta convención.' });
        }

        const convention = await prisma.convention.findUnique({
            where: { id: parseInt(conventionId) },
            select: { type: true, year: true }
        });

        if (!convention) {
            return res.status(404).json({ error: 'Convención no encontrada.' });
        }

        const userProfile = await prisma.userProfile.findUnique({
            where: { userId: parseInt(userId) },
            select: { sex: true, fullName: true }
        });

        if (convention.type === 'HOMBRES' && userProfile?.sex !== 'HOMBRE') {
            return res.status(400).json({ error: 'Esta convención es exclusiva para hombres.' });
        }
        if (convention.type === 'MUJERES' && userProfile?.sex !== 'MUJER') {
            return res.status(400).json({ error: 'Esta convención es exclusiva para mujeres.' });
        }
        // --- END RESTRICTIONS ---

        const registration = await prisma.conventionRegistration.create({
            data: {
                userId: parseInt(userId),
                conventionId: parseInt(conventionId),
                fullName: userProfile?.fullName || null,
                phone: null,
                status: 'REGISTERED',
                discountPercentage: parseFloat(discountPercentage || 0),
                ticketType: ticketType || 'GENERAL',
                needsTransport: needsTransport || false,
                needsAccommodation: needsAccommodation || false,
                registeredById: currentUserId ? parseInt(currentUserId) : undefined
            },
            select: {
                id: true,
                user: {
                    include: { profile: true }
                },
                registeredBy: {
                    include: { profile: true }
                }
            }
        });

        if (currentUserId) {
            await logActivity(currentUserId, 'CREATE', 'CONVENTION_REGISTRATION', registration.id, {
                Usuario: registration.user?.profile?.fullName || registration.user?.email || userProfile?.fullName || 'Sin nombre',
                Evento: `${convention.type} ${convention.year}`,
                UserId: userId,
                ConventionId: conventionId
            }, req.ip, req.headers['user-agent']);
        }

        res.status(201).json(registration);
    } catch (error) {
        console.error('Error registering user:', error);
        res.status(500).json({ error: 'Error registering user' });
    }
};

const getPublicConventions = async (req, res) => {
    try {
        const conventions = await prisma.convention.findMany({
            where: {
                isDeleted: false,
                endDate: {
                    gte: new Date()
                }
            },
            select: {
                id: true,
                type: true,
                year: true,
                theme: true,
                cost: true,
                startDate: true,
                endDate: true,
                coordinator: {
                    include: {
                        profile: true
                    }
                },
                registrations: {
                    where: {
                        status: { in: ACTIVE_REGISTRATION_STATUSES }
                    },
                    select: {
                        id: true
                    }
                }
            },
            orderBy: {
                startDate: 'asc'
            }
        });

        res.json(conventions.map((convention) => ({
            ...convention,
            coordinator: convention.coordinator
                ? { id: convention.coordinator.id, fullName: convention.coordinator.profile?.fullName }
                : null,
            registeredCount: convention.registrations?.length || 0
        })));
    } catch (error) {
        console.error('Error fetching public conventions:', error);
        res.status(500).json({ error: 'Error getting public conventions' });
    }
};

const createPublicConventionRegistration = async (req, res) => {
    try {
        const { conventionId } = req.params;
        const { fullName, phone, sex, needsTransport, needsAccommodation } = req.body;

        const convention = await prisma.convention.findUnique({
            where: { id: parseInt(conventionId) },
            select: {
                id: true,
                type: true,
                year: true,
                cost: true,
                endDate: true
            }
        });

        if (!convention) {
            return res.status(404).json({ error: 'Convención no encontrada.' });
        }

        if (new Date(convention.endDate) < new Date()) {
            return res.status(400).json({ error: 'La convención ya finalizó y no acepta nuevas solicitudes.' });
        }

        const trimmedName = (fullName || '').trim();
        const trimmedPhone = (phone || '').trim();

        if (!trimmedName) {
            return res.status(400).json({ error: 'El nombre es obligatorio.' });
        }

        if ((convention.type === 'HOMBRES' || convention.type === 'MUJERES') && !sex) {
            return res.status(400).json({ error: 'Debes indicar el sexo para esta convención.' });
        }

        if (convention.type === 'HOMBRES' && sex && sex !== 'HOMBRE') {
            return res.status(400).json({ error: 'Esta convención es exclusiva para hombres.' });
        }

        if (convention.type === 'MUJERES' && sex && sex !== 'MUJER') {
            return res.status(400).json({ error: 'Esta convención es exclusiva para mujeres.' });
        }

        const duplicateRegistration = await prisma.conventionRegistration.findFirst({
            where: {
                conventionId: parseInt(conventionId),
                status: {
                    in: [PENDING_REGISTRATION_STATUS, 'REGISTERED', 'ATTENDED']
                },
                fullName: {
                    equals: trimmedName,
                    mode: 'insensitive'
                },
                ...(trimmedPhone ? { phone: trimmedPhone } : { phone: null })
            },
            select: { id: true }
        });

        if (duplicateRegistration) {
            return res.status(400).json({ error: 'Ya existe una solicitud o inscripción con este nombre en la convención.' });
        }

        const registration = await prisma.conventionRegistration.create({
            data: {
                conventionId: parseInt(conventionId),
                fullName: trimmedName,
                phone: trimmedPhone || null,
                status: PENDING_REGISTRATION_STATUS,
                ticketType: 'GENERAL',
                needsTransport: Boolean(needsTransport),
                needsAccommodation: Boolean(needsAccommodation)
            }
        });

        await logActivity(null, 'CREATE', 'CONVENTION_REGISTRATION', registration.id, {
            type: 'PUBLIC_REGISTRATION',
            conventionId: parseInt(conventionId),
            fullName: trimmedName
        }, req.ip, req.headers['user-agent']);

        res.status(201).json({
            message: 'Tu solicitud fue enviada y quedó pendiente de aprobación.',
            registration
        });
    } catch (error) {
        console.error('Error creating public convention registration:', error);
        res.status(500).json({ error: 'Error creating public registration' });
    }
};

const getPendingConventionRegistrations = async (req, res) => {
    try {
        const { conventionId } = req.params;

        const convention = await prisma.convention.findUnique({
            where: { id: parseInt(conventionId) },
            select: {
                id: true,
                coordinatorId: true,
                cost: true,
                vipPlateaCost: true,
                generalCost: true,
                transportCost: true,
                accommodationCost: true,
                type: true,
                year: true,
                theme: true
            }
        });

        if (!convention) {
            return res.status(404).json({ error: 'Convención no encontrada.' });
        }

        const hasAccess = await checkConventionAccess(req.user, conventionId);
        if (!hasAccess) {
            return res.status(403).json({ error: 'No tienes permisos para ver las solicitudes pendientes.' });
        }

        const registrations = await prisma.conventionRegistration.findMany({
            where: {
                conventionId: parseInt(conventionId),
                status: PENDING_REGISTRATION_STATUS
            },
            select: {
                id: true,
                fullName: true,
                phone: true,
                status: true,
                ticketType: true,
                needsTransport: true,
                needsAccommodation: true,
                discountPercentage: true,
                createdAt: true,
                userId: true,
                registeredById: true,
                user: {
                    include: { profile: true }
                },
                payments: {
                    select: {
                        amount: true,
                        paymentType: true
                    }
                }
            },
            orderBy: { createdAt: 'asc' }
        });

        res.json(registrations.map((registration) => serializeConventionRegistration(convention, registration)));
    } catch (error) {
        console.error('Error fetching pending convention registrations:', error);
        res.status(500).json({ error: 'Error getting pending registrations' });
    }
};

const approveConventionRegistration = async (req, res) => {
    try {
        const { registrationId } = req.params;
        const userId = req.user?.id;

        const registration = await prisma.conventionRegistration.findUnique({
            where: { id: parseInt(registrationId) },
            select: { id: true, conventionId: true, status: true, fullName: true }
        });

        if (!registration) {
            return res.status(404).json({ error: 'Registro no encontrado.' });
        }

        const hasAccess = await checkConventionAccess(req.user, registration.conventionId);
        if (!hasAccess) {
            return res.status(403).json({ error: 'No tienes permisos para aprobar este registro.' });
        }

        if (registration.status !== PENDING_REGISTRATION_STATUS) {
            return res.status(400).json({ error: 'Solo se pueden aprobar registros pendientes.' });
        }

        const updated = await prisma.conventionRegistration.update({
            where: { id: parseInt(registrationId) },
            data: {
                status: 'REGISTERED',
                registeredById: userId ? parseInt(userId) : null
            }
        });

        if (userId) {
            await logActivity(userId, 'UPDATE', 'CONVENTION_REGISTRATION', updated.id, {
                action: 'APPROVE_PUBLIC_REGISTRATION',
                fullName: registration.fullName
            }, req.ip, req.headers['user-agent']);
        }

        res.json({ message: 'Registro aprobado correctamente.' });
    } catch (error) {
        console.error('Error approving convention registration:', error);
        res.status(500).json({ error: 'Error approving registration' });
    }
};

const rejectConventionRegistration = async (req, res) => {
    try {
        const { registrationId } = req.params;
        const userId = req.user?.id;

        const registration = await prisma.conventionRegistration.findUnique({
            where: { id: parseInt(registrationId) },
            select: { id: true, conventionId: true, status: true, fullName: true }
        });

        if (!registration) {
            return res.status(404).json({ error: 'Registro no encontrado.' });
        }

        const hasAccess = await checkConventionAccess(req.user, registration.conventionId);
        if (!hasAccess) {
            return res.status(403).json({ error: 'No tienes permisos para rechazar este registro.' });
        }

        if (registration.status !== PENDING_REGISTRATION_STATUS) {
            return res.status(400).json({ error: 'Solo se pueden rechazar registros pendientes.' });
        }

        const updated = await prisma.conventionRegistration.update({
            where: { id: parseInt(registrationId) },
            data: {
                status: 'CANCELLED'
            }
        });

        if (userId) {
            await logActivity(userId, 'UPDATE', 'CONVENTION_REGISTRATION', updated.id, {
                action: 'REJECT_PUBLIC_REGISTRATION',
                fullName: registration.fullName
            }, req.ip, req.headers['user-agent']);
        }

        res.json({ message: 'Registro rechazado correctamente.' });
    } catch (error) {
        console.error('Error rejecting convention registration:', error);
        res.status(500).json({ error: 'Error rejecting registration' });
    }
};

const addPayment = async (req, res) => {
    try {
        const { registrationId } = req.params;
        const { amount, notes, paymentType } = req.body;
        const roles = req.user?.roles || [];
        const userId = req.user?.id;

        const foundRegistration = await prisma.conventionRegistration.findUnique({
            where: { id: parseInt(registrationId) },
            select: { conventionId: true }
        });

        if (!foundRegistration) {
            return res.status(404).json({ error: 'Registration not found' });
        }

        // Restriction: Only ADMIN or Coordinator
        const hasAccess = await checkConventionAccess(req.user, foundRegistration.conventionId);
        if (!hasAccess) {
            return res.status(403).json({ error: 'No tienes permisos para agregar pagos en esta convención.' });
        }

        const payment = await prisma.conventionPayment.create({
            data: {
                registrationId: parseInt(registrationId),
                amount: parseFloat(amount),
                paymentType: paymentType || 'CONVENTION',
                notes
            }
        });

        if (userId) {
            await logActivity(userId, 'CREATE', 'CONVENTION_PAYMENT', payment.id, { registrationId: parseInt(registrationId), amount }, req.ip, req.headers['user-agent']);
        }

        res.status(201).json(payment);
    } catch (error) {
        console.error('Error adding payment:', error);
        res.status(500).json({ error: 'Error adding payment' });
    }
};

const deleteRegistration = async (req, res) => {
    try {
        const { registrationId } = req.params;
        const roles = req.user?.roles || [];
        const userId = req.user?.id;

        const foundRegToDelete = await prisma.conventionRegistration.findUnique({
            where: { id: parseInt(registrationId) },
            select: { conventionId: true }
        });

        if (!foundRegToDelete) {
            return res.status(404).json({ error: 'Registration not found' });
        }

        // Restriction: Only ADMIN or Coordinator
        const hasAccess = await checkConventionAccess(req.user, foundRegToDelete.conventionId);
        if (!hasAccess) {
            return res.status(403).json({ error: 'No tienes permisos para eliminar inscripciones en esta convención.' });
        }

        const registration = await prisma.conventionRegistration.delete({
            where: { id: parseInt(registrationId) },
            select: { id: true, userId: true, conventionId: true }
        });

        if (userId) {
            await logActivity(userId, 'DELETE', 'CONVENTION_REGISTRATION', registration.id, { userId: registration.userId, conventionId: registration.conventionId }, req.ip, req.headers['user-agent']);
        }

        res.json({ message: 'Registration deleted successfully' });
    } catch (error) {
        console.error('Error deleting registration:', error);
        res.status(500).json({ error: 'Error deleting registration' });
    }
};

const deleteConvention = async (req, res) => {
    try {
        const { id } = req.params;
        const roles = req.user?.roles || [];
        const userId = req.user?.id;

        if (!roles.includes('ADMIN')) {
            return res.status(403).json({ error: 'Not authorized to delete conventions' });
        }

        const convention = await prisma.convention.delete({
            where: { id: parseInt(id) },
            select: { id: true, type: true, year: true }
        });

        if (userId) {
            await logActivity(userId, 'DELETE', 'CONVENTION', convention.id, { type: convention.type, year: convention.year }, req.ip, req.headers['user-agent']);
        }

        res.json({ message: 'Convention deleted successfully' });
    } catch (error) {
        console.error('Error deleting convention:', error);
        res.status(500).json({ error: 'Error deleting convention' });
    }
};

const getConventionBalanceReport = async (req, res) => {
    try {
        const { id } = req.params;
        const roles = req.user?.roles || [];
        const userId = req.user?.id;

        const convention = await prisma.convention.findUnique({
            where: { id: parseInt(id) },
            select: {
                cost: true,
                vipPlateaCost: true,
                generalCost: true,
                transportCost: true,
                accommodationCost: true,
                coordinatorId: true,
                registrations: {
                    where: {
                        status: { in: ACTIVE_REGISTRATION_STATUSES }
                    },
                    select: {
                        id: true,
                        userId: true,
                        fullName: true,
                        phone: true,
                        status: true,
                        discountPercentage: true,
                        ticketType: true,
                        needsTransport: true,
                        needsAccommodation: true,
                        registeredById: true,
                        user: {
                            include: {
                                profile: true,
                                parents: {
                                    include: {
                                        parent: { include: { profile: true } }
                                    }
                                }
                            }
                        },
                        payments: {
                            select: {
                                amount: true,
                                paymentType: true,
                                date: true,
                                notes: true
                            }
                        }
                    }
                }
            }
        });

        if (!convention) {
            return res.status(404).json({ error: 'Convention not found' });
        }

        // Apply Network Filter
        let visibleRegistrations = convention.registrations || [];

        const isAdmin = roles.includes('ADMIN');
        const isCoordinator = convention.coordinatorId === parseInt(userId);

        if (isAdmin || isCoordinator) {
            // All
        } else if (roles.some(r => ['PASTOR', 'LIDER_DOCE', 'LIDER_CELULA'].includes(r))) {
            if (userId) {
                const networkIds = await getUserNetwork(userId);
                const allowedIds = new Set([...networkIds, parseInt(userId)]);
                visibleRegistrations = visibleRegistrations.filter(reg => {
                    const assignedCheck = reg.userId && allowedIds.has(reg.userId);
                    return assignedCheck;
                });
            } else {
                visibleRegistrations = [];
            }
        } else {
            // Members see only themselves
            if (userId) {
                visibleRegistrations = visibleRegistrations.filter(reg => reg.userId === parseInt(userId));
            } else {
                visibleRegistrations = [];
            }
        }

        // Transform Data for Report
        const reportData = visibleRegistrations.map(reg => {
            const registration = serializeConventionRegistration(convention, reg);

            // Simplified hierarchy display for the report
            const getParentName = (role) => {
                const parent = reg.user?.parents?.find(p => p.role === role);
                return parent?.parent?.profile?.fullName || 'N/A';
            };

            return {
                id: reg.id,
                userName: registration.fullName,
                userRole: 'DISCIPULO', // Roles would need to be fetched/joined if needed specifically
                pastorName: getParentName('PASTOR'),
                liderDoceName: getParentName('LIDER_DOCE'),
                liderCelulaName: getParentName('LIDER_CELULA'),
                leaderName: getParentName('DISCIPULO'), // Direct discipler
                baseCost: registration.baseCost,
                transportCost: registration.transportCost,
                accommodationCost: registration.accommodationCost,
                cost: registration.finalCost,
                paid: registration.totalPaid,
                balance: registration.balance,
                paymentsByType: registration.paymentsByType,
                paymentsDetails: reg.payments
            };
        });

        res.json(reportData);
    } catch (error) {
        console.error('Error generating balance report:', error);
        res.status(500).json({ error: 'Error generating report: ' + error.message });
    }
};

module.exports = {
    getConventions,
    getConventionById,
    createConvention,
    updateConvention,
    registerUser,
    getPublicConventions,
    createPublicConventionRegistration,
    getPendingConventionRegistrations,
    approveConventionRegistration,
    rejectConventionRegistration,
    addPayment,
    deleteRegistration,
    deleteConvention,
    getConventionBalanceReport
};
