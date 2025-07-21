const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true
    },
    password: {
        type: String,
        required: true
    },
    subscription: {
        type: String,
        enum: ['none', 'beginner', 'advanced', 'complete'],
        default: 'none'
    },
    isAdmin: {
        type: Boolean,
        default: false
    },
    subscriptionExpiry: {
        type: Date,
        default: null
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Update the updatedAt field before saving
userSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('User', userSchema);
