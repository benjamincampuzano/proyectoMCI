const prisma = require('../utils/database');
const { logActivity } = require('../utils/auditLogger');

// Generar un código numérico aleatorio único de 6 dígitos
const generateUniqueCode = async () => {
    let code;
    let exists = true;
    let attempts = 0;
    const maxAttempts = 100;

    while (exists && attempts < maxAttempts) {
        code = Math.floor(100000 + Math.random() * 900000).toString();
        const existing = await prisma.registrarCode.findUnique({
            where: { code },
        });
        exists = existing !== null;
        attempts++;
    }

    if (exists) {
        throw new Error('No se pudo generar un código único después de múltiples intentos');
    }

    return code;
};

// Crear un nuevo servidor (asignar código a usuario)
const createServidor = async (req, res) => {
    try {
        const { userId, description } = req.body;
        const { id: currentUserId, roles } = req.user;

        // Solo ADMIN, PASTOR o el coordinador del módulo Ganar pueden crear servidores
        const isAdminOrPastor = roles.some(r => ['ADMIN', 'PASTOR'].includes(r));
        const isGanarCoordinator = req.user.moduleCoordinations?.includes('ganar');
        if (!isAdminOrPastor && !isGanarCoordinator) {
            return res.status(403).json({
                message: 'No tiene permisos para crear servidores. Solo ADMIN, PASTOR o el coordinador del módulo Ganar pueden realizar esta acción.'
            });
        }

        if (!userId) {
            return res.status(400).json({ message: 'El ID de usuario es requerido' });
        }

        // Verificar que el usuario existe
        const user = await prisma.user.findUnique({
            where: { id: parseInt(userId) },
            include: { profile: true, roles: { include: { role: true } } }
        });

        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        // Verificar que el usuario no tenga ya un código activo
        const existingCode = await prisma.registrarCode.findFirst({
            where: {
                userId: parseInt(userId),
                isActive: true,
                isDeleted: false
            }
        });

        if (existingCode) {
            return res.status(400).json({
                message: 'El usuario ya tiene un código de servidor activo',
                code: existingCode.code
            });
        }

        // Generar código único
        const code = await generateUniqueCode();

        // Crear el registro
        const registrarCode = await prisma.registrarCode.create({
            data: {
                userId: parseInt(userId),
                code,
                description: description || null,
                isActive: true,
                isDeleted: false
            },
            include: {
                user: {
                    include: { profile: true }
                }
            }
        });

        await logActivity(currentUserId, 'CREATE', 'REGISTRAR_CODE', registrarCode.id, {
            userId: parseInt(userId),
            code,
            description
        }, req.ip, req.headers['user-agent']);

        res.status(201).json({
            message: 'Servidor creado exitosamente',
            servidor: {
                id: registrarCode.id,
                code: registrarCode.code,
                description: registrarCode.description,
                isActive: registrarCode.isActive,
                createdAt: registrarCode.createdAt,
                user: {
                    id: user.id,
                    fullName: user.profile?.fullName || user.email,
                    email: user.email,
                    roles: user.roles.map(r => r.role.name)
                }
            }
        });
    } catch (error) {
        console.error('Error creating servidor:', error);
        res.status(500).json({ message: error.message || 'Error del servidor' });
    }
};

