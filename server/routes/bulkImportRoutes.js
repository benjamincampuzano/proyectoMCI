const express = require('express');
const { downloadTemplate, bulkImport } = require('../controllers/bulkImportController');
const { authenticate, isAdmin } = require('../middleware/auth');
const { uploadExcel, importLimiter } = require('../middleware/uploadExcel');

const router = express.Router();

router.use(authenticate);

router.get('/import-template', downloadTemplate);
router.post('/bulk-import', isAdmin, importLimiter, uploadExcel.single('file'), bulkImport);

module.exports = router;
