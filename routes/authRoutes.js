const express = require('express');
const { body } = require('express-validator');
const { register, login, getMe } = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// @route   POST /api/auth/register
// @desc    Register user
// @access  Public
router.post('/register', [
    body('name')
        .trim()
        .notEmpty()
        .withMessage('Name is required')
        .isLength({ min: 2, max: 50 })
        .withMessage('Name must be between 2 and 50 characters'),
    body('email')
        .isEmail()
        .withMessage('Please provide a valid email')
        .normalizeEmail(),
    body('password')
        .isLength({ min: 8 })
        .withMessage('Password must be at least 8 characters long')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('Password must contain at least 1 uppercase letter, 1 lowercase letter, and 1 number')
], register);

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', [
    body('email')
        .isEmail()
        .withMessage('Please provide a valid email')
        .normalizeEmail(),
    body('password')
        .notEmpty()
        .withMessage('Password is required')
], login);

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', authMiddleware, getMe);

module.exports = router;