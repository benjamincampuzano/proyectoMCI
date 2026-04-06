const express = require('express');
const rateLimit = require('express-rate-limit');
const { register, login, getPublicLeaders, checkInitStatus, registerSetup, changePassword, forcePasswordChange, refreshToken, logout, getSessions, logoutAll } = require('../controllers/authController');
const { searchPublicUsers } = require('../controllers/userController');
const { createPublicGuest } = require('../controllers/guestController');
const { authenticate, isAdmin, authorize } = require('../middleware/auth');

const router = express.Router();

/* ✅ Rate Limiting para autenticación */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10, // 10 intentos por ventana
  message: { message: 'Demasiados intentos. Intenta en 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 30, // 30 refresh por ventana
  message: { message: 'Demasiadas solicitudes de token. Intenta más tarde.' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.get('/init-status', checkInitStatus);
router.post('/setup', authLimiter, registerSetup);
router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.get('/leaders', getPublicLeaders);

// Token management routes
router.post('/refresh-token', refreshLimiter, refreshToken);
router.post('/logout', logout);

// Protected routes
router.post('/change-password', authenticate, changePassword);
router.post('/force-password-change/:userId', authenticate, authorize(['ADMIN', 'PASTOR', 'LIDER_DOCE']), forcePasswordChange);

// Session management (protected)
router.get('/sessions', authenticate, getSessions);
router.post('/logout-all', authenticate, logoutAll);

// Public Guest Registration Routes
router.get('/public/users/search', searchPublicUsers);
router.post('/public/guests', createPublicGuest);

module.exports = router;
