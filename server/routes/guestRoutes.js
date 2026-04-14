const express = require('express');
const {
    createGuest,
    getAllGuests,
    getGuestById,
    updateGuest,
    deleteGuest,
    convertGuestToMember,
    addCall,
    addVisit,
    deleteCall,
    deleteVisit,
} = require('../controllers/guestController');
const guestStatsController = require('../controllers/guestStatsController');
const { authenticate, checkCoordinatorStatus } = require('../middleware/auth');

const router = express.Router();

// All guest routes require authentication and coordinator status check
router.get('/stats', authenticate, checkCoordinatorStatus, guestStatsController.getGuestStats);
router.post('/', authenticate, checkCoordinatorStatus, createGuest);
router.get('/', authenticate, checkCoordinatorStatus, getAllGuests);
router.get('/:id', authenticate, checkCoordinatorStatus, getGuestById);
router.put('/:id', authenticate, checkCoordinatorStatus, updateGuest);
router.delete('/:id', authenticate, checkCoordinatorStatus, deleteGuest);
router.post('/:id/convert-to-member', authenticate, checkCoordinatorStatus, convertGuestToMember);
router.post('/:id/calls', authenticate, checkCoordinatorStatus, addCall);
router.post('/:id/visits', authenticate, checkCoordinatorStatus, addVisit);
router.delete('/:id/calls/:callId', authenticate, checkCoordinatorStatus, deleteCall);
router.delete('/:id/visits/:visitId', authenticate, checkCoordinatorStatus, deleteVisit);

module.exports = router;
