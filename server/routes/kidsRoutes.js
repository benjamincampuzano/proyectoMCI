const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
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
    getKidsStatsByLeader
} = require('../controllers/kidsController');

router.use(authenticate);

router.post('/modules', createModule);
router.get('/modules', getModules);
router.put('/modules/:id', updateModule);
router.delete('/modules/:id', deleteModule);
router.get('/modules/:id/matrix', getModuleMatrix);

router.post('/enroll', enrollStudent);
router.delete('/enrollments/:enrollmentId', unenrollStudent);
router.post('/matrix/update', updateMatrixCell);

router.get('/student-matrix', getStudentMatrix);
router.get('/eligible-students/:moduleId', getEligibleStudents);
router.get('/stats/leader', getKidsStatsByLeader);

module.exports = router;
