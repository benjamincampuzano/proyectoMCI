const { PrismaClient } = require('@prisma/client');
const prisma = require('../utils/database');
const { logActivity } = require('../utils/auditLogger');
const { getUserNetwork } = require('../utils/networkUtils');

// Helper to check if user has modification access to an encuentro
const checkEncuentroAccess = async (user, encuentroId) => {
    if (user.roles.includes('ADMIN')) return true;

    const encuentro = await prisma.encuentro.findUnique({
        where: { id: parseInt(encuentroId) },
        select: { coordinatorId: true }
    });

    if (!encuentro) return false;
    return encuentro.coordinatorId === parseInt(user.id);
};

const getEncuentros = async (req, res) => {
    try {
        const encuentros = await prisma.encuentro.findMany({
            include: {
                coordinator: {
                    include: { profile: true }
                },
                _count: {
                    select: { registrations: true }
                },
                registrations: {
                    select: {
                        id: true,
                        discountPercentage: true,
                        needsTransport: true,
                        needsAccommodation: true,
                        payments: {
                            select: { amount: true }
                        }
                    }
                }
            },
            orderBy: { startDate: 'asc' }
        });

        // Calculate stats
        const encuentrosWithStats = encuentros.map(enc => {
            const totalCollected = enc.registrations?.reduce((acc, reg) => {
                const paymentsSum = reg.payments?.reduce((sum, p) => sum + p.amount, 0) || 0;
                return acc + paymentsSum;
            }, 0) || 0;

            const expectedIncome = enc.registrations?.reduce((acc, reg) => {
                const baseCost = enc.cost * (1 - ((reg.discountPercentage || 0) / 100));
                const transportCost = reg.needsTransport ? enc.transportCost : 0;
                const accommodationCost = reg.needsAccommodation ? enc.accommodationCost : 0;
                const finalCost = baseCost + transportCost + accommodationCost;
                return acc + finalCost;
            }, 0) || 0;

            return {
                ...enc,
                coordinator: enc.coordinator ? { id: enc.coordinator.id, fullName: enc.coordinator.profile?.fullName } : null,
                stats: {
                    registeredCount: enc._count?.registrations || 0,
                    totalCollected,
                    expectedIncome
                }
            };
        });

        res.json(encuentrosWithStats);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error fetching encuentros' });
    }
};

const getEncuentroById = async (req, res) => {
    try {
        const { id } = req.params;
        const { roles, id: currentUserId } = req.user;

        const encuentro = await prisma.encuentro.findUnique({
            where: { id: parseInt(id) },
            include: {
                coordinator: {
                    include: { profile: true }
                },
                registrations: {
                    include: {
                        guest: {
                            include: {
                                invitedBy: { include: { profile: true } },
                                assignedTo: { include: { profile: true } }
                            }
                        },
                        user: {
                            include: { profile: true }
                        },
                        payments: {
                            select: {
                                id: true,
                                amount: true,
                                paymentType: true,
                                date: true,
                                notes: true
                            }
                        },
                        classAttendances: true
                    }
                }
            }
        });

        if (!encuentro) return res.status(404).json({ error: 'Not found' });

        // Visibility Filtering
        let filteredRegistrations = encuentro.registrations;

        const isAdmin = roles.includes('ADMIN');
        const isCoordinator = encuentro.coordinatorId === parseInt(currentUserId);

        if (!isAdmin && !isCoordinator) {
            const networkIds = await getUserNetwork(currentUserId);
            const allowedIds = new Set([...networkIds, parseInt(currentUserId)]);

            filteredRegistrations = encuentro.registrations.filter(reg => {
                const participant = reg.guest || reg.user;
                if (!participant) return false;

                if (reg.guest) {
                    const assignedCheck = reg.guest.assignedToId && allowedIds.has(reg.guest.assignedToId);
                    const invitedCheck = reg.guest.invitedById && allowedIds.has(reg.guest.invitedById);
                    return assignedCheck || invitedCheck;
                } else {
                    return allowedIds.has(reg.userId);
                }
            });
        }

        const registrationsWithFinancials = filteredRegistrations.map(reg => {
            // Calculate payments by type
            const paymentsByType = reg.payments.reduce((acc, p) => {
                const type = p.paymentType || 'ENCUENTRO';
                acc[type] = (acc[type] || 0) + p.amount;
                return acc;
            }, { ENCUENTRO: 0, TRANSPORT: 0, ACCOMMODATION: 0 });

            const totalPaid = Object.values(paymentsByType).reduce((sum, amount) => sum + amount, 0);

            // Costs
            const baseCost = encuentro.cost * (1 - ((reg.discountPercentage || 0) / 100));
            const transportCost = reg.needsTransport ? encuentro.transportCost : 0;
            const accommodationCost = reg.needsAccommodation ? encuentro.accommodationCost : 0;

            const finalCost = baseCost + transportCost + accommodationCost;
            const balance = finalCost - totalPaid;

            const classesAttended = reg.classAttendances.filter(c => c.attended).length;
            const preEncuentroProgress = reg.classAttendances.filter(c => c.attended && c.classNumber <= 5).length;
            const postEncuentroProgress = reg.classAttendances.filter(c => c.attended && c.classNumber > 5).length;

            return {
                ...reg,
                user: reg.user ? { id: reg.user.id, fullName: reg.user.profile?.fullName, phone: reg.user.phone } : null,
                paymentsByType,
                totalPaid,
                baseCost,
                transportCost,
                accommodationCost,
                finalCost,
                balance,
                classesAttended,
                preEncuentroProgress,
                postEncuentroProgress
            };
        });

        const formattedEncuentro = {
            ...encuentro,
            coordinator: encuentro.coordinator ? { id: encuentro.coordinator.id, fullName: encuentro.coordinator.profile?.fullName } : null,
            registrations: registrationsWithFinancials
        };

        res.json(formattedEncuentro);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error fetching detail' });
    }
};

