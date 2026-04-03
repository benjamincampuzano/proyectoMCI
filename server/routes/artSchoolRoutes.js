const express = require('express');
const router = express.Router();
const artSchoolController = require('../controllers/artSchoolController');
const { authenticate, isAdmin, authorize } = require('../middleware/auth');

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

// Pagos — solo ADMIN puede registrar/eliminar abonos
router.post('/payments', isAdmin, artSchoolController.registerPayment);
router.post('/enrollments/:id/payments', isAdmin, artSchoolController.registerPayment);
router.delete('/payments/:id', isAdmin, artSchoolController.deletePayment);

module.exports = router;
