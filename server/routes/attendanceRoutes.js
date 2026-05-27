const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { selfReport } = require('../controllers/attendanceController');

router.post('/self-report', authenticate, selfReport);

module.exports = router;
