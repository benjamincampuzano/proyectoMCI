const express = require('express');
const router = express.Router();
const { getDashboardData } = require('../controllers/dashboardController');
const { authenticate } = require('../middleware/auth');

/**
 * @route   GET /api/dashboard
 * @desc    Obtener resumen estadístico consolidado de todos los módulos
 * @access  Privado (requiere autenticación JWT)
 */
router.get('/', authenticate, getDashboardData);

module.exports = router;
