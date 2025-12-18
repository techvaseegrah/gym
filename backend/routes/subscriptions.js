const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const Subscription = require('../models/Subscription');
const Fighter = require('../models/Fighter');
const auth = require('../middleware/authMiddleware');

// Check if we're in test mode
const isTestMode = process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_ID.startsWith('rzp_test_');

// Log test mode status
if (isTestMode) {
    console.log('Razorpay running in TEST mode');
} else {
    console.log('Razorpay running in LIVE mode');
}

// Plan prices in INR (you can adjust these values)
const PLAN_PRICES = {
    monthly: 500,    // ₹500 per month
    quarterly: 1200, // ₹1200 per quarter (₹400/month equivalent)
    yearly: 4800     // ₹4800 per year (₹400/month equivalent)
};

// @route   POST /api/subscriptions/admin-create
// @desc    Create a subscription directly by admin
// @access  Private (Admin)
router.post('/admin-create', auth, async (req, res) => {
    try {
        // Check if user is admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({ msg: 'Access denied' });
        }
        
        const { fighterId, planType, startDate, endDate, status } = req.body;
        
        // Validate inputs
        if (!fighterId || !planType || !startDate || !endDate || !status) {
            return res.status(400).json({ msg: 'All fields are required' });
        }
        
        // Validate plan type
        if (!PLAN_PRICES[planType]) {
            return res.status(400).json({ msg: 'Invalid plan type' });
        }
        
        // Check if fighter exists
        const fighter = await Fighter.findById(fighterId);
        if (!fighter) {
            return res.status(404).json({ msg: 'Fighter not found' });
        }
        
        // Create subscription record
        const subscription = new Subscription({
            fighterId,
            planType,
            amount: PLAN_PRICES[planType],
            razorpayOrderId: `admin_created_${Date.now()}`, // Generate a placeholder ID for admin-created subscriptions
            startDate: new Date(startDate),
            endDate: new Date(endDate),
            status,
            isActive: status === 'paid'
        });
        
        await subscription.save();
        
        res.json({ msg: 'Subscription created successfully', subscription });
    } catch (err) {
        console.error('Error creating subscription:', err.message);
        res.status(500).json({ msg: 'Server Error', error: err.message });
    }
});

// @route   POST /api/subscriptions/create-order
// @desc    Create a Razorpay order for subscription
// @access  Private (Fighter)
router.post('/create-order', auth, async (req, res) => {
    try {
        const { planType } = req.body;
        
        // Validate plan type
        if (!PLAN_PRICES[planType]) {
            return res.status(400).json({ msg: 'Invalid plan type' });
        }
        
        // Log request for debugging
        console.log('Creating order for user:', req.user.id, 'plan:', planType);
        
        // Log environment variables for debugging
        console.log('RAZORPAY_KEY_ID:', process.env.RAZORPAY_KEY_ID);
        console.log('RAZORPAY_KEY_SECRET:', process.env.RAZORPAY_KEY_SECRET ? '[SECRET]' : 'NOT SET');
        
        // Check if environment variables are set
        if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
            return res.status(500).json({ 
                msg: 'Razorpay configuration missing',
                error: 'RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET not set in environment variables'
            });
        }
        
        // Initialize Razorpay instance inside the function to ensure env vars are loaded
        const Razorpay = require('razorpay');
        const razorpay = new Razorpay({
            key_id: process.env.RAZORPAY_KEY_ID,
            key_secret: process.env.RAZORPAY_KEY_SECRET
        });
        
        const amount = PLAN_PRICES[planType] * 100; // Convert to paise
        
        // Create Razorpay order with a shorter receipt (max 40 characters)
        // Using a timestamp-based receipt that's guaranteed to be short
        const timestamp = Date.now().toString().slice(-10); // Last 10 digits of timestamp
        const receipt = `receipt_${req.user.id.slice(-10)}_${timestamp}`;
        
        const options = {
            amount: amount,
            currency: "INR",
            receipt: receipt
        };
        
        console.log('Razorpay options:', options);
        console.log('Razorpay instance:', !!razorpay);
        
        const order = await razorpay.orders.create(options);
        console.log('Order created:', order);
        
        // Create subscription record
        const endDate = new Date();
        if (planType === 'monthly') {
            endDate.setMonth(endDate.getMonth() + 1);
        } else if (planType === 'quarterly') {
            endDate.setMonth(endDate.getMonth() + 3);
        } else if (planType === 'yearly') {
            endDate.setFullYear(endDate.getFullYear() + 1);
        }
        
        const subscription = new Subscription({
            fighterId: req.user.id,
            planType,
            amount: PLAN_PRICES[planType],
            razorpayOrderId: order.id,
            endDate
        });
        
        await subscription.save();
        
        res.json({
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
            subscriptionId: subscription._id
        });
    } catch (err) {
        console.error('Error creating subscription order:', err);
        // More detailed error response
        if (err.statusCode) {
            console.error('Razorpay error details:', err.error);
            return res.status(err.statusCode).json({ 
                msg: 'Razorpay Error: ' + (err.error.description || err.error.reason || 'Unknown error'),
                error: err.error
            });
        }
        res.status(500).json({ 
            msg: 'Server Error',
            error: err.message,
            stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
        });
    }
});

