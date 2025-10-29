const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const DoubtSchema = new Schema({
    text: {
        type: String,
        required: true,
        trim: true,
        maxlength: 2000
    },
    user: {
        type: Schema.Types.ObjectId,
        required: true,
        refPath: 'userModel'
    },
    userModel: {
        type: String,
        required: true,
        enum: ['Admin', 'Fighter']
    },
    recipient: {
        type: Schema.Types.ObjectId,
        refPath: 'recipientModel',
        default: null
    },
    recipientModel: {
        type: String,
        enum: ['Admin', 'Fighter'],
        required: function() { return this.recipient != null; }
    },
    // FIXED: Add recipientId field for easier querying
    recipientId: {
        type: Schema.Types.ObjectId,
        default: null
    },
    messageType: {
        type: String,
        enum: ['doubt', 'clarity'],
        default: 'doubt'
    },
    isVisible: {
        type: Boolean,
        default: true
    },
    timestamp: {
        type: Date,
        default: Date.now,
        index: true
    },
    parentDoubt: {
        type: Schema.Types.ObjectId,
        ref: 'Doubt',
        default: null
    },
    replies: [{
        type: Schema.Types.ObjectId,
        ref: 'Doubt'
    }],
    isResolved: {
        type: Boolean,
        default: false
    },
    lastReplyAt: {
        type: Date,
        default: null
    },
    // Field to track which users have read this message
    readBy: [{
        type: Schema.Types.ObjectId,
        refPath: 'readByModel'
    }],
    readByModel: {
        type: String,
        enum: ['Admin', 'Fighter']
    }
});

DoubtSchema.index({ timestamp: 1 });
DoubtSchema.index({ user: 1, timestamp: 1 });
DoubtSchema.index({ recipient: 1, timestamp: 1 });
DoubtSchema.index({ recipientId: 1, timestamp: 1 }); // FIXED: Add index for recipientId
DoubtSchema.index({ parentDoubt: 1, timestamp: 1 });

module.exports = mongoose.model('Doubt', DoubtSchema);