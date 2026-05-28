const express = require('express');
const router = express.Router();
const {
    getLosDoce,
    getPastores,
    getNetwork,
    getAvailableUsers,
    assignUserToLeader,
    removeUserFromNetwork,
    getUserActivityList
} = require('../controllers/networkController');
const { authenticate } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

// Get all users with role LIDER_DOCE
router.get('/los-doce', getLosDoce);

// Get all users with role PASTOR
router.get('/pastores', getPastores);

// Get available users that can be added to a leader's network
router.get('/available-users/:leaderId', getAvailableUsers);

// Assign a user to a leader's network
router.post('/assign', assignUserToLeader);

// Remove a user from their leader's network
router.delete('/remove/:userId', removeUserFromNetwork);

// Get aggregated activity list for network
// ⚠️ TODAS las rutas GET específicas deben ir ANTES de esta línea.
//    No mover router.get('/:userId', getNetwork) antes de ninguna ruta específica.
router.get('/activity-list', getUserActivityList);

// Catch-all for network — debe permanecer al final de todas las rutas GET
router.get('/:userId', getNetwork);

module.exports = router;
