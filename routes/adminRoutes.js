const express = require('express');
const { body } = require('express-validator');
const { 
    addVideo, 
    updateVideo, 
    deleteVideo, 
    getAllVideos, 
    getAllUsers, 
    updateUserSubscription, 
    getDashboardStats, 
    getAllPayments 
} = require('../controllers/adminController');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');

const router = express.Router();

// Apply auth and admin middleware to all routes
router.use(authMiddleware);
router.use(adminMiddleware);

// Video Management Routes
// @route   POST /api/admin/video
// @desc    Add new video
// @access  Private (Admin only)
router.post('/video', [
    body('title')
        .trim()
        .notEmpty()
        .withMessage('Title is required')
        .isLength({ min: 3, max: 200 })
        .withMessage('Title must be between 3 and 200 characters'),
    body('description')
        .trim()
        .notEmpty()
        .withMessage('Description is required')
        .isLength({ min: 10, max: 1000 })
        .withMessage('Description must be between 10 and 1000 characters'),
    body('url')
        .trim()
        .notEmpty()
        .withMessage('Video URL is required')
        .isURL()
        .withMessage('Please provide a valid URL'),
    body('planRequired')
        .notEmpty()
        .withMessage('Plan required is required')
        .isIn(['beginner', 'advanced', 'complete'])
        .withMessage('Plan must be one of: beginner, advanced, complete'),
    body('duration')
        .optional()
        .isNumeric()
        .withMessage('Duration must be a number'),
    body('thumbnail')
        .optional()
        .isURL()
        .withMessage('Thumbnail must be a valid URL')
], addVideo);

// @route   PUT /api/admin/video/:id
// @desc    Update video
// @access  Private (Admin only)
router.put('/video/:id', [
    body('title')
        .optional()
        .trim()
        .isLength({ min: 3, max: 200 })
        .withMessage('Title must be between 3 and 200 characters'),
    body('description')
        .optional()
        .trim()
        .isLength({ min: 10, max: 1000 })
        .withMessage('Description must be between 10 and 1000 characters'),
    body('url')
        .optional()
        .trim()
        .isURL()
        .withMessage('Please provide a valid URL'),
    body('planRequired')
        .optional()
        .isIn(['beginner', 'advanced', 'complete'])
        .withMessage('Plan must be one of: beginner, advanced, complete'),
    body('duration')
        .optional()
        .isNumeric()
        .withMessage('Duration must be a number'),
    body('thumbnail')
        .optional()
        .isURL()
        .withMessage('Thumbnail must be a valid URL'),
    body('isActive')
        .optional()
        .isBoolean()
        .withMessage('isActive must be a boolean')
], updateVideo);

// @route   DELETE /api/admin/video/:id
// @desc    Delete video
// @access  Private (Admin only)
router.delete('/video/:id', deleteVideo);

// @route   GET /api/admin/videos
// @desc    Get all videos (admin view)
// @access  Private (Admin only)
router.get('/videos', getAllVideos);

// User Management Routes
// @route   GET /api/admin/users
// @desc    Get all users
// @access  Private (Admin only)
router.get('/users', getAllUsers);

// @route   PUT /api/admin/user/:id/subscription
// @desc    Update user subscription
// @access  Private (Admin only)
router.put('/user/:id/subscription', [
    body('subscription')
        .notEmpty()
        .withMessage('Subscription is required')
        .isIn(['none', 'beginner', 'advanced', 'complete'])
        .withMessage('Subscription must be one of: none, beginner, advanced, complete'),
    body('subscriptionExpiry')
        .optional()
        .isISO8601()
        .withMessage('Subscription expiry must be a valid date')
], updateUserSubscription);

// Dashboard Routes
// @route   GET /api/admin/stats
// @desc    Get dashboard statistics
// @access  Private (Admin only)
router.get('/stats', getDashboardStats);

// Payment Management Routes
// @route   GET /api/admin/payments
// @desc    Get all payments
// @access  Private (Admin only)
router.get('/payments', getAllPayments);

module.exports = router;