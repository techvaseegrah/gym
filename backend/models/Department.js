const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true
    },
    feeStructure: {
        totalFee: {
            type: Number,
            default: 4000
        },
        durationMonths: {
            type: Number,
            default: 3
        },
        description: {
            type: String,
            default: ''
        }
    },
    isActive: {
        type: Boolean,
        default: true
    },
    isDefault: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

module.exports = mongoose.model('Department', departmentSchema);