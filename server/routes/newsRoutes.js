const express = require('express');
const {
    getAllNews,
    getActiveNews,
    createNews,
    updateNews,
    deleteNews
} = require('../controllers/newsController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// Rutas públicas (para usuarios autenticados)
router.get('/active', authenticate, getActiveNews);

// Rutas protegidas (Administración)
router.get('/', authenticate, authorize(['ADMIN', 'PASTOR']), getAllNews);
router.post('/', authenticate, authorize(['ADMIN', 'PASTOR']), createNews);
router.put('/:id', authenticate, authorize(['ADMIN', 'PASTOR']), updateNews);
router.delete('/:id', authenticate, authorize(['ADMIN', 'PASTOR']), deleteNews);

module.exports = router;
