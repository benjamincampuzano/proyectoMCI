const express = require('express');
const router = express.Router();
const auditController = require('../controllers/auditController');
const backupController = require('../controllers/backupController');
const { authenticate, authorize } = require('../middleware/auth');
const multer = require('multer');
const { backupLimiter, restoreLimiter } = require('../middleware/backupRateLimit');

const upload = multer({ 
    dest: 'uploads/',
    limits: {
        fileSize: 100 * 1024 * 1024  // 100MB
    }
});

// Audit routes - Restricted to ADMIN and PASTOR
router.get('/logs', authenticate, authorize(['ADMIN', 'PASTOR']), auditController.getAuditLogs);
router.get('/stats', authenticate, authorize(['ADMIN', 'PASTOR']), auditController.getAuditStats);

// Database Backup Routes - Restricted to ADMIN only for safety
router.post('/backup', 
    authenticate, 
    authorize(['ADMIN']), 
    // backupLimiter,  // Temporalmente deshabilitado para pruebas
    backupController.generateBackup
);

router.post('/restore', 
    authenticate, 
    authorize(['ADMIN']), 
    // restoreLimiter,  // Temporalmente deshabilitado para pruebas
    upload.single('backupFile'), 
    backupController.restoreBackup
);

module.exports = router;
