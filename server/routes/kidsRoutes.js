const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { isModuleCoordinator } = require('../middleware/coordinatorAuth');
const {
    createModule,
    getModules,
    updateModule,
    deleteModule,
    getModuleMatrix,
    enrollStudent,
    unenrollStudent,
    updateMatrixCell,
    getStudentMatrix,
    getEligibleStudents,
    getKidsStatsByLeader,
    checkKidsAccess
} = require('../controllers/kidsController');

router.use(authenticate);

router.post('/modules', authenticate, isModuleCoordinator, createModule);
router.get('/modules', getModules);
router.put('/modules/:id', authenticate, isModuleCoordinator, updateModule);
router.delete('/modules/:id', authenticate, isModuleCoordinator, deleteModule);
router.get('/modules/:id/matrix', getModuleMatrix);

router.post('/enroll', enrollStudent);
router.delete('/enrollments/:enrollmentId', unenrollStudent);
router.post('/matrix/update', updateMatrixCell);

router.get('/student-matrix', getStudentMatrix);
router.get('/eligible-students/:moduleId', getEligibleStudents);
router.get('/stats/leader', getKidsStatsByLeader);
router.get('/students/check-access', checkKidsAccess);

module.exports = router;
