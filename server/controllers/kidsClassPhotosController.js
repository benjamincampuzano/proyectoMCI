const prisma = require('../utils/database');

exports.createClassPhoto = async (req, res) => {
    try {
        const { url, description, uploadedBy } = req.body;

        // Validar datos requeridos
        if (!url || !uploadedBy) {
            return res.status(400).json({ 
                message: 'Faltan datos requeridos: url, uploadedBy' 
            });
        }

        // Verificar que el usuario que sube la foto existe
        const uploader = await prisma.user.findUnique({
            where: { id: parseInt(uploadedBy) }
        });

        if (!uploader) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        // Crear el registro fotográfico
        const classPhoto = await prisma.kidsClassPhoto.create({
            data: {
                url: url.trim(),
                description: description?.trim() || null,
                uploadedBy: parseInt(uploadedBy),
                uploadDate: new Date()
            },
            include: {
                uploader: {
                    select: { 
                        id: true, 
                        profile: { select: { fullName: true } } 
                    }
                }
            }
        });

        // Audit Log
        await prisma.auditLog.create({
            data: {
                userId: parseInt(uploadedBy),
                action: 'CREATE',
                entityType: 'KIDS_CLASS_PHOTO',
                entityId: classPhoto.id,
                details: { 
                    photoUrl: url.trim(),
                    uploaderName: uploader.profile?.fullName
                }
            }
        });

        res.status(201).json({
            message: 'Evidencia de clase creada exitosamente',
            data: classPhoto
        });

    } catch (error) {
        console.error('Error creating class photo:', error);
        res.status(500).json({ 
            message: 'Error al crear la evidencia de clase',
            error: error.message 
        });
    }
};

exports.deleteClassPhoto = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        // Verificar que la foto existe
        const photo = await prisma.kidsClassPhoto.findUnique({
            where: { id: parseInt(id) }
        });

        if (!photo) {
            return res.status(404).json({ message: 'Evidencia de clase no encontrada' });
        }

        // Solo el usuario que subió la foto o un admin puede eliminarla
        if (photo.uploadedBy !== parseInt(userId) && req.user.role !== 'ADMIN') {
            return res.status(403).json({ 
                message: 'No tienes permiso para eliminar esta evidencia' 
            });
        }

        await prisma.kidsClassPhoto.delete({
            where: { id: parseInt(id) }
        });

        // Audit Log
        await prisma.auditLog.create({
            data: {
                userId: parseInt(userId),
                action: 'DELETE',
                entityType: 'KIDS_CLASS_PHOTO',
                entityId: parseInt(id),
                details: { 
                    deletedPhotoUrl: photo.url
                }
            }
        });

        res.status(204).send();

    } catch (error) {
        console.error('Error deleting class photo:', error);
        res.status(500).json({ 
            message: 'Error al eliminar la evidencia de clase',
            error: error.message 
        });
    }
};

exports.getAllClassPhotos = async (req, res) => {
    try {
        const { page = 1, limit = 20 } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [photos, total] = await Promise.all([
            prisma.kidsClassPhoto.findMany({
                include: {
                    uploader: {
                        select: { 
                            id: true, 
                            profile: { select: { fullName: true } } 
                        }
                    }
                },
                orderBy: { uploadDate: 'desc' },
                skip,
                take: parseInt(limit)
            }),
            prisma.kidsClassPhoto.count()
        ]);

        res.json({
            photos,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / parseInt(limit))
            }
        });

    } catch (error) {
        console.error('Error fetching all class photos:', error);
        res.status(500).json({ 
            message: 'Error al obtener las evidencias de clase',
            error: error.message 
        });
    }
};
