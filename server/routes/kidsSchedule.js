const express = require('express');
const router = express.Router();
const kidsScheduleController = require('../controllers/kidsScheduleController');
const { authenticate, authorize } = require('../middleware/auth');

// Protect all routes with authentication
router.use(authenticate);

// Get schedules for a specific course/module
router.get('/module/:moduleId', authorize(['ADMIN', 'PASTOR', 'LIDER_DOCE', 'LIDER_CELULA']), kidsScheduleController.getSchedulesByModule);

// Create a new schedule (Admin/Coordinator)
router.post('/module/:moduleId', kidsScheduleController.createSchedule);

// Update a schedule (Admin/Coordinator)
router.put('/:id', kidsScheduleController.updateSchedule);

// Delete a schedule (Admin/Coordinator)
router.delete('/:id', kidsScheduleController.deleteSchedule);

module.exports = router;
