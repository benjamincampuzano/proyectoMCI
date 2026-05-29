const express = require('express');
const router = express.Router();
const kidsClassPhotosController = require('../controllers/kidsClassPhotosController');
const { authenticate, authorize } = require('../middleware/auth');
const { hasAdminAccessOnModule } = require('../middleware/coordinatorAuth');

// Protect all routes with authentication
router.use(authenticate);

const authorizeKidsModuleAccess = (req, res, next) => {
    if (hasAdminAccessOnModule(req.user, 'kids')) {
        return next();
    }

    return res.status(403).json({
        message: 'Acceso denegado. Se requiere acceso completo al módulo Kids.'
    });
};

// Create a new class photo
// Solo para acceso completo del módulo Kids
router.post('/', authorizeKidsModuleAccess, kidsClassPhotosController.createClassPhoto);

// Get all class photos (with pagination)
// Solo para acceso completo del módulo Kids
router.get('/', authorizeKidsModuleAccess, kidsClassPhotosController.getAllClassPhotos);

// Delete a class photo
// El controller permite al usuario que subió la foto o al liderazgo completo del módulo
router.delete('/:id', kidsClassPhotosController.deleteClassPhoto);

module.exports = router;
