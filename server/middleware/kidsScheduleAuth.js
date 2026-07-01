const prisma = require('../utils/database');
const { hasAdminAccessOnModule } = require('./coordinatorAuth');
const { getUserNetwork } = require('../utils/networkUtils');

/**
 * Middleware para verificar si el usuario tiene permiso para acceder al cronograma de kids
 * Permisos válidos para:
 * - ADMIN, PASTOR (global)
 * - Coordinador/Subcoordinador/Tesorero del módulo KIDS específico (NO otros módulos)
 * - LIDER_DOCE / LIDER_CELULA (solo si la clase tiene estudiantes de su red o ellos son profesor/auxiliar)
 * - DISCIPULO (solo si la clase tiene estudiantes de su red o él es profesor/auxiliar)
 * - Profesores y Auxiliares asignados
 */
const authorizeKidsScheduleAccess = async (req, res, next) => {
    try {
        const user = req.user;
        const { moduleId } = req.params;

        // Si es ADMIN, PASTOR o Coordinador/Subcoordinador/Tesorero del módulo de KIDS, permitir acceso inmediato
        if (hasAdminAccessOnModule(user, 'kids')) {
            return next();
        }

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

        // LIDER_DOCE / LIDER_CELULA / DISCIPULO sin permisos elevados: solo pueden ver
        // el cronograma de módulos en los que ellos (o alguien de su red) estén inscritos.
        if (user.roles?.some(r => ['LIDER_DOCE', 'LIDER_CELULA', 'DISCIPULO'].includes(r))) {
            const networkIds = await getUserNetwork(userId);
            const allowedIds = [...new Set([userId, ...networkIds.map(id => parseInt(id))])];

            const inNetwork = await prisma.seminarEnrollment.findFirst({
                where: {
                    moduleId: parseInt(moduleId),
                    userId: { in: allowedIds.length > 0 ? allowedIds : [-1] }
                }
            });

            if (inNetwork) {
                return next();
            }
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
 * Solo ADMIN, PASTOR y Coordinadores/Subcoordinadores/Tesoreros del módulo KIDS pueden modificar
 * (NOT coordinators of other modules)
 */
const authorizeKidsScheduleModification = async (req, res, next) => {
    try {
        const user = req.user;
        const { moduleId } = req.params;
        
        // Si es ADMIN, PASTOR o Coordinador/Subcoordinador/Tesorero del módulo de KIDS, permitir acceso inmediato
        if (hasAdminAccessOnModule(user, 'kids')) {
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
        
        // Si es ADMIN, PASTOR o Coordinador/Subcoordinador/Tesorero del módulo de KIDS, permitir acceso inmediato
        if (hasAdminAccessOnModule(user, 'kids')) {
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
