const jwt = require('jsonwebtoken');
const User = require('../models/Users');

const authMiddleware = async (req, res, next) => {
    try {
        let token;

        // Check for token in Authorization header
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            try {
                // Get token from header
                token = req.headers.authorization.split(' ')[1];

                // Verify token
                const decoded = jwt.verify(token, process.env.JWT_SECRET);

                // Get user from the token
                req.user = await User.findById(decoded.id).select('-password');

                if (!req.user) {
                    return res.status(401).json({
                        success: false,
                        message: 'User not found'
                    });
                }

                next();
            } catch (error) {
                console.error('Token verification error:', error);
                return res.status(401).json({
                    success: false,
                    message: 'Not authorized, token failed'
                });
            }
        }

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Not authorized, no token'
            });
        }
    } catch (error) {
        console.error('Auth middleware error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error in authentication'
        });
    }
};

module.exports = authMiddleware;