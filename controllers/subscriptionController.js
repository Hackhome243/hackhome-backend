const { validationResult } = require('express-validator');
const User = require('../models/Users');
const Payment = require('../models/Payment');
const nowPayments = require('../utils/nowPayments');

// @desc    Get subscription plans
// @route   GET /api/subscription/plans
// @access  Public
const getPlans = async (req, res) => {
    try {
        const plans = nowPayments.getPlanDetails();
        
        res.json({
            success: true,
            data: plans
        });
    } catch (error) {
        console.error('Get plans error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error fetching plans'
        });
    }
};

// @desc    Start subscription payment
// @route   POST /api/subscription/start
// @access  Private
const startSubscription = async (req, res) => {
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

        const { plan } = req.body;
        const userId = req.user._id;

        // Validate plan
        const validPlans = ['beginner', 'advanced', 'complete'];
        if (!validPlans.includes(plan)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid subscription plan'
            });
        }

        // Get plan details and price
        const planDetails = nowPayments.getPlanDetails()[plan];
        const planPrices = nowPayments.getPlanPrices();
        const amount = planPrices[plan];

        // Create payment data for NowPayments
        const paymentData = {
            price_amount: amount,
            price_currency: 'USD',
            pay_currency: 'btc', // Default to Bitcoin, can be customized
            ipn_callback_url: `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/subscription/ipn`,
            order_id: `${userId}_${plan}_${Date.now()}`,
            order_description: `HackHome Academy - ${planDetails.name} Subscription`
        };

        // Create payment with NowPayments
        const paymentResponse = await nowPayments.createPayment(paymentData);

        // Save payment record to database
        const payment = await Payment.create({
            userId: userId,
            paymentId: paymentResponse.payment_id,
            plan: plan,
            amount: amount,
            currency: 'USD',
            status: paymentResponse.payment_status || 'pending',
            paymentUrl: paymentResponse.invoice_url || paymentResponse.payment_url,
            payAddress: paymentResponse.pay_address || '',
            payCurrency: paymentResponse.pay_currency || 'btc',
            payAmount: paymentResponse.pay_amount || 0,
            orderDescription: paymentData.order_description,
            ipnCallbackUrl: paymentData.ipn_callback_url
        });

        res.status(201).json({
            success: true,
            message: 'Payment created successfully',
            data: {
                paymentId: payment.paymentId,
                paymentUrl: payment.paymentUrl,
                plan: plan,
                amount: amount,
                currency: 'USD',
                payAddress: payment.payAddress,
                payCurrency: payment.payCurrency,
                payAmount: payment.payAmount,
                status: payment.status
            }
        });

    } catch (error) {
        console.error('Start subscription error:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating payment',
            error: error.response?.data || error.message
        });
    }
};

// @desc    Handle IPN callback from NowPayments
// @route   POST /api/subscription/ipn
// @access  Public (but verified with signature)
const handleIPN = async (req, res) => {
    try {
        const signature = req.headers['x-nowpayments-sig'];
        const payload = req.body;

        // Verify IPN signature
        if (!nowPayments.verifyIpnSignature(signature, payload)) {
            console.error('Invalid IPN signature');
            return res.status(400).json({
                success: false,
                message: 'Invalid signature'
            });
        }

        const { payment_id, payment_status, pay_amount, actually_paid } = payload;

        // Find payment in database
        const payment = await Payment.findOne({ paymentId: payment_id });
        if (!payment) {
            console.error('Payment not found:', payment_id);
            return res.status(404).json({
                success: false,
                message: 'Payment not found'
            });
        }

        // Update payment status
        payment.status = payment_status;
        payment.actuallyPaid = actually_paid || 0;

        // If payment is confirmed, update user subscription
        if (payment_status === 'finished' || payment_status === 'confirmed') {
            const user = await User.findById(payment.userId);
            if (user) {
                // Calculate subscription expiry (30 days from now)
                const expiryDate = new Date();
                expiryDate.setDate(expiryDate.getDate() + 30);

                user.subscription = payment.plan;
                user.subscriptionExpiry = expiryDate;
                await user.save();

                payment.confirmedAt = new Date();
                
                console.log(`Subscription activated for user ${user._id}: ${payment.plan} plan`);
            }
        }

        await payment.save();

        res.json({
            success: true,
            message: 'IPN processed successfully'
        });

    } catch (error) {
        console.error('IPN handling error:', error);
        res.status(500).json({
            success: false,
            message: 'Error processing IPN'
        });
    }
};

// @desc    Get payment status
// @route   GET /api/subscription/payment/:paymentId
// @access  Private
const getPaymentStatus = async (req, res) => {
    try {
        const { paymentId } = req.params;
        const userId = req.user._id;

        // Find payment in database
        const payment = await Payment.findOne({ 
            paymentId: paymentId,
            userId: userId 
        });

        if (!payment) {
            return res.status(404).json({
                success: false,
                message: 'Payment not found'
            });
        }

        // Get latest status from NowPayments
        try {
            const nowPaymentStatus = await nowPayments.getPaymentStatus(paymentId);
            
            // Update local payment status if different
            if (nowPaymentStatus.payment_status !== payment.status) {
                payment.status = nowPaymentStatus.payment_status;
                payment.actuallyPaid = nowPaymentStatus.actually_paid || payment.actuallyPaid;
                
                // If payment is confirmed, update user subscription
                if (nowPaymentStatus.payment_status === 'finished' || nowPaymentStatus.payment_status === 'confirmed') {
                    const user = await User.findById(payment.userId);
                    if (user && user.subscription !== payment.plan) {
                        const expiryDate = new Date();
                        expiryDate.setDate(expiryDate.getDate() + 30);

                        user.subscription = payment.plan;
                        user.subscriptionExpiry = expiryDate;
                        await user.save();

                        payment.confirmedAt = new Date();
                    }
                }
                
                await payment.save();
            }
        } catch (nowPaymentError) {
            console.error('Error fetching payment status from NowPayments:', nowPaymentError);
            // Continue with local payment status
        }

        res.json({
            success: true,
            data: {
                paymentId: payment.paymentId,
                plan: payment.plan,
                amount: payment.amount,
                currency: payment.currency,
                status: payment.status,
                paymentUrl: payment.paymentUrl,
                actuallyPaid: payment.actuallyPaid,
                createdAt: payment.createdAt,
                confirmedAt: payment.confirmedAt
            }
        });

    } catch (error) {
        console.error('Get payment status error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching payment status'
        });
    }
};

// @desc    Get user's payment history
// @route   GET /api/subscription/payments
// @access  Private
const getUserPayments = async (req, res) => {
    try {
        const userId = req.user._id;
        
        const payments = await Payment.find({ userId: userId })
            .sort({ createdAt: -1 })
            .select('-__v');

        res.json({
            success: true,
            count: payments.length,
            data: payments
        });

    } catch (error) {
        console.error('Get user payments error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching payment history'
        });
    }
};

module.exports = {
    getPlans,
    startSubscription,
    handleIPN,
    getPaymentStatus,
    getUserPayments
};