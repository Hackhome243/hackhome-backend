const adminMiddleware = (req, res, next) => {
    try {
        // Check if user is authenticated (authMiddleware should run before this)
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        // Check if user is admin
        if (!req.user.isAdmin) {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Admin privileges required.'
            });
        }

        next();
    } catch (error) {
        console.error('Admin middleware error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error in admin authorization'
        });
    }
};

module.exports = adminMiddleware;