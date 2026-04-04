const express = require('express');
const router = express.Router();
const artSchoolController = require('../controllers/artSchoolController');
const { authenticate, isAdmin, authorize } = require('../middleware/auth');
const { canManageTreasurerActions } = require('../middleware/coordinatorAuth');

// All routes require authentication
router.use(authenticate);

// Roles internos del módulo — solo ADMIN puede asignar/ver/quitar
router.post('/roles', isAdmin, artSchoolController.assignRole);
router.delete('/roles/:userId/:role', isAdmin, artSchoolController.removeRole);
router.get('/roles/:userId', isAdmin, artSchoolController.getUserRoles);

// Clases — cualquier autenticado puede leer, solo ADMIN puede crear/editar/eliminar
router.get('/classes', artSchoolController.getClasses);
router.get('/classes/:id', artSchoolController.getClassById);
router.post('/classes', isAdmin, artSchoolController.createClass);
router.put('/classes/:id', isAdmin, artSchoolController.updateClass);
router.delete('/classes/:id', isAdmin, artSchoolController.deleteClass);

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
