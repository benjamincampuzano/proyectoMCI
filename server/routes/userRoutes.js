const express = require('express');
const {
    getProfile,
    updateProfile,
    changePassword,
    getAllUsers,
    getUserById,
    updateUser,
    createUser,
    deleteUser,
    assignLeader,
    getMyNetwork,
    searchUsers // Added
} = require('../controllers/userController');
const { authenticate, isAdmin, authorize } = require('../middleware/auth');

const router = express.Router();

// User profile routes (authenticated users)
router.get('/profile', authenticate, getProfile);
router.put('/profile', authenticate, updateProfile);
router.put('/password', authenticate, changePassword);

// Dedicated search endpoint for internal leaders (Must be before /:id)
// Allows ADMIN, PASTOR, LIDER_DOCE (excludes LIDER_CELULA per user request)
router.get('/search', authenticate, (req, res, next) => {
    // Custom inline middleware for specific role check
    const roles = req.user.roles || [];
    if (roles.some(r => ['ADMIN', 'PASTOR', 'LIDER_DOCE'].includes(r))) {
        next();
    } else {
        res.status(403).json({ message: 'Access denied. Requires leadership role (Pastor/Doce).' });
    }
}, searchUsers);

// Role-based routes
// Read access: ADMIN, PASTOR, LIDER_DOCE, LIDER_CELULA
router.get('/', authenticate, authorize(['ADMIN', 'PASTOR', 'LIDER_DOCE', 'LIDER_CELULA']), getAllUsers);
router.get('/:id', authenticate, authorize(['ADMIN', 'PASTOR', 'LIDER_DOCE', 'LIDER_CELULA']), getUserById);

// Write access: ADMIN, PASTOR, LIDER_DOCE
router.post('/', authenticate, authorize(['ADMIN', 'PASTOR', 'LIDER_DOCE']), createUser);
router.put('/:id', authenticate, authorize(['ADMIN', 'PASTOR', 'LIDER_DOCE']), updateUser);
router.delete('/:id', authenticate, authorize(['ADMIN', 'PASTOR', 'LIDER_DOCE']), deleteUser);
router.post('/assign-leader/:id', authenticate, authorize(['ADMIN', 'PASTOR', 'LIDER_DOCE']), assignLeader);

router.get('/my-network/all', authenticate, getMyNetwork);

module.exports = router;
