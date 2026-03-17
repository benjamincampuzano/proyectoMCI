const express = require('express');
const { getModuleCoordinators, getDefaultModuleCoordinator } = require('../controllers/coordinatorController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Get all module coordinators
router.get('/', authenticate, getModuleCoordinators);

// Get default coordinator for a specific module
router.get('/module/:module', authenticate, getDefaultModuleCoordinator);

module.exports = router;
