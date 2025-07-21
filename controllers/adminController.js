const { validationResult } = require('express-validator');
const Video = require('../models/Video');
const User = require('../models/Users');
const Payment = require('../models/Payment');

// @desc    Add new video
// @route   POST /api/admin/video
// @access  Private (Admin only)
const addVideo = async (req, res) => {
    try {
        // Check for validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation errors',
                errors: errors.array()
            });
        }

        const { title, description, url, planRequired, duration, thumbnail } = req.body;

        // Validate plan
        const validPlans = ['beginner', 'advanced', 'complete'];
        if (!validPlans.includes(planRequired)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid plan. Must be one of: beginner, advanced, complete'
            });
        }

        // Create video
        const video = await Video.create({
            title: title.trim(),
            description: description.trim(),
            url: url.trim(),
            planRequired,
            duration: duration || 0,
            thumbnail: thumbnail || '',
            isActive: true
        });

        res.status(201).json({
            success: true,
            message: 'Video added successfully',
            data: video
        });

    } catch (error) {
        console.error('Add video error:', error);
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: 'Video with this URL already exists'
            });
        }
        res.status(500).json({
            success: false,
            message: 'Error adding video'
        });
    }
};

// @desc    Update video
// @route   PUT /api/admin/video/:id
// @access  Private (Admin only)
const updateVideo = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, url, planRequired, duration, thumbnail, isActive } = req.body;

        // Find video
        const video = await Video.findById(id);
        if (!video) {
            return res.status(404).json({
                success: false,
                message: 'Video not found'
            });
        }

        // Validate plan if provided
        if (planRequired) {
            const validPlans = ['beginner', 'advanced', 'complete'];
            if (!validPlans.includes(planRequired)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid plan. Must be one of: beginner, advanced, complete'
                });
            }
        }

        // Update video fields
        if (title) video.title = title.trim();
        if (description) video.description = description.trim();
        if (url) video.url = url.trim();
        if (planRequired) video.planRequired = planRequired;
        if (duration !== undefined) video.duration = duration;
        if (thumbnail !== undefined) video.thumbnail = thumbnail;
        if (isActive !== undefined) video.isActive = isActive;

        await video.save();

        res.json({
            success: true,
            message: 'Video updated successfully',
            data: video
        });

    } catch (error) {
        console.error('Update video error:', error);
        if (error.name === 'CastError') {
            return res.status(400).json({
                success: false,
                message: 'Invalid video ID'
            });
        }
        res.status(500).json({
            success: false,
            message: 'Error updating video'
        });
    }
};

// @desc    Delete video
// @route   DELETE /api/admin/video/:id
// @access  Private (Admin only)
const deleteVideo = async (req, res) => {
    try {
        const { id } = req.params;

        const video = await Video.findById(id);
        if (!video) {
            return res.status(404).json({
                success: false,
                message: 'Video not found'
            });
        }

        await Video.findByIdAndDelete(id);

        res.json({
            success: true,
            message: 'Video deleted successfully'
        });

    } catch (error) {
        console.error('Delete video error:', error);
        if (error.name === 'CastError') {
            return res.status(400).json({
                success: false,
                message: 'Invalid video ID'
            });
        }
        res.status(500).json({
            success: false,
            message: 'Error deleting video'
        });
    }
};

// @desc    Get all videos (admin view)
// @route   GET /api/admin/videos
// @access  Private (Admin only)
const getAllVideos = async (req, res) => {
    try {
        const { page = 1, limit = 10, plan, search, isActive } = req.query;

        // Build query
        let query = {};

        if (plan) {
            const validPlans = ['beginner', 'advanced', 'complete'];
            if (validPlans.includes(plan)) {
                query.planRequired = plan;
            }
        }

        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }

        if (isActive !== undefined) {
            query.isActive = isActive === 'true';
        }

        // Execute query with pagination
        const videos = await Video.find(query)
            .select('-__v')
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await Video.countDocuments(query);

        res.json({
            success: true,
            count: videos.length,
            total: total,
            page: parseInt(page),
            pages: Math.ceil(total / limit),
            data: videos
        });

    } catch (error) {
        console.error('Get all videos error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching videos'
        });
    }
};

// @desc    Get all users
// @route   GET /api/admin/users
// @access  Private (Admin only)
const getAllUsers = async (req, res) => {
    try {
        const { page = 1, limit = 10, subscription, search } = req.query;

        // Build query
        let query = {};

        if (subscription) {
            const validSubscriptions = ['none', 'beginner', 'advanced', 'complete'];
            if (validSubscriptions.includes(subscription)) {
                query.subscription = subscription;
            }
        }

        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }

        // Execute query with pagination
        const users = await User.find(query)
            .select('-password -__v')
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await User.countDocuments(query);

        res.json({
            success: true,
            count: users.length,
            total: total,
            page: parseInt(page),
            pages: Math.ceil(total / limit),
            data: users
        });

    } catch (error) {
        console.error('Get all users error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching users'
        });
    }
};

