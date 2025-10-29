const express = require('express');
const router = express.Router();
const Settings = require('../models/Settings');
const auth = require('../middleware/authMiddleware');

// @route   GET /api/settings
// @desc    Get gym location settings
// @access  Public
router.get('/', async (req, res) => {
    try {
        let settings = await Settings.findOne();
        if (!settings) {
            // If no settings exist, create default settings
            settings = new Settings({
                location: {
                    latitude: 12.9716, // Default Latitude (e.g., Bangalore, India)
                    longitude: 77.5946, // Default Longitude (e.g., Bangalore, India)
                    enabled: true,
                    radius: 100
                }
            });
            await settings.save();
        }
        res.json(settings);
    } catch (err) {
        console.error('Error fetching settings:', err);
        res.status(500).json({ msg: 'Server Error: ' + err.message });
    }
});

// @route   POST /api/settings
// @desc    Update gym location settings
// @access  Private (Admin only)
router.post('/', auth, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ msg: 'Access denied' });
    }
    
    try {
        console.log('Received settings update request:');
        console.log('Request body:', JSON.stringify(req.body, null, 2));
        console.log('Request user:', req.user);
        
        // Check if req.body is properly parsed
        if (!req.body || typeof req.body !== 'object') {
            console.log('Invalid request body:', req.body);
            return res.status(400).json({ msg: 'Invalid request body format' });
        }
        
        const { location } = req.body;
        
        // Check if location exists and is an object
        if (!location || typeof location !== 'object') {
            console.log('Invalid location data:', location);
            return res.status(400).json({ msg: 'Location data is required and must be an object' });
        }
        
        console.log('Location data from request:', JSON.stringify(location, null, 2));
        
        // Convert values to proper types with better error handling
        let latitude, longitude, radius, enabled;
        
        // Handle latitude
        if (location.latitude === undefined || location.latitude === null) {
            console.log('Latitude is missing or null');
            return res.status(400).json({ msg: 'Latitude is required' });
        }
        latitude = parseFloat(location.latitude);
        if (isNaN(latitude)) {
            console.log('Invalid latitude value:', location.latitude);
            return res.status(400).json({ msg: `Invalid latitude value: ${location.latitude}` });
        }
        // Validate latitude range
        if (latitude < -90 || latitude > 90) {
            console.log('Latitude out of range:', latitude);
            return res.status(400).json({ msg: `Latitude must be between -90 and 90, got: ${latitude}` });
        }
        
        // Handle longitude
        if (location.longitude === undefined || location.longitude === null) {
            console.log('Longitude is missing or null');
            return res.status(400).json({ msg: 'Longitude is required' });
        }
        longitude = parseFloat(location.longitude);
        if (isNaN(longitude)) {
            console.log('Invalid longitude value:', location.longitude);
            return res.status(400).json({ msg: `Invalid longitude value: ${location.longitude}` });
        }
        // Validate longitude range
        if (longitude < -180 || longitude > 180) {
            console.log('Longitude out of range:', longitude);
            return res.status(400).json({ msg: `Longitude must be between -180 and 180, got: ${longitude}` });
        }
        
        // Handle radius
        if (location.radius === undefined || location.radius === null) {
            console.log('Radius is missing or null, using default value 100');
            radius = 100; // Default value
        } else {
            radius = parseInt(location.radius);
            if (isNaN(radius)) {
                console.log('Invalid radius value:', location.radius);
                return res.status(400).json({ msg: `Invalid radius value: ${location.radius}` });
            }
            if (radius < 50 || radius > 500) {
                console.log('Radius out of range:', radius);
                return res.status(400).json({ msg: `Radius must be between 50 and 500 meters, got: ${radius}` });
            }
        }
        
        // Handle enabled
        enabled = location.enabled === true || location.enabled === false ? location.enabled : true;
        
        console.log('Parsed and validated values:', { latitude, longitude, radius, enabled });
        
        let settings = await Settings.findOne();
        if (settings) {
            console.log('Updating existing settings');
            settings.location.latitude = latitude;
            settings.location.longitude = longitude;
            settings.location.enabled = enabled;
            settings.location.radius = radius;
            await settings.save();
            console.log('Settings updated successfully:', JSON.stringify(settings, null, 2));
            return res.json({ msg: 'Settings updated', settings });
        } else {
            console.log('Creating new settings');
            settings = new Settings({ 
                location: {
                    latitude: latitude,
                    longitude: longitude,
                    enabled: enabled,
                    radius: radius
                }
            });
            await settings.save();
            console.log('Settings created successfully:', JSON.stringify(settings, null, 2));
            return res.json({ msg: 'Settings created', settings });
        }
    } catch (err) {
        console.error('Error updating settings:', err);
        // Handle Mongoose validation errors specifically
        if (err.name === 'ValidationError') {
            const errors = Object.values(err.errors).map(e => e.message);
            return res.status(400).json({ msg: 'Validation Error: ' + errors.join(', ') });
        }
        // Handle MongoDB duplicate key errors
        if (err.code === 11000) {
            return res.status(400).json({ msg: 'Duplicate key error. Please check your input.' });
        }
        res.status(500).json({ msg: 'Server Error: ' + err.message });
    }
});

module.exports = router;