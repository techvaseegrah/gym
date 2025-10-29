const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Fighter = require('../models/Fighter');
const auth = require('../middleware/authMiddleware');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

// @route   POST api/fighters/register
// @desc    Register a new fighter (Admin only)
// @access  Private (Admin)
router.post('/register', auth, async (req, res) => {
    console.log('Fighter registration attempt:', {
        ...req.body,
        password: '[HIDDEN]',
        faceEncodings: req.body.faceEncodings ? `${req.body.faceEncodings.length} encodings` : 'No encodings'
    });
    console.log('User role:', req.user.role);
    
    if (req.user.role !== 'admin') {
        return res.status(403).json({ msg: 'Access denied' });
    }

    const { name, email, password, faceEncodings, rfid, profilePhoto } = req.body;
    
    // Validate required fields
    if (!name || !email || !password || !rfid) {
        return res.status(400).json({ msg: 'Please provide name, email, password, and RFID' });
    }
    
    // Face encodings are recommended but not strictly required for testing
    if (!faceEncodings || faceEncodings.length === 0) {
        console.log('Warning: No face encodings provided - face recognition will not work');
    }
    
    try {
        // Check if database is connected
        if (mongoose.connection.readyState !== 1) {
            console.log('Database not connected. Ready state:', mongoose.connection.readyState);
            return res.status(500).json({ msg: 'Database connection error' });
        }

        let existingFighter = await Fighter.findOne({ $or: [{ email }, { rfid }] });
        if (existingFighter) {
            if (existingFighter.email === email) {
                return res.status(400).json({ msg: 'Fighter with this email already exists' });
            }
            if (existingFighter.rfid === rfid) {
                return res.status(400).json({ msg: 'This RFID is already assigned. Please regenerate.' });
            }
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        
        // Auto-generate unique batch number
        const fighterBatchNo = generateBatchNo();
        console.log('Generated batch number:', fighterBatchNo);

        // Create fighter object
        const fighterData = {
            name,
            fighterBatchNo,
            email,
            password: hashedPassword,
            role: 'fighter',
            faceEncodings: faceEncodings ? JSON.parse(faceEncodings) : [],
            rfid,
            dateOfJoining: new Date()
        };
        
        // Add profile photo if provided
        if (profilePhoto) {
            fighterData.profilePhoto = profilePhoto;
        }
        
        console.log('Creating fighter with data:', {
            ...fighterData,
            password: '[HIDDEN]',
            faceEncodings: `${fighterData.faceEncodings.length} encodings`
        });

        const fighter = new Fighter(fighterData);
        await fighter.save();
        
        console.log('Fighter registered successfully:', fighter.email, 'ID:', fighter._id);
        
        res.status(201).json({ 
            msg: 'Fighter registered successfully', 
            fighter: { 
                id: fighter._id, 
                name: fighter.name, 
                email: fighter.email, 
                fighterBatchNo: fighter.fighterBatchNo 
            } 
        });
    } catch (err) {
        console.error('Fighter registration error:', {
            message: err.message,
            stack: err.stack,
            name: err.name
        });
        
        // More specific error messages
        if (err.name === 'ValidationError') {
            const errors = Object.keys(err.errors).map(key => `${key}: ${err.errors[key].message}`);
            return res.status(400).json({ msg: 'Validation Error: ' + errors.join(', ') });
        }
        
        if (err.code === 11000) {
            return res.status(400).json({ msg: 'Email already exists' });
        }
        
        res.status(500).json({ msg: 'Server Error: ' + err.message });
    }
});

// @route   GET api/fighters/list
// @desc    Get list of all fighters for the fighter login page
// @access  Public
router.get('/list', async (req, res) => {
    try {
        const fighters = await Fighter.find({}).select('name fighterBatchNo email rfid'); 
        res.json(fighters);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST api/fighters/profile
// @desc    Update fighter profile on first login
// @access  Private (Fighter only)
router.post('/profile', auth, async (req, res) => {
    try {
        const fighter = await Fighter.findById(req.user.id);
        if (!fighter) {
            return res.status(404).json({ msg: 'Fighter not found' });
        }

        Object.assign(fighter, req.body);
        fighter.profile_completed = true;
        await fighter.save();
        res.json({ msg: 'Profile updated successfully', fighter });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET api/fighters/me
// @desc    Get current fighter's data
// @access  Private (Fighter only)
router.get('/me', auth, async (req, res) => {
    if (req.user.role !== 'fighter') {
        return res.status(403).json({ msg: 'Access denied' });
    }
    try {
        const fighter = await Fighter.findById(req.user.id).select('-password');
        if (!fighter) {
            return res.status(404).json({ msg: 'Fighter not found' });
        }
        res.json(fighter);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET api/fighters/dashboard-stats
// @desc    Get dashboard statistics for admin
// @access  Private (Admin only)
router.get('/dashboard-stats', auth, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ msg: 'Access denied' });
    }
    try {
        // Check if database is connected
        if (mongoose.connection.readyState !== 1) {
            return res.status(500).json({ msg: 'Database connection error' });
        }

        const totalFighters = await Fighter.countDocuments({ role: 'fighter' });
        const profileCompleted = await Fighter.countDocuments({ role: 'fighter', profile_completed: true });
        const profilePending = totalFighters - profileCompleted;

        // Get fighters with assessments for top fighters calculation
        const assessedFighters = await Fighter.find({
            role: 'fighter',
            'assessment.specialGradeScore': { $exists: true, $ne: null }
        }).select('name fighterBatchNo assessment.specialGradeScore dateOfJoining')
          .sort({ 'assessment.specialGradeScore': -1 })
          .limit(5);

        // Recent joinings (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const recentJoinings = await Fighter.countDocuments({
            role: 'fighter',
            dateOfJoining: { $gte: thirtyDaysAgo }
        });

        // Gender distribution
        const maleCount = await Fighter.countDocuments({ role: 'fighter', gender: 'male' });
        const femaleCount = await Fighter.countDocuments({ role: 'fighter', gender: 'female' });

        // Age groups with error handling
        let ageGroups = [];
        try {
            ageGroups = await Fighter.aggregate([
                { $match: { role: 'fighter', age: { $exists: true, $type: 'number' } } },
                {
                    $group: {
                        _id: {
                            $switch: {
                                branches: [
                                    { case: { $lt: ['$age', 18] }, then: 'Under 18' },
                                    { case: { $and: [{ $gte: ['$age', 18] }, { $lt: ['$age', 25] }] }, then: '18-24' },
                                    { case: { $and: [{ $gte: ['$age', 25] }, { $lt: ['$age', 35] }] }, then: '25-34' },
                                    { case: { $gte: ['$age', 35] }, then: '35+' }
                                ],
                                default: 'Unknown'
                            }
                        },
                        count: { $sum: 1 }
                    }
                }
            ]);
        } catch (aggregateError) {
            console.log('Age groups aggregation failed, using fallback');
            ageGroups = [];
        }

        res.json({
            totalFighters,
            profileCompleted,
            profilePending,
            topFighters: assessedFighters,
            recentJoinings,
            genderDistribution: { male: maleCount, female: femaleCount },
            ageGroups
        });
    } catch (err) {
        console.error('Dashboard stats error:', err.message);
        // Return fallback data instead of crashing
        res.json({
            totalFighters: 0,
            profileCompleted: 0,
            profilePending: 0,
            topFighters: [],
            recentJoinings: 0,
            genderDistribution: { male: 0, female: 0 },
            ageGroups: []
        });
    }
});


// @desc    Get all fighters (for admin)
// @access  Private (Admin only)
router.get('/roster', auth, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ msg: 'Access denied' });
    }
    try {
        const fighters = await Fighter.find({ role: 'fighter' }).select('-password');
        res.json(fighters);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET api/fighters/rfids
// @desc    Get a list of all fighter RFIDs for autosuggest
// @access  Private (Admin only)
router.get('/rfids', auth, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ msg: 'Access denied' });
    }
    try {
        const fighters = await Fighter.find({ role: 'fighter' }).select('rfid');
        const rfids = fighters.map(fighter => fighter.rfid);
        res.json(rfids);
    } catch (err) {
        console.error('Error fetching RFIDs:', err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET api/fighters/:id
// @desc    Get a single fighter's profile by ID
// @access  Private (Admin only)
router.get('/:id', auth, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ msg: 'Access denied' });
    }
    try {
        const fighter = await Fighter.findById(req.params.id).select('-password');
        if (!fighter) {
            return res.status(404).json({ msg: 'Fighter not found' });
        }
        res.json(fighter);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST api/fighters/assess/:id
// @desc    Save an admin assessment for a fighter
// @access  Private (Admin only)
router.post('/assess/:id', auth, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ msg: 'Access denied' });
    }
    try {
        const fighter = await Fighter.findById(req.params.id);
        if (!fighter) {
            return res.status(404).json({ msg: 'Fighter not found' });
        }

        fighter.assessment = req.body;
        await fighter.save();
        res.json({ msg: 'Assessment saved successfully', fighter });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   PUT api/fighters/:id
// @desc    Update a fighter's profile
// @access  Private (Admin only)
router.put('/:id', auth, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ msg: 'Access denied' });
    }
    
    const { name, fighterBatchNo, email, profilePhoto, faceEncodings } = req.body;
    
    try {
        const fighter = await Fighter.findById(req.params.id);
        if (!fighter) {
            return res.status(404).json({ msg: 'Fighter not found' });
        }

        fighter.name = name;
        fighter.fighterBatchNo = fighterBatchNo;
        fighter.email = email;
        
        // Update profile photo if provided
        if (profilePhoto !== undefined) {
            fighter.profilePhoto = profilePhoto;
        }
        
        // Update face encodings if provided
        if (faceEncodings !== undefined) {
            fighter.faceEncodings = faceEncodings ? JSON.parse(faceEncodings) : [];
        }

        await fighter.save();
        res.json({ msg: 'Fighter updated successfully', fighter });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

router.delete('/:id', auth, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ msg: 'Access denied' });
    }
    try {
        const fighter = await Fighter.findById(req.params.id);
        if (!fighter) {
            return res.status(404).json({ msg: 'Fighter not found' });
        }

        await Fighter.deleteOne({ _id: req.params.id });
        res.json({ msg: 'Fighter deleted successfully' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET api/fighters/with-face-data
// @desc    Get all fighters with face recognition data (for admin face recognition)
// @access  Private (Admin only)
router.get('/with-face-data', auth, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ msg: 'Access denied' });
    }
    try {
        const fighters = await Fighter.find({ 
            role: 'fighter',
            faceEncodings: { $exists: true, $ne: [] }
        }).select('name fighterBatchNo faceEncodings');
        
        res.json(fighters);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// Utility to generate a unique batch number
const generateBatchNo = () => {
    return 'ASHURA-' + crypto.randomBytes(4).toString('hex').toUpperCase();
};

module.exports = router;