// @desc    Update user subscription
// @route   PUT /api/admin/user/:id/subscription
// @access  Private (Admin only)
const updateUserSubscription = async (req, res) => {
    try {
        const { id } = req.params;
        const { subscription, subscriptionExpiry } = req.body;

        // Find user
        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Validate subscription
        const validSubscriptions = ['none', 'beginner', 'advanced', 'complete'];
        if (!validSubscriptions.includes(subscription)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid subscription. Must be one of: none, beginner, advanced, complete'
            });
        }

        // Update user subscription
        user.subscription = subscription;
        
        if (subscription === 'none') {
            user.subscriptionExpiry = null;
        } else if (subscriptionExpiry) {
            user.subscriptionExpiry = new Date(subscriptionExpiry);
        } else {
            // Default to 30 days from now
            const expiryDate = new Date();
            expiryDate.setDate(expiryDate.getDate() + 30);
            user.subscriptionExpiry = expiryDate;
        }

        await user.save();

        res.json({
            success: true,
            message: 'User subscription updated successfully',
            data: {
                _id: user._id,
                name: user.name,
                email: user.email,
                subscription: user.subscription,
                subscriptionExpiry: user.subscriptionExpiry
            }
        });

    } catch (error) {
        console.error('Update user subscription error:', error);
        if (error.name === 'CastError') {
            return res.status(400).json({
                success: false,
                message: 'Invalid user ID'
            });
        }
        res.status(500).json({
            success: false,
            message: 'Error updating user subscription'
        });
    }
};

// @desc    Get dashboard statistics
// @route   GET /api/admin/stats
// @access  Private (Admin only)
const getDashboardStats = async (req, res) => {
    try {
        // Get counts
        const totalUsers = await User.countDocuments();
        const totalVideos = await Video.countDocuments();
        const activeVideos = await Video.countDocuments({ isActive: true });
        const totalPayments = await Payment.countDocuments();
        const successfulPayments = await Payment.countDocuments({ 
            status: { $in: ['finished', 'confirmed'] } 
        });

        // Get subscription distribution
        const subscriptionStats = await User.aggregate([
            {
                $group: {
                    _id: '$subscription',
                    count: { $sum: 1 }
                }
            }
        ]);

        // Get plan-wise video distribution
        const videoStats = await Video.aggregate([
            {
                $group: {
                    _id: '$planRequired',
                    count: { $sum: 1 }
                }
            }
        ]);

        // Get recent payments (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const recentPayments = await Payment.countDocuments({
            createdAt: { $gte: thirtyDaysAgo }
        });

        const recentRevenue = await Payment.aggregate([
            {
                $match: {
                    createdAt: { $gte: thirtyDaysAgo },
                    status: { $in: ['finished', 'confirmed'] }
                }
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: '$amount' }
                }
            }
        ]);

        res.json({
            success: true,
            data: {
                overview: {
                    totalUsers,
                    totalVideos,
                    activeVideos,
                    totalPayments,
                    successfulPayments,
                    recentPayments,
                    recentRevenue: recentRevenue[0]?.total || 0
                },
                subscriptionDistribution: subscriptionStats,
                videoDistribution: videoStats
            }
        });

    } catch (error) {
        console.error('Get dashboard stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching dashboard statistics'
        });
    }
};

// @desc    Get all payments
// @route   GET /api/admin/payments
// @access  Private (Admin only)
const getAllPayments = async (req, res) => {
    try {
        const { page = 1, limit = 10, status, plan } = req.query;

        // Build query
        let query = {};

        if (status) {
            query.status = status;
        }

        if (plan) {
            const validPlans = ['beginner', 'advanced', 'complete'];
            if (validPlans.includes(plan)) {
                query.plan = plan;
            }
        }

        // Execute query with pagination
        const payments = await Payment.find(query)
            .populate('userId', 'name email')
            .select('-__v')
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await Payment.countDocuments(query);

        res.json({
            success: true,
            count: payments.length,
            total: total,
            page: parseInt(page),
            pages: Math.ceil(total / limit),
            data: payments
        });

    } catch (error) {
        console.error('Get all payments error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching payments'
        });
    }
};

module.exports = {
    addVideo,
    updateVideo,
    deleteVideo,
    getAllVideos,
    getAllUsers,
    updateUserSubscription,
    getDashboardStats,
    getAllPayments
};