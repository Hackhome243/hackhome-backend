const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Import routes
const authRoutes = require('./routes/authRoutes');
const videoRoutes = require('./routes/videoRoutes');
const subscriptionRoutes = require('./routes/subscriptionRoutes');
const adminRoutes = require('./routes/adminRoutes');

// Initialize Express app
const app = express();

// Middleware
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.originalUrl}`);
    next();
});

// Health check route
app.get('/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'HackHome Academy Backend is running!',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/videos', videoRoutes);
app.use('/api/subscription', subscriptionRoutes);
app.use('/api/admin', adminRoutes);

// Welcome route
app.get('/', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Welcome to HackHome Academy Backend API',
        version: '1.0.0',
        documentation: {
            authentication: '/api/auth',
            videos: '/api/videos',
            subscriptions: '/api/subscription',
            admin: '/api/admin'
        },
        subscriptionPlans: {
            beginner: {
                price: '$17.99/month',
                description: 'Access to beginner level content (0-50)'
            },
            advanced: {
                price: '$24.99/month',
                description: 'Access to advanced level content (50-100)'
            },
            complete: {
                price: '$19.99/month',
                description: 'Full access to all content (0-100) - Most Popular!'
            }
        }
    });
});

// 404 Handler
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: `Route ${req.originalUrl} not found`
    });
});

// Global Error Handler
app.use((error, req, res, next) => {
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

    // Default error
    res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Internal Server Error',
        ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
});

// Database Connection
const connectDB = async () => {
    try {
        // Remove deprecated options
        const conn = await mongoose.connect(process.env.MONGO_URI);

        console.log(`MongoDB Connected: ${conn.connection.host}`);
        
        // Create admin user if it doesn't exist
        createAdminUser();
        
    } catch (error) {
        console.error('Database connection error:', error.message);
        
        // For development, continue without DB if connection fails
        if (process.env.NODE_ENV === 'development') {
            console.log('⚠️  Continuing without database connection in development mode');
            console.log('📝 Note: Database features will not work until connected');
            return;
        }
        
        process.exit(1);
    }
};

// Create default admin user
const createAdminUser = async () => {
    try {
        const User = require('./models/Users');
        const bcrypt = require('bcryptjs');

        const adminExists = await User.findOne({ isAdmin: true });
        
        if (!adminExists) {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash('Admin123!', salt);

            const adminUser = await User.create({
                name: 'Admin',
                email: 'admin@hackhome.com',
                password: hashedPassword,
                subscription: 'complete',
                isAdmin: true
            });

            console.log('Default admin user created:');
            console.log('Email: admin@hackhome.com');
            console.log('Password: Admin123!');
            console.log('Please change this password after first login!');
        }
    } catch (error) {
        console.error('Error creating admin user:', error);
    }
};

// Graceful shutdown handlers
const gracefulShutdown = (signal) => {
    console.log(`\nReceived ${signal}. Closing HTTP server gracefully...`);
    
    server.close(() => {
        console.log('HTTP server closed.');
        
        mongoose.connection.close(false, () => {
            console.log('MongoDB connection closed.');
            process.exit(0);
        });
    });

    // Force close after 10 seconds
    setTimeout(() => {
        console.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
    }, 10000);
};

// Handle process termination
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

// Start server
const PORT = process.env.PORT || 5000;
let server;

const startServer = async () => {
    try {
        await connectDB();
        
        server = app.listen(PORT, () => {
            console.log(`\n🚀 HackHome Academy Backend Server running on port ${PORT}`);
            console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
            console.log(`📊 Health check: http://localhost:${PORT}/health`);
            console.log(`📚 API Documentation: http://localhost:${PORT}/`);
            console.log(`\n🔐 Subscription Plans:`);
            console.log(`   • Beginner: $17.99/month (0-50 content)`);
            console.log(`   • Advanced: $24.99/month (50-100 content)`);
            console.log(`   • Complete: $19.99/month (0-100 content) - Popular!`);
            console.log(`\n💳 Payment powered by NowPayments API`);
            console.log(`🎯 Ready to accept requests!\n`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

// Start the server
if (require.main === module) {
    startServer();
}

module.exports = app;