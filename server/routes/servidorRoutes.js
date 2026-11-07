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
const { codeValidationLimiter, serverCreateLimiter } = require('../middleware/servidorRateLimit');

const router = express.Router();

// Todas las rutas de servidores requieren autenticación
router.post('/', authenticate, checkCoordinatorStatus, serverCreateLimiter, createServidor);
router.get('/', authenticate, checkCoordinatorStatus, getAllServidores);
router.get('/available-users', authenticate, checkCoordinatorStatus, getAvailableUsers);
// Público para validación de código, con límite por IP: sin él, una IP podría
// enumerar el espacio de 900.000 códigos y obtener los datos de los servidores.
router.get('/validate/:code', codeValidationLimiter, getServidorByCode);
router.put('/:id/status', authenticate, checkCoordinatorStatus, updateServidorStatus);
router.delete('/:id', authenticate, checkCoordinatorStatus, deleteServidor);

module.exports = router;
