const express = require('express');
const { register, login, getPublicLeaders, checkInitStatus, registerSetup, changePassword, forcePasswordChange } = require('../controllers/authController');
const { searchPublicUsers } = require('../controllers/userController');
const { createPublicGuest } = require('../controllers/guestController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.get('/init-status', checkInitStatus);
router.post('/setup', registerSetup);
router.post('/register', register);
router.post('/login', login);
router.get('/leaders', getPublicLeaders);

// Protected routes
router.post('/change-password', authenticate, changePassword);
router.post('/force-password-change/:userId', authenticate, forcePasswordChange);

// Public Guest Registration Routes
router.get('/public/users/search', searchPublicUsers);
router.post('/public/guests', createPublicGuest);

module.exports = router;
