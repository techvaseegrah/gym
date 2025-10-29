const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
    fighterId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Fighter',
        required: true
    },
    checkIn: {
        type: Date,
        default: Date.now
    },
    checkOut: {
        type: Date
    },
    method: {
        type: String,
        enum: ['rfid', 'face', 'manual'], // Fixed to match the values used in the routes
        required: true
    },
    location: {
        latitude: { type: Number },
        longitude: { type: Number }
    }
}, { timestamps: true }); // Using timestamps adds createdAt and updatedAt fields automatically

module.exports = mongoose.model('Attendance', attendanceSchema);