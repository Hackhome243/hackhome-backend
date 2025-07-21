const express = require('express');
const { body } = require('express-validator');
const { 
    getPlans, 
    startSubscription, 
    handleIPN, 
    getPaymentStatus, 
    getUserPayments 
} = require('../controllers/subscriptionController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// @route   GET /api/subscription/plans
// @desc    Get subscription plans
// @access  Public
router.get('/plans', getPlans);

// @route   POST /api/subscription/start
// @desc    Start subscription payment
// @access  Private
router.post('/start', authMiddleware, [
    body('plan')
        .notEmpty()
        .withMessage('Plan is required')
        .isIn(['beginner', 'advanced', 'complete'])
        .withMessage('Plan must be one of: beginner, advanced, complete')
], startSubscription);

// @route   POST /api/subscription/ipn
// @desc    Handle IPN callback from NowPayments
// @access  Public (verified with signature)
router.post('/ipn', handleIPN);

// @route   GET /api/subscription/payment/:paymentId
// @desc    Get payment status
// @access  Private
router.get('/payment/:paymentId', authMiddleware, getPaymentStatus);

// @route   GET /api/subscription/payments
// @desc    Get user's payment history
// @access  Private
router.get('/payments', authMiddleware, getUserPayments);

module.exports = router;