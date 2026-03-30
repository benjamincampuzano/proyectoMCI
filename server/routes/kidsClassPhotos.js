const express = require('express');
const router = express.Router();
const kidsClassPhotosController = require('../controllers/kidsClassPhotosController');
const { authenticate, authorize } = require('../middleware/auth');

// Protect all routes with authentication
router.use(authenticate);

// Create a new class photo
// Solo para: ADMIN, PASTOR, LIDER_DOCE (profesores), LIDER_CELULA (auxiliares)
router.post('/', 
    authorize(['ADMIN', 'PASTOR', 'LIDER_DOCE', 'LIDER_CELULA']), 
    kidsClassPhotosController.createClassPhoto
);

// Get all class photos (with pagination)
// Solo para: ADMIN, PASTOR
router.get('/', 
    authorize(['ADMIN', 'PASTOR']), 
    kidsClassPhotosController.getAllClassPhotos
);

// Delete a class photo
// Solo para: ADMIN, PASTOR, o el usuario que subió la foto
router.delete('/:id', 
    authenticate, 
    kidsClassPhotosController.deleteClassPhoto
);

module.exports = router;
