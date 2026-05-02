const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const axios = require('axios');
const { randomInt } = require('crypto');
const { logActivity } = require('../utils/auditLogger');
const { validatePassword } = require('../utils/passwordValidator');
const { canManageUser, getVisibleRoles, MANAGABLE_ROLES, PROTECTED_ROLES, hasAdminAccessOnModule } = require('../middleware/coordinatorAuth');

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
const { getUserNetworkId } = require('../middleware/coordinatorAuth');

/**
 * Common include configuration for Prisma user queries to ensure all necessary
 * relations are loaded for formatUser and frontend display.
 */
const USER_FULL_INCLUDE = {
    roles: { include: { role: true } },
    profile: true,
    artRoles: true,
    moduleCoordinations: true,
    moduleTreasurers: true,
    professorModules: { select: { id: true, name: true } },
    auxiliaryModules: { select: { id: true, name: true } },
    parents: { include: { parent: { include: { profile: true } } } },
    spouse: true
};

/**
 * Auxiliar para formatear un objeto de usuario de Prisma a un formato aplanado para el frontend.
 */
const formatUser = (user) => {
    if (!user) return null;

    let pastorId = null;
    let liderDoceId = null;
    let liderCelulaId = null;
    let pastorIds = [];
    let liderDoceIds = [];
    let liderCelulaIds = [];
    let pastorSpouseIds = [];
    let liderDoceSpouseIds = [];
    let liderCelulaSpouseIds = [];
    let pastorName = null;
    let liderDoceName = null;

    // Handle parents field gracefully - default to empty array if not included
    const parents = user.parents || [];
    if (parents.length > 0) {
        // Legacy single IDs
        const pastorParent = parents.find(p => p.role === 'PASTOR');
        const liderDoceParent = parents.find(p => p.role === 'LIDER_DOCE');
        const liderCelulaParent = parents.find(p => p.role === 'LIDER_CELULA');

        pastorId = pastorParent?.parentId || null;
        liderDoceId = liderDoceParent?.parentId || null;
        liderCelulaId = liderCelulaParent?.parentId || null;

        // Get names from parent profiles
        pastorName = pastorParent?.parent?.profile?.fullName || null;
        liderDoceName = liderDoceParent?.parent?.profile?.fullName || null;

        // New array format
        pastorIds = parents.filter(p => p.role === 'PASTOR').map(p => p.parentId);
        liderDoceIds = parents.filter(p => p.role === 'LIDER_DOCE').map(p => p.parentId);
        liderCelulaIds = parents.filter(p => p.role === 'LIDER_CELULA').map(p => p.parentId);
    }

    // Get spouse info from the user object
    if (user.spouse && user.spouse.id) {
        const spouseId = user.spouse.id;
        // Add spouse ID to the appropriate spouse array as array
        pastorSpouseIds = [spouseId];
        liderDoceSpouseIds = [spouseId];
        liderCelulaSpouseIds = [spouseId];
    }

    // Roles secundarios derivados de relaciones funcionales (no de UserRole)
    const secondaryRoles = [];

    // Roles en Escuela de Artes
    if (user.artRoles && user.artRoles.length > 0) {
        user.artRoles.forEach(ar => {
            const label = `ARTE_${ar.role}`;
            if (!secondaryRoles.includes(label)) secondaryRoles.push(label);
        });
    }

    // Coordinaciones de módulo
    if (user.moduleCoordinations && user.moduleCoordinations.length > 0) {
        user.moduleCoordinations.forEach(mc => {
            const label = `COORD_${mc.moduleName.toUpperCase()}`;
            if (!secondaryRoles.includes(label)) secondaryRoles.push(label);
        });
    }

    // Tesorerías de módulo
    if (user.moduleTreasurers && user.moduleTreasurers.length > 0) {
        user.moduleTreasurers.forEach(mt => {
            const label = `TES_${mt.moduleName.toUpperCase()}`;
            if (!secondaryRoles.includes(label)) secondaryRoles.push(label);
        });
    }

    // Módulos como profesor
    if (user.professorModules && user.professorModules.length > 0) {
        if (!secondaryRoles.includes('PROFESOR')) secondaryRoles.push('PROFESOR');
    }

    // Módulos como auxiliar
    if (user.auxiliaryModules && user.auxiliaryModules.length > 0) {
        if (!secondaryRoles.includes('AUXILIAR')) secondaryRoles.push('AUXILIAR');
    }

    return {
        ...(user.profile || {}),
        id: user.id,
        email: user.email,
        phone: user.phone,
        isActive: user.isActive,
        roles: user.roles ? user.roles.map(r => r.role.name) : [],
        secondaryRoles,
        pastorId,
        liderDoceId,
        liderCelulaId,
        pastorIds,
        liderDoceIds,
        liderCelulaIds,
        pastorSpouseIds,
        liderDoceSpouseIds,
        liderCelulaSpouseIds,
        pastorName,
        liderDoceName,
        isCoordinator: user.isCoordinator || (user.moduleCoordinations && user.moduleCoordinations.length > 0),
        isModuleTreasurer: user.moduleTreasurers && user.moduleTreasurers.length > 0,
        moduleCoordinations: user.moduleCoordinations?.map(mc => mc.moduleName) || [],
        moduleTreasurers: user.moduleTreasurers?.map(mt => mt.moduleName) || [],
        mustChangePassword: user.mustChangePassword,
        spouseId: user.spouseId,
        hierarchy: parents.map(p => ({
            parentId: p.parentId,
            parentName: p.parent?.profile?.fullName || '(sin nombre)',
            role: p.role
        }))
    };
};
const getProfile = async (req, res) => {
    try {
        const userId = parseInt(req.user.id);
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: USER_FULL_INCLUDE
        });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.status(200).json({
            user: formatUser(user)
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Actualizar perfil propio
const updateProfile = async (req, res) => {
    try {
        const userId = parseInt(req.user.id);
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

const getAllUsers = async (req, res) => {
    try {
        const { role, page = 1, limit, search, sexFilter, liderDoceFilter, export: exportAll, leadersOnly } = req.query;
        const pageNum = parseInt(page);

        // Handle leadersOnly request - return all leaders regardless of other filters
        if (leadersOnly === 'true') {
            const leaderRoles = ['PASTOR', 'LIDER_DOCE', 'LIDER_CELULA'];

            const leaders = await prisma.user.findMany({
                where: {
                    isDeleted: false,
                    roles: {
                        some: {
                            role: { name: { in: leaderRoles } }
                        }
                    }
                },
                include: {
                    profile: true,
                    roles: { include: { role: true } },
                    parents: { include: { parent: { include: { profile: true } } } },
                    spouse: true
                },
                orderBy: { profile: { fullName: 'asc' } }
            });

            return res.json({
                users: leaders.map(formatUser)
            });
        }

        // Para ADMIN, no hay límite por defecto (pueden ver todos los usuarios)
        // Para otros roles, mantener el límite de 50 por defecto
        // Si export=true, siempre devolver todos los usuarios (solo ADMIN puede usar esto)
        const isExport = exportAll === 'true';

        // Solo ADMIN puede exportar todos los usuarios
        if (isExport && !req.user.roles.includes('ADMIN')) {
            return res.status(403).json({ message: 'Solo los administradores pueden exportar todos los usuarios' });
        }

        let limitNum = isExport ? undefined : (limit ? parseInt(limit) : (req.user.roles.includes('ADMIN') ? undefined : 50));

        if (req.user.roles.includes('ADMIN') || req.user.roles.includes('PASTOR')) {
            let rolesFilter = undefined;
            if (req.user.roles.includes('ADMIN')) {
                if (role) {
                    rolesFilter = { some: { role: { name: role } } };
                }
            } else {
                rolesFilter = {
                    none: { role: { name: 'ADMIN' } },
                    ...(role && { some: { role: { name: role } } })
                };
            }

            // Construir filtro de búsqueda
            let searchFilter = {};
            if (search) {
                searchFilter = {
                    OR: [
                        { profile: { fullName: { contains: search, mode: 'insensitive' } } },
                        { email: { contains: search, mode: 'insensitive' } }
                    ]
                };
            }

            // Filtro de sexo
            let sexFilterObj = {};
            if (sexFilter) {
                sexFilterObj = { profile: { sex: sexFilter } };
            }

            // Filtro de líder de 12
            let liderDoceFilterObj = {};
            if (liderDoceFilter) {
                liderDoceFilterObj = {
                    parents: {
                        some: {
                            parentId: parseInt(liderDoceFilter),
                            role: 'LIDER_DOCE'
                        }
                    }
                };
            }

            // Combinar todos los filtros
            const whereClause = {
                isDeleted: false,
                ...(rolesFilter && { roles: rolesFilter }),
                ...(Object.keys(searchFilter).length > 0 && searchFilter),
                ...(Object.keys(sexFilterObj).length > 0 && sexFilterObj),
                ...(Object.keys(liderDoceFilterObj).length > 0 && liderDoceFilterObj)
            };

            // Obtener total de usuarios para paginación
            const totalCount = await prisma.user.count({
                where: whereClause
            });

            const queryOptions = {
                where: whereClause,
                include: USER_FULL_INCLUDE,
                orderBy: { id: 'desc' }
            };

            // Aplicar paginación solo si hay un límite definido
            if (limitNum !== undefined) {
                queryOptions.skip = (pageNum - 1) * limitNum;
                queryOptions.take = limitNum;
            }

            const users = await prisma.user.findMany(queryOptions);

            return res.json({
                users: users.map(formatUser),
                pagination: {
                    page: pageNum,
                    limit: limitNum,
                    total: totalCount,
                    pages: limitNum ? Math.ceil(totalCount / limitNum) : 1
                }
            });
        }

        if (req.user.roles.includes('LIDER_DOCE') || req.user.roles.includes('LIDER_CELULA')) {
            const requesterNetworkId = await getUserNetwork(req.user.id);

            if (!requesterNetworkId || requesterNetworkId.length === 0) {
                return res.json({
                    users: [],
                    pagination: {
                        page: pageNum,
                        limit: limitNum,
                        total: 0,
                        pages: 0
                    }
                });
            }

            const isLiderCelula = req.user.roles.includes('LIDER_CELULA');

            let searchFilter = {};
            if (search) {
                searchFilter = {
                    OR: [
                        { profile: { fullName: { contains: search, mode: 'insensitive' } } },
                        { email: { contains: search, mode: 'insensitive' } }
                    ]
                };
            }

            let sexFilterObj = {};
            if (sexFilter) {
                sexFilterObj = { profile: { sex: sexFilter } };
            }

            let liderDoceFilterObj = {};
            if (liderDoceFilter) {
                liderDoceFilterObj = {
                    parents: {
                        some: {
                            parentId: parseInt(liderDoceFilter),
                            role: 'LIDER_DOCE'
                        }
                    }
                };
            }

            let roleFilterObj = {};
            if (role) {
                roleFilterObj = {
                    roles: {
                        some: {
                            role: { name: role }
                        }
                    }
                };
            } else if (isLiderCelula) {
                roleFilterObj = {
                    roles: {
                        some: {
                            role: { name: { in: ['DISCIPULO', 'LIDER_CELULA'] } }
                        }
                    }
                };
            }

            const whereClause = {
                isDeleted: false,
                id: { in: requesterNetworkId },
                ...roleFilterObj,
                ...(Object.keys(searchFilter).length > 0 && searchFilter),
                ...(Object.keys(sexFilterObj).length > 0 && sexFilterObj),
                ...(Object.keys(liderDoceFilterObj).length > 0 && liderDoceFilterObj)
            };

            const totalCount = await prisma.user.count({
                where: whereClause
            });

            const queryOptions = {
                where: whereClause,
                include: USER_FULL_INCLUDE,
                orderBy: { id: 'desc' }
            };

            if (limitNum !== undefined) {
                queryOptions.skip = (pageNum - 1) * limitNum;
                queryOptions.take = limitNum;
            }

            const users = await prisma.user.findMany(queryOptions);

            return res.json({
                users: users.map(formatUser),
                pagination: {
                    page: pageNum,
                    limit: limitNum,
                    total: totalCount,
                    pages: limitNum ? Math.ceil(totalCount / limitNum) : 1
                }
            });
        }

        if (req.user.isModuleCoordinator) {
            // Construir filtro de búsqueda
            let searchFilter = {};
            if (search) {
                searchFilter = {
                    OR: [
                        { profile: { fullName: { contains: search, mode: 'insensitive' } } },
                        { email: { contains: search, mode: 'insensitive' } }
                    ]
                };
            }

            // Filtro de sexo
            let sexFilterObj = {};
            if (sexFilter) {
                sexFilterObj = { profile: { sex: sexFilter } };
            }

            // Filtro de líder de 12
            let liderDoceFilterObj = {};
            if (liderDoceFilter) {
                liderDoceFilterObj = {
                    parents: {
                        some: {
                            parentId: parseInt(liderDoceFilter),
                            role: 'LIDER_DOCE'
                        }
                    }
                };
            }

            // Combinar todos los filtros
            const whereClause = {
                isDeleted: false,
                roles: {
                    some: {
                        role: {
                            name: role || { in: MANAGABLE_ROLES }
                        }
                    }
                },
                ...(Object.keys(searchFilter).length > 0 && searchFilter),
                ...(Object.keys(sexFilterObj).length > 0 && sexFilterObj),
                ...(Object.keys(liderDoceFilterObj).length > 0 && liderDoceFilterObj)
            };

            // Obtener total de usuarios para paginación
            const totalCount = await prisma.user.count({
                where: whereClause
            });

            const queryOptions = {
                where: whereClause,
                include: USER_FULL_INCLUDE,
                orderBy: { id: 'desc' }
            };

            // Aplicar paginación solo si hay un límite definido
            if (limitNum !== undefined) {
                queryOptions.skip = (pageNum - 1) * limitNum;
                queryOptions.take = limitNum;
            }

            const users = await prisma.user.findMany(queryOptions);

            return res.json({
                users: users.map(formatUser),
                pagination: {
                    page: pageNum,
                    limit: limitNum,
                    total: totalCount,
                    pages: limitNum ? Math.ceil(totalCount / limitNum) : 1
                }
            });
        }

        return res.json([]);

    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const getUserById = async (req, res) => {
    try {
        const userId = parseInt(req.params.id);

        if (isNaN(userId)) {
            return res.status(400).json({ message: 'ID de usuario inválido' });
        }

        // Permitir que los ADMIN accedan a su propia cuenta, otros roles no pueden
        if (req.user.id === userId && !req.user.roles.includes('ADMIN')) {
            return res.status(403).json({ message: 'Cannot access your own account via this endpoint. Use /profile instead.' });
        }

        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: USER_FULL_INCLUDE
        });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const targetRole = user.roles?.[0]?.role?.name;
        const permission = await canManageUser(req.user, targetRole, user.profile?.network);

        if (!permission.canManage) {
            return res.status(403).json({ message: permission.reason });
        }

        res.status(200).json({ user: formatUser(user) });

    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const updateUser = async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        const currentUserId = req.user.id;

        if (isNaN(userId)) {
            return res.status(400).json({ message: 'ID de usuario inválido' });
        }

        // Permitir que los ADMIN se modifiquen a sí mismos, otros roles no pueden
        if (userId === currentUserId && !req.user.roles.includes('ADMIN')) {
            return res.status(403).json({ message: 'Cannot modify your own account through this endpoint. Use /profile instead.' });
        }

        const targetUser = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                roles: { include: { role: true } },
                profile: true
            }
        });

        if (!targetUser || targetUser.isDeleted) {
            return res.status(404).json({ message: 'User not found' });
        }

        const targetRole = targetUser.roles?.[0]?.role?.name;
        const permission = await canManageUser(req.user, targetRole, targetUser.profile?.network);

        if (!permission.canManage) {
            return res.status(403).json({ message: permission.reason });
        }

        const { fullName, email, role, sex, phone, address, city, neighborhood, parentId, roleInHierarchy, documentType, documentNumber, birthDate, pastorId, liderDoceId, liderCelulaId, pastorIds, liderDoceIds, liderCelulaIds, pastorSpouseIds, liderDoceSpouseIds, liderCelulaSpouseIds, maritalStatus, network, isCoordinator, spouseId } = req.body;

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
            const newUser = await tx.user.update({
                where: { id: userId },
                data: {
                    ...(email !== undefined && { email }),
                    ...(cleanPhone !== undefined && { phone: cleanPhone }),
                    ...(isCoordinator !== undefined && { isCoordinator }),
                    ...(spouseId !== undefined && {
                        spouseId: spouseId ? parseInt(spouseId) : null
                    }),
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
                const existingRoles = await tx.userRole.findMany({
                    where: { userId },
                    include: { role: true }
                });

                const PRIMARY_ROLES = ['ADMIN', 'PASTOR', 'LIDER_DOCE', 'LIDER_CELULA', 'DISCIPULO', 'INVITADO'];
                const secondaryRoles = existingRoles
                    .map(ur => ur.role.name)
                    .filter(name => !PRIMARY_ROLES.includes(name));

                const newRolesToAssign = [...new Set([role, ...secondaryRoles])];

                await tx.userRole.deleteMany({ where: { userId } });

                for (const roleName of newRolesToAssign) {
                    const r = await tx.role.upsert({
                        where: { name: roleName },
                        update: {},
                        create: { name: roleName }
                    });
                    await tx.userRole.create({ data: { userId, roleId: r.id } });
                }
            }

            // 3. Update Hierarchy if leaders provided
            const hierarchyEntries = [
                { ids: pastorIds || (pastorId ? [pastorId] : undefined), spouseIds: pastorSpouseIds || [], role: 'PASTOR' },
                { ids: liderDoceIds || (liderDoceId ? [liderDoceId] : undefined), spouseIds: liderDoceSpouseIds || [], role: 'LIDER_DOCE' },
                { ids: liderCelulaIds || (liderCelulaId ? [liderCelulaId] : undefined), spouseIds: liderCelulaSpouseIds || [], role: 'LIDER_CELULA' }
            ];

            // If any of these are explicitly passed (even as null/empty to remove), we update
            if (pastorId !== undefined || liderDoceId !== undefined || liderCelulaId !== undefined || pastorIds !== undefined || liderDoceIds !== undefined || liderCelulaIds !== undefined || parentId !== undefined || pastorSpouseIds !== undefined || liderDoceSpouseIds !== undefined || liderCelulaSpouseIds !== undefined) {
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

                            // Process main leaders
                            const ids = Array.isArray(entry.ids) ? entry.ids : [entry.ids];
                            for (const idToAssign of ids.filter(Boolean)) {
                                await tx.userHierarchy.upsert({
                                    where: {
                                        parentId_childId_role: {
                                            parentId: parseInt(idToAssign),
                                            childId: userId,
                                            role: entry.role
                                        }
                                    },
                                    update: {},
                                    create: {
                                        parentId: parseInt(idToAssign),
                                        childId: userId,
                                        role: entry.role
                                    }
                                });
                            }

                            // Process spouse IDs - filter out duplicates with main leaders
                            const spouseIds = Array.isArray(entry.spouseIds) ? entry.spouseIds : [entry.spouseIds];
                            const mainIds = (Array.isArray(entry.ids) ? entry.ids : [entry.ids]).map(id => parseInt(id));
                            for (const spouseIdToAssign of spouseIds.filter(Boolean)) {
                                // Skip if this spouse is already in the main IDs (compare as integers)
                                if (mainIds.includes(parseInt(spouseIdToAssign))) continue;
                                await tx.userHierarchy.upsert({
                                    where: {
                                        parentId_childId_role: {
                                            parentId: parseInt(spouseIdToAssign),
                                            childId: userId,
                                            role: entry.role
                                        }
                                    },
                                    update: {},
                                    create: {
                                        parentId: parseInt(spouseIdToAssign),
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

            return newUser;
        });

        const finalUpdated = await prisma.user.findUnique({
            where: { id: userId },
            include: { profile: true, roles: { include: { role: true } } }
        });

        await logActivity(req.user.id, 'UPDATE', 'USER', userId, { targetUser: finalUpdated.profile?.fullName }, req.ip, req.headers['user-agent']);

        res.status(200).json({
            user: formatUser(finalUpdated)
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
        const { email, password, fullName, role, sex, phone, address, city, parentId, roleInHierarchy, documentType, documentNumber, birthDate, pastorId, liderDoceId, liderCelulaId, pastorIds, liderDoceIds, liderCelulaIds, pastorSpouseIds, liderDoceSpouseIds, liderCelulaSpouseIds, maritalStatus, network, generateTempPassword, mustChangePassword, spouseId } = req.body;

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

            let chars = [];
            chars.push(upper[randomInt(0, upper.length)]);
            chars.push(lower[randomInt(0, lower.length)]);
            chars.push(nums[randomInt(0, nums.length)]);
            chars.push(syms[randomInt(0, syms.length)]);

            const all = upper + lower + nums + syms;
            for (let i = 0; i < 6; i++) {
                chars.push(all[randomInt(0, all.length)]);
            }

            // Shuffle Fisher-Yates
            for (let i = chars.length - 1; i > 0; i--) {
                const j = randomInt(0, i + 1);
                [chars[i], chars[j]] = [chars[j], chars[i]];
            }
            finalPassword = chars.join('');
            shouldChangePassword = true;
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
                { ids: pastorIds || (pastorId ? [pastorId] : []), spouseIds: pastorSpouseIds || [], role: 'PASTOR' },
                { ids: liderDoceIds || (liderDoceId ? [liderDoceId] : []), spouseIds: liderDoceSpouseIds || [], role: 'LIDER_DOCE' },
                { ids: liderCelulaIds || (liderCelulaId ? [liderCelulaId] : []), spouseIds: liderCelulaSpouseIds || [], role: 'LIDER_CELULA' }
            ];

            for (const entry of hierarchyEntries) {
                // Process main leaders
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

                // Process spouse IDs - filter out duplicates with main leaders
                const spouseIds = Array.isArray(entry.spouseIds) ? entry.spouseIds : [entry.spouseIds];
                const mainIds = (Array.isArray(entry.ids) ? entry.ids : [entry.ids]).map(id => parseInt(id));
                for (const spouseIdToAssign of spouseIds.filter(Boolean)) {
                    // Skip if this spouse is already in the main IDs (compare as integers)
                    if (mainIds.includes(parseInt(spouseIdToAssign))) continue;
                    await tx.userHierarchy.create({
                        data: {
                            parentId: parseInt(spouseIdToAssign),
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

        const createdUser = await prisma.user.findUnique({
            where: { id: user.id },
            include: { profile: true, roles: { include: { role: true } } }
        });

        await logActivity(req.user.id, 'CREATE', 'USER', createdUser.id, { targetUser: createdUser.profile?.fullName }, req.ip, req.headers['user-agent']);

        res.status(201).json({
            user: formatUser(createdUser)
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

const deleteUser = async (req, res) => {
    try {
        const userId = parseInt(req.params.id);

        if (isNaN(userId)) {
            return res.status(400).json({ message: 'ID de usuario inválido' });
        }

        if (!req.user.roles.includes('ADMIN')) {
            return res.status(403).json({ message: 'Only administrators can delete users' });
        }

        if (userId === req.user.id) {
            return res.status(403).json({ message: 'Cannot delete your own account' });
        }

        const userToDelete = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                roles: { include: { role: true } },
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

        const targetRole = userToDelete.roles?.[0]?.role?.name;
        if (targetRole === 'ADMIN') {
            return res.status(403).json({ message: 'Cannot delete admin users' });
        }

        if (userToDelete._count.children > 0 || userToDelete._count.ledCells > 0 || userToDelete._count.invitedGuests > 0) {
            return res.status(400).json({ message: 'El usuario tiene dependencias (Discipulos, Células o Invitados) y aún no puede ser eliminado.' });
        }

        await prisma.$transaction([
            // Eliminar roles y jerarquías
            prisma.userRole.deleteMany({ where: { userId } }),
            prisma.userHierarchy.deleteMany({ where: { OR: [{ parentId: userId }, { childId: userId }] } }),

            // Eliminar coordinaciones
            prisma.moduleCoordinator.deleteMany({ where: { userId } }),
            prisma.moduleSubCoordinator.deleteMany({ where: { userId } }),

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

// Obtener usuarios en mi red (para líderes) - MODIFICADO para soportar ADMIN
const getMyNetwork = async (req, res) => {
    try {
        const userId = req.user.id;
        const userRoles = req.user.roles || [];

        // Si es ADMIN, devolver todos los usuarios (excepto otros admins y el mismo usuario)
        if (userRoles.includes('ADMIN')) {
            const users = await prisma.user.findMany({
                where: {
                    id: { not: userId },
                    roles: {
                        none: {
                            role: { name: 'ADMIN' }
                        }
                    }
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

            return res.json(formatted);
        }

        // Para otros roles, usar la lógica normal de red
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
        const { search, excludeRoles } = req.query;

        if (!search || search.length < 3) {
            return res.status(400).json({ message: 'Search term must be at least 3 characters' });
        }

        let where = {
            isDeleted: false,
            profile: {
                fullName: {
                    contains: search,
                    mode: 'insensitive'
                }
            }
        };

        // Add role exclusions if provided
        if (excludeRoles) {
            const excludedRolesArray = excludeRoles.split(',');
            where['roles'] = {
                none: {
                    role: {
                        name: {
                            in: excludedRolesArray
                        }
                    }
                }
            };
        }

        const users = await prisma.user.findMany({
            where,
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

const searchUsers = async (req, res) => {
    try {
        const { q, search, role, page = 1, limit = 20, allowAllRoles = false, excludeRoles } = req.query;

        // Accept both 'q' and 'search' parameters for compatibility
        const searchQuery = q || search;
        const allowAllRolesBool = allowAllRoles === 'true';

        // Allow empty search when role, excludeRoles, or allowAllRoles is specified
        if (!searchQuery && !role && !excludeRoles && !allowAllRolesBool) {
            return res.status(400).json({ message: 'Search query or role parameter is required' });
        }

        let where = {
            isDeleted: false
        };

        // Add role exclusions if provided
        if (excludeRoles) {
            const excludedRolesArray = excludeRoles.split(',');
            where['roles'] = {
                none: {
                    role: {
                        name: {
                            in: excludedRolesArray
                        }
                    }
                }
            };
        }

        // Add search conditions only if search query is provided and has meaningful content
        if (searchQuery && searchQuery.trim() && searchQuery.trim().length >= 2) {
            const trimmedQuery = searchQuery.trim();
            where['OR'] = [
                { email: { contains: trimmedQuery, mode: 'insensitive' } },
                { profile: { fullName: { contains: trimmedQuery, mode: 'insensitive' } } }
            ];
        } else if (searchQuery && searchQuery.trim() && searchQuery.trim().length > 0 && searchQuery.trim().length < 2) {
            return res.status(400).json({ message: 'Search query must be at least 2 characters' });
        }

        // Pre-process role for multiple role support
        // Handle both array ['ROLE1', 'ROLE2'] and comma-separated string "ROLE1,ROLE2"
        const roleFilter = role
            ? Array.isArray(role)
                ? { in: role }
                : role.includes(',')
                    ? { in: role.split(',') }
                    : role
            : null;

        // Special case: when excludeRoles is provided without role filter, allow global search
        // This enables any authenticated user to search all users except excluded roles
        if (excludeRoles && !roleFilter) {
            // No additional role restrictions - excludeRoles already handled in where clause
        }
        // Special case for Art School enrollment - allow all roles
        else if (allowAllRolesBool && (req.user.roles.includes('ADMIN') || req.user.roles.includes('PASTOR') || req.user.isModuleCoordinator)) {
            if (roleFilter) {
                where['roles'] = {
                    ...(where['roles'] || {}),
                    some: { role: { name: roleFilter } }
                };
            }
        }
        else if (req.user.roles.includes('ADMIN') || req.user.roles.includes('PASTOR')) {
            if (roleFilter) {
                where['roles'] = {
                    ...(where['roles'] || {}),
                    some: { role: { name: roleFilter } }
                };
            }
        }
        else if (req.user.isModuleCoordinator) {
            const allowedRoles = [...MANAGABLE_ROLES, 'LIDER_DOCE'];

            if (role) {
                const requestedRoles = role.split(',');
                if (requestedRoles.some(r => !allowedRoles.includes(r))) {
                    return res.status(403).json({ message: `You cannot search for one or more requested roles: ${role}` });
                }
            }

            where['roles'] = {
                ...(where['roles'] || {}),
                some: { role: { name: roleFilter ? roleFilter : { in: allowedRoles } } }
            };
        }
        else if (req.user.roles.includes('LIDER_DOCE')) {
            const requesterNetwork = await getUserNetwork(req.user.id);
            if (!requesterNetwork || requesterNetwork.length === 0) {
                return res.json([]);
            }
            where['id'] = { in: requesterNetwork };

            const allowedRoles = [...MANAGABLE_ROLES, 'LIDER_DOCE'];

            if (role) {
                const requestedRoles = role.split(',');
                if (requestedRoles.some(r => !allowedRoles.includes(r))) {
                    return res.status(403).json({ message: `You cannot search for one or more requested roles: ${role}` });
                }
            }

            where['roles'] = {
                ...(where['roles'] || {}),
                some: { role: { name: roleFilter ? roleFilter : { in: allowedRoles } } }
            };
        }
        else {
            return res.json([]);
        }

        const users = await prisma.user.findMany({
            where,
            include: {
                roles: { include: { role: true } },
                profile: true,
                parents: { include: { parent: { include: { profile: true } } } }
            },
            skip: (parseInt(page) - 1) * parseInt(limit),
            take: parseInt(limit)
        });

        res.json(users.map(formatUser));

    } catch (error) {
        console.error('Error searching users:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

/**
 * Get users by IDs (for caching related users to avoid "Cargando..." issue)
 */
const getUsersByIds = async (req, res) => {
    try {
        const { ids } = req.query;

        if (!ids) {
            return res.status(400).json({ error: 'IDs parameter is required' });
        }

        const idArray = ids.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));

        if (idArray.length === 0) {
            return res.json({ users: [] });
        }

        const users = await prisma.user.findMany({
            where: {
                id: { in: idArray }
            },
            include: {
                profile: true,
                roles: { include: { role: true } },
                parents: { include: { parent: { include: { profile: true } } } },
                spouse: {
                    include: {
                        profile: true
                    }
                }
            }
        });

        const formattedUsers = users.map(formatUser);
        res.json({ users: formattedUsers });
    } catch (error) {
        console.error('Error fetching users by IDs:', error);
        res.status(500).json({ error: 'Error fetching users' });
    }
};

const getUsersWithoutCell = async (req, res) => {
    try {
        const { search, page = 1, limit = 50, liderDoceId, role: roleParam, network: networkParam, all } = req.query;
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);

        // Access check: ADMIN, PASTOR or Coordinator of 'enviar'
        const isAdminOrPastor = req.user.roles.some(r => ['ADMIN', 'PASTOR'].includes(r));
        const isEnviarCoordinator = hasAdminAccessOnModule(req.user, 'enviar');

        if (!isAdminOrPastor && !isEnviarCoordinator) {
            return res.status(403).json({ message: 'No tiene permisos para ver este listado.' });
        }

        // Build explicit AND filters array for reliability
        const andFilters = [
            { isDeleted: false },
            { cellId: null }
        ];

        // Role filter
        if (roleParam) {
            andFilters.push({
                roles: {
                    some: {
                        role: { name: roleParam }
                    }
                }
            });
        } else {
            // Default roles
            andFilters.push({
                roles: {
                    some: {
                        role: { name: { in: ['DISCIPULO', 'LIDER_CELULA'] } }
                    }
                }
            });
        }

        // Search filter
        if (search && search.trim()) {
            andFilters.push({
                OR: [
                    { profile: { fullName: { contains: search, mode: 'insensitive' } } },
                    { email: { contains: search, mode: 'insensitive' } },
                    { phone: { contains: search, mode: 'insensitive' } }
                ]
            });
        }

        // Parent leader filter
        if (liderDoceId) {
            andFilters.push({
                parents: {
                    some: { parentId: parseInt(liderDoceId) }
                }
            });
        }

        // Network filter
        if (networkParam) {
            andFilters.push({
                profile: {
                    network: networkParam
                }
            });
        }

        const whereClause = { AND: andFilters };

        const totalCount = await prisma.user.count({ where: whereClause });

        const users = await prisma.user.findMany({
            where: whereClause,
            include: {
                profile: true,
                roles: { include: { role: true } },
                parents: { include: { parent: { include: { profile: true } } } }
            },
            orderBy: { profile: { fullName: 'asc' } },
            ...(all !== 'true' && {
                skip: (pageNum - 1) * limitNum,
                take: limitNum
            })
        });

        res.json({
            users: users.map(formatUser),
            pagination: {
                page: pageNum,
                limit: limitNum,
                total: totalCount,
                pages: Math.ceil(totalCount / limitNum)
            }
        });
    } catch (error) {
        console.error('Error in getUsersWithoutCell:', error);
        res.status(500).json({ message: 'Error al obtener personas sin célula' });
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
    searchUsers,
    getUsersByIds,
    getUsersWithoutCell
};
