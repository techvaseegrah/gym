const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
    fighterId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Fighter',
        required: true
    },
    planType: {
        type: String,
        enum: ['monthly', 'quarterly', 'yearly'],
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    razorpayOrderId: {
        type: String,
        default: 'admin_created' // Default value for admin-created subscriptions
    },
    razorpayPaymentId: {
        type: String
    },
    razorpaySignature: {
        type: String
    },
    startDate: {
        type: Date,
        default: Date.now
    },
    endDate: {
        type: Date,
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    status: {
        type: String,
        enum: ['created', 'paid', 'expired', 'cancelled'],
        default: 'created'
    }
}, { timestamps: true });

module.exports = mongoose.model('Subscription', subscriptionSchema);
