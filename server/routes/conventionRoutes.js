const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const {
    getConventions,
    getConventionById,
    createConvention,
    updateConvention,
    registerUser,
    getPendingConventionRegistrations,
    approveConventionRegistration,
    rejectConventionRegistration,
    addPayment,
    updateRegistration,
    deleteRegistration,
    deleteConvention,
    getConventionBalanceReport
} = require('../controllers/conventionController');
const { canManageTreasurerActions } = require('../middleware/coordinatorAuth');

// All routes require authentication
router.use(authenticate);

const canManageConventionPayments = canManageTreasurerActions('Convenciones');

router.get('/', getConventions);
router.post('/', createConvention);
router.get('/:id', getConventionById);
router.put('/:id', updateConvention);
router.delete('/:id', deleteConvention);
router.get('/:id/report/balance', getConventionBalanceReport);
router.get('/:conventionId/registrations/pending', getPendingConventionRegistrations);

router.post('/:conventionId/register', registerUser);
router.patch('/registrations/:registrationId/approve', approveConventionRegistration);
router.patch('/registrations/:registrationId/reject', rejectConventionRegistration);
router.post('/registrations/:registrationId/payments', canManageConventionPayments, addPayment);
router.put('/registrations/:registrationId', updateRegistration);
router.delete('/registrations/:registrationId', deleteRegistration);

module.exports = router;
