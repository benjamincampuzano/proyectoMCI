const express = require('express');
const router = express.Router();
const kidsScheduleController = require('../controllers/kidsScheduleController');
const { authenticate } = require('../middleware/auth');
const { 
    authorizeKidsScheduleAccess, 
    authorizeKidsScheduleModification,
    authorizeScheduleModification 
} = require('../middleware/kidsScheduleAuth');

// Protect all routes with authentication
router.use(authenticate);

// Get schedules for a specific course/module
// Visible para: ADMIN, PASTOR, Coordinador del módulo, Profesores y Auxiliares asignados
router.get('/module/:moduleId', authorizeKidsScheduleAccess, kidsScheduleController.getSchedulesByModule);

// Create a new schedule
// Solo para: ADMIN, PASTOR, Coordinador del módulo
router.post('/module/:moduleId', authorizeKidsScheduleModification, kidsScheduleController.createSchedule);

// Update a schedule
// Solo para: ADMIN, PASTOR, Coordinador del módulo
router.put('/:id', authorizeScheduleModification, kidsScheduleController.updateSchedule);

// Delete a schedule
// Solo para: ADMIN, PASTOR, Coordinador del módulo
router.delete('/:id', authorizeScheduleModification, kidsScheduleController.deleteSchedule);

module.exports = router;
