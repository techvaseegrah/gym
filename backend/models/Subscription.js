const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
    fighterId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Fighter',
        required: true
    },
    planType: {
        type: String,
        enum: ['free', 'fixed_commitment', 'custom'],
        required: true,
        default: 'fixed_commitment'
    },
    // For fixed commitment model - total fee for the 3-month package
    totalFee: {
        type: Number,
        default: 4000
    },
    // How much has been paid so far
    paidAmount: {
        type: Number,
        default: 0
    },
    // Remaining balance to be paid
    remainingBalance: {
        type: Number,
        default: 4000
    },
    // Track payment history for audit trail
    paymentHistory: [{
        amount: Number,
        date: Date,
        razorpayPaymentId: String,
        razorpayOrderId: String,
        razorpaySignature: String
    }],
    // Track number of installments made
    installmentCount: {
        type: Number,
        default: 0
    },
    maxInstallments: {
        type: Number,
        default: 4
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
        enum: ['created', 'paid', 'partial_payment', 'expired', 'cancelled'],
        default: 'created'
    },
    // Duration in months for the subscription
    duration: {
        type: Number,
        default: 3 // Default to 3 months for fixed commitment plans
    }
}, { timestamps: true });

// Add indexes for better query performance
subscriptionSchema.index({ fighterId: 1 });
subscriptionSchema.index({ planType: 1 });
subscriptionSchema.index({ status: 1 });
subscriptionSchema.index({ startDate: 1 });
subscriptionSchema.index({ endDate: 1 });
subscriptionSchema.index({ isActive: 1 });
subscriptionSchema.index({ fighterId: 1, status: 1 });
subscriptionSchema.index({ fighterId: 1, isActive: 1 });
subscriptionSchema.index({ createdAt: -1 }); // For sorting

module.exports = mongoose.model('Subscription', subscriptionSchema);
