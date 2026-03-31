const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { logActivity } = require('../utils/auditLogger');
const { validatePassword } = require('../utils/passwordValidator');

const prisma = require('../utils/database');

const register = async (req, res) => {
    try {
        const { email, password, fullName, sex, phone, address, city, parentId, liderDoceId, roleInHierarchy, documentType, documentNumber, birthDate, dataPolicyAccepted, dataTreatmentAuthorized, minorConsentAuthorized } = req.body;

        const validation = validatePassword(password, { email, fullName });
        if (!validation.isValid) {
            return res.status(400).json({ message: validation.message });
        }

        // Check if phone already exists (if provided)
        if (phone) {
            const existingUserByPhone = await prisma.user.findUnique({
                where: { phone }
            });
            if (existingUserByPhone) {
                return res.status(400).json({ message: 'El número de teléfono ya está registrado' });
            }
        }

        // Check if document already exists (if both type and number are provided)
        if (documentType && documentNumber) {
            const existingProfile = await prisma.userProfile.findUnique({
                where: { 
                    documentType_documentNumber: {
                        documentType,
                        documentNumber
                    }
                }
            });
            if (existingProfile) {
                return res.status(400).json({ message: 'El número de documento ya está registrado' });
            }
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        // Transaction to ensure atomicity
        const user = await prisma.$transaction(async (tx) => {
            // 1. Create User
            const newUser = await tx.user.create({
                data: {
                    email,
                    password: hashedPassword,
                    phone,
                    mustChangePassword: false, // Los usuarios nuevos no necesitan cambiar contraseña
                    profile: {
                        create: {
                            fullName,
                            ...(sex && (sex === 'HOMBRE' || sex === 'MUJER') ? { sex } : {}),
                            address,
                            city,
                            documentType,
                            documentNumber,
                            birthDate: birthDate ? new Date(birthDate) : null,
                            dataPolicyAccepted: dataPolicyAccepted || false,
                            dataTreatmentAuthorized: dataTreatmentAuthorized || false,
                            minorConsentAuthorized: minorConsentAuthorized || false,
                        }
                    }
                }
            });

            // 2. Assign default role (DISCIPULO/MIEMBRO)
            const discipleRole = await tx.role.upsert({
                where: { name: 'DISCIPULO' },
                update: {},
                create: { name: 'DISCIPULO' }
            });

            await tx.userRole.create({
                data: {
                    userId: newUser.id,
                    roleId: discipleRole.id
                }
            });

            // 3. Handle Hierarchy if parent or liderDoceId provided
            const reqParentId = parentId || liderDoceId;
            if (reqParentId) {
                const parentUserId = parseInt(reqParentId);

                await tx.userHierarchy.create({
                    data: {
                        parentId: parentUserId,
                        childId: newUser.id,
                        role: roleInHierarchy || 'DISCIPULO'
                    }
                });

                // Check for spouse to assign automatically as well
                const parentUser = await tx.user.findUnique({
                    where: { id: parentUserId },
                    select: { spouseId: true }
                });

                if (parentUser && parentUser.spouseId) {
                    await tx.userHierarchy.create({
                        data: {
                            parentId: parentUser.spouseId,
                            childId: newUser.id,
                            role: roleInHierarchy || 'DISCIPULO'
                        }
                    });
                } else if (parentUser) {
                    const spouseOfUser = await tx.user.findFirst({
                        where: { spouseId: parentUserId },
                        select: { id: true }
                    });
                    if (spouseOfUser) {
                        await tx.userHierarchy.create({
                            data: {
                                parentId: spouseOfUser.id,
                                childId: newUser.id,
                                role: roleInHierarchy || 'DISCIPULO'
                            }
                        });
                    }
                }
            }

            return tx.user.findUnique({
                where: { id: newUser.id },
                include: {
                    profile: true,
                    roles: { include: { role: true } },
                    parents: { include: { parent: { include: { profile: true } } } },
                    moduleCoordinations: true
                }
            });
        });

        const roles = user.roles.map(r => r.role.name);
        const token = jwt.sign({ userId: user.id, roles }, process.env.JWT_SECRET, {
            expiresIn: '1d',
        });

        res.status(201).json({
            token,
            user: {
                id: user.id,
                email: user.email,
                fullName: user.profile.fullName,
                roles,
                phone: user.phone,
                address: user.profile.address,
                city: user.profile.city,
                sex: user.profile.sex,
                mustChangePassword: user.mustChangePassword
            }
        });
    } catch (error) {
        console.error(error);
        
        // Handle Prisma unique constraint errors
        if (error.code === 'P2002') {
            const target = error.meta?.target;
            if (target?.includes('phone')) {
                return res.status(400).json({ message: 'El número de teléfono ya está registrado' });
            }
            if (target?.includes('email')) {
                return res.status(400).json({ message: 'El correo electrónico ya está registrado' });
            }
            if (target?.includes('documentType') || target?.includes('documentNumber')) {
                return res.status(400).json({ message: 'El número de documento ya está registrado' });
            }
            return res.status(400).json({ message: 'Ya existe un registro con estos datos' });
        }
        
        res.status(500).json({ message: 'Server error' });
    }
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await prisma.user.findFirst({
            where: {
                email,
                isActive: true,
                isDeleted: false
            },
            include: {
                profile: true,
                roles: {
                    include: {
                        role: true
                    }
                }
            }
        });

        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { 
                userId: user.id, 
                email: user.email, 
                roles: user.roles.map(r => r.role.name),
                mustChangePassword: user.mustChangePassword
            },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            token,
            user: {
                id: user.id,
                email: user.email,
                fullName: user.profile?.fullName,
                roles: user.roles.map(r => r.role.name),
                mustChangePassword: user.mustChangePassword
            }
        });
    } catch (error) {
        console.error('❌ Login error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

const getPublicLeaders = async (req, res) => {
    try {
        // Fetch users who have LIDER_DOCE role only (for security in registration)
        const leaders = await prisma.user.findMany({
            where: {
                roles: {
                    some: {
                        role: {
                            name: 'LIDER_DOCE'
                        }
                    }
                }
            },
            select: {
                id: true,
                spouseId: true,
                profile: { select: { fullName: true } },
                roles: { include: { role: { select: { name: true } } } }
            }
        });

        const formattedLeaders = [];
        const processedIds = new Set();

        for (const leader of leaders) {
            if (processedIds.has(leader.id)) continue;

            let displayName = leader.profile.fullName;
            let partnerId = null;

            if (leader.spouseId) {
                const spouse = leaders.find(l => l.id === leader.spouseId);
                if (spouse) {
                    displayName += ` y ${spouse.profile.fullName}`;
                    processedIds.add(spouse.id);
                    partnerId = spouse.id;
                }
            } else {
                const spouseOf = leaders.find(l => l.spouseId === leader.id);
                if (spouseOf) {
                    displayName += ` y ${spouseOf.profile.fullName}`;
                    processedIds.add(spouseOf.id);
                    partnerId = spouseOf.id;
                }
            }

            formattedLeaders.push({
                id: leader.id,
                partnerId: partnerId,
                fullName: displayName,
                roles: leader.roles.map(r => r.role.name)
            });

            processedIds.add(leader.id);
        }

        res.json(formattedLeaders);
    } catch (error) {
        console.error('Error fetching public leaders:', error);
        res.status(500).json({ message: 'Error fetching leaders' });
    }
};

const checkInitStatus = async (req, res) => {
    try {
        const userCount = await prisma.user.count();
        res.json({ isInitialized: userCount > 0 });
    } catch (error) {
        console.error('Error checking init status:', error);
        res.status(500).json({ message: 'Error checking system initialization status' });
    }
};

const registerSetup = async (req, res) => {
    try {
        const userCount = await prisma.user.count();
        if (userCount > 0) {
            return res.status(403).json({ message: 'System is already initialized' });
        }

        const { email, password, fullName, sex, phone, address, city, documentType, documentNumber, birthDate, dataPolicyAccepted, dataTreatmentAuthorized, minorConsentAuthorized } = req.body;

        const validation = validatePassword(password, { email, fullName });
        if (!validation.isValid) {
            return res.status(400).json({ message: validation.message });
        }

        // Check if phone already exists (if provided)
        if (phone) {
            const existingUserByPhone = await prisma.user.findUnique({
                where: { phone }
            });
            if (existingUserByPhone) {
                return res.status(400).json({ message: 'El número de teléfono ya está registrado' });
            }
        }

        // Check if document already exists (if both type and number are provided)
        if (documentType && documentNumber) {
            const existingProfile = await prisma.userProfile.findUnique({
                where: { 
                    documentType_documentNumber: {
                        documentType,
                        documentNumber
                    }
                }
            });
            if (existingProfile) {
                return res.status(400).json({ message: 'El número de documento ya está registrado' });
            }
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await prisma.$transaction(async (tx) => {
            const adminRole = await tx.role.upsert({
                where: { name: 'ADMIN' },
                update: {},
                create: { name: 'ADMIN' }
            });

            const newUser = await tx.user.create({
                data: {
                    email,
                    password: hashedPassword,
                    phone,
                    mustChangePassword: false, // El admin inicial no necesita cambiar contraseña
                    profile: {
                        create: {
                            fullName,
                            sex: sex || undefined,
                            address,
                            city,
                            documentType: documentType || undefined,
                            documentNumber,
                            birthDate: birthDate ? new Date(birthDate) : null,
                            dataPolicyAccepted: dataPolicyAccepted || false,
                            dataTreatmentAuthorized: dataTreatmentAuthorized || false,
                            minorConsentAuthorized: minorConsentAuthorized || false,
                        }
                    }
                },
                include: { profile: true }
            });

            await tx.userRole.create({
                data: {
                    userId: newUser.id,
                    roleId: adminRole.id
                }
            });

            return newUser;
        });

        const roles = ['ADMIN'];
        const token = jwt.sign({ userId: user.id, roles }, process.env.JWT_SECRET, {
            expiresIn: '1d',
        });

        await logActivity(user.id, 'CREATE', 'USER', user.id, { message: 'Inicialización del sistema: Primer Usuario (ADMIN)' }, req.ip, req.headers['user-agent']);

        res.status(201).json({
            token,
            user: {
                id: user.id,
                email: user.email,
                fullName: user.profile.fullName,
                roles,
                isCoordinator: true
            },
        });
    } catch (err) {
        console.error('Setup error:', err);
        
        // Handle Prisma unique constraint errors
        if (err.code === 'P2002') {
            const target = err.meta?.target;
            if (target?.includes('phone')) {
                return res.status(400).json({ message: 'El número de teléfono ya está registrado' });
            }
            if (target?.includes('email')) {
                return res.status(400).json({ message: 'El correo electrónico ya está registrado' });
            }
            if (target?.includes('documentType') || target?.includes('documentNumber')) {
                return res.status(400).json({ message: 'El número de documento ya está registrado' });
            }
            return res.status(400).json({ message: 'Ya existe un registro con estos datos' });
        }
        
        res.status(500).json({ message: 'Error initializing system' });
    }
};

// Change password controller
const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const userId = req.user.id;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ message: 'Contraseña actual y nueva contraseña son requeridas' });
        }

        const user = await prisma.user.findUnique({
            where: { id: userId }
        });

        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        // Verify current password
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'La contraseña actual es incorrecta' });
        }

        // Validate new password
        const userProfile = await prisma.userProfile.findUnique({
            where: { userId: userId }
        });

        const validation = validatePassword(newPassword, {
            email: user.email,
            fullName: userProfile?.fullName
        });

        if (!validation.isValid) {
            return res.status(400).json({ message: validation.message });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update password and reset mustChangePassword flag
        await prisma.user.update({
            where: { id: userId },
            data: {
                password: hashedPassword,
                mustChangePassword: false
            }
        });

        await logActivity(userId, 'UPDATE', 'USER', userId, { message: 'Cambio de contraseña' }, req.ip, req.headers['user-agent']);

        res.status(200).json({ message: 'Contraseña actualizada exitosamente' });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ message: 'Error al cambiar la contraseña' });
    }
};

