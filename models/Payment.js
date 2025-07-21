const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    paymentId: {
        type: String,
        required: true,
        unique: true
    },
    plan: {
        type: String,
        enum: ['beginner', 'advanced', 'complete'],
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    currency: {
        type: String,
        default: 'USD'
    },
    status: {
        type: String,
        enum: ['pending', 'waiting', 'confirming', 'confirmed', 'sending', 'partially_paid', 'finished', 'failed', 'refunded', 'expired'],
        default: 'pending'
    },
    paymentUrl: {
        type: String,
        required: true
    },
    actuallyPaid: {
        type: Number,
        default: 0
    },
    payAddress: {
        type: String,
        default: ''
    },
    payCurrency: {
        type: String,
        default: ''
    },
    payAmount: {
        type: Number,
        default: 0
    },
    orderDescription: {
        type: String,
        default: ''
    },
    ipnCallbackUrl: {
        type: String,
        default: ''
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    },
    confirmedAt: {
        type: Date,
        default: null
    }
});

// Update the updatedAt field before saving
paymentSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('Payment', paymentSchema);