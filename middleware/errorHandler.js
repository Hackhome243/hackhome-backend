// Global Error Handler Middleware
const errorHandler = (error, req, res, next) => {
    console.error('Global Error Handler:', error);

    // Mongoose validation error
    if (error.name === 'ValidationError') {
        const errors = Object.values(error.errors).map(err => err.message);
        return res.status(400).json({
            success: false,
            message: 'Validation Error',
            errors: errors
        });
    }

    // Mongoose duplicate key error
    if (error.code === 11000) {
        const field = Object.keys(error.keyValue)[0];
        return res.status(400).json({
            success: false,
            message: `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`
        });
    }

    // Mongoose cast error (invalid ObjectId)
    if (error.name === 'CastError') {
        return res.status(400).json({
            success: false,
            message: 'Invalid ID format'
        });
    }

    // JWT errors
    if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({
            success: false,
            message: 'Invalid token'
        });
    }

    if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
            success: false,
            message: 'Token expired'
        });
    }

    // MongoDB connection errors
    if (error.name === 'MongoNetworkError') {
        return res.status(500).json({
            success: false,
            message: 'Database connection error'
        });
    }

    // MongoDB server selection error
    if (error.name === 'MongoServerSelectionError') {
        return res.status(500).json({
            success: false,
            message: 'Database server unavailable'
        });
    }

    // Axios/HTTP errors from external APIs
    if (error.response && error.response.data) {
        return res.status(error.response.status || 500).json({
            success: false,
            message: 'External API error',
            details: error.response.data
        });
    }

    // Default error
    res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Internal Server Error',
        ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
};

module.exports = errorHandler;