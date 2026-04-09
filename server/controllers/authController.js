const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { logActivity } = require('../utils/auditLogger');
const { validatePassword } = require('../utils/passwordValidator');

const prisma = require('../utils/database');

// Helper function to generate refresh token
const generateRefreshToken = async (userId, userAgent, ipAddress) => {
    const token = crypto.randomBytes(64).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiration
    
    await prisma.refreshToken.create({
        data: {
            token,
            userId,
            expiresAt,
            userAgent,
            ipAddress
        }
    });
    
    return token;
};

// Helper function to clean expired refresh tokens
const cleanExpiredTokens = async () => {
    await prisma.refreshToken.deleteMany({
        where: {
            expiresAt: {
                lt: new Date()
            }
        }
    });
};

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
            expiresIn: '30m',
        });
        
        // Generate refresh token
        const refreshToken = await generateRefreshToken(user.id, req.headers['user-agent'], req.ip);
        
        // Clean expired tokens periodically
        await cleanExpiredTokens();

        res.status(201).json({
            token,
            refreshToken,
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
            await logActivity(user.id, 'LOGIN_FAILED', 'USER', user.id, { 
                reason: 'Invalid password',
                ipAddress: req.ip,
                userAgent: req.headers['user-agent']
            }, req.ip, req.headers['user-agent']);
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
            { expiresIn: '30m' }
        );
        
        // Generate refresh token
        const refreshToken = await generateRefreshToken(user.id, req.headers['user-agent'], req.ip);
        
        // Clean expired tokens periodically
        await cleanExpiredTokens();

        // Auditoría de login exitoso
        await logActivity(user.id, 'LOGIN', 'USER', user.id, { 
            method: 'password',
            ipAddress: req.ip,
            userAgent: req.headers['user-agent']
        }, req.ip, req.headers['user-agent']);

        res.json({
            token,
            refreshToken,
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
            expiresIn: '30m',
        });
        
        // Generate refresh token
        const refreshToken = await generateRefreshToken(user.id, req.headers['user-agent'], req.ip);
        
        // Clean expired tokens periodically
        await cleanExpiredTokens();

        await logActivity(user.id, 'CREATE', 'USER', user.id, { message: 'Inicialización del sistema: Primer Usuario (ADMIN)' }, req.ip, req.headers['user-agent']);

        res.status(201).json({
            token,
            refreshToken,
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

// Refresh token endpoint
const refreshToken = async (req, res) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(401).json({ message: 'Refresh token is required' });
        }

        const storedToken = await prisma.refreshToken.findUnique({
            where: { token: refreshToken },
            include: { user: { include: { roles: { include: { role: true } } } } }
        });

        if (!storedToken || storedToken.isRevoked || storedToken.expiresAt < new Date() || !storedToken.user) {
            return res.status(401).json({ message: 'Invalid or expired refresh token' });
        }

        const roles = storedToken.user.roles.map(r => r.role.name);
        const newAccessToken = jwt.sign(
            { 
                userId: storedToken.user.id, 
                email: storedToken.user.email, 
                roles,
                mustChangePassword: storedToken.user.mustChangePassword
            },
            process.env.JWT_SECRET,
            { expiresIn: '30m' }
        );

        await prisma.refreshToken.update({
            where: { id: storedToken.id },
            data: { isRevoked: true }
        });

        const newRefreshToken = await generateRefreshToken(
            storedToken.user.id, 
            req.headers['user-agent'], 
            req.ip
        );

        await cleanExpiredTokens();

        await logActivity(
            storedToken.user.id, 
            'TOKEN_REFRESH', 
            'USER', 
            storedToken.id, 
            { 
                oldTokenId: storedToken.id,
                newTokenCreated: true,
                ipAddress: req.ip,
                userAgent: req.headers['user-agent']
            }, 
            req.ip, 
            req.headers['user-agent']
        );

        res.json({
            token: newAccessToken,
            refreshToken: newRefreshToken
        });

    } catch (error) {
        console.error('Refresh token error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Logout endpoint
const logout = async (req, res) => {
    try {
        const { refreshToken } = req.body;

        if (refreshToken) {
            await prisma.refreshToken.updateMany({
                where: { token: refreshToken },
                data: { isRevoked: true }
            });
        }

        res.json({ message: 'Logged out successfully' });

    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Get active sessions for current user
const getSessions = async (req, res) => {
    try {
        const userId = req.user.id;

        const sessions = await prisma.refreshToken.findMany({
            where: {
                userId,
                isRevoked: false,
                expiresAt: { gt: new Date() }
            },
            select: {
                id: true,
                userAgent: true,
                ipAddress: true,
                createdAt: true,
                expiresAt: true
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json(sessions);
    } catch (error) {
        console.error('Get sessions error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Logout from all devices
const logoutAll = async (req, res) => {
    try {
        const userId = req.user.id;

        await prisma.refreshToken.updateMany({
            where: { userId },
            data: { isRevoked: true }
        });

        await logActivity(userId, 'LOGOUT_ALL', 'SESSION', userId, { message: 'Cierre de todas las sesiones' }, req.ip, req.headers['user-agent']);

        res.json({ message: 'Todas las sesiones han sido cerradas' });
    } catch (error) {
        console.error('Logout all error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
    register,
    login,
    getPublicLeaders,
    checkInitStatus,
    registerSetup,
    changePassword,
    forcePasswordChange,
    refreshToken,
    logout,
    getSessions,
    logoutAll
};
