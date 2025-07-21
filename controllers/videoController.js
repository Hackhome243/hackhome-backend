const { validationResult } = require('express-validator');
const Video = require('../models/Video');
const User = require('../models/Users');

// Define plan hierarchy for access control
const planHierarchy = {
    'none': [],
    'beginner': ['beginner'],
    'advanced': ['advanced'],
    'complete': ['beginner', 'advanced', 'complete']
};

// @desc    Get videos based on user subscription
// @route   GET /api/videos
// @access  Private
const getVideos = async (req, res) => {
    try {
        const userId = req.user._id;
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Check if subscription has expired
        let userSubscription = user.subscription;
        if (user.subscriptionExpiry && user.subscriptionExpiry < new Date() && user.subscription !== 'none') {
            // Subscription has expired, reset to 'none'
            user.subscription = 'none';
            user.subscriptionExpiry = null;
            await user.save();
            userSubscription = 'none';
        }

        // Get allowed plan types based on user subscription
        const allowedPlans = planHierarchy[userSubscription] || [];

        // Build query based on subscription
        let query = { isActive: true };
        if (allowedPlans.length > 0) {
            query.planRequired = { $in: allowedPlans };
        } else {
            // User has no subscription, return empty array
            return res.json({
                success: true,
                subscription: userSubscription,
                count: 0,
                data: []
            });
        }

        // Get videos
        const videos = await Video.find(query)
            .select('-__v')
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            subscription: userSubscription,
            subscriptionExpiry: user.subscriptionExpiry,
            count: videos.length,
            data: videos
        });

    } catch (error) {
        console.error('Get videos error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching videos'
        });
    }
};

// @desc    Get single video by ID
// @route   GET /api/videos/:id
// @access  Private
const getVideoById = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user._id;

        // Get video
        const video = await Video.findById(id);
        if (!video || !video.isActive) {
            return res.status(404).json({
                success: false,
                message: 'Video not found'
            });
        }

        // Get user and check subscription
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Check if subscription has expired
        let userSubscription = user.subscription;
        if (user.subscriptionExpiry && user.subscriptionExpiry < new Date() && user.subscription !== 'none') {
            // Subscription has expired, reset to 'none'
            user.subscription = 'none';
            user.subscriptionExpiry = null;
            await user.save();
            userSubscription = 'none';
        }

        // Check if user has access to this video
        const allowedPlans = planHierarchy[userSubscription] || [];
        if (!allowedPlans.includes(video.planRequired)) {
            return res.status(403).json({
                success: false,
                message: `This video requires ${video.planRequired} subscription or higher`,
                requiredPlan: video.planRequired,
                currentPlan: userSubscription
            });
        }

        res.json({
            success: true,
            data: video
        });

    } catch (error) {
        console.error('Get video by ID error:', error);
        if (error.name === 'CastError') {
            return res.status(400).json({
                success: false,
                message: 'Invalid video ID'
            });
        }
        res.status(500).json({
            success: false,
            message: 'Error fetching video'
        });
    }
};

// @desc    Get videos by plan
// @route   GET /api/videos/plan/:plan
// @access  Private
const getVideosByPlan = async (req, res) => {
    try {
        const { plan } = req.params;
        const userId = req.user._id;

        // Validate plan
        const validPlans = ['beginner', 'advanced', 'complete'];
        if (!validPlans.includes(plan)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid plan specified'
            });
        }

        // Get user and check subscription
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Check if subscription has expired
        let userSubscription = user.subscription;
        if (user.subscriptionExpiry && user.subscriptionExpiry < new Date() && user.subscription !== 'none') {
            user.subscription = 'none';
            user.subscriptionExpiry = null;
            await user.save();
            userSubscription = 'none';
        }

        // Check if user has access to this plan
        const allowedPlans = planHierarchy[userSubscription] || [];
        if (!allowedPlans.includes(plan)) {
            return res.status(403).json({
                success: false,
                message: `Access denied. ${plan} plan required`,
                requiredPlan: plan,
                currentPlan: userSubscription
            });
        }

        // Get videos for the specified plan
        const videos = await Video.find({ 
            planRequired: plan,
            isActive: true 
        })
        .select('-__v')
        .sort({ createdAt: -1 });

        res.json({
            success: true,
            plan: plan,
            count: videos.length,
            data: videos
        });

    } catch (error) {
        console.error('Get videos by plan error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching videos by plan'
        });
    }
};

// @desc    Search videos
// @route   GET /api/videos/search
// @access  Private
const searchVideos = async (req, res) => {
    try {
        const { q, plan } = req.query;
        const userId = req.user._id;

        if (!q || q.trim() === '') {
            return res.status(400).json({
                success: false,
                message: 'Search query is required'
            });
        }

        // Get user and check subscription
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Check if subscription has expired
        let userSubscription = user.subscription;
        if (user.subscriptionExpiry && user.subscriptionExpiry < new Date() && user.subscription !== 'none') {
            user.subscription = 'none';
            user.subscriptionExpiry = null;
            await user.save();
            userSubscription = 'none';
        }

        // Get allowed plans based on user subscription
        const allowedPlans = planHierarchy[userSubscription] || [];

        if (allowedPlans.length === 0) {
            return res.json({
                success: true,
                query: q,
                count: 0,
                data: []
            });
        }

        // Build search query
        let searchQuery = {
            isActive: true,
            planRequired: { $in: allowedPlans },
            $or: [
                { title: { $regex: q, $options: 'i' } },
                { description: { $regex: q, $options: 'i' } }
            ]
        };

        // Filter by specific plan if provided
        if (plan && allowedPlans.includes(plan)) {
            searchQuery.planRequired = plan;
        }

        const videos = await Video.find(searchQuery)
            .select('-__v')
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            query: q,
            plan: plan || 'all',
            count: videos.length,
            data: videos
        });

    } catch (error) {
        console.error('Search videos error:', error);
        res.status(500).json({
            success: false,
            message: 'Error searching videos'
        });
    }
};

module.exports = {
    getVideos,
    getVideoById,
    getVideosByPlan,
    searchVideos
};