// Obtener todos los servidores
const getAllServidores = async (req, res) => {
    try {
        const { roles, id: currentUserId } = req.user;
        const { search, isActive } = req.query;

        // Solo ADMIN, PASTOR o el coordinador del módulo Ganar pueden ver servidores
        const isAdminOrPastor = roles.some(r => ['ADMIN', 'PASTOR'].includes(r));
        const isGanarCoordinator = req.user.moduleCoordinations?.includes('ganar');
        if (!isAdminOrPastor && !isGanarCoordinator) {
            return res.status(403).json({
                message: 'No tiene permisos para ver la lista de servidores'
            });
        }

        let whereClause = {
            isDeleted: false
        };

        if (isActive !== undefined) {
            whereClause.isActive = isActive === 'true';
        }

        const servidores = await prisma.registrarCode.findMany({
            where: whereClause,
            include: {
                user: {
                    include: {
                        profile: true,
                        roles: { include: { role: true } }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        // Filtrar por búsqueda si se proporciona
        let filteredServidores = servidores;
        if (search) {
            const searchLower = search.toLowerCase();
            filteredServidores = servidores.filter(s =>
                s.code.toLowerCase().includes(searchLower) ||
                s.user.profile?.fullName?.toLowerCase().includes(searchLower) ||
                s.user.email.toLowerCase().includes(searchLower) ||
                s.description?.toLowerCase().includes(searchLower)
            );
        }

        const formattedServidores = filteredServidores.map(s => ({
            id: s.id,
            code: s.code,
            description: s.description,
            isActive: s.isActive,
            createdAt: s.createdAt,
            updatedAt: s.updatedAt,
            user: {
                id: s.user.id,
                fullName: s.user.profile?.fullName || s.user.email,
                email: s.user.email,
                roles: s.user.roles.map(r => r.role.name)
            }
        }));

        res.status(200).json({ servidores: formattedServidores });
    } catch (error) {
        console.error('Error getting servidores:', error);
        res.status(500).json({ message: 'Error del servidor' });
    }
};

// Obtener un servidor por código (para validación pública)
const getServidorByCode = async (req, res) => {
    try {
        const { code } = req.params;

        if (!code || code.length !== 6) {
            return res.status(400).json({ message: 'Código inválido' });
        }

        const registrarCode = await prisma.registrarCode.findFirst({
            where: {
                code: code,
                isActive: true,
                isDeleted: false
            },
            include: {
                user: {
                    include: { profile: true }
                }
            }
        });

        if (!registrarCode) {
            return res.status(404).json({ message: 'Código de servidor no encontrado o inactivo' });
        }

        res.status(200).json({
            valid: true,
            servidor: {
                id: registrarCode.user.id,
                fullName: registrarCode.user.profile?.fullName || registrarCode.user.email,
                code: registrarCode.code
            }
        });
    } catch (error) {
        console.error('Error validating servidor code:', error);
        res.status(500).json({ message: 'Error del servidor' });
    }
};

// Actualizar estado de un servidor (activar/desactivar)
const updateServidorStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { isActive } = req.body;
        const { id: currentUserId, roles } = req.user;

        // Solo ADMIN, PASTOR o el coordinador del módulo Ganar pueden modificar servidores
        const isAdminOrPastor = roles.some(r => ['ADMIN', 'PASTOR'].includes(r));
        const isGanarCoordinator = req.user.moduleCoordinations?.includes('ganar');
        if (!isAdminOrPastor && !isGanarCoordinator) {
            return res.status(403).json({
                message: 'No tiene permisos para modificar servidores'
            });
        }

        const registrarCode = await prisma.registrarCode.findUnique({
            where: { id: parseInt(id) },
            include: {
                user: {
                    include: { profile: true, roles: { include: { role: true } } } }
                }
            }
        );

        if (!registrarCode || registrarCode.isDeleted) {
            return res.status(404).json({ message: 'Servidor no encontrado' });
        }

        const updated = await prisma.registrarCode.update({
            where: { id: parseInt(id) },
            data: { isActive },
            include: {
                user: {
                    include: { profile: true, roles: { include: { role: true } } } }
                }
            }
        );

        await logActivity(currentUserId, 'UPDATE', 'REGISTRAR_CODE', parseInt(id), {
            isActive,
            previousStatus: registrarCode.isActive
        }, req.ip, req.headers['user-agent']);

        res.status(200).json({
            message: `Servidor ${isActive ? 'activado' : 'desactivado'} exitosamente`,
            servidor: {
                id: updated.id,
                code: updated.code,
                description: updated.description,
                isActive: updated.isActive,
                updatedAt: updated.updatedAt,
                user: {
                    id: updated.user.id,
                    fullName: updated.user.profile?.fullName || updated.user.email,
                    email: updated.user.email,
                    roles: updated.user.roles.map(r => r.role.name)
                }
            }
        });
    } catch (error) {
        console.error('Error updating servidor:', error);
        res.status(500).json({ message: 'Error del servidor' });
    }
};

// Eliminar (soft delete) un servidor
const deleteServidor = async (req, res) => {
    try {
        const { id } = req.params;
        const { id: currentUserId, roles } = req.user;

        // Solo ADMIN, PASTOR o el coordinador del módulo Ganar pueden eliminar servidores
        const isAdminOrPastor = roles.some(r => ['ADMIN', 'PASTOR'].includes(r));
        const isGanarCoordinator = req.user.moduleCoordinations?.includes('ganar');
        if (!isAdminOrPastor && !isGanarCoordinator) {
            return res.status(403).json({
                message: 'No tiene permisos para eliminar servidores. Solo ADMIN, PASTOR o el coordinador del módulo Ganar pueden realizar esta acción.'
            });
        }

        const registrarCode = await prisma.registrarCode.findUnique({
            where: { id: parseInt(id) }
        });

        if (!registrarCode || registrarCode.isDeleted) {
            return res.status(404).json({ message: 'Servidor no encontrado' });
        }

        await prisma.registrarCode.update({
            where: { id: parseInt(id) },
            data: {
                isDeleted: true,
                deletedAt: new Date(),
                isActive: false
            }
        });

        await logActivity(currentUserId, 'DELETE', 'REGISTRAR_CODE', parseInt(id), {
            code: registrarCode.code,
            userId: registrarCode.userId
        }, req.ip, req.headers['user-agent']);

        res.status(200).json({ message: 'Servidor eliminado exitosamente' });
    } catch (error) {
        console.error('Error deleting servidor:', error);
        res.status(500).json({ message: 'Error del servidor' });
    }
};

// Obtener usuarios disponibles para ser servidores
const getAvailableUsers = async (req, res) => {
    try {
        const { roles, id: currentUserId } = req.user;
        const { search } = req.query;

        // Solo ADMIN, PASTOR o el coordinador del módulo Ganar pueden ver usuarios disponibles
        const isAdminOrPastor = roles.some(r => ['ADMIN', 'PASTOR'].includes(r));
        const isGanarCoordinator = req.user.moduleCoordinations?.includes('ganar');
        if (!isAdminOrPastor && !isGanarCoordinator) {
            return res.status(403).json({
                message: 'No tiene permisos para ver usuarios disponibles'
            });
        }

        // Buscar usuarios que no tengan un código activo
        const whereClause = {
            isDeleted: false,
            isActive: true,
            registrarCodes: {
                none: {
                    isActive: true,
                    isDeleted: false
                }
            }
        };

        if (search) {
            whereClause.OR = [
                { email: { contains: search, mode: 'insensitive' } },
                { profile: { fullName: { contains: search, mode: 'insensitive' } } }
            ];
        }

        const users = await prisma.user.findMany({
            where: whereClause,
            include: {
                profile: true,
                roles: { include: { role: true } }
            },
            take: 20,
            orderBy: { createdAt: 'desc' }
        });

        const formattedUsers = users.map(u => ({
            id: u.id,
            fullName: u.profile?.fullName || u.email,
            email: u.email,
            roles: u.roles.map(r => r.role.name)
        }));

        res.status(200).json({ users: formattedUsers });
    } catch (error) {
        console.error('Error getting available users:', error);
        res.status(500).json({ message: 'Error del servidor' });
    }
};

module.exports = {
    createServidor,
    getAllServidores,
    getServidorByCode,
    updateServidorStatus,
    deleteServidor,
    getAvailableUsers,
    generateUniqueCode
};
