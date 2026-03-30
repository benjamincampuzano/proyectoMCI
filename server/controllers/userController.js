const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const axios = require('axios');
const { logActivity } = require('../utils/auditLogger');
const { validatePassword } = require('../utils/passwordValidator');

const prisma = require('../utils/database');

// Geocoding helper using Nominatim
const geocodeAddress = async (address, city) => {
    if (!address) return { lat: null, lng: null };
    try {
        const fullAddress = `${address}${city ? ', ' + city : ''}`;
        const response = await axios.get('https://nominatim.openstreetmap.org/search', {
            params: {
                q: fullAddress,
                format: 'json',
                limit: 1
            },
            headers: {
                'User-Agent': 'ProyectoIglesia/1.0'
            }
        });
        if (response.data && response.data.length > 0) {
            return {
                lat: parseFloat(response.data[0].lat),
                lng: parseFloat(response.data[0].lon)
            };
        }
    } catch (error) {
        console.error('Geocoding error:', error);
    }
    return { lat: null, lng: null };
};

const { getUserNetwork } = require('../utils/networkUtils');

// Función auxiliar local eliminada en favor de la centralizada en utils/networkUtils


// Obtener perfil propio
const getProfile = async (req, res) => {
    try {
        const userId = parseInt(req.user.id);
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                profile: true,
                roles: { include: { role: true } },
                parents: { include: { parent: { include: { profile: true } } } },
                moduleCoordinations: true
            }
        });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.status(200).json({
            user: {
                id: user.id,
                email: user.email,
                phone: user.phone,
                ...user.profile,
                roles: user.roles.map(r => r.role.name),
                isCoordinator: user.isCoordinator || user.moduleCoordinations.length > 0,
                hierarchy: user.parents.map(p => ({
                    parentId: p.parentId,
                    parentName: p.parent.profile.fullName,
                    role: p.role
                }))
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Actualizar perfil propio
const updateProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        const { fullName, email, sex, phone, address, city, documentType, documentNumber, birthDate } = req.body;

        if (email) {
            const existingUser = await prisma.user.findUnique({ where: { email } });
            if (existingUser && existingUser.id !== userId) {
                return res.status(400).json({ message: 'Email already in use' });
            }
        }

        // Check for duplicate phone number
        if (phone) {
            const existingPhone = await prisma.user.findUnique({ where: { phone } });
            if (existingPhone && existingPhone.id !== userId) {
                return res.status(400).json({ message: 'El número de teléfono ya está registrado. Por favor use otro teléfono.' });
            }
        }

        let latitude = undefined;
        let longitude = undefined;
        if (address || city) {
            const coords = await geocodeAddress(address, city);
            if (coords.lat) {
                latitude = coords.lat;
                longitude = coords.lng;
            }
        }

        // Clean phone number before updating
        const cleanPhone = phone && phone.trim() !== '' ? phone.trim() : null;

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: {
                ...(email && { email }),
                ...(cleanPhone && { phone: cleanPhone }),
                profile: {
                    update: {
                        ...(fullName && { fullName }),
                        ...(sex && { sex }),
                        ...(address && { address }),
                        ...(city && { city }),
                        ...(latitude !== undefined && { latitude }),
                        ...(longitude !== undefined && { longitude }),
                        ...(documentType !== undefined && { documentType }),
                        ...(documentNumber !== undefined && { documentNumber }),
                        ...(birthDate !== undefined && { birthDate: birthDate ? new Date(birthDate) : null }),
                        ...(req.body.dataPolicyAccepted !== undefined && { dataPolicyAccepted: req.body.dataPolicyAccepted }),
                        ...(req.body.dataTreatmentAuthorized !== undefined && { dataTreatmentAuthorized: req.body.dataTreatmentAuthorized }),
                        ...(req.body.minorConsentAuthorized !== undefined && { minorConsentAuthorized: req.body.minorConsentAuthorized }),
                    }
                }
            },
            include: { profile: true, roles: { include: { role: true } } }
        });

        res.status(200).json({
            user: {
                id: updatedUser.id,
                email: updatedUser.email,
                fullName: updatedUser.profile.fullName,
                roles: updatedUser.roles.map(r => r.role.name),
                phone: updatedUser.phone,
                address: updatedUser.profile.address,
                city: updatedUser.profile.city,
            },
        });
    } catch (error) {
        console.error('Error updating profile:', error);

        // Handle Prisma unique constraint errors
        if (error.code === 'P2002') {
            const targetField = error.meta?.target?.[0];
            if (targetField === 'phone') {
                return res.status(400).json({
                    message: 'El número de teléfono ya está registrado. Por favor use otro teléfono.'
                });
            } else if (targetField === 'email') {
                return res.status(400).json({
                    message: 'El correo electrónico ya está registrado. Por favor use otro correo.'
                });
            } else {
                return res.status(400).json({
                    message: 'Ya existe un usuario con estos datos. Por favor verifique la información.'
                });
            }
        }

        res.status(500).json({ message: 'Error del servidor al actualizar perfil' });
    }
};

