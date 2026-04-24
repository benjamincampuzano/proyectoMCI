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
    searchUsers, // Added
    getUsersByIds
} = require('../controllers/userController');
const { authenticate, isAdmin, authorize, checkCoordinatorStatus } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);
router.use(checkCoordinatorStatus);

// User profile routes (authenticated users)
router.get('/profile', getProfile);
router.put('/profile', updateProfile);
router.put('/password', changePassword);

// Dedicated search endpoint for internal leaders
router.get('/search', searchUsers);

// Get users by IDs (for caching related users)
router.get('/by-ids', getUsersByIds);

// Role-based routes
router.get('/', getAllUsers);
router.get('/:id', getUserById);

// Write access
router.post('/', authorize(['ADMIN', 'PASTOR', 'LIDER_DOCE']), createUser);
router.put('/:id', updateUser);
router.delete('/:id', isAdmin, deleteUser);
router.post('/assign-leader/:id', authorize(['ADMIN', 'PASTOR', 'LIDER_DOCE']), assignLeader);

router.get('/my-network/all', getMyNetwork);

module.exports = router;
