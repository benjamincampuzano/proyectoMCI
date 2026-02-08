const express = require('express');
const { register, login, getPublicLeaders, checkInitStatus, registerSetup } = require('../controllers/authController');
const { searchPublicUsers } = require('../controllers/userController');
const { createPublicGuest } = require('../controllers/guestController');

const router = express.Router();

router.get('/init-status', checkInitStatus);
router.post('/setup', registerSetup);
router.post('/register', register);
router.post('/login', login);
router.get('/leaders', getPublicLeaders);

// Public Guest Registration Routes
router.get('/public/users/search', searchPublicUsers);
router.post('/public/guests', createPublicGuest);

module.exports = router;
