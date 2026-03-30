const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Middleware para verificar si el usuario tiene permiso para acceder al cronograma de kids
 * Permisos válidos para: ADMIN, PASTOR, Coordinador del módulo, Profesores y Auxiliares asignados
 */
const authorizeKidsScheduleAccess = async (req, res, next) => {
    try {
        const user = req.user;
        const { moduleId } = req.params;
        
        // Obtener el rol principal del usuario (primer rol del array)
        const userRole = user.roles && user.roles.length > 0 ? user.roles[0] : undefined;
        
        // Si es ADMIN o PASTOR, permitir acceso inmediato
        if (userRole === 'ADMIN' || userRole === 'PASTOR') {
            return next();
        }
        
        // Para otros roles, verificar si es coordinador del módulo o está asignado al cronograma
        const userId = parseInt(user.id);
        
        // Verificar si es profesor/coordinador del módulo (ahora es un array)
        const moduleProfessor = await prisma.seminarModule.findFirst({
            where: {
                id: parseInt(moduleId),
                professorIds: {
                    has: userId
                }
            }
        });
        
        if (moduleProfessor) {
            return next();
        }
        
        // Verificar si está asignado como profesor o auxiliar en algún cronograma del módulo
        const assignedUser = await prisma.kidsSchedule.findFirst({
            where: {
                moduleId: parseInt(moduleId),
                OR: [
                    { teacherId: userId },
                    { auxiliaryId: userId }
                ]
            }
        });
        
        if (assignedUser) {
            return next();
        }
        
        // Si no cumple ninguno de los criterios, denegar acceso
        return res.status(403).json({ 
            message: 'No tienes permiso para acceder al cronograma de este módulo' 
        });
        
    } catch (error) {
        console.error('Error in authorizeKidsScheduleAccess middleware:', error);
        return res.status(500).json({ message: 'Error al verificar permisos' });
    }
};

/**
 * Middleware para verificar si el usuario puede modificar el cronograma
 * Solo ADMIN, PASTOR y Coordinadores del módulo pueden modificar
 */
const authorizeKidsScheduleModification = async (req, res, next) => {
    try {
        const user = req.user;
        const { moduleId } = req.params;
        
        // Obtener el rol principal del usuario (primer rol del array)
        const userRole = user.roles && user.roles.length > 0 ? user.roles[0] : undefined;
        
        // Si es ADMIN o PASTOR, permitir acceso inmediato
        if (userRole === 'ADMIN' || userRole === 'PASTOR') {
            return next();
        }
        
        // Verificar si es profesor/coordinador del módulo (ahora es un array)
        const moduleProfessor = await prisma.seminarModule.findFirst({
            where: {
                id: parseInt(moduleId),
                professorIds: {
                    has: parseInt(user.id)
                }
            }
        });
        
        if (moduleProfessor) {
            return next();
        }
        
        // Si no es coordinador, denegar acceso
        return res.status(403).json({ 
            message: 'No tienes permiso para modificar el cronograma de este módulo' 
        });
        
    } catch (error) {
        console.error('Error in authorizeKidsScheduleModification middleware:', error);
        return res.status(500).json({ message: 'Error al verificar permisos' });
    }
};

/**
 * Middleware para verificar si el usuario puede modificar un cronograma específico (por ID)
 * Solo ADMIN, PASTOR y Coordinadores del módulo pueden modificar
 */
const authorizeScheduleModification = async (req, res, next) => {
    try {
        const user = req.user;
        const { id } = req.params;
        
        // Obtener el rol principal del usuario (primer rol del array)
        const userRole = user.roles && user.roles.length > 0 ? user.roles[0] : undefined;
        
        // Si es ADMIN o PASTOR, permitir acceso inmediato
        if (userRole === 'ADMIN' || userRole === 'PASTOR') {
            return next();
        }
        
        // Obtener el cronograma para verificar el módulo
        const schedule = await prisma.kidsSchedule.findUnique({
            where: { id: parseInt(id) },
            select: { moduleId: true }
        });
        
        if (!schedule) {
            return res.status(404).json({ message: 'Cronograma no encontrado' });
        }
        
        // Verificar si es profesor/coordinador del módulo (ahora es un array)
        const moduleProfessor = await prisma.seminarModule.findFirst({
            where: {
                id: schedule.moduleId,
                professorIds: {
                    has: parseInt(user.id)
                }
            }
        });
        
        if (moduleProfessor) {
            return next();
        }
        
        // Si no es coordinador, denegar acceso
        return res.status(403).json({ 
            message: 'No tienes permiso para modificar este cronograma' 
        });
        
    } catch (error) {
        console.error('Error in authorizeScheduleModification middleware:', error);
        return res.status(500).json({ message: 'Error al verificar permisos' });
    }
};

module.exports = {
    authorizeKidsScheduleAccess,
    authorizeKidsScheduleModification,
    authorizeScheduleModification
};
