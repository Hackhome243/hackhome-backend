const express = require('express');
const { 
    getVideos, 
    getVideoById, 
    getVideosByPlan, 
    searchVideos 
} = require('../controllers/videoController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// @route   GET /api/videos
// @desc    Get videos based on user subscription
// @access  Private
router.get('/', authMiddleware, getVideos);

// @route   GET /api/videos/search
// @desc    Search videos
// @access  Private
router.get('/search', authMiddleware, searchVideos);

// @route   GET /api/videos/plan/:plan
// @desc    Get videos by plan
// @access  Private
router.get('/plan/:plan', authMiddleware, getVideosByPlan);

// @route   GET /api/videos/:id
// @desc    Get single video by ID
// @access  Private
router.get('/:id', authMiddleware, getVideoById);

module.exports = router;