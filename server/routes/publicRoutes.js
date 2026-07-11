const express = require('express');
const rateLimit = require('express-rate-limit');
const {
    searchPublicUsers
} = require('../controllers/userController');
const {
    getPublicConventions,
    createPublicConventionRegistration
} = require('../controllers/conventionController');
const {
    getPublicEncuentros,
    createPublicEncuentroRegistration
} = require('../controllers/encuentroController');

const router = express.Router();

const publicConventionLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Demasiadas solicitudes. Intenta nuevamente más tarde.' }
});

const publicEncuentroLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Demasiadas solicitudes. Intenta nuevamente más tarde.' }
});

// Public user search endpoint
router.get('/users/search', searchPublicUsers);
router.get('/convenciones', getPublicConventions);
router.post('/convenciones/:conventionId/registrations', publicConventionLimiter, createPublicConventionRegistration);
router.get('/encuentros', getPublicEncuentros);
router.post('/encuentros/:encuentroId/registrations', publicEncuentroLimiter, createPublicEncuentroRegistration);

module.exports = router;
