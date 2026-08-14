const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const router = express.Router();
const legalDocumentController = require('../controllers/legalDocumentController');
const { authenticate, checkCoordinatorStatus } = require('../middleware/auth');
const { hasAdminAccessOnModule } = require('../middleware/coordinatorAuth');

const ALLOWED_EXTENSIONS = ['.doc', '.docx', '.pdf', '.jpg', '.png'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

// Asegurar que el directorio de uploads exista
const uploadDir = path.join(process.cwd(), 'uploads', 'legal-documents');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        const baseName = path.basename(file.originalname, ext)
            .replace(/[^a-zA-Z0-9-_ ]/g, '_')
            .replace(/\s+/g, '_')
            .slice(0, 80) || 'documento';
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        cb(null, `${uniqueSuffix}-${baseName}${ext}`);
    }
});

const fileFilter = (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ALLOWED_EXTENSIONS.includes(ext)) {
        return cb(null, true);
    }
    return cb(new Error('Formato de archivo no permitido. Solo se aceptan .doc, .docx, .pdf, .jpg y .png.'));
};

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: MAX_FILE_SIZE }
});

// Middleware para manejar errores de multer (tamaño/ formato) con respuesta limpia
const handleUpload = (req, res, next) => {
    upload.single('file')(req, res, (err) => {
        if (err) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({ error: 'El archivo excede el tamaño máximo permitido de 5MB.' });
            }
            return res.status(400).json({ error: err.message || 'Error al subir el archivo.' });
        }
        next();
    });
};

// Middleware de acceso: solo Coordinador, Subcoordinador o Tesorero del módulo Kids (o ADMIN/PASTOR)
const requireKidsModuleAccess = async (req, res, next) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Se requiere autenticación' });
        }
        if (hasAdminAccessOnModule(req.user, 'kids')) {
            return next();
        }
        return res.status(403).json({
            message: 'Acceso denegado. Solo el coordinador, subcoordinador o tesorero del módulo Kids puede acceder a los documentos legales.'
        });
    } catch (error) {
        console.error('Error in requireKidsModuleAccess:', error);
        return res.status(500).json({ message: 'Error al verificar permisos' });
    }
};

// Proteger todas las rutas con autenticación y permisos del módulo Kids
router.use(authenticate);
router.use(checkCoordinatorStatus);
router.use(requireKidsModuleAccess);

router.get('/', legalDocumentController.getAllDocuments);
router.post('/', handleUpload, legalDocumentController.createDocument);
router.get('/:id/download', legalDocumentController.downloadDocument);
router.delete('/:id', legalDocumentController.deleteDocument);

module.exports = router;
