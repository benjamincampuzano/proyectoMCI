const express = require('express');
const router = express.Router();
const artSchoolController = require('../controllers/artSchoolController');
const { authenticate, isAdmin, authorize } = require('../middleware/auth');
const { canManageTreasurerActions, isModuleCoordinator } = require('../middleware/coordinatorAuth');

/**
 * Middleware para verificar si el usuario puede gestionar clases de Escuela de Artes
 * Permite ADMIN, PASTOR, LIDER_DOCE, o Coordinadores/Sub-coordinadores/Tesoreros del módulo escuela-de-artes
 */
const canManageArtsClasses = (req, res, next) => {
    try {
        const user = req.user;
        console.log('[canManageArtsClasses] Checking permissions for user:', user.id, 'roles:', user.roles);
        console.log('[canManageArtsClasses] moduleCoordinations:', user.moduleCoordinations);
        console.log('[canManageArtsClasses] moduleSubCoordinations:', user.moduleSubCoordinations);
        console.log('[canManageArtsClasses] moduleTreasurers:', user.moduleTreasurers);

        const hasLeadershipRole = user.roles.some(role => ['ADMIN', 'PASTOR', 'LIDER_DOCE'].includes(role));

        // ADMIN, PASTOR y LIDER_DOCE tienen acceso completo
        if (hasLeadershipRole) {
            console.log('[canManageArtsClasses] Access granted via leadership role');
            return next();
        }

        // Verificar si es coordinador, sub-coordinador o tesorero de escuela-de-artes
        const moduleName = 'escuela-de-artes';
        const isCoordinator = user.moduleCoordinations?.includes(moduleName);
        const isSubCoordinator = user.moduleSubCoordinations?.includes(moduleName);
        const isTreasurer = user.moduleTreasurers?.includes(moduleName);

        console.log('[canManageArtsClasses] isCoordinator:', isCoordinator, 'isSubCoordinator:', isSubCoordinator, 'isTreasurer:', isTreasurer);

        if (isCoordinator || isSubCoordinator || isTreasurer) {
            console.log('[canManageArtsClasses] Access granted via module role');
            return next();
        }

        console.log('[canManageArtsClasses] Access denied - no matching permissions');
        return res.status(403).json({
            message: 'Access denied. Admin, Pastor, Lider Doce, or Escuela de Artes coordinator/treasurer privileges required.'
        });
    } catch (error) {
        console.error('Error in canManageArtsClasses:', error);
        return res.status(500).json({ message: 'Error checking permissions' });
    }
};

// All routes require authentication
router.use(authenticate);

// Roles internos del módulo — solo ADMIN puede asignar/ver/quitar
router.post('/roles', isAdmin, artSchoolController.assignRole);
router.delete('/roles/:userId/:role', isAdmin, artSchoolController.removeRole);
router.get('/roles/:userId', isAdmin, artSchoolController.getUserRoles);

// Clases — cualquier autenticado puede leer, ADMIN o Coordinador de Escuela de Artes puede crear/editar/eliminar
router.get('/classes', artSchoolController.getClasses);
router.get('/classes/:id', artSchoolController.getClassById);
router.post('/classes', isModuleCoordinator, canManageArtsClasses, artSchoolController.createClass);
router.put('/classes/:id', isModuleCoordinator, canManageArtsClasses, artSchoolController.updateClass);
router.delete('/classes/:id', isModuleCoordinator, canManageArtsClasses, artSchoolController.deleteClass);

// Inscripciones — cualquier autenticado puede inscribir (control adicional en el controller)
router.post('/classes/:id/enroll', artSchoolController.enrollStudent);
router.post('/enrollments', artSchoolController.enrollStudent); // Mantener para compatibilidad
router.get('/enrollments/:id', artSchoolController.getEnrollmentById);
router.put('/enrollments/:id', isAdmin, artSchoolController.updateEnrollmentStatus);
router.delete('/enrollments/:id', isAdmin, artSchoolController.deleteEnrollment);

// Asistencias — cualquier autenticado puede registrar asistencia
router.post('/attendances', artSchoolController.registerAttendance);

// Sesiones
router.get('/classes/:id/sessions', artSchoolController.getSessions);
router.post('/classes/:id/sessions', artSchoolController.createSession);
router.put('/sessions/:id', artSchoolController.updateSession);
router.delete('/sessions/:id', artSchoolController.deleteSession);
router.post('/sessions/:id/attendance', artSchoolController.registerSessionAttendance);

// Reportes
router.get('/classes/:id/report/balance', artSchoolController.getClassBalanceReport);

// Pagos — Tesoreros y Coordinadores pueden gestionar pagos
const canManageArtsPayments = canManageTreasurerActions('Escuela de Artes');

router.post('/payments', canManageArtsPayments, artSchoolController.registerPayment);
router.post('/enrollments/:id/payments', canManageArtsPayments, artSchoolController.registerPayment);
router.delete('/payments/:id', canManageArtsPayments, artSchoolController.deletePayment);

module.exports = router;