const createEncuentro = async (req, res) => {
    try {
        const { roles, id: userId } = req.user;
        const isAuthorized = roles.some(r => ['ADMIN', 'PASTOR', 'LIDER_DOCE'].includes(r));
        if (!isAuthorized) {
            return res.status(403).json({ error: 'Not authorized to create encuentros' });
        }
        const { type, name, description, cost, transportCost, accommodationCost, startDate, endDate, coordinatorId } = req.body;
        const encuentro = await prisma.encuentro.create({
            data: {
                type,
                name,
                description,
                cost: parseFloat(cost),
                transportCost: parseFloat(transportCost || 0),
                accommodationCost: parseFloat(accommodationCost || 0),
                startDate: new Date(startDate),
                endDate: new Date(endDate),
                coordinatorId: coordinatorId ? parseInt(coordinatorId) : null
            }
        });

        await logActivity(userId, 'CREATE', 'ENCUENTRO', encuentro.id, { name: encuentro.name, type: encuentro.type }, req.ip, req.headers['user-agent']);

        res.status(201).json(encuentro);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error creating encuentro' });
    }
};

const deleteEncuentro = async (req, res) => {
    try {
        const { id } = req.params;
        const { roles, id: userId } = req.user;

        const isAuthorized = roles.some(r => ['ADMIN', 'PASTOR', 'LIDER_DOCE'].includes(r));
        if (!isAuthorized) {
            return res.status(403).json({ error: 'Not authorized to delete encuentros' });
        }
        const encuentro = await prisma.encuentro.delete({
            where: { id: parseInt(id) },
            select: { id: true, name: true }
        });

        await logActivity(userId, 'DELETE', 'ENCUENTRO', encuentro.id, { name: encuentro.name }, req.ip, req.headers['user-agent']);

        res.json({ message: 'Deleted' });
    } catch (error) {
        res.status(500).json({ error: 'Error deleting' });
    }
};

