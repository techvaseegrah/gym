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
    free: 0,         // Free plan
    fixed_commitment: 4000 // Fixed commitment 3-month package
};

// Log PLAN_PRICES for debugging
console.log('=== PLAN_PRICES INITIALIZED ===');
console.log('PLAN_PRICES object:', PLAN_PRICES);
console.log('PLAN_PRICES keys:', Object.keys(PLAN_PRICES));
console.log('PLAN_PRICES values:', Object.values(PLAN_PRICES));

// @route   POST /api/subscriptions/admin-create
// @desc    Create a subscription directly by admin
// @access  Private (Admin)
router.post('/admin-create', auth, async (req, res) => {
    console.log('=== REQUEST RECEIVED at /admin-create ===');
    console.log('Request method:', req.method);
    console.log('Request URL:', req.originalUrl);
    console.log('Request headers:', req.headers);
    
    try {
        console.log('=== Starting admin-create subscription process ===');
        
        // Check if user is admin
        console.log('Checking user role:', req.user.role);
        if (req.user.role !== 'admin') {
            console.log('Access denied: User is not admin');
            return res.status(403).json({ msg: 'Access denied' });
        }
        
        console.log('Received admin-create request');
        console.log('User role:', req.user.role);
        
        const { fighterId, planType, startDate, endDate, status, forceCreate, initialPaymentAmount, customFee, customDuration } = req.body;
        
        // Log the incoming request for debugging
        console.log('Admin create subscription request:', { fighterId, planType, startDate, endDate, status, forceCreate });
        console.log('Request body:', req.body);
        console.log('typeof planType:', typeof planType);
        console.log('planType value:', planType);
        console.log('planType length:', planType ? planType.length : 'undefined');
        
        // Check for hidden characters
        if (planType) {
            console.log('planType char codes:', [...planType].map(c => c.charCodeAt(0)));
        }
        
        // Validate inputs
        if (!fighterId || !planType || !startDate || !status) {
            console.log('Missing required fields:', { 
                fighterId: !!fighterId, 
                planType: !!planType, 
                startDate: !!startDate, 
                status: !!status 
            });
            return res.status(400).json({ msg: 'All fields are required' });
        }
        
        // Additional validation for custom plans
        if (planType === 'custom') {
            if (!customFee || !customDuration) {
                return res.status(400).json({ msg: 'Custom fee and duration are required for custom plans' });
            }
            
            if (customFee <= 0) {
                return res.status(400).json({ msg: 'Custom fee must be greater than 0' });
            }
            
            if (customDuration <= 0) {
                return res.status(400).json({ msg: 'Custom duration must be greater than 0' });
            }
        }
        
        // SPECIAL DEBUGGING: Let's check the exact value and type of planType
        console.log('=== PLAN TYPE DEBUGGING ===');
        console.log('Raw planType:', planType);
        console.log('Type of planType:', typeof planType);
        console.log('Is planType a string?', typeof planType === 'string');
        console.log('Trimmed planType:', typeof planType === 'string' ? planType.trim() : 'NOT_A_STRING');
        console.log('Lowercase planType:', typeof planType === 'string' ? planType.toLowerCase() : 'NOT_A_STRING');
        
        // Check if it's a string and trim it
        let cleanPlanType = planType;
        if (typeof planType === 'string') {
            cleanPlanType = planType.trim().toLowerCase();
            console.log('Cleaned planType:', cleanPlanType);
        }
        
        // Validate plan type with cleaned value
        console.log('PLAN_PRICES keys:', Object.keys(PLAN_PRICES));
        console.log('PLAN_PRICES hasOwnProperty check with raw planType:', PLAN_PRICES.hasOwnProperty(planType));
        console.log('PLAN_PRICES hasOwnProperty check with clean planType:', PLAN_PRICES.hasOwnProperty(cleanPlanType));
        console.log('PLAN_PRICES[planType]:', PLAN_PRICES[planType]);
        console.log('PLAN_PRICES[cleanPlanType]:', PLAN_PRICES[cleanPlanType]);
        
        // NEW APPROACH: Check if the planType matches any of our known plans
        const validPlans = ['free', 'fixed_commitment', 'custom'];
        let validPlanType = null;
        
        // First try exact match
        if (validPlans.includes(planType)) {
            validPlanType = planType;
            console.log('Found exact match for planType:', validPlanType);
        } 
        // Then try cleaned match
        else if (validPlans.includes(cleanPlanType)) {
            validPlanType = cleanPlanType;
            console.log('Found cleaned match for planType:', validPlanType);
        }
        // Finally, try case-insensitive match
        else {
            const lowerPlanType = typeof planType === 'string' ? planType.toLowerCase() : '';
            const matchedPlan = validPlans.find(plan => plan === lowerPlanType);
            if (matchedPlan) {
                validPlanType = matchedPlan;
                console.log('Found case-insensitive match for planType:', validPlanType);
            }
        }
        
        if (!validPlanType) {
            console.log('Invalid plan type received:', planType);
            console.log('Cleaned plan type:', cleanPlanType);
            console.log('Available plan types:', validPlans);
            return res.status(400).json({ 
                msg: 'Invalid plan type: ' + planType + '. Valid options are: ' + validPlans.join(', ')
            });
        }
        
        console.log('Using valid planType:', validPlanType);
        
        // Check if fighter exists
        console.log('Checking if fighter exists:', fighterId);
        const fighter = await Fighter.findById(fighterId);
        if (!fighter) {
            console.log('Fighter not found:', fighterId);
            return res.status(404).json({ msg: 'Fighter not found' });
        }
        
        // STRICT CHECK: Prevent creating new subscriptions if fighter has ANY active subscriptions or unpaid balances
        if (!forceCreate) {
            console.log('Checking for any active subscriptions for fighter:', fighterId);
            
            // Check for any active subscriptions (regardless of payment status)
            const activeSubscriptions = await Subscription.find({
                fighterId: fighterId,
                isActive: true,
                endDate: { $gte: new Date() }
            });
            
            console.log('Found active subscriptions:', activeSubscriptions.length);
            
            // If there are any active subscriptions, prevent creation
            if (activeSubscriptions.length > 0) {
                console.log('Fighter has active subscriptions. Preventing new subscription creation.');
                return res.status(400).json({ 
                    msg: 'Cannot create new subscription. Fighter already has an active subscription.',
                    activeSubscriptions: activeSubscriptions
                });
            }
            
            // Additionally, check for any subscriptions with unpaid balances (even expired ones)
            console.log('Checking for any unpaid subscription balances for fighter:', fighterId);
            
            const unpaidSubscriptions = await Subscription.find({
                fighterId: fighterId,
                $expr: { $lt: ['$paidAmount', '$totalFee'] }, // With unpaid balances
                $or: [
                    { 
                        // Active subscriptions (within duration)
                        isActive: true,
                        endDate: { $gte: new Date() }
                    },
                    { 
                        // Expired subscriptions (past duration)
                        endDate: { $lt: new Date() }
                    }
                ]
            });
            
            console.log('Found subscriptions with unpaid balances:', unpaidSubscriptions.length);
            
            // If there are any subscriptions with unpaid balances, prevent creation
            if (unpaidSubscriptions.length > 0) {
                console.log('Fighter has subscriptions with unpaid balances. Preventing new subscription creation.');
                return res.status(400).json({ 
                    msg: 'Cannot create new subscription. Fighter has existing subscriptions with unpaid balances that must be settled first.',
                    unpaidSubscriptions: unpaidSubscriptions
                });
            }
        } else {
            console.log('Force create flag is set, skipping subscription checks');
        }
        
        // For free plan, set end date to a very distant future (99 years from now)
        // This effectively makes it indefinite until admin changes the plan
        let actualEndDate;
        if (validPlanType === 'free') {
            actualEndDate = new Date();
            actualEndDate.setFullYear(actualEndDate.getFullYear() + 99); // 99 years in the future
            console.log('Setting end date for free plan to:', actualEndDate);
        } else if (validPlanType === 'custom') {
            // For custom plans, calculate end date based on custom duration
            if (!customDuration) {
                console.log('Custom duration is required for custom plans');
                return res.status(400).json({ msg: 'Custom duration is required for custom plans' });
            }
            actualEndDate = new Date(startDate);
            actualEndDate.setMonth(actualEndDate.getMonth() + parseInt(customDuration));
            console.log('Setting end date for custom plan based on duration:', actualEndDate);
        } else {
            // For other paid plans, endDate is required
            if (!endDate) {
                console.log('End date is required for paid plans');
                return res.status(400).json({ msg: 'End date is required for paid plans' });
            }
            actualEndDate = new Date(endDate);
            console.log('Using provided end date for paid plan:', actualEndDate);
            console.log('End date string received:', endDate);
            console.log('Parsed end date:', actualEndDate);
        }
        
        // Log the calculated end date for debugging
        console.log('Calculated end date:', actualEndDate);
        
        // Parse start date
        const actualStartDate = new Date(startDate);
        console.log('Start date string received:', startDate);
        console.log('Parsed start date:', actualStartDate);
        
        // Validate dates
        if (isNaN(actualStartDate.getTime())) {
            console.log('Invalid start date:', startDate);
            return res.status(400).json({ msg: 'Invalid start date' });
        }
        
        if (isNaN(actualEndDate.getTime())) {
            console.log('Invalid end date:', actualEndDate);
            return res.status(400).json({ msg: 'Invalid end date' });
        }
        
        // Create subscription record
        console.log('Creating subscription record');
        const subscriptionData = {
            fighterId,
            planType: validPlanType,  // Use the validated planType
            amount: PLAN_PRICES[validPlanType] || customFee,
            razorpayOrderId: `admin_created_${Date.now()}`, // Generate a placeholder ID for admin-created subscriptions
            startDate: actualStartDate,
            endDate: actualEndDate,
            status,
            isActive: status === 'paid'
        };
        
        // For fixed commitment plans, handle initial payment amount
        if (validPlanType === 'fixed_commitment') {
            // Validate initial payment amount
            if (initialPaymentAmount && initialPaymentAmount < 500) {
                return res.status(400).json({ msg: 'Minimum initial payment amount is ₹500 for fixed commitment plan' });
            }
            
            console.log('Creating fixed commitment plan with initial payment amount:', initialPaymentAmount);
            
            // Set fixed commitment specific fields
            subscriptionData.totalFee = 4000; // Fixed total fee for commitment plan
            subscriptionData.paidAmount = initialPaymentAmount || 0;
            subscriptionData.remainingBalance = 4000 - (initialPaymentAmount || 0);
            
            // Update status based on payment amount
            if (subscriptionData.paidAmount >= 4000) {
                subscriptionData.status = 'paid';
                subscriptionData.isActive = true;
            } else if (subscriptionData.paidAmount > 0) {
                subscriptionData.status = 'partial_payment';
                subscriptionData.isActive = true;
            } else {
                subscriptionData.status = 'created';
                subscriptionData.isActive = false;
            }
            
            // Add initial payment to payment history if amount was provided
            if (initialPaymentAmount && initialPaymentAmount > 0) {
                subscriptionData.paymentHistory = [{
                    amount: initialPaymentAmount,
                    date: new Date(),
                    razorpayPaymentId: `admin_initial_payment_${Date.now()}`,
                    razorpayOrderId: `admin_created_${Date.now()}`
                }];
                // Increment installment count for the initial payment
                subscriptionData.installmentCount = 1;
            }
        }
        
        // For custom plans, handle initial payment amount and financial ledger fields
        if (validPlanType === 'custom') {
            console.log('Creating custom plan with fee:', customFee, 'and duration:', customDuration);
            
            // Validate custom plan parameters
            if (!customFee || customFee <= 0) {
                return res.status(400).json({ msg: 'Custom fee must be greater than 0' });
            }
            
            if (!customDuration || customDuration <= 0) {
                return res.status(400).json({ msg: 'Custom duration must be greater than 0' });
            }
            
            // Validate initial payment amount for custom plan
            if (initialPaymentAmount && initialPaymentAmount > 0) {
                if (initialPaymentAmount > customFee) {
                    return res.status(400).json({ msg: 'Initial payment amount cannot exceed custom fee' });
                }
            }
            
            // Set custom plan specific fields
            subscriptionData.totalFee = customFee;
            subscriptionData.paidAmount = initialPaymentAmount || 0;
            subscriptionData.remainingBalance = customFee - (initialPaymentAmount || 0);
            
            // Update status based on payment amount
            if (subscriptionData.paidAmount >= customFee) {
                subscriptionData.status = 'paid';
                subscriptionData.isActive = true;
            } else if (subscriptionData.paidAmount > 0) {
                subscriptionData.status = 'partial_payment';
                subscriptionData.isActive = true;
            } else {
                subscriptionData.status = 'created';
                subscriptionData.isActive = false;
            }
            
            // Add initial payment to payment history if amount was provided
            if (initialPaymentAmount && initialPaymentAmount > 0) {
                subscriptionData.paymentHistory = [{
                    amount: initialPaymentAmount,
                    date: new Date(),
                    razorpayPaymentId: `admin_initial_payment_${Date.now()}`,
                    razorpayOrderId: `admin_created_${Date.now()}`
                }];
                // Increment installment count for the initial payment
                subscriptionData.installmentCount = 1;
            }
        }
        
        const subscription = new Subscription(subscriptionData);
        
        console.log('Subscription object to save:', JSON.stringify(subscription, null, 2));
        console.log('Saving subscription');
        await subscription.save();
        console.log('Subscription saved successfully');
        
        res.json({ msg: 'Subscription created successfully', subscription });
    } catch (err) {
        console.error('=== ERROR in admin-create subscription ===');
        console.error('Error creating subscription:', err.message);
        console.error('Full error stack:', err.stack);
        console.error('Error name:', err.name);
        console.error('Error code:', err.code);
        
        // Send more detailed error response
        res.status(500).json({ 
            msg: 'Server Error', 
            error: err.message,
            errorName: err.name,
            errorCode: err.code
        });
    } finally {
        console.log('=== Finished admin-create subscription process ===');
    }
});

