const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Fighter = require('../models/Fighter');
const Admin = require('../models/Admin');
const auth = require('../middleware/authMiddleware');
const router = express.Router();

router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    
    // Basic validation
    if (!email || !password) {
        return res.status(400).json({ msg: 'Please enter all fields' });
    }

    try {
        // --- CORRECTED LOGIC ---
        // 1. Check for an Admin first
        let user = await Admin.findOne({ email });

        if (user) {
            // Admin found, check password
            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                return res.status(400).json({ msg: 'Invalid credentials' });
            }
        } else {
            // 2. If no Admin, check for a Fighter
            user = await Fighter.findOne({ email });

            if (!user) {
                return res.status(400).json({ msg: 'Invalid credentials' });
            }

            // Fighter found, check password
            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                return res.status(400).json({ msg: 'Invalid credentials' });
            }
        }
        
        // 3. If password is correct, create and send token
        const payload = {
            user: {
                id: user.id,
                role: user.role,
                profile_completed: user.profile_completed
            }
        };

        jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: 3600 },
            (err, token) => {
                if (err) throw err;
                res.json({ token, user: payload.user });
            }
        );

    } catch (err) {
        console.error('Login error:', err.message);
        res.status(500).send('Server error');
    }
});

// @route   GET api/auth/user
// @desc    Get user data by token
// @access  Private
router.get('/user', auth, async (req, res) => {
    try {
        let user;
        if (req.user.role === 'admin') {
            user = await Admin.findById(req.user.id).select('-password');
        } else {
            user = await Fighter.findById(req.user.id).select('-password');
        }
        res.json(user);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET api/auth/admin-id
// @desc    Get the ID of an admin user
// @access  Private
router.get('/admin-id', auth, async (req, res) => {
    try {
        console.log(`[AUTH] /admin-id called by user: ${req.user.id} (${req.user.role})`);
        
        let adminId;
        
        if (req.user.role === 'admin') {
            // If current user is admin, return their ID
            adminId = req.user.id;
            console.log(`[AUTH] Returning current admin ID: ${adminId}`);
        } else {
            // FIXED: For fighter, return the specific admin that should be used for chat
            // This ensures consistent chat routing
            
            // TEMPORARY OVERRIDE: Force return the logged-in admin's ID
            const targetAdminId = '68bc3872c7f20dc76f9da534';
            console.log(`[AUTH] FORCING admin ID for fighter: ${targetAdminId}`);
            
            // Verify this admin exists
            const targetAdmin = await Admin.findById(targetAdminId);
            if (targetAdmin) {
                adminId = targetAdminId;
                console.log(`[AUTH] Successfully returning target admin: ${adminId}`);
            } else {
                // Fallback to any admin
                const admin = await Admin.findOne({ role: 'admin' }).select('_id');
                if (!admin) {
                    return res.status(404).json({ msg: 'No admin accounts found.' });
                }
                adminId = admin._id;
                console.log(`[AUTH] Target admin not found, fallback to: ${adminId}`);
                }
        }
        
        res.json({ adminId: adminId });
    } catch (err) {
        console.error('Error fetching admin ID:', err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST api/auth/logout
// @desc    Logout user
// @access  Private
router.post('/logout', auth, (req, res) => {
    res.json({ msg: 'User logged out successfully' });
});

// @route   GET api/auth/list-admins
// @desc    List all admins for debugging
// @access  Private
router.get('/list-admins', auth, async (req, res) => {
    try {
        const admins = await Admin.find().select('_id email role');
        console.log('[AUTH] All admins in database:', admins);
        res.json({ 
            admins: admins,
            currentUserId: req.user.id,
            currentUserRole: req.user.role
        });
    } catch (err) {
        console.error('Error listing admins:', err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET api/auth/current-admin
// @desc    Get the currently active admin for fighter chat
// @access  Private
router.get('/current-admin', auth, async (req, res) => {
    try {
        console.log(`[AUTH] /current-admin called by user: ${req.user.id} (${req.user.role})`);
        
        // Find the admin with the specific ID that should be used for chat
        // This is a temporary fix - in production you'd want better logic
        const targetAdminId = '68bc3872c7f20dc76f9da534'; // The logged-in admin
        
        const admin = await Admin.findById(targetAdminId).select('_id email');
        if (!admin) {
            return res.status(404).json({ msg: 'Target admin not found.' });
        }
        
        console.log(`[AUTH] Returning target admin for chat: ${admin._id}`);
        res.json({ adminId: admin._id, adminEmail: admin.email });
    } catch (err) {
        console.error('Error fetching current admin:', err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET api/auth/debug-users
// @desc    Debug endpoint to check user relationships
// @access  Private
router.get('/debug-users', auth, async (req, res) => {
    try {
        const allAdmins = await Admin.find().select('_id email role');
        const allFighters = await Fighter.find().select('_id name email');
        
        res.json({
            currentUser: {
                id: req.user.id,
                role: req.user.role
            },
            allAdmins: allAdmins,
            allFighters: allFighters.slice(0, 5) // Limit to first 5 for readability
        });
    } catch (err) {
        console.error('Error in debug endpoint:', err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET api/auth/admin
// @desc    Get the admin user's details
// @access  Private
router.get('/admin', auth, async (req, res) => {
    try {
        // Find the first admin user
        const admin = await Admin.findOne().select('-password');
        if (!admin) {
            return res.status(404).json({ msg: 'Admin user not found' });
        }
        res.json(admin);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});


module.exports = router;