// Cambiar contraseña propia
const changePassword = async (req, res) => {
    try {
        const userId = req.user.id;
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ message: 'Current and new password are required' });
        }

        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { profile: true }
        });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Current password is incorrect' });
        }

        const validation = validatePassword(newPassword, { email: user.email, fullName: user.profile.fullName });
        if (!validation.isValid) {
            return res.status(400).json({ message: validation.message });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await prisma.user.update({
            where: { id: userId },
            data: {
                password: hashedPassword,
                mustChangePassword: false
            },
        });

        res.status(200).json({ message: 'Password changed successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Admin: Obtener todos los usuarios
const getAllUsers = async (req, res) => {
    try {
        const currentUser = req.user;
        const { role, sex, minBirthDate } = req.query;
        let where = {};

        // Security Filter based on RBAC and Hierarchy
        // Note: currentUser.roles is an array from the token
        if (currentUser.roles.includes('ADMIN')) {
            where = {};
        } else if (currentUser.roles.some(r => ['PASTOR', 'LIDER_DOCE'].includes(r))) {
            const networkIds = await getUserNetwork(currentUser.id);
            where = {
                id: { in: [...networkIds, currentUser.id] },
                roles: {
                    none: {
                        role: { name: 'ADMIN' }
                    }
                }
            };
        } else if (currentUser.roles.includes('LIDER_CELULA')) {
            // LIDER_CELULA also sees their network
            const networkIds = await getUserNetwork(currentUser.id);
            where = {
                id: { in: [...networkIds, currentUser.id] }
            };
        } else {
            where = { id: currentUser.id };
        }

        // Apply role filter if provided (matching the new Role table)
        if (role) {
            const roleNames = role.split(',');
            where.roles = {
                some: {
                    role: {
                        name: { in: roleNames }
                    }
                }
            };
        }

        if (sex || minBirthDate) {
            where.profile = {
                ...(where.profile || {}),
                ...(sex ? { sex } : {}),
                ...(minBirthDate ? { birthDate: { gt: new Date(minBirthDate) } } : {})
            };
        }

        const users = await prisma.user.findMany({
            where,
            include: {
                profile: true,
                roles: { include: { role: true } },
                spouse: { include: { profile: true } },
                spouseOf: { include: { profile: true } },
                parents: {
                    include: {
                        parent: {
                            include: { profile: true }
                        }
                    }
                },
                _count: {
                    select: {
                        invitedGuests: true
                    }
                },
                moduleCoordinations: true
            },
            orderBy: { profile: { fullName: 'asc' } }
        });

        // Format for frontend consumption
        const formattedUsers = users.map(u => ({
            ...u.profile,
            id: u.id,  // Ensure User ID is not overwritten by Profile ID
            email: u.email,
            phone: u.phone,
            roles: u.roles.map(r => r.role.name),
            isCoordinator: u.isCoordinator || u.moduleCoordinations.length > 0,
            spouseId: u.spouseId || (u.spouseOf ? u.spouseOf.id : null),
            spouseName: u.spouse?.profile.fullName || u.spouseOf?.profile.fullName || null,
            pastorIds: u.parents.filter(p => p.role === 'PASTOR').map(p => p.parentId),
            liderDoceIds: u.parents.filter(p => p.role === 'LIDER_DOCE').map(p => p.parentId),
            liderCelulaIds: u.parents.filter(p => p.role === 'LIDER_CELULA').map(p => p.parentId),
            // Maintain single IDs for backward compatibility if needed, but using arrays primarily
            pastorId: u.parents.find(p => p.role === 'PASTOR')?.parentId || null,
            liderDoceId: u.parents.find(p => p.role === 'LIDER_DOCE')?.parentId || null,
            liderCelulaId: u.parents.find(p => p.role === 'LIDER_CELULA')?.parentId || null,
            parents: u.parents.map(p => ({
                id: p.parentId,
                fullName: p.parent.profile.fullName,
                role: p.role
            })),
            invitedGuestsCount: u._count.invitedGuests
        }));

        res.status(200).json(formattedUsers);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Admin: Obtener usuario específico
const getUserById = async (req, res) => {
    try {
        const { id } = req.params;

        const user = await prisma.user.findUnique({
            where: { id: parseInt(id) },
            include: {
                profile: true,
                roles: { include: { role: true } },
                parents: { include: { parent: { include: { profile: true } } } },
                spouse: { include: { profile: true } },
                spouseOf: { include: { profile: true } },
                moduleCoordinations: true
            }
        });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const formattedUser = {
            ...user.profile,
            id: user.id,
            email: user.email,
            phone: user.phone,
            roles: user.roles.map(r => r.role.name),
            isCoordinator: user.isCoordinator || user.moduleCoordinations.length > 0,
            spouseId: user.spouseId || (user.spouseOf ? user.spouseOf.id : null),
            spouseName: user.spouse?.profile.fullName || user.spouseOf?.profile.fullName || null,
            pastorIds: user.parents.filter(p => p.role === 'PASTOR').map(p => p.parentId),
            liderDoceIds: user.parents.filter(p => p.role === 'LIDER_DOCE').map(p => p.parentId),
            liderCelulaIds: user.parents.filter(p => p.role === 'LIDER_CELULA').map(p => p.parentId),
            pastorId: user.parents.find(p => p.role === 'PASTOR')?.parentId || null,
            liderDoceId: user.parents.find(p => p.role === 'LIDER_DOCE')?.parentId || null,
            liderCelulaId: user.parents.find(p => p.role === 'LIDER_CELULA')?.parentId || null,
            parents: user.parents.map(p => ({
                id: p.parentId,
                fullName: p.parent.profile.fullName,
                role: p.role
            }))
        };

        res.status(200).json({ user: formattedUser });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Admin: Actualizar usuario (rol, detalles, jerarquía)
const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = parseInt(id);
        const { fullName, email, role, sex, phone, address, city, neighborhood, parentId, roleInHierarchy, documentType, documentNumber, birthDate, pastorId, liderDoceId, liderCelulaId, pastorIds, liderDoceIds, liderCelulaIds, maritalStatus, network, isCoordinator, spouseId } = req.body;

        const userToUpdate = await prisma.user.findUnique({
            where: { id: userId },
            include: { profile: true, roles: { include: { role: true } } }
        });

        if (!userToUpdate) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Security: LIDER_DOCE or PASTOR can only update their network
        if (req.user.roles.some(r => ['LIDER_DOCE', 'PASTOR'].includes(r)) && !req.user.roles.includes('ADMIN')) {
            const networkIds = await getUserNetwork(req.user.id);
            if (!networkIds.includes(userId) && userId !== req.user.id) {
                console.warn(`Unauthorized update attempt by user ${req.user.id} on user ${userId}`);
                return res.status(403).json({ message: 'No tienes permiso para editar usuarios fuera de tu red' });
            }
        }

        if (email) {
            const existingUser = await prisma.user.findUnique({ where: { email } });
            if (existingUser && existingUser.id !== userId) {
                return res.status(400).json({ message: 'Email already in use' });
            }
        }

        // Check for duplicate phone number
        if (phone) {
            const existingPhone = await prisma.user.findUnique({ where: { phone } });
            if (existingPhone && existingPhone.id !== userId) {
                return res.status(400).json({ message: 'El número de teléfono ya está registrado. Por favor use otro teléfono.' });
            }
        }

        let latitude = undefined;
        let longitude = undefined;
        if (address || city) {
            const coords = await geocodeAddress(address, city);
            if (coords.lat) { latitude = coords.lat; longitude = coords.lng; }
        }

        // Clean phone number before updating
        const cleanPhone = phone && phone.trim() !== '' ? phone.trim() : null;

        const updatedUser = await prisma.$transaction(async (tx) => {
            // 1. Update Core User & Profile
            const updated = await tx.user.update({
                where: { id: userId },
                data: {
                    email,
                    phone: cleanPhone,
                    isCoordinator,
                    spouseId: spouseId ? parseInt(spouseId) : null,
                    profile: {
                        update: {
                            ...(fullName && { fullName }),
                            ...(sex && { sex }),
                            ...(address && { address }),
                            ...(city && { city }),
                            ...(neighborhood !== undefined && { neighborhood }),
                            ...(latitude !== undefined && { latitude }),
                            ...(longitude !== undefined && { longitude }),
                            ...(documentType !== undefined && { documentType }),
                            ...(documentNumber !== undefined && { documentNumber }),
                            ...(birthDate !== undefined && { birthDate: birthDate ? new Date(birthDate) : null }),
                            ...(req.body.maritalStatus !== undefined && { maritalStatus: req.body.maritalStatus || null }),
                            ...(req.body.network !== undefined && { network: req.body.network || null }),
                            ...(req.body.dataPolicyAccepted !== undefined && { dataPolicyAccepted: req.body.dataPolicyAccepted }),
                            ...(req.body.dataTreatmentAuthorized !== undefined && { dataTreatmentAuthorized: req.body.dataTreatmentAuthorized }),
                            ...(req.body.minorConsentAuthorized !== undefined && { minorConsentAuthorized: req.body.minorConsentAuthorized }),
                        }
                    }
                },
                include: { profile: true, roles: { include: { role: true } } }
            });

            // 2. Update Role if provided
            if (role) {
                const targetRole = await tx.role.upsert({
                    where: { name: role },
                    update: {},
                    create: { name: role }
                });
                // Clear existing roles and assign new one (or handle multi-role if needed)
                await tx.userRole.deleteMany({ where: { userId } });
                await tx.userRole.create({ data: { userId, roleId: targetRole.id } });
            }

            // 3. Update Hierarchy if leaders provided
            const hierarchyEntries = [
                { ids: pastorIds || (pastorId ? [pastorId] : undefined), role: 'PASTOR' },
                { ids: liderDoceIds || (liderDoceId ? [liderDoceId] : undefined), role: 'LIDER_DOCE' },
                { ids: liderCelulaIds || (liderCelulaId ? [liderCelulaId] : undefined), role: 'LIDER_CELULA' }
            ];

            // If any of these are explicitly passed (even as null/empty to remove), we update
            if (pastorId !== undefined || liderDoceId !== undefined || liderCelulaId !== undefined || pastorIds !== undefined || liderDoceIds !== undefined || liderCelulaIds !== undefined || parentId !== undefined) {
                // For backward compatibility or general cleanup, if parentId is passed as the primary way
                if (parentId !== undefined && !pastorId && !liderDoceId && !liderCelulaId && !pastorIds && !liderDoceIds && !liderCelulaIds) {
                    await tx.userHierarchy.deleteMany({ where: { childId: userId } });
                    if (parentId) {
                        await tx.userHierarchy.create({
                            data: {
                                parentId: parseInt(parentId),
                                childId: userId,
                                role: roleInHierarchy || 'DISCIPULO'
                            }
                        });
                    }
                } else {
                    // Modern multi-leader approach
                    for (const entry of hierarchyEntries) {
                        if (entry.ids !== undefined) {
                            // Replacement logic: remove previous for this role
                            await tx.userHierarchy.deleteMany({
                                where: { childId: userId, role: entry.role }
                            });

                            const ids = Array.isArray(entry.ids) ? entry.ids : [entry.ids];
                            for (const idToAssign of ids.filter(Boolean)) {
                                await tx.userHierarchy.create({
                                    data: {
                                        parentId: parseInt(idToAssign),
                                        childId: userId,
                                        role: entry.role
                                    }
                                });
                            }
                        }
                    }
                }
            }

            // 4. Ensure spouse symmetry
            if (spouseId !== undefined) {
                const sId = spouseId ? parseInt(spouseId) : null;
                if (sId) {
                    // Break any old spouse relationship for both
                    await tx.user.updateMany({
                        where: { OR: [{ spouseId: userId }, { spouseId: sId }] },
                        data: { spouseId: null }
                    });
                    // Set new
                    await tx.user.update({
                        where: { id: userId },
                        data: { spouseId: sId }
                    });
                } else {
                    // Removing spouse: find whoever points to me or whoever I point to
                    await tx.user.updateMany({
                        where: { spouseId: userId },
                        data: { spouseId: null }
                    });
                }
            }

            return updated;
        });

        // Audit Log (Simplified for brevity)
        await logActivity(req.user.id, 'UPDATE', 'USER', userId, { targetUser: updatedUser.profile.fullName }, req.ip, req.headers['user-agent']);

        res.status(200).json({
            user: {
                id: updatedUser.id,
                email: updatedUser.email,
                fullName: updatedUser.profile.fullName,
                roles: updatedUser.roles.map(r => r.role.name)
            },
        });
    } catch (error) {
        console.error('Error updating user:', error);

        // Handle Prisma unique constraint errors
        if (error.code === 'P2002') {
            const targetField = error.meta?.target?.[0];
            if (targetField === 'phone') {
                return res.status(400).json({
                    message: 'El número de teléfono ya está registrado. Por favor use otro teléfono.'
                });
            } else if (targetField === 'email') {
                return res.status(400).json({
                    message: 'El correo electrónico ya está registrado. Por favor use otro correo.'
                });
            } else {
                return res.status(400).json({
                    message: 'Ya existe un usuario con estos datos. Por favor verifique la información.'
                });
            }
        }

        res.status(500).json({ message: 'Error del servidor al actualizar usuario' });
    }
};

// Admin: Crear nuevo usuario
const createUser = async (req, res) => {
    try {
        const { email, password, fullName, role, sex, phone, address, city, parentId, roleInHierarchy, documentType, documentNumber, birthDate, pastorId, liderDoceId, liderCelulaId, pastorIds, liderDoceIds, liderCelulaIds, maritalStatus, network, generateTempPassword, mustChangePassword, spouseId } = req.body;

        if (!email || !fullName) {
            return res.status(400).json({ message: 'Email and full name are required' });
        }

        // Forzar cambio de contraseña solo si se genera contraseña temporal
        let finalPassword = password;
        let shouldChangePassword = false;

        if (generateTempPassword) {
            const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
            const lower = 'abcdefghijklmnopqrstuvwxyz';
            const nums = '0123456789';
            const syms = '!@#$%^&*+-_';
            const all = upper + lower + nums + syms;

            let tempPass = '';
            tempPass += upper.charAt(Math.floor(Math.random() * upper.length));
            tempPass += lower.charAt(Math.floor(Math.random() * lower.length));
            tempPass += nums.charAt(Math.floor(Math.random() * nums.length));
            tempPass += syms.charAt(Math.floor(Math.random() * syms.length));

            for (let i = 0; i < 6; i++) {
                tempPass += all.charAt(Math.floor(Math.random() * all.length));
            }
            // Mezclar caracteres
            finalPassword = tempPass.split('').sort(() => 0.5 - Math.random()).join('');
            shouldChangePassword = true; // Solo forzar cambio si es contraseña temporal
        } else if (!password) {
            return res.status(400).json({ message: 'Password is required when not generating temporary password' });
        }

        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) return res.status(400).json({ message: 'El correo electrónico ya está registrado. Por favor use otro correo.' });

        // Check for duplicate phone number (more robust validation)
        if (phone && phone.trim() !== '') {
            const cleanPhone = phone.trim();
            const existingPhone = await prisma.user.findUnique({ where: { phone: cleanPhone } });
            if (existingPhone) {
                return res.status(400).json({ message: 'El número de teléfono ya está registrado. Por favor use otro teléfono.' });
            }
        }

        // Check for duplicate document information
        if (documentType && documentNumber) {
            const existingProfile = await prisma.userProfile.findFirst({
                where: { documentType, documentNumber }
            });
            if (existingProfile) {
                return res.status(400).json({ message: 'Ya existe un usuario registrado con este tipo y número de documento.' });
            }
        }

        const hashedPassword = await bcrypt.hash(finalPassword, 10);
        const coords = await geocodeAddress(address, city);

        // Clean phone number before storing
        const cleanPhone = phone && phone.trim() !== '' ? phone.trim() : null;

        const user = await prisma.$transaction(async (tx) => {
            const newUser = await tx.user.create({
                data: {
                    email,
                    password: hashedPassword,
                    phone: cleanPhone,
                    mustChangePassword: shouldChangePassword,
                    spouseId: spouseId ? parseInt(spouseId) : null,
                    profile: {
                        create: {
                            fullName,
                            sex,
                            address,
                            city,
                            latitude: coords.lat,
                            longitude: coords.lng,
                            documentType,
                            documentNumber,
                            birthDate: birthDate ? new Date(birthDate) : null,
                            maritalStatus: maritalStatus || null,
                            network: network || null,
                            dataPolicyAccepted: req.body.dataPolicyAccepted || false,
                            dataTreatmentAuthorized: req.body.dataTreatmentAuthorized || false,
                            minorConsentAuthorized: req.body.minorConsentAuthorized || false,
                        }
                    }
                },
                include: { profile: true }
            });

            const targetRole = await tx.role.upsert({
                where: { name: role || 'DISCIPULO' },
                update: {},
                create: { name: role || 'DISCIPULO' }
            });

            await tx.userRole.create({ data: { userId: newUser.id, roleId: targetRole.id } });

            // Create hierarchy for all provided leaders
            const hierarchyEntries = [
                { ids: pastorIds || (pastorId ? [pastorId] : []), role: 'PASTOR' },
                { ids: liderDoceIds || (liderDoceId ? [liderDoceId] : []), role: 'LIDER_DOCE' },
                { ids: liderCelulaIds || (liderCelulaId ? [liderCelulaId] : []), role: 'LIDER_CELULA' }
            ];

            for (const entry of hierarchyEntries) {
                const ids = Array.isArray(entry.ids) ? entry.ids : [entry.ids];
                for (const idToAssign of ids.filter(Boolean)) {
                    await tx.userHierarchy.create({
                        data: {
                            parentId: parseInt(idToAssign),
                            childId: newUser.id,
                            role: entry.role
                        }
                    });
                }
            }

            // Fallback for parentId if none of the specific ones were used
            const hasSpecificLeaders = hierarchyEntries.some(e => Array.isArray(e.ids) ? e.ids.length > 0 : !!e.ids);
            if (!hasSpecificLeaders && parentId) {
                await tx.userHierarchy.create({
                    data: {
                        parentId: parseInt(parentId),
                        childId: newUser.id,
                        role: roleInHierarchy || 'DISCIPULO'
                    }
                });
            }

            // Ensure spouse symmetry
            if (spouseId) {
                const sId = parseInt(spouseId);
                await tx.user.update({
                    where: { id: sId },
                    data: { spouseId: newUser.id }
                });
            }

            return newUser;
        });

        await logActivity(req.user.id, 'CREATE', 'USER', user.id, { targetUser: user.profile.fullName }, req.ip, req.headers['user-agent']);

        res.status(201).json({
            user: {
                id: user.id,
                email: user.email,
                fullName: user.profile.fullName,
                roles: [role || 'DISCIPULO']
            },
        });
    } catch (error) {
        console.error('Error creating user:', error);

        // Handle Prisma unique constraint errors
        if (error.code === 'P2002') {
            const targetField = error.meta?.target?.[0];
            if (targetField === 'phone') {
                return res.status(400).json({
                    message: 'El número de teléfono ya está registrado. Por favor use otro teléfono.'
                });
            } else if (targetField === 'email') {
                return res.status(400).json({
                    message: 'El correo electrónico ya está registrado. Por favor use otro correo.'
                });
            } else {
                return res.status(400).json({
                    message: 'Ya existe un usuario con estos datos. Por favor verifique la información.'
                });
            }
        }

        res.status(500).json({ message: 'Error del servidor al crear usuario' });
    }
};

// Admin: Eliminar usuario
const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = parseInt(id);

        if (userId === req.user.id) return res.status(400).json({ message: 'Cannot delete your own account' });

        const userToDelete = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                _count: {
                    select: {
                        children: true,
                        ledCells: true,
                        invitedGuests: true,
                        churchAttendances: true,
                        cellAttendances: true,
                        seminarEnrollments: true,
                        classAttendances: true,
                        conventionRegistrations: true,
                        registeredConventions: true,
                        encuentroRegistrations: true,
                        guestCalls: true,
                        guestVisits: true
                    }
                }
            }
        });

        if (!userToDelete) return res.status(404).json({ message: 'User not found' });

        // Security check for deletion
        if (!req.user.roles.includes('ADMIN')) {
            const networkIds = await getUserNetwork(req.user.id);
            if (!networkIds.includes(userId)) {
                console.warn(`Unauthorized delete attempt by user ${req.user.id} on user ${userId}`);
                return res.status(403).json({ message: 'No tienes permiso para eliminar usuarios fuera de tu red' });
            }
        }

        if (userToDelete._count.children > 0 || userToDelete._count.ledCells > 0 || userToDelete._count.invitedGuests > 0) {
            return res.status(400).json({ message: 'El usuario tiene dependencias (Discipulos, Células o Invitados) y aún no puede ser eliminado.' });
        }

        await prisma.$transaction([
            // Eliminar roles y jerarquías
            prisma.userRole.deleteMany({ where: { userId } }),
            prisma.userHierarchy.deleteMany({ where: { OR: [{ parentId: userId }, { childId: userId }] } }),

            // Eliminar asistencias y registros relacionados
            prisma.churchAttendance.deleteMany({ where: { userId } }),
            prisma.cellAttendance.deleteMany({ where: { userId } }),
            prisma.classAttendance.deleteMany({ where: { userId } }),
            prisma.seminarEnrollment.deleteMany({ where: { userId } }),

            // Eliminar registros de eventos
            prisma.conventionRegistration.deleteMany({ where: { userId } }),
            prisma.conventionRegistration.deleteMany({ where: { registeredById: userId } }),
            prisma.encuentroRegistration.deleteMany({ where: { userId } }),

            // Eliminar llamadas y visitas a invitados
            prisma.guestCall.deleteMany({ where: { callerId: userId } }),
            prisma.guestVisit.deleteMany({ where: { visitorId: userId } }),

            // Eliminar perfil y usuario
            prisma.userProfile.delete({ where: { userId } }),
            prisma.user.delete({ where: { id: userId } })
        ]);

        await logActivity(req.user.id, 'DELETE', 'USER', userId, { targetId: userId }, req.ip, req.headers['user-agent']);

        res.status(200).json({ message: 'Usuario eliminado exitosamente' });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ message: 'Error del servidor al eliminar usuario' });
    }
};

