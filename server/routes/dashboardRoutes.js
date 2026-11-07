const express = require('express');
const router = express.Router();
const { getDashboardData, getCellsByLeader } = require('../controllers/dashboardController');
const { authenticate } = require('../middleware/auth');

/**
 * @route   GET /api/dashboard
 * @desc    Obtener resumen estadístico consolidado de todos los módulos
 * @access  Privado (requiere autenticación JWT)
 */
router.get('/', authenticate, getDashboardData);

/**
 * @route   GET /api/dashboard/enviar/cells-by-leader
 * @desc    Drill-down de células por Líder 12 con inscritos por célula
 * @access  Privado (requiere autenticación JWT)
 */
router.get('/enviar/cells-by-leader', authenticate, getCellsByLeader);

module.exports = router;
