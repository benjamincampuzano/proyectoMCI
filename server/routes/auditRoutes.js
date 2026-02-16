const express = require('express');
const router = express.Router();
const auditController = require('../controllers/auditController');
const backupController = require('../controllers/backupController');
const { authenticate, authorize } = require('../middleware/auth');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

// Audit routes - Restricted to ADMIN and PASTOR
router.get('/logs', authenticate, authorize(['ADMIN', 'PASTOR']), auditController.getAuditLogs);
router.get('/stats', authenticate, authorize(['ADMIN', 'PASTOR']), auditController.getAuditStats);

// Database Backup Routes - Restricted to ADMIN only for safety
router.get('/backup', authenticate, authorize(['ADMIN']), backupController.downloadBackup);
router.post('/restore', authenticate, authorize(['ADMIN']), upload.single('backupFile'), backupController.restoreBackup);
router.post('/backup/drive', authenticate, authorize(['ADMIN']), backupController.backupToDrive);

module.exports = router;