const updateEncuentro = async (req, res) => {
    try {
        const { id } = req.params;
        const { roles, id: userId } = req.user;

        const hasAccess = await checkEncuentroAccess(req.user, id);
        if (!hasAccess) {
            return res.status(403).json({ error: 'No tienes permisos para modificar este encuentro.' });
        }

        const { type, name, description, cost, transportCost, accommodationCost, startDate, endDate, coordinatorId } = req.body;

        const updateData = {};
        if (type !== undefined) updateData.type = type;
        if (name !== undefined) updateData.name = name;
        if (description !== undefined) updateData.description = description;
        if (cost !== undefined) updateData.cost = parseFloat(cost);
        if (transportCost !== undefined) updateData.transportCost = parseFloat(transportCost);
        if (accommodationCost !== undefined) updateData.accommodationCost = parseFloat(accommodationCost);
        if (startDate !== undefined) updateData.startDate = new Date(startDate);
        if (endDate !== undefined) updateData.endDate = new Date(endDate);
        if (coordinatorId !== undefined) updateData.coordinatorId = coordinatorId ? parseInt(coordinatorId) : null;

        const encuentro = await prisma.encuentro.update({
            where: { id: parseInt(id) },
            data: updateData,
            select: { id: true, name: true }
        });

        await logActivity(userId, 'UPDATE', 'ENCUENTRO', encuentro.id, { name: encuentro.name }, req.ip, req.headers['user-agent']);

        res.json(encuentro);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error updating encuentro' });
    }
};

const registerParticipant = async (req, res) => {
    try {
        const { encuentroId } = req.params;
        const { guestId, userId, discountPercentage, needsTransport, needsAccommodation } = req.body;
        const { roles, id: currentUserId } = req.user;

        console.log('Registration attempt:', {
            encuentroId,
            guestId,
            userId,
            discountPercentage,
            needsTransport,
            needsAccommodation,
            currentUserId,
            userRoles: roles
        });

        const hasAccess = await checkEncuentroAccess(req.user, encuentroId);
        if (!hasAccess) {
            console.log('Access denied for user:', currentUserId, 'to encuentro:', encuentroId);
            return res.status(403).json({ error: 'No tienes permisos para registrar participantes.' });
        }

        if ((!guestId && !userId) || (guestId && userId)) {
            console.log('Invalid guest/user ID combination:', { guestId, userId });
            return res.status(400).json({ error: 'Must provide either guestId OR userId, not both.' });
        }

        const existing = await prisma.encuentroRegistration.findFirst({
            where: {
                encuentroId: parseInt(encuentroId),
                OR: [
                    guestId ? { guestId: parseInt(guestId) } : {},
                    userId ? { userId: parseInt(userId) } : {}
                ]
            }
        });

        if (existing) {
            return res.status(400).json({ error: 'El participante ya está registrado.' });
        }

        const encuentroInfo = await prisma.encuentro.findUnique({
            where: { id: parseInt(encuentroId) }
        });

        if (!encuentroInfo) {
            return res.status(404).json({ error: 'Encuentro no encontrado' });
        }

        let participantSex;
        let participantBirthDate;

        if (guestId) {
            const guest = await prisma.guest.findUnique({ where: { id: parseInt(guestId) } });
            if (!guest) {
                console.log('Guest not found:', guestId);
                return res.status(404).json({ error: 'Invitado no encontrado.' });
            }
            participantSex = guest?.sex;
            participantBirthDate = guest?.birthDate;
            console.log('Guest data:', { guestId, sex: participantSex, birthDate: participantBirthDate });
        } else {
            const user = await prisma.user.findUnique({
                where: { id: parseInt(userId) },
                include: { profile: true }
            });
            if (!user) {
                console.log('User not found:', userId);
                return res.status(404).json({ error: 'Usuario no encontrado.' });
            }
            participantSex = user?.profile?.sex;
            participantBirthDate = user?.profile?.birthDate;
            console.log('User data:', { userId, sex: participantSex, birthDate: participantBirthDate });
        }

        console.log('Encuentro type:', encuentroInfo.type);
        console.log('Participant sex:', participantSex);
        console.log('Participant birth date:', participantBirthDate);

        if (encuentroInfo.type === 'HOMBRES') {
            if (!participantSex) {
                console.log('Gender validation failed: HOMBRES encounter but participant has no sex specified');
                return res.status(400).json({ 
                    error: 'El invitado debe tener especificado el sexo (HOMBRE) para este encuentro. Por favor, actualice la información del invitado primero.',
                    requiresGuestUpdate: true,
                    missingField: 'sex',
                    expectedValue: 'HOMBRE'
                });
            }
            if (participantSex !== 'HOMBRE') {
                console.log('Gender validation failed: HOMBRES encounter but participant is not HOMBRE');
                return res.status(400).json({ error: 'Este encuentro es exclusivo para hombres.' });
            }
        }
        if (encuentroInfo.type === 'MUJERES') {
            if (!participantSex) {
                console.log('Gender validation failed: MUJERES encounter but participant has no sex specified');
                return res.status(400).json({ 
                    error: 'El invitado debe tener especificado el sexo (MUJER) para este encuentro. Por favor, actualice la información del invitado primero.',
                    requiresGuestUpdate: true,
                    missingField: 'sex',
                    expectedValue: 'MUJER'
                });
            }
            if (participantSex !== 'MUJER') {
                console.log('Gender validation failed: MUJERES encounter but participant is not MUJER');
                return res.status(400).json({ error: 'Este encuentro es exclusivo para mujeres.' });
            }
        }

        if (encuentroInfo.type === 'JOVENES') {
            if (!participantBirthDate) {
                console.log('Age validation failed: JOVENES encounter but no birth date provided');
                return res.status(400).json({ 
                    error: 'El invitado debe tener especificado la fecha de nacimiento para el encuentro de jóvenes. Por favor, actualice la información del invitado primero.',
                    requiresGuestUpdate: true,
                    missingField: 'birthDate'
                });
            }
            const birthDate = new Date(participantBirthDate);
            const today = new Date();
            let age = today.getFullYear() - birthDate.getFullYear();
            const m = today.getMonth() - birthDate.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
                age--;
            }
            console.log('Age validation for JOVENES:', { age, birthDate, today });
            if (age >= 18) {
                console.log('Age validation failed: JOVENES encounter but participant is 18 or older');
                return res.status(400).json({ error: 'Este encuentro es exclusivo para jóvenes.' });
            }
        }

        const registration = await prisma.encuentroRegistration.create({
            data: {
                encuentroId: parseInt(encuentroId),
                guestId: guestId ? parseInt(guestId) : null,
                userId: userId ? parseInt(userId) : null,
                discountPercentage: parseFloat(discountPercentage || 0),
                needsTransport: !!needsTransport,
                needsAccommodation: !!needsAccommodation
            },
            include: {
                guest: true,
                user: { include: { profile: true } }
            }
        });

        if (guestId) {
            await prisma.guest.update({
                where: { id: parseInt(guestId) },
                data: { status: 'GANADO' }
            });
        }

        await logActivity(currentUserId, 'CREATE', 'ENCUENTRO_REGISTRATION', registration.id, {
            participant: registration.guest?.name || registration.user?.profile?.fullName,
            encuentroId
        }, req.ip, req.headers['user-agent']);

        res.status(201).json(registration);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error registering participant' });
    }
};

