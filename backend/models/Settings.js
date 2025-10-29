const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
    location: {
        latitude: { type: Number, required: true },
        longitude: { type: Number, required: true },
        enabled: { type: Boolean, default: true },
        radius: { type: Number, default: 100 }
    }
});

module.exports = mongoose.model('Settings', settingsSchema);