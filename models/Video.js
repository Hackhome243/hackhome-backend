const mongoose = require('mongoose');

const videoSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true
    },
    url: {
        type: String,
        required: true
    },
    planRequired: {
        type: String,
        enum: ['beginner', 'advanced', 'complete'],
        required: true
    },
    duration: {
        type: Number, // in seconds
        default: 0
    },
    thumbnail: {
        type: String,
        default: ''
    },
    isActive: {
        type: Boolean,
        default: true
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
videoSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('Video', videoSchema);