const express = require('express');
const router = express.Router();
const oracionDeTresController = require('../controllers/oracionDeTresController');
const { authenticate } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

// Create a new group
router.post('/', oracionDeTresController.createGroup);

// List groups for the authenticated user (contextual)
router.get('/', oracionDeTresController.getGroups);

// Get details of a specific group
router.get('/:id', oracionDeTresController.getGroupById);

// Update a group
router.put('/:id', oracionDeTresController.updateGroup);

// Delete a group
router.delete('/:id', oracionDeTresController.deleteGroup);

// Add a meeting to a group
router.post('/meeting', oracionDeTresController.addMeeting);

module.exports = router;