// Force password change (for admins to reset user passwords)
const forcePasswordChange = async (req, res) => {
    try {
        const { userId } = req.params;
        const { newTempPassword } = req.body;

        // Security check: Only ADMIN can reset any password. PASTOR and LIDER_DOCE only their network.
        const currentUserRoles = req.user.roles || [];
        const isSelfAdmin = currentUserRoles.includes('ADMIN');
        const targetUserId = parseInt(userId);

        if (!isSelfAdmin) {
            const { getUserNetwork } = require('../utils/networkUtils');
            const networkIds = await getUserNetwork(req.user.id);
            if (!networkIds.includes(targetUserId)) {
                return res.status(403).json({ message: 'No tienes permiso para resetear esta contraseña' });
            }
        }

        // Validate the temporary password
        const user = await prisma.user.findUnique({
            where: { id: targetUserId },
            include: { profile: true }
        });

        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        const validation = validatePassword(newTempPassword, {
            email: user.email,
            fullName: user.profile?.fullName
        });

        if (!validation.isValid) {
            return res.status(400).json({ message: validation.message });
        }

        const hashedPassword = await bcrypt.hash(newTempPassword, 10);
        
        await prisma.user.update({
            where: { id: targetUserId },
            data: {
                password: hashedPassword,
                mustChangePassword: true,
                updatedAt: new Date()
            }
        });

        res.json({ message: 'Contraseña reseteada exitosamente' });
    } catch (error) {
        console.error('Force password change error:', error);
        res.status(500).json({ message: 'Error resetting password' });
    }
};

module.exports = {
    register,
    login,
    getPublicLeaders,
    checkInitStatus,
    registerSetup,
    changePassword,
    forcePasswordChange
};
