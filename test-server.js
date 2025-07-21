const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

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
        environment: process.env.NODE_ENV || 'development',
        database: 'MongoDB connection required for full functionality'
    });
});

// Welcome route with API documentation
app.get('/', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Welcome to HackHome Academy Backend API',
        version: '1.0.0',
        status: 'Server running - Database connection required for full functionality',
        endpoints: {
            health: 'GET /health',
            documentation: 'GET /',
            authentication: {
                register: 'POST /api/auth/register',
                login: 'POST /api/auth/login',
                profile: 'GET /api/auth/me'
            },
            subscriptions: {
                plans: 'GET /api/subscription/plans',
                start: 'POST /api/subscription/start',
                status: 'GET /api/subscription/payment/:id',
                history: 'GET /api/subscription/payments',
                ipn: 'POST /api/subscription/ipn'
            },
            videos: {
                list: 'GET /api/videos',
                search: 'GET /api/videos/search',
                byPlan: 'GET /api/videos/plan/:plan',
                single: 'GET /api/videos/:id'
            },
            admin: {
                addVideo: 'POST /api/admin/video',
                updateVideo: 'PUT /api/admin/video/:id',
                deleteVideo: 'DELETE /api/admin/video/:id',
                listVideos: 'GET /api/admin/videos',
                listUsers: 'GET /api/admin/users',
                updateSubscription: 'PUT /api/admin/user/:id/subscription',
                statistics: 'GET /api/admin/stats',
                payments: 'GET /api/admin/payments'
            }
        },
        subscriptionPlans: {
            beginner: {
                price: '$17.99/month',
                description: 'Access to beginner level content (0-50)',
                features: ['Basic tutorials', 'Community access', 'Email support']
            },
            advanced: {
                price: '$24.99/month',
                description: 'Access to advanced level content (50-100)',
                features: ['Advanced tutorials', 'Priority support', 'Code samples']
            },
            complete: {
                price: '$19.99/month',
                description: 'Full access to all content (0-100) - Most Popular!',
                features: ['All content access', 'Premium support', 'Exclusive resources'],
                popular: true
            }
        },
        features: {
            authentication: 'JWT-based secure authentication',
            payments: 'Crypto payments via NowPayments API',
            streaming: 'Subscription-based video streaming',
            admin: 'Complete admin panel for content management',
            security: 'bcrypt password hashing, input validation, CORS protection'
        },
        requirements: {
            database: 'MongoDB Atlas or local MongoDB instance',
            payment: 'NowPayments API key for crypto transactions',
            environment: 'Node.js >= 16.0.0'
        }
    });
});

// Mock API routes for demonstration
app.get('/api/subscription/plans', (req, res) => {
    res.json({
        success: true,
        data: {
            beginner: {
                name: 'Beginner Plan',
                price: 17.99,
                description: 'Access to beginner level content (0-50)',
                duration: 30
            },
            advanced: {
                name: 'Advanced Plan',
                price: 24.99,
                description: 'Access to advanced level content (50-100)',
                duration: 30
            },
            complete: {
                name: 'Complete Plan',
                price: 19.99,
                description: 'Full access to all content (0-100) - Most Popular!',
                duration: 30,
                popular: true
            }
        }
    });
});

// Database required message for other routes
app.use('/api/*', (req, res) => {
    res.status(503).json({
        success: false,
        message: 'Database connection required',
        note: 'Please connect to MongoDB to access this endpoint',
        endpoint: req.originalUrl,
        method: req.method
    });
});

// 404 Handler
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: `Route ${req.originalUrl} not found`,
        availableRoutes: [
            'GET /',
            'GET /health', 
            'GET /api/subscription/plans',
            'Any /api/* (requires database)'
        ]
    });
});

// Error Handler
app.use((error, req, res, next) => {
    console.error('Error:', error);
    res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Internal Server Error',
        ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
});

// Start server
const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
    console.log('\n🚀 HackHome Academy Backend Test Server');
    console.log(`📡 Server running on port ${PORT}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
    console.log(`📚 API Documentation: http://localhost:${PORT}/`);
    console.log(`\n🔐 Subscription Plans:`);
    console.log(`   • Beginner: $17.99/month (0-50 content)`);
    console.log(`   • Advanced: $24.99/month (50-100 content)`);
    console.log(`   • Complete: $19.99/month (0-100 content) - Popular!`);
    console.log(`\n⚠️  Note: This is a test server - Connect MongoDB for full functionality`);
    console.log(`🎯 Ready to accept requests!\n`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('\nSIGTERM received. Shutting down gracefully...');
    server.close(() => {
        console.log('Server closed.');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('\nSIGINT received. Shutting down gracefully...');
    server.close(() => {
        console.log('Server closed.');
        process.exit(0);
    });
});

module.exports = app;