// Admin: Asignar líder a usuario
const assignLeader = async (req, res) => {
    try {
        const { id } = req.params;
        const { parentId, role } = req.body;

        const userId = parseInt(id);
        const pId = parseInt(parentId);

        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) return res.status(404).json({ message: 'User not found' });

        // Update hierarchy: remove old for this role, add new
        if (role) {
            await prisma.userHierarchy.deleteMany({
                where: { childId: userId, role: role }
            });
        } else {
            // Default behavior if no role provided (standard assignment)
            await prisma.userHierarchy.deleteMany({ where: { childId: userId } });
        }

        if (parentId) {
            await prisma.userHierarchy.create({
                data: {
                    parentId: pId,
                    childId: userId,
                    role: role || 'DISCIPULO'
                }
            });
        }

        res.status(200).json({ message: 'Leader assigned successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Obtener usuarios en mi red (para líderes)
const getMyNetwork = async (req, res) => {
    try {
        const userId = req.user.id;
        const networkIds = await getUserNetwork(userId);

        if (networkIds.length === 0) {
            return res.json([]);
        }

        const users = await prisma.user.findMany({
            where: {
                id: { in: networkIds }
            },
            include: {
                profile: true,
                roles: { include: { role: true } }
            },
            orderBy: { profile: { fullName: 'asc' } }
        });

        const formatted = users.map(u => ({
            id: u.id,
            fullName: u.profile.fullName,
            email: u.email,
            phone: u.phone,
            roles: u.roles.map(r => r.role.name)
        }));

        res.json(formatted);
    } catch (error) {
        console.error('Error fetching my network:', error);
        res.status(500).json({ error: 'Error fetching network' });
    }
};

/**
 * Public search for inviters (discípulos)
 * Securely returns only id and fullName
 */
const searchPublicUsers = async (req, res) => {
    try {
        const { search } = req.query;

        if (!search || search.length < 3) {
            return res.status(400).json({ message: 'Search term must be at least 3 characters' });
        }

        const users = await prisma.user.findMany({
            where: {
                profile: {
                    fullName: {
                        contains: search,
                        mode: 'insensitive'
                    }
                }
            },
            select: {
                id: true,
                profile: {
                    select: {
                        fullName: true
                    }
                }
            },
            take: 10
        });

        const formatted = users.map(u => ({
            id: u.id,
            fullName: u.profile.fullName
        }));

        res.json(formatted);
    } catch (error) {
        console.error('Error in searchPublicUsers:', error);
        res.status(500).json({ message: 'Error searching users' });
    }
};

// Internal search for coordinators (Pastors/Doce)
const searchUsers = async (req, res) => {
    try {
        const { search, role, excludeRoles } = req.query;
        // Basic check: current user must be at least LIDER_DOCE, PASTOR, or ADMIN (enforced by route middleware)

        const where = {};

        if (search) {
            where.OR = [
                { profile: { fullName: { contains: search, mode: 'insensitive' } } },
                { email: { contains: search, mode: 'insensitive' } }
            ];
        }

        if (role) {
            where.roles = {
                some: {
                    role: { name: role }
                }
            };
        }

        if (excludeRoles) {
            const rolesToExclude = excludeRoles.split(',');
            where.roles = {
                ...where.roles,
                none: {
                    role: { name: { in: rolesToExclude } }
                }
            };
        }

        const users = await prisma.user.findMany({
            where,
            select: {
                id: true,
                email: true,
                profile: { select: { fullName: true } },
                roles: { select: { role: { select: { name: true } } } }
            },
            take: 20
        });

        const formatted = users.map(u => ({
            id: u.id,
            email: u.email,
            fullName: u.profile?.fullName || 'Sin Nombre',
            roles: u.roles.map(r => r.role.name)
        }));

        res.json(formatted);
    } catch (error) {
        console.error('Error searching users internal:', error);
        res.status(500).json({ message: 'Server error searching users' });
    }
};

module.exports = {
    getProfile,
    updateProfile,
    changePassword,
    getAllUsers,
    getUserById,
    updateUser,
    createUser,
    deleteUser,
    assignLeader,
    getMyNetwork,
    searchPublicUsers,
    searchUsers
};
