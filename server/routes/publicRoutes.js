const express = require('express');
const {
    searchPublicUsers
} = require('../controllers/userController');

const router = express.Router();

// Public user search endpoint
router.get('/users/search', searchPublicUsers);

module.exports = router;
