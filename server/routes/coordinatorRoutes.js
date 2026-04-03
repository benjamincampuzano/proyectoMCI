const express = require('express');
const { getModuleCoordinators, getDefaultModuleCoordinator, assignModuleCoordinator, removeModuleCoordinator, getModuleSubCoordinator, assignModuleSubCoordinator, removeModuleSubCoordinator, getModuleCandidates } = require('../controllers/coordinatorController');
const { authenticate, isAdmin, authorize, checkCoordinatorStatus } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);
router.use(checkCoordinatorStatus);

// Get all module coordinators - ADMIN/PASTOR ven todos, LIDER_DOCE solo ve los de su red
router.get('/', getModuleCoordinators);

// Get default coordinator for a specific module - abierto
router.get('/module/:module', getDefaultModuleCoordinator);

// Assign coordinator to a module - ADMIN or PASTOR
router.post('/module/:module', authorize(['ADMIN', 'PASTOR']), assignModuleCoordinator);

// Remove coordinator from a module - ADMIN or PASTOR  
router.delete('/module/:module', authorize(['ADMIN', 'PASTOR']), removeModuleCoordinator);

// Subcoordinators routes
router.get('/module/:module/subcoordinator', getModuleSubCoordinator);
router.post('/module/:module/subcoordinator', assignModuleSubCoordinator);
router.delete('/module/:module/subcoordinator', removeModuleSubCoordinator);
router.get('/module/:module/candidates', getModuleCandidates);

module.exports = router;