// @route   POST /api/subscriptions/create-order
// @desc    Create a Razorpay order for subscription
// @access  Private (Fighter)
router.post('/create-order', auth, async (req, res) => {
    try {
        const { planType, initialPaymentAmount } = req.body;
        
        // Validate plan type
        if (!planType || !PLAN_PRICES.hasOwnProperty(planType)) {
            return res.status(400).json({ msg: 'Invalid plan type' });
        }
        
        // Free plan cannot be purchased through Razorpay
        if (planType === 'free') {
            return res.status(400).json({ msg: 'Free plan cannot be purchased. Please contact admin.' });
        }
        
        // For fixed commitment plan, validate initial payment amount
        if (planType === 'fixed_commitment') {
            // Validate that initial payment amount is provided
            if (!initialPaymentAmount || initialPaymentAmount < 500) {
                return res.status(400).json({ msg: 'Minimum initial payment amount is ₹500 for fixed commitment plan' });
            }
            
            // Validate that initial payment amount is not more than total fee
            if (initialPaymentAmount > PLAN_PRICES[planType]) {
                return res.status(400).json({ msg: 'Initial payment amount cannot exceed total fee of ₹4000' });
            }
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
        
        // For fixed commitment plan, use initial payment amount; otherwise use plan price
        const amount = planType === 'fixed_commitment' ? initialPaymentAmount * 100 : PLAN_PRICES[planType] * 100; // Convert to paise
        
        // Create Razorpay order with a shorter receipt (max 40 characters)
        // Using a timestamp-based receipt that's guaranteed to be short
        const timestamp = Date.now().toString().slice(-10); // Last 10 digits of timestamp
        const receipt = `ord_${req.user.id.slice(-10)}_${timestamp}`;
        
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
        const startDate = new Date();
        const endDate = new Date();
        
        if (planType === 'fixed_commitment') {
            // Fixed 3-month duration for fixed commitment plan
            endDate.setMonth(endDate.getMonth() + 3);
            
            // Create subscription with financial ledger fields for fixed commitment plan
            const subscription = new Subscription({
                fighterId: req.user.id,
                planType: 'fixed_commitment',
                totalFee: PLAN_PRICES[planType],
                paidAmount: 0, // Will be updated after payment verification
                remainingBalance: PLAN_PRICES[planType],
                razorpayOrderId: order.id,
                startDate: startDate,
                endDate: endDate,
                status: 'created'
            });
            
            await subscription.save();
            
            res.json({
                orderId: order.id,
                amount: order.amount,
                currency: order.currency,
                subscriptionId: subscription._id
            });
            return;
        }
        
        const subscription = new Subscription({
            fighterId: req.user.id,
            planType,
            amount: PLAN_PRICES[planType],
            razorpayOrderId: order.id,
            startDate: startDate,
            endDate: endDate
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
        
        // Handle fixed commitment plan differently
        if (subscription.planType === 'fixed_commitment') {
            // For fixed commitment plan, we need to get the payment amount from the order
            // We'll need to fetch the order details from Razorpay to get the actual amount paid
            
            // Initialize Razorpay instance
            const Razorpay = require('razorpay');
            const razorpay = new Razorpay({
                key_id: process.env.RAZORPAY_KEY_ID,
                key_secret: process.env.RAZORPAY_KEY_SECRET
            });
            
            // Fetch order details to get the actual amount paid
            const order = await razorpay.orders.fetch(razorpayOrderId);
            const paymentAmount = order.amount_paid / 100; // Convert from paise to rupees
            
            // Add payment to history
            subscription.paymentHistory.push({
                amount: paymentAmount,
                date: new Date(),
                razorpayPaymentId: razorpayPaymentId,
                razorpayOrderId: razorpayOrderId,
                razorpaySignature: razorpaySignature
            });
            
            // Update installment count (first payment counts as first installment)
            subscription.installmentCount += 1;
            
            // Update paid amount and remaining balance
            subscription.paidAmount += paymentAmount;
            subscription.remainingBalance = subscription.totalFee - subscription.paidAmount;
            
            // Update status based on payment amount
            if (subscription.paidAmount >= 1) {
                subscription.status = 'partial_payment';
                subscription.isActive = true;
            }
            
            if (subscription.paidAmount >= subscription.totalFee) {
                subscription.status = 'paid';
                subscription.isActive = true;
            }
        } else if (subscription.planType === 'free') {
            // For free plans
            subscription.status = 'paid';
            subscription.isActive = true;
        } else {
            // For custom plans and other paid plan types
            subscription.status = 'paid';
            subscription.isActive = true;
            
            // Increment installment count for paid plan payments
            subscription.installmentCount += 1;
        }
        
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

// @route   GET /api/subscriptions/export-report/:fighterId
// @desc    Export subscription/payment report for a fighter (Admin only)
// @access  Private (Admin only)
router.get('/export-report/:fighterId', auth, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ msg: 'Access denied' });
    }
    
    try {
        const fighter = await Fighter.findById(req.params.fighterId);
        if (!fighter) {
            return res.status(404).json({ msg: 'Fighter not found' });
        }
        
        // Get all subscriptions for the fighter
        const subscriptions = await Subscription.find({ fighterId: req.params.fighterId })
            .sort({ createdAt: -1 });
        
        // Format data for export
        const exportData = subscriptions.map(sub => ({
            fighterName: fighter.name,
            fighterRFID: fighter.rfid,
            planType: sub.planType,
            totalFee: sub.totalFee || sub.amount || 0,
            paidAmount: sub.paidAmount || 0,
            remainingBalance: sub.remainingBalance || 0,
            startDate: sub.startDate ? new Date(sub.startDate).toLocaleDateString() : 'N/A',
            endDate: sub.endDate ? new Date(sub.endDate).toLocaleDateString() : 'N/A',
            status: sub.status,
            isActive: sub.isActive ? 'Yes' : 'No',
            createdAt: sub.createdAt ? new Date(sub.createdAt).toLocaleDateString() : 'N/A',
            paymentHistoryCount: sub.paymentHistory ? sub.paymentHistory.length : 0
        }));
        
        res.json({
            fighter: {
                name: fighter.name,
                rfid: fighter.rfid
            },
            subscriptions: exportData
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET /api/subscriptions/export-my-report
// @desc    Export subscription/payment report for logged-in fighter
// @access  Private (Fighter only)
router.get('/export-my-report', auth, async (req, res) => {
    if (req.user.role !== 'fighter') {
        return res.status(403).json({ msg: 'Access denied' });
    }
    
    try {
        const fighter = await Fighter.findById(req.user.id);
        if (!fighter) {
            return res.status(404).json({ msg: 'Fighter not found' });
        }
        
        // Get all subscriptions for the fighter
        const subscriptions = await Subscription.find({ fighterId: req.user.id })
            .sort({ createdAt: -1 });
        
        // Format data for export
        const exportData = subscriptions.map(sub => ({
            planType: sub.planType,
            totalFee: sub.totalFee || sub.amount || 0,
            paidAmount: sub.paidAmount || 0,
            remainingBalance: sub.remainingBalance || 0,
            startDate: sub.startDate ? new Date(sub.startDate).toLocaleDateString() : 'N/A',
            endDate: sub.endDate ? new Date(sub.endDate).toLocaleDateString() : 'N/A',
            status: sub.status,
            isActive: sub.isActive ? 'Yes' : 'No',
            createdAt: sub.createdAt ? new Date(sub.createdAt).toLocaleDateString() : 'N/A',
            paymentHistoryCount: sub.paymentHistory ? sub.paymentHistory.length : 0
        }));
        
        res.json({
            fighter: {
                name: fighter.name,
                rfid: fighter.rfid
            },
            subscriptions: exportData
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET /api/subscriptions/check-payment-status/:fighterId
// @desc    Check if a fighter has made any payments
// @access  Private (Admin)
router.get('/check-payment-status/:fighterId', auth, async (req, res) => {
    try {
        // Check if user is admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({ msg: 'Access denied. Admins only.' });
        }
        
        const fighterId = req.params.fighterId;
        
        // Check if fighter exists
        const fighter = await Fighter.findById(fighterId);
        if (!fighter) {
            return res.status(404).json({ msg: 'Fighter not found' });
        }
        
        // Find all subscriptions for this fighter
        const subscriptions = await Subscription.find({ fighterId: fighterId });
        
        // Check if fighter has any paid subscriptions or payment history
        let hasMadePayments = false;
        let totalPaidAmount = 0;
        let hasFixedCommitment = false;
        let fixedCommitmentSub = null;
        
        for (const subscription of subscriptions) {
            // Check for fixed commitment plans
            if (subscription.planType === 'fixed_commitment') {
                hasFixedCommitment = true;
                fixedCommitmentSub = subscription;
                
                // Check if they've made any payments
                if (subscription.paidAmount > 0) {
                    hasMadePayments = true;
                    totalPaidAmount += subscription.paidAmount;
                }
            } 
            // Check for custom plan subscriptions
            else if (subscription.planType === 'custom') {
                // Check if they've made any payments
                if (subscription.paidAmount > 0) {
                    hasMadePayments = true;
                    totalPaidAmount += subscription.paidAmount;
                }
            }
        }
        
        res.json({
            hasMadePayments,
            totalPaidAmount,
            hasFixedCommitment,
            fixedCommitmentSub
        });
    } catch (err) {
        console.error('Error checking payment status:', err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
});

// @route   POST /api/subscriptions/make-installment
// @desc    Make an installment payment for an existing fixed commitment subscription
// @access  Private (Fighter)
router.post('/make-installment', auth, async (req, res) => {
    try {
        const { subscriptionId, installmentAmount } = req.body;
        
        // Validate inputs
        if (!subscriptionId || !installmentAmount) {
            return res.status(400).json({ msg: 'Subscription ID and installment amount are required' });
        }
        
        if (installmentAmount <= 0) {
            return res.status(400).json({ msg: 'Installment amount must be greater than 0' });
        }
        
        // Find the subscription
        const subscription = await Subscription.findById(subscriptionId);
        if (!subscription) {
            return res.status(404).json({ msg: 'Subscription not found' });
        }
        
        // Verify ownership
        if (subscription.fighterId.toString() !== req.user.id) {
            return res.status(403).json({ msg: 'Unauthorized' });
        }
        
        // Check if it's a fixed commitment plan
        if (subscription.planType !== 'fixed_commitment') {
            return res.status(400).json({ msg: 'Installment payments are only available for fixed commitment plans' });
        }
        
        // Check if subscription is active
        if (!subscription.isActive) {
            return res.status(400).json({ msg: 'Subscription is not active' });
        }
        
        // Check if subscription has remaining balance
        if (subscription.remainingBalance <= 0) {
            return res.status(400).json({ msg: 'Subscription is already fully paid' });
        }
        
        // Check if installment amount doesn't exceed remaining balance
        if (installmentAmount > subscription.remainingBalance) {
            return res.status(400).json({ 
                msg: `Installment amount cannot exceed remaining balance of ₹${subscription.remainingBalance}` 
            });
        }
        
        // Create Razorpay order for installment
        const Razorpay = require('razorpay');
        const razorpay = new Razorpay({
            key_id: process.env.RAZORPAY_KEY_ID,
            key_secret: process.env.RAZORPAY_KEY_SECRET
        });
        
        const amount = installmentAmount * 100; // Convert to paise
        
        // Create Razorpay order with a shorter receipt (max 40 characters)
        const timestamp = Date.now().toString().slice(-10); // Last 10 digits of timestamp
        const receipt = `inst_${req.user.id.slice(-10)}_${timestamp}`;
        
        const options = {
            amount: amount,
            currency: "INR",
            receipt: receipt
        };
        
        const order = await razorpay.orders.create(options);
        
        // Return order details for payment processing
        res.json({
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
            subscriptionId: subscription._id
        });
    } catch (err) {
        console.error('Error creating installment order:', err);
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

// @route   POST /api/subscriptions/admin-make-installment
// @desc    Make an installment payment for an existing fixed commitment subscription (Admin version)
// @access  Private (Admin)
router.post('/admin-make-installment', auth, async (req, res) => {
    try {
        // Check if user is admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({ msg: 'Access denied. Admins only.' });
        }
        
        const { subscriptionId, installmentAmount } = req.body;
        
        // Validate inputs
        if (!subscriptionId || !installmentAmount) {
            return res.status(400).json({ msg: 'Subscription ID and installment amount are required' });
        }
        
        if (installmentAmount <= 0) {
            return res.status(400).json({ msg: 'Installment amount must be greater than 0' });
        }
        
        // Find the subscription
        const subscription = await Subscription.findById(subscriptionId);
        if (!subscription) {
            return res.status(404).json({ msg: 'Subscription not found' });
        }
        
        // Check if it's a fixed commitment or custom plan
        if (subscription.planType !== 'fixed_commitment' && subscription.planType !== 'custom') {
            return res.status(400).json({ msg: 'Installment payments are only available for fixed commitment and custom plans' });
        }
        
        // Check if subscription is active
        if (!subscription.isActive) {
            return res.status(400).json({ msg: 'Subscription is not active' });
        }
        
        // Check if subscription has remaining balance
        if (subscription.remainingBalance <= 0) {
            return res.status(400).json({ msg: 'Subscription is already fully paid' });
        }
        
        // Check if installment amount doesn't exceed remaining balance
        if (installmentAmount > subscription.remainingBalance) {
            return res.status(400).json({ 
                msg: `Installment amount cannot exceed remaining balance of ₹${subscription.remainingBalance}` 
            });
        }
        
        // Create Razorpay order for installment
        const Razorpay = require('razorpay');
        const razorpay = new Razorpay({
            key_id: process.env.RAZORPAY_KEY_ID,
            key_secret: process.env.RAZORPAY_KEY_SECRET
        });
        
        const amount = installmentAmount * 100; // Convert to paise
        
        // Create Razorpay order with a shorter receipt (max 40 characters)
        const timestamp = Date.now().toString().slice(-10); // Last 10 digits of timestamp
        const receipt = `adm_inst_${subscription.fighterId.toString().slice(-10)}_${timestamp}`;
        
        const options = {
            amount: amount,
            currency: "INR",
            receipt: receipt
        };
        
        const order = await razorpay.orders.create(options);
        
        // Return order details for payment processing
        res.json({
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
            subscriptionId: subscription._id
        });
    } catch (err) {
        console.error('Error creating admin installment order:', err);
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

// @route   POST /api/subscriptions/verify-installment
// @desc    Verify installment payment and update subscription
// @access  Private (Fighter)
router.post('/verify-installment', auth, async (req, res) => {
    try {
        const { razorpayOrderId, razorpayPaymentId, razorpaySignature, subscriptionId } = req.body;
        
        // Verify signature
        const hmac = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET);
        hmac.update(razorpayOrderId + "|" + razorpayPaymentId);
        const generatedSignature = hmac.digest('hex');
        
        if (generatedSignature !== razorpaySignature) {
            return res.status(400).json({ msg: 'Payment verification failed' });
        }
        
        // Find the subscription
        const subscription = await Subscription.findById(subscriptionId);
        if (!subscription) {
            return res.status(404).json({ msg: 'Subscription not found' });
        }
        
        // Verify ownership
        if (subscription.fighterId.toString() !== req.user.id) {
            return res.status(403).json({ msg: 'Unauthorized' });
        }
        
        // Check if it's a fixed commitment or custom plan
        if (subscription.planType !== 'fixed_commitment' && subscription.planType !== 'custom') {
            return res.status(400).json({ msg: 'Installment payments are only available for fixed commitment and custom plans' });
        }
        
        // Initialize Razorpay instance
        const Razorpay = require('razorpay');
        const razorpay = new Razorpay({
            key_id: process.env.RAZORPAY_KEY_ID,
            key_secret: process.env.RAZORPAY_KEY_SECRET
        });
        
        // Fetch order details to get the actual amount paid
        const order = await razorpay.orders.fetch(razorpayOrderId);
        const paymentAmount = order.amount_paid / 100; // Convert from paise to rupees
        
        // Check if installment limit is reached
        if (subscription.installmentCount >= subscription.maxInstallments) {
            return res.status(400).json({ 
                msg: `Maximum number of installments (${subscription.maxInstallments}) reached for this subscription.` 
            });
        }
        
        // Add payment to history
        subscription.paymentHistory.push({
            amount: paymentAmount,
            date: new Date(),
            razorpayPaymentId: razorpayPaymentId,
            razorpayOrderId: razorpayOrderId,
            razorpaySignature: razorpaySignature
        });
        
        // Update installment count
        subscription.installmentCount += 1;
        
        // Update paid amount and remaining balance
        subscription.paidAmount += paymentAmount;
        subscription.remainingBalance = subscription.totalFee - subscription.paidAmount;
        
        // Update status based on payment amount
        if (subscription.paidAmount >= 1) {
            subscription.status = 'partial_payment';
            subscription.isActive = true;
        }
        
        if (subscription.paidAmount >= subscription.totalFee) {
            subscription.status = 'paid';
            subscription.isActive = true;
        }
        
        await subscription.save();
        
        res.json({ msg: 'Installment payment verified successfully', subscription });
    } catch (err) {
        console.error('Error verifying installment payment:', err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
});

// @route   POST /api/subscriptions/admin-verify-installment
// @desc    Verify installment payment and update subscription (Admin version)
// @access  Private (Admin)
router.post('/admin-verify-installment', auth, async (req, res) => {
    try {
        // Check if user is admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({ msg: 'Access denied. Admins only.' });
        }
        
        const { razorpayOrderId, razorpayPaymentId, razorpaySignature, subscriptionId } = req.body;
        
        // Verify signature
        const hmac = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET);
        hmac.update(razorpayOrderId + "|" + razorpayPaymentId);
        const generatedSignature = hmac.digest('hex');
        
        if (generatedSignature !== razorpaySignature) {
            return res.status(400).json({ msg: 'Payment verification failed' });
        }
        
        // Find the subscription
        const subscription = await Subscription.findById(subscriptionId);
        if (!subscription) {
            return res.status(404).json({ msg: 'Subscription not found' });
        }
        
        // Check if it's a fixed commitment or custom plan
        if (subscription.planType !== 'fixed_commitment' && subscription.planType !== 'custom') {
            return res.status(400).json({ msg: 'Installment payments are only available for fixed commitment and custom plans' });
        }
        
        // Initialize Razorpay instance
        const Razorpay = require('razorpay');
        const razorpay = new Razorpay({
            key_id: process.env.RAZORPAY_KEY_ID,
            key_secret: process.env.RAZORPAY_KEY_SECRET
        });
        
        // Fetch order details to get the actual amount paid
        const order = await razorpay.orders.fetch(razorpayOrderId);
        const paymentAmount = order.amount_paid / 100; // Convert from paise to rupees
        
        // Check if installment limit is reached
        if (subscription.installmentCount >= subscription.maxInstallments) {
            return res.status(400).json({ 
                msg: `Maximum number of installments (${subscription.maxInstallments}) reached for this subscription.` 
            });
        }
        
        // Add payment to history
        subscription.paymentHistory.push({
            amount: paymentAmount,
            date: new Date(),
            razorpayPaymentId: razorpayPaymentId,
            razorpayOrderId: razorpayOrderId,
            razorpaySignature: razorpaySignature
        });
        
        // Update installment count
        subscription.installmentCount += 1;
        
        // Update paid amount and remaining balance
        subscription.paidAmount += paymentAmount;
        subscription.remainingBalance = subscription.totalFee - subscription.paidAmount;
        
        // Update status based on payment amount
        if (subscription.paidAmount >= 1) {
            subscription.status = 'partial_payment';
            subscription.isActive = true;
        }
        
        if (subscription.paidAmount >= subscription.totalFee) {
            subscription.status = 'paid';
            subscription.isActive = true;
        }
        
        await subscription.save();
        
        res.json({ msg: 'Installment payment verified successfully', subscription });
    } catch (err) {
        console.error('Error verifying admin installment payment:', err.message);
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
            $or: [
                { 
                    // Regular paid subscriptions (not fixed commitment or free)
                    planType: { $nin: ['free', 'fixed_commitment'] },
                    status: 'paid',
                    endDate: { $gte: now }
                },
                { 
                    // Free plans (no end date check needed as they're indefinite)
                    planType: 'free',
                    status: 'paid'
                },
                { 
                    // Fixed commitment plans (can be partially paid)
                    planType: 'fixed_commitment',
                    status: { $in: ['paid', 'partial_payment'] },
                    endDate: { $gte: now }
                },
                { 
                    // Custom plans (can be partially paid)
                    planType: 'custom',
                    status: { $in: ['paid', 'partial_payment'] },
                    endDate: { $gte: now }
                }
            ]
        }).sort({ createdAt: -1 }); // Get the most recent one if there are multiple
        
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
        const { planType, status, search } = req.query;
        
        // Build query
        const query = {};
        if (planType) query.planType = planType;
        
        if (status) {
            if (status === 'expired') {
                // For expired status, include both explicitly expired subscriptions and those past their end date
                query.$or = [
                    { status: 'expired' },
                    { endDate: { $lt: new Date() }, status: { $ne: 'paid' } } // Past end date but not fully paid
                ];
            } else {
                query.status = status;
            }
        }
        
        // Add search functionality if search parameter is provided
        if (search) {
            // Search across multiple fields: fighter's name/RFID and subscription details
            const Fighter = require('../models/Fighter');
            
            // First, find fighter IDs that match the search term
            const fighterIds = await Fighter.find({
                $or: [
                    { name: { $regex: search, $options: 'i' } },
                    { rfid: { $regex: search, $options: 'i' } }
                ]
            }).select('_id');
            
            // Create search query for subscription fields
            const subscriptionSearchQuery = {
                $or: [
                    { planType: { $regex: search, $options: 'i' } },
                    { status: { $regex: search, $options: 'i' } },
                    { startDate: { $regex: search, $options: 'i' } }, // Search in start date
                    { endDate: { $regex: search, $options: 'i' } } // Search in end date
                ]
            };
            
            // Check if search term is numeric to search in numeric fields as well
            const searchAsNumber = isNaN(search) ? null : parseFloat(search);
            if (searchAsNumber !== null) {
                // If search term is numeric, also search in numeric fields
                subscriptionSearchQuery.$or.push(
                    { totalFee: { $gte: searchAsNumber - 0.01, $lte: searchAsNumber + 0.01 } },
                    { paidAmount: { $gte: searchAsNumber - 0.01, $lte: searchAsNumber + 0.01 } },
                    { remainingBalance: { $gte: searchAsNumber - 0.01, $lte: searchAsNumber + 0.01 } },
                    { amount: { $gte: searchAsNumber - 0.01, $lte: searchAsNumber + 0.01 } }
                );
            } else {
                // If search term is not numeric, also search in string representations of numeric fields
                subscriptionSearchQuery.$or.push(
                    { totalFee: { $regex: search, $options: 'i' } },
                    { paidAmount: { $regex: search, $options: 'i' } },
                    { remainingBalance: { $regex: search, $options: 'i' } },
                    { amount: { $regex: search, $options: 'i' } }
                );
            }
            
            // Preserve any existing query conditions (like status filter) and combine with search
            const preservedQuery = { ...query }; // Keep existing filters like status
            
            // If we found matching fighters, combine fighter search and subscription search
            if (fighterIds.length > 0) {
                query.$and = [
                    preservedQuery, // Preserve existing filters (like status)
                    {
                        $or: [
                            { fighterId: { $in: fighterIds.map(f => f._id) } },
                            subscriptionSearchQuery
                        ]
                    }
                ];
            } else {
                // If no matching fighters found, only search in subscription fields but preserve other filters
                query.$and = [
                    preservedQuery, // Preserve existing filters (like status)
                    subscriptionSearchQuery
                ];
            }
        }
        
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
        if (planType && !PLAN_PRICES.hasOwnProperty(planType)) {
            return res.status(400).json({ msg: 'Invalid plan type' });
        }
        
        const subscription = await Subscription.findById(req.params.id);
        if (!subscription) {
            return res.status(404).json({ msg: 'Subscription not found' });
        }
        
        // Update fields if provided
        if (planType) subscription.planType = planType;
        if (startDate) subscription.startDate = new Date(startDate);
        
        // For free plan, set end date to distant future (99 years)
        // This makes it indefinite until admin changes the plan
        if (planType === 'free' || subscription.planType === 'free') {
            if (planType === 'free') {
                // Changing to or keeping free plan
                const distantFuture = new Date();
                distantFuture.setFullYear(distantFuture.getFullYear() + 99);
                subscription.endDate = distantFuture;
            } else if (planType && planType !== 'free' && subscription.planType === 'free') {
                // Changing from free to paid plan, endDate becomes required
                if (!endDate) {
                    return res.status(400).json({ msg: 'End date is required for paid plans' });
                }
                subscription.endDate = new Date(endDate);
            } else if (!planType && subscription.planType === 'free' && endDate) {
                // Keeping free plan but trying to set endDate - override to distant future
                const distantFuture = new Date();
                distantFuture.setFullYear(distantFuture.getFullYear() + 99);
                subscription.endDate = distantFuture;
            } else if (!planType && subscription.planType === 'free' && !endDate) {
                // Keeping free plan without endDate change - ensure it's still distant future
                const distantFuture = new Date();
                distantFuture.setFullYear(distantFuture.getFullYear() + 99);
                subscription.endDate = distantFuture;
            }
        } else {
            // Regular paid plan handling
            if (endDate) subscription.endDate = new Date(endDate);
        }
        
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

// @route   POST /api/subscriptions/admin-record-cash-payment
// @desc    Record a cash payment for a subscription (Admin only)
// @access  Private (Admin)
router.post('/admin-record-cash-payment', auth, async (req, res) => {
    try {
        // Check if user is admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({ msg: 'Access denied. Admins only.' });
        }
        
        const { subscriptionId, paymentAmount, paymentNotes } = req.body;
        
        // Validate inputs
        if (!subscriptionId || !paymentAmount) {
            return res.status(400).json({ msg: 'Subscription ID and payment amount are required' });
        }
        
        if (paymentAmount <= 0) {
            return res.status(400).json({ msg: 'Payment amount must be greater than 0' });
        }
        
        // Find the subscription
        const subscription = await Subscription.findById(subscriptionId);
        if (!subscription) {
            return res.status(404).json({ msg: 'Subscription not found' });
        }
        
        // Check if it's a fixed commitment or custom plan
        if (subscription.planType !== 'fixed_commitment' && subscription.planType !== 'custom') {
            return res.status(400).json({ msg: 'Cash payments are only available for fixed commitment and custom plans' });
        }
        
        // For fixed commitment plans, check remaining balance
        if (subscription.planType === 'fixed_commitment') {
            if (subscription.remainingBalance <= 0) {
                return res.status(400).json({ msg: 'Subscription is already fully paid' });
            }
            
            if (paymentAmount > subscription.remainingBalance) {
                return res.status(400).json({ 
                    msg: `Payment amount cannot exceed remaining balance of ₹${subscription.remainingBalance}` 
                });
            }
        }
        
        // For custom plans, check if totalFee is properly set
        if (subscription.planType === 'custom') {
            if (subscription.totalFee && subscription.remainingBalance <= 0) {
                return res.status(400).json({ msg: 'Subscription is already fully paid' });
            }
            
            if (subscription.totalFee && paymentAmount > subscription.remainingBalance) {
                return res.status(400).json({ 
                    msg: `Payment amount cannot exceed remaining balance of ₹${subscription.remainingBalance}` 
                });
            }
        }
        
        // Check if installment limit is reached
        // For fixed commitment plans, enforce installment limit
        if (subscription.planType === 'fixed_commitment') {
            if (subscription.installmentCount >= subscription.maxInstallments) {
                return res.status(400).json({ 
                    msg: `Maximum number of installments (${subscription.maxInstallments}) reached for this subscription.` 
                });
            }
        }
        // For custom plans, we'll allow payments as long as maxInstallments hasn't been reached
        // or if maxInstallments is not properly set
        if (subscription.planType === 'custom') {
            if (subscription.maxInstallments && subscription.installmentCount >= subscription.maxInstallments) {
                return res.status(400).json({ 
                    msg: `Maximum number of installments (${subscription.maxInstallments}) reached for this subscription.` 
                });
            }
        }
        
        // Add payment to history with cash payment marker
        subscription.paymentHistory.push({
            amount: paymentAmount,
            date: new Date(),
            paymentMethod: 'cash',
            notes: paymentNotes || 'Cash payment recorded by admin',
            razorpayPaymentId: null,
            razorpayOrderId: null,
            razorpaySignature: null
        });
        
        // Update installment count
        subscription.installmentCount += 1;
        
        // Update paid amount and remaining balance
        subscription.paidAmount += paymentAmount;
        
        // Calculate remaining balance based on totalFee if it exists
        if (subscription.totalFee) {
            subscription.remainingBalance = Math.max(0, subscription.totalFee - subscription.paidAmount);
        } else {
            // For custom plans without totalFee set, we'll just update the paid amount
            // and let the remaining balance be managed separately
            subscription.remainingBalance = Math.max(0, subscription.remainingBalance - paymentAmount);
        }
        
        // Update status based on payment amount
        if (subscription.paidAmount >= 1) {
            subscription.status = 'partial_payment';
            subscription.isActive = true;
        }
        
        if (subscription.paidAmount >= subscription.totalFee && subscription.totalFee) {
            subscription.status = 'paid';
            subscription.isActive = true;
        }
        
        await subscription.save();
        
        res.json({ msg: 'Cash payment recorded successfully', subscription });
    } catch (err) {
        console.error('Error recording cash payment:', err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
});

// @route   PUT /api/subscriptions/:id
// @desc    Update a subscription (Admin only)
// @access  Private (Admin)
router.put('/:id', auth, async (req, res) => {
    try {
        // Check if user is admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({ msg: 'Access denied' });
        }
        
        const { id } = req.params;
        const { totalFee, paidAmount, remainingBalance, startDate, endDate, status, isActive, installmentCount, maxInstallments } = req.body;
        
        // Find the subscription by ID
        const subscription = await Subscription.findById(id);
        if (!subscription) {
            return res.status(404).json({ msg: 'Subscription not found' });
        }
        
        // Update the subscription fields
        if (totalFee !== undefined) subscription.totalFee = totalFee;
        if (paidAmount !== undefined) subscription.paidAmount = paidAmount;
        if (remainingBalance !== undefined) subscription.remainingBalance = remainingBalance;
        if (startDate !== undefined) subscription.startDate = startDate;
        if (endDate !== undefined) subscription.endDate = endDate;
        if (status !== undefined) subscription.status = status;
        if (isActive !== undefined) subscription.isActive = isActive;
        if (installmentCount !== undefined) subscription.installmentCount = installmentCount;
        if (maxInstallments !== undefined) subscription.maxInstallments = maxInstallments;
        
        // Update status based on payment amount if paidAmount is being updated
        if (paidAmount !== undefined) {
            if (paidAmount >= (totalFee || subscription.totalFee)) {
                subscription.status = 'paid';
            } else if (paidAmount > 0) {
                subscription.status = 'partial_payment';
            } else {
                subscription.status = 'unpaid';
            }
        }
        
        // Update isActive based on status if not explicitly provided
        if (isActive === undefined) {
            subscription.isActive = (status || subscription.status) === 'paid';
        }
        
        // Save the updated subscription
        await subscription.save();
        
        res.json({ msg: 'Subscription updated successfully', subscription });
    } catch (err) {
        console.error('Error updating subscription:', err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
});

// @route   PUT /api/subscriptions/:id/cancel
// @desc    Cancel a subscription (Admin only)
// @access  Private (Admin)
router.put('/:id/cancel', auth, async (req, res) => {
    try {
        // Check if user is admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({ msg: 'Access denied' });
        }
        
        const { id } = req.params;
        
        // Find the subscription by ID
        const subscription = await Subscription.findById(id);
        if (!subscription) {
            return res.status(404).json({ msg: 'Subscription not found' });
        }
        
        // Update the subscription to cancelled status
        subscription.status = 'cancelled';
        subscription.isActive = false;
        
        // If maxInstallments is provided in the request, update it
        if (req.body.maxInstallments !== undefined) {
            subscription.maxInstallments = req.body.maxInstallments;
        }
        
        // Save the updated subscription
        await subscription.save();
        
        res.json({ msg: 'Subscription cancelled successfully', subscription });
    } catch (err) {
        console.error('Error cancelling subscription:', err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
});

module.exports = router;