const deleteRegistration = async (req, res) => {
    try {
        const { registrationId } = req.params;
        const { roles, id: userId } = req.user;

        const registration = await prisma.encuentroRegistration.findUnique({
            where: { id: parseInt(registrationId) },
            select: { id: true, guestId: true, userId: true, encuentroId: true }
        });

        if (!registration) {
            return res.status(404).json({ error: 'Registration not found' });
        }

        const hasAccess = await checkEncuentroAccess(req.user, registration.encuentroId);
        if (!hasAccess) {
            return res.status(403).json({ error: 'No tienes permisos para eliminar inscripciones.' });
        }

        await prisma.encuentroRegistration.delete({
            where: { id: parseInt(registrationId) }
        });

        await logActivity(userId, 'DELETE', 'ENCUENTRO_REGISTRATION', registration.id, {
            participantId: registration.guestId || registration.userId,
            encuentroId: registration.encuentroId
        }, req.ip, req.headers['user-agent']);

        res.json({ message: 'Deleted' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Delete failed' });
    }
};

const addPayment = async (req, res) => {
    try {
        const { registrationId } = req.params;
        const { amount, notes, paymentType } = req.body;
        const { id: userId } = req.user;

        const registration = await prisma.encuentroRegistration.findUnique({
            where: { id: parseInt(registrationId) },
            select: { encuentroId: true }
        });

        if (!registration) {
            return res.status(404).json({ error: 'Registration not found' });
        }

        const hasAccess = await checkEncuentroAccess(req.user, registration.encuentroId);
        if (!hasAccess) {
            return res.status(403).json({ error: 'No tienes permisos para agregar pagos.' });
        }

        const payment = await prisma.encuentroPayment.create({
            data: {
                registrationId: parseInt(registrationId),
                amount: parseFloat(amount),
                paymentType: paymentType || 'ENCUENTRO',
                notes
            }
        });

        await logActivity(userId, 'CREATE', 'ENCUENTRO_PAYMENT', payment.id, { registrationId: parseInt(registrationId), amount }, req.ip, req.headers['user-agent']);

        res.status(201).json(payment);
    } catch (error) {
        res.status(500).json({ error: 'Payment failed' });
    }
};

const updateClassAttendance = async (req, res) => {
    try {
        const { registrationId, classNumber } = req.params;
        const { attended } = req.body;
        const { id: userId } = req.user;

        const registration = await prisma.encuentroRegistration.findUnique({
            where: { id: parseInt(registrationId) },
            select: { encuentroId: true }
        });

        if (!registration) {
            return res.status(404).json({ error: 'Registration not found' });
        }

        const hasAccess = await checkEncuentroAccess(req.user, registration.encuentroId);
        if (!hasAccess) {
            return res.status(403).json({ error: 'No tienes permisos para actualizar asistencia.' });
        }

        const record = await prisma.encuentroClassAttendance.upsert({
            where: {
                registrationId_classNumber: {
                    registrationId: parseInt(registrationId),
                    classNumber: parseInt(classNumber)
                }
            },
            update: { attended },
            create: {
                registrationId: parseInt(registrationId),
                classNumber: parseInt(classNumber),
                attended
            }
        });

        await logActivity(userId, 'UPDATE', 'ENCUENTRO_ATTENDANCE', record.id, { registrationId: parseInt(registrationId), classNumber, attended }, req.ip, req.headers['user-agent']);

        res.json(record);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Attendance update failed' });
    }
};

const updateRegistration = async (req, res) => {
    try {
        const { registrationId } = req.params;
        const { isBaptized } = req.body;
        const { id: userId } = req.user;

        const registration = await prisma.encuentroRegistration.findUnique({
            where: { id: parseInt(registrationId) },
            select: { encuentroId: true }
        });

        if (!registration) {
            return res.status(404).json({ error: 'Registration not found' });
        }

        const hasAccess = await checkEncuentroAccess(req.user, registration.encuentroId);
        if (!hasAccess) {
            return res.status(403).json({ error: 'No tienes permisos para actualizar el registro.' });
        }

        const updated = await prisma.encuentroRegistration.update({
            where: { id: parseInt(registrationId) },
            data: { isBaptized }
        });

        await logActivity(userId, 'UPDATE', 'ENCUENTRO_REGISTRATION', updated.id, { isBaptized }, req.ip, req.headers['user-agent']);

        res.json(updated);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Registration update failed' });
    }
};

const getEncuentroBalanceReport = async (req, res) => {
    try {
        const { id } = req.params;
        const { roles, id: userId } = req.user;

        const encuentro = await prisma.encuentro.findUnique({
            where: { id: parseInt(id) },
            include: {
                registrations: {
                    where: {
                        OR: [
                            { guest: { isNot: null } },
                            { user: { roles: { none: { role: { name: 'ADMIN' } } } } }
                        ]
                    },
                    include: {
                        guest: {
                            include: {
                                assignedTo: {
                                    include: {
                                        profile: true,
                                        parents: { include: { parent: { include: { profile: true } } } }
                                    }
                                },
                                invitedBy: {
                                    include: {
                                        profile: true,
                                        parents: { include: { parent: { include: { profile: true } } } }
                                    }
                                }
                            }
                        },
                        user: {
                            include: {
                                profile: true,
                                parents: { include: { parent: { include: { profile: true } } } }
                            }
                        },
                        payments: true
                    }
                }
            }
        });

        if (!encuentro) {
            return res.status(404).json({ error: 'Encuentro not found' });
        }

        let visibleRegistrations = encuentro.registrations;

        const isAdmin = roles.includes('ADMIN');
        const isCoordinator = encuentro.coordinatorId === parseInt(userId);

        if (!isAdmin && !isCoordinator) {
            const networkIds = await getUserNetwork(userId);
            const allowedIds = new Set([...networkIds, parseInt(userId)]);

            visibleRegistrations = encuentro.registrations.filter(reg => {
                const participant = reg.guest || reg.user;
                if (!participant) return false;
                const ownerId = reg.guest ? (reg.guest.assignedToId || reg.guest.invitedById) : reg.userId;
                return allowedIds.has(ownerId);
            });
        }

        const reportData = visibleRegistrations.map(reg => {
            const paymentsByType = reg.payments.reduce((acc, p) => {
                const type = p.paymentType || 'ENCUENTRO';
                acc[type] = (acc[type] || 0) + p.amount;
                return acc;
            }, { ENCUENTRO: 0, TRANSPORT: 0, ACCOMMODATION: 0 });

            const totalPaid = Object.values(paymentsByType).reduce((sum, amount) => sum + amount, 0);

            const baseCost = encuentro.cost * (1 - (reg.discountPercentage / 100));
            const transportCost = reg.needsTransport ? encuentro.transportCost : 0;
            const accommodationCost = reg.needsAccommodation ? encuentro.accommodationCost : 0;

            const finalCost = baseCost + transportCost + accommodationCost;
            const balance = finalCost - totalPaid;

            const responsibleUser = reg.guest ? (reg.guest.assignedTo || reg.guest.invitedBy) : reg.user;

            const getParentName = (role) => {
                if (!responsibleUser) return 'N/A';
                const parent = responsibleUser.parents?.find(p => p.role === role);
                return parent?.parent?.profile?.fullName || 'N/A';
            };

            return {
                id: reg.id,
                userName: reg.user?.profile?.fullName || reg.user?.email,
                guestName: reg.guest?.name,
                userRole: 'PARTICIPANTE',
                status: reg.guest?.status,
                responsibleName: responsibleUser?.profile?.fullName || 'Sin Asignar',
                pastorName: getParentName('PASTOR'),
                liderDoceName: getParentName('LIDER_DOCE'),
                liderCelulaName: getParentName('LIDER_CELULA'),
                leaderName: getParentName('DISCIPULO'),
                baseCost,
                transportCost,
                accommodationCost,
                cost: finalCost,
                paid: totalPaid,
                balance,
                paymentsByType,
                paymentsDetails: reg.payments
            };
        });

        res.json(reportData);
    } catch (error) {
        console.error('Error generating balance report:', error);
        res.status(500).json({ error: 'Error generating report' });
    }
};

const deletePayment = async (req, res) => {
    try {
        const { paymentId } = req.params;
        const { id: userId, roles } = req.user;

        // Only ADMIN can delete payments
        if (!roles.includes('ADMIN')) {
            return res.status(403).json({ error: 'Solo ADMIN puede eliminar abonos.' });
        }

        const payment = await prisma.encuentroPayment.findUnique({
            where: { id: parseInt(paymentId) },
            include: {
                registration: {
                    select: { encuentroId: true }
                }
            }
        });

        if (!payment) {
            return res.status(404).json({ error: 'Payment not found' });
        }

        const deletedPayment = await prisma.encuentroPayment.delete({
            where: { id: parseInt(paymentId) }
        });

        await logActivity(userId, 'DELETE', 'ENCUENTRO_PAYMENT', paymentId, {
            registrationId: payment.registrationId,
            amount: payment.amount,
            paymentType: payment.paymentType
        }, req.ip, req.headers['user-agent']);

        res.json({ message: 'Abono eliminado exitosamente', payment: deletedPayment });
    } catch (error) {
        console.error('Error deleting payment:', error);
        res.status(500).json({ error: 'Error deleting payment' });
    }
};

module.exports = {
    getEncuentros,
    getEncuentroById,
    createEncuentro,
    updateEncuentro,
    deleteEncuentro,
    updateRegistration,
    registerParticipant,
    deleteRegistration,
    addPayment,
    deletePayment,
    updateClassAttendance,
    getEncuentroBalanceReport
};