// @route   POST /api/subscriptions/verify-payment
// @desc    Verify Razorpay payment and activate subscription
// @access  Private (Fighter)
router.post('/verify-payment', auth, async (req, res) => {
    try {
        const { razorpayOrderId, razorpayPaymentId, razorpaySignature, subscriptionId } = req.body;
        
        // Verify signature
        const hmac = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET);
        hmac.update(razorpayOrderId + "|" + razorpayPaymentId);
        const generatedSignature = hmac.digest('hex');
        
        if (generatedSignature !== razorpaySignature) {
            return res.status(400).json({ msg: 'Payment verification failed' });
        }
        
        // Update subscription
        const subscription = await Subscription.findById(subscriptionId);
        if (!subscription) {
            return res.status(404).json({ msg: 'Subscription not found' });
        }
        
        if (subscription.fighterId.toString() !== req.user.id) {
            return res.status(403).json({ msg: 'Unauthorized' });
        }
        
        subscription.razorpayPaymentId = razorpayPaymentId;
        subscription.razorpaySignature = razorpaySignature;
        subscription.status = 'paid';
        subscription.isActive = true;
        
        await subscription.save();
        
        res.json({ msg: 'Payment verified successfully', subscription });
    } catch (err) {
        console.error('Error verifying payment:', err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
});

// @route   GET /api/subscriptions/my-subscriptions
// @desc    Get all subscriptions for the current fighter
// @access  Private (Fighter)
router.get('/my-subscriptions', auth, async (req, res) => {
    try {
        const subscriptions = await Subscription.find({ fighterId: req.user.id })
            .sort({ createdAt: -1 });
        
        res.json(subscriptions);
    } catch (err) {
        console.error('Error fetching subscriptions:', err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
});

// @route   GET /api/subscriptions/current
// @desc    Get current active subscription for the fighter
// @access  Private (Fighter)
router.get('/current', auth, async (req, res) => {
    try {
        const now = new Date();
        const subscription = await Subscription.findOne({
            fighterId: req.user.id,
            isActive: true,
            startDate: { $lte: now },
            endDate: { $gte: now },
            status: 'paid'
        });
        
        res.json(subscription);
    } catch (err) {
        console.error('Error fetching current subscription:', err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
});

// @route   GET /api/subscriptions/fighter/:fighterId
// @desc    Get all subscriptions for a specific fighter (Admin only)
// @access  Private (Admin)
router.get('/fighter/:fighterId', auth, async (req, res) => {
    try {
        // Check if user is admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({ msg: 'Access denied' });
        }
        
        const subscriptions = await Subscription.find({ fighterId: req.params.fighterId })
            .sort({ createdAt: -1 });
        
        res.json(subscriptions);
    } catch (err) {
        console.error('Error fetching fighter subscriptions:', err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
});

// @route   GET /api/subscriptions/all
// @desc    Get all subscriptions with fighter information (Admin only)
// @access  Private (Admin)
router.get('/all', auth, async (req, res) => {
    try {
        // Check if user is admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({ msg: 'Access denied' });
        }
        
        // Get query parameters for pagination
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;
        
        // Get filter parameters
        const { planType, status } = req.query;
        
        // Build query
        const query = {};
        if (planType) query.planType = planType;
        if (status) query.status = status;
        
        // Get total count for pagination
        const total = await Subscription.countDocuments(query);
        
        // Get subscriptions with fighter information
        const subscriptions = await Subscription.find(query)
            .populate('fighterId', 'name rfid')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);
        
        res.json({
            subscriptions,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            total
        });
    } catch (err) {
        console.error('Error fetching all subscriptions:', err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
});

// @route   PUT /api/subscriptions/:id/update-plan
// @desc    Manually update a fighter's subscription plan (Admin only)
// @access  Private (Admin)
router.put('/:id/update-plan', auth, async (req, res) => {
    try {
        // Check if user is admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({ msg: 'Access denied' });
        }
        
        const { planType, startDate, endDate, status } = req.body;
        
        // Validate plan type if provided
        if (planType && !PLAN_PRICES[planType]) {
            return res.status(400).json({ msg: 'Invalid plan type' });
        }
        
        const subscription = await Subscription.findById(req.params.id);
        if (!subscription) {
            return res.status(404).json({ msg: 'Subscription not found' });
        }
        
        // Update fields if provided
        if (planType) subscription.planType = planType;
        if (startDate) subscription.startDate = new Date(startDate);
        if (endDate) subscription.endDate = new Date(endDate);
        if (status) subscription.status = status;
        
        // Update isActive based on status
        subscription.isActive = status === 'paid';
        
        // Update amount if plan type changed
        if (planType) {
            subscription.amount = PLAN_PRICES[planType];
        }
        
        await subscription.save();
        
        res.json({ msg: 'Subscription updated successfully', subscription });
    } catch (err) {
        console.error('Error updating subscription:', err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
});

module.exports = router;
