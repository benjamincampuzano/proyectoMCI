const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { hasAdminAccessOnModule } = require('../middleware/coordinatorAuth');
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

const authorizeKidsModuleAccess = (req, res, next) => {
    if (hasAdminAccessOnModule(req.user, 'kids')) {
        return next();
    }

    return res.status(403).json({
        message: 'Acceso denegado. Se requiere acceso completo al módulo Kids.'
    });
};

router.post('/modules', authorizeKidsModuleAccess, createModule);
router.get('/modules', getModules);
router.put('/modules/:id', authorizeKidsModuleAccess, updateModule);
router.delete('/modules/:id', authorizeKidsModuleAccess, deleteModule);
router.get('/modules/:id/matrix', getModuleMatrix);

router.post('/enroll', enrollStudent);
router.delete('/enrollments/:enrollmentId', unenrollStudent);
router.post('/matrix/update', updateMatrixCell);

router.get('/student-matrix', getStudentMatrix);
router.get('/eligible-students/:moduleId', getEligibleStudents);
router.get('/stats/leader', getKidsStatsByLeader);
router.get('/students/check-access', checkKidsAccess);

module.exports = router;
