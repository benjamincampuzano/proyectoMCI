const express = require('express');
const router = express.Router();
const { getPendingTasks } = require('../controllers/dashboardTasksController');
const { authenticate } = require('../middleware/auth');

router.get('/pending', authenticate, getPendingTasks);

module.exports = router;
