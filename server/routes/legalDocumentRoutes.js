const express = require('express');
const router = express.Router();
const legalDocumentController = require('../controllers/legalDocumentController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/', authenticate, legalDocumentController.getAllDocuments);
router.post('/', authenticate, authorize(['ADMIN']), legalDocumentController.createDocument);
router.delete('/:id', authenticate, authorize(['ADMIN']), legalDocumentController.deleteDocument);

module.exports = router;
