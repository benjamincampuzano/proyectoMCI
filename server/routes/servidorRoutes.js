const express = require('express');
const {
    createServidor,
    getAllServidores,
    getServidorByCode,
    updateServidorStatus,
    deleteServidor,
    getAvailableUsers,
} = require('../controllers/servidorController');
const { authenticate, checkCoordinatorStatus } = require('../middleware/auth');

const router = express.Router();

// Todas las rutas de servidores requieren autenticación
router.post('/', authenticate, checkCoordinatorStatus, createServidor);
router.get('/', authenticate, checkCoordinatorStatus, getAllServidores);
router.get('/available-users', authenticate, checkCoordinatorStatus, getAvailableUsers);
router.get('/validate/:code', getServidorByCode); // Público para validación de código
router.put('/:id/status', authenticate, checkCoordinatorStatus, updateServidorStatus);
router.delete('/:id', authenticate, checkCoordinatorStatus, deleteServidor);

module.exports = router;
