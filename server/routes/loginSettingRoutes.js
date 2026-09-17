const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const router = express.Router();
const loginSettingController = require('../controllers/loginSettingController');
const { authenticate, isAdmin } = require('../middleware/auth');

const ALLOWED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg'];
const ALLOWED_VIDEO_EXTENSIONS = ['.mp4', '.webm', '.ogg', '.mov'];
const MAX_FILE_SIZE = 30 * 1024 * 1024; // 30MB

const uploadDir = path.join(process.cwd(), 'uploads', 'login-media');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        const baseName = path.basename(file.originalname, ext)
            .replace(/[^a-zA-Z0-9-_ ]/g, '_')
            .replace(/\s+/g, '_')
            .slice(0, 60) || 'bienvenida';
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        cb(null, `${uniqueSuffix}-${baseName}${ext}`);
    }
});

const fileFilter = (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if ([...ALLOWED_IMAGE_EXTENSIONS, ...ALLOWED_VIDEO_EXTENSIONS].includes(ext)) {
        return cb(null, true);
    }
    return cb(new Error('Formato de archivo no permitido. Solo se aceptan imágenes (jpg, png, webp, gif, svg) o videos (mp4, webm, ogg, mov).'));
};

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: MAX_FILE_SIZE }
});

const handleUpload = (req, res, next) => {
    upload.single('file')(req, res, (err) => {
        if (err) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({ error: 'El archivo excede el tamaño máximo permitido de 30MB.' });
            }
            return res.status(400).json({ error: err.message || 'Error al subir el archivo.' });
        }
        next();
    });
};

router.get('/', loginSettingController.getLoginSetting);

router.put('/', authenticate, isAdmin, loginSettingController.updateLoginSetting);

router.post('/upload', authenticate, isAdmin, handleUpload, loginSettingController.uploadLoginMedia);

module.exports = router;