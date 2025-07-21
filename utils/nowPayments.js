const axios = require('axios');
const crypto = require('crypto');

class NowPayments {
    constructor() {
        this.apiKey = process.env.NOWPAYMENTS_API_KEY;
        this.ipnSecret = process.env.NOWPAYMENTS_IPN_SECRET;
        this.baseURL = 'https://api.nowpayments.io/v1';
        this.sandboxURL = 'https://api-sandbox.nowpayments.io/v1';
        this.isProduction = process.env.NODE_ENV === 'production';
    }

    // Get available currencies
    async getCurrencies() {
        try {
            const response = await axios.get(`${this.getBaseURL()}/currencies`, {
                headers: {
                    'x-api-key': this.apiKey
                }
            });
            return response.data;
        } catch (error) {
            console.error('Error fetching currencies:', error.response?.data || error.message);
            throw error;
        }
    }

    // Create payment
    async createPayment(paymentData) {
        try {
            const response = await axios.post(`${this.getBaseURL()}/payment`, paymentData, {
                headers: {
                    'x-api-key': this.apiKey,
                    'Content-Type': 'application/json'
                }
            });
            return response.data;
        } catch (error) {
            console.error('Error creating payment:', error.response?.data || error.message);
            throw error;
        }
    }

    // Get payment status
    async getPaymentStatus(paymentId) {
        try {
            const response = await axios.get(`${this.getBaseURL()}/payment/${paymentId}`, {
                headers: {
                    'x-api-key': this.apiKey
                }
            });
            return response.data;
        } catch (error) {
            console.error('Error fetching payment status:', error.response?.data || error.message);
            throw error;
        }
    }

    // Verify IPN signature
    verifyIpnSignature(signature, payload) {
        try {
            const hmac = crypto.createHmac('sha512', this.ipnSecret);
            hmac.update(JSON.stringify(payload), 'utf8');
            const expectedSignature = hmac.digest('hex');
            
            return signature === expectedSignature;
        } catch (error) {
            console.error('Error verifying IPN signature:', error);
            return false;
        }
    }

    // Get base URL based on environment
    getBaseURL() {
        return this.isProduction ? this.baseURL : this.sandboxURL;
    }

    // Get subscription plan prices
    getPlanPrices() {
        return {
            beginner: 17.99,
            advanced: 24.99,
            complete: 19.99
        };
    }

    // Get plan details
    getPlanDetails() {
        return {
            beginner: {
                name: 'Beginner Plan',
                price: 17.99,
                description: 'Access to beginner level content (0-50)',
                duration: 30 // days
            },
            advanced: {
                name: 'Advanced Plan',
                price: 24.99,
                description: 'Access to advanced level content (50-100)',
                duration: 30 // days
            },
            complete: {
                name: 'Complete Plan',
                price: 19.99,
                description: 'Full access to all content (0-100) - Most Popular!',
                duration: 30, // days
                popular: true
            }
        };
    }
}

module.exports = new NowPayments();