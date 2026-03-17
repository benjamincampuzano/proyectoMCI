const express = require('express');
const { getModuleCoordinators, getDefaultModuleCoordinator, assignModuleCoordinator, removeModuleCoordinator } = require('../controllers/coordinatorController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Get all module coordinators
router.get('/', authenticate, getModuleCoordinators);

// Get default coordinator for a specific module
router.get('/module/:module', authenticate, getDefaultModuleCoordinator);

// Assign coordinator to a module
router.post('/module/:module', authenticate, assignModuleCoordinator);

// Remove coordinator from a module
router.delete('/module/:module', authenticate, removeModuleCoordinator);

module.exports = router;
