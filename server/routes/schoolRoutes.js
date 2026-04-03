const express = require('express');
const router = express.Router();
const { authenticate, authorize, checkCoordinatorStatus } = require('../middleware/auth');
const {
    createModule,
    getModules,
    enrollStudent,
    getModuleMatrix,
    updateMatrixCell,
    deleteModule,
    updateModule,
    unenrollStudent,
    getSchoolStatsByLeader,
    getStudentMatrix,
    getClassMaterials,
    updateClassMaterial
} = require('../controllers/schoolController');

router.use(authenticate);
router.use(checkCoordinatorStatus);

// Módulos - lectura para todos los autenticados
router.get('/modules', getModules);
router.get('/modules/:id/matrix', getModuleMatrix);

// Gestión de módulos - ADMIN, PASTOR, LIDER_DOCE
router.post('/modules', authorize(['ADMIN', 'PASTOR', 'LIDER_DOCE']), createModule);
router.put('/modules/:id', authorize(['ADMIN', 'PASTOR', 'LIDER_DOCE']), updateModule);
router.delete('/modules/:id', authorize(['ADMIN', 'PASTOR', 'LIDER_DOCE']), deleteModule);

// Inscripción - ADMIN, PASTOR, LIDER_DOCE
router.post('/enroll', authorize(['ADMIN', 'PASTOR', 'LIDER_DOCE']), enrollStudent);
router.delete('/enrollments/:enrollmentId', authorize(['ADMIN', 'PASTOR', 'LIDER_DOCE']), unenrollStudent);
router.post('/matrix/update', authorize(['ADMIN', 'PASTOR', 'LIDER_DOCE']), updateMatrixCell);

// Materials
router.get('/modules/:moduleId/materials', getClassMaterials);
router.post('/modules/:moduleId/materials/:classNumber',
    authorize(['ADMIN', 'PASTOR', 'LIDER_DOCE']),
    updateClassMaterial);

// Stats
router.get('/stats/leader', authorize(['ADMIN', 'PASTOR', 'LIDER_DOCE']), getSchoolStatsByLeader);

// Student Matrix
router.get('/student-matrix', authorize(['ADMIN', 'PASTOR', 'LIDER_DOCE']), getStudentMatrix);

module.exports = router;
