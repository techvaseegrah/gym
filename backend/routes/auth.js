const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer'); // This requires 'npm install nodemailer'
const Fighter = require('../models/Fighter');
const Admin = require('../models/Admin');
const auth = require('../middleware/authMiddleware');
const router = express.Router();

// --- Email Configuration ---
if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn('Warning: EMAIL_USER or EMAIL_PASS not set in environment variables. Forgot password feature will not work.');
}

// Configure transporter with better error handling
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    },
    tls: {
        rejectUnauthorized: false
    }
});

// Verify transporter configuration on startup
transporter.verify((error, success) => {
    if (error) {
        console.warn('Email transporter configuration warning:', error.message);
        console.warn('Forgot password feature may not work properly.');
        console.warn('Please ensure EMAIL_USER and EMAIL_PASS are correctly set in .env file.');
        console.warn('For Gmail, use App Passwords: https://myaccount.google.com/apppasswords');
    } else {
        console.log('Email transporter is ready to send messages');
    }
});

// @route   POST api/auth/login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    
    if (!email || !password) {
        return res.status(400).json({ msg: 'Please enter all fields' });
    }

    try {
        let user = await Admin.findOne({ email });

        if (user) {
            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                return res.status(400).json({ msg: 'Invalid credentials' });
            }
        } else {
            user = await Fighter.findOne({ email });

            if (!user) {
                return res.status(400).json({ msg: 'Invalid credentials' });
            }

            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                return res.status(400).json({ msg: 'Invalid credentials' });
            }
        }
        
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

// @route   POST api/auth/forgot-password
// @desc    Send password reset email
router.post('/forgot-password', async (req, res) => {
    console.log('Forgot password request received:', req.body);
    
    // Check if email configuration is available
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.error('Email service not configured: Missing EMAIL_USER or EMAIL_PASS');
        return res.status(500).json({ 
            msg: 'Email service not configured. Please contact administrator.' 
        });
    }

    const { email } = req.body;

    try {
        console.log('Looking up user with email:', email);
        
        // 1. Find user in Admin or Fighter collection
        let user = await Admin.findOne({ email });
        let modelType = 'Admin';
        
        if (!user) {
            user = await Fighter.findOne({ email });
            modelType = 'Fighter';
        }
        
        console.log('User lookup result:', user ? `${modelType} user found` : 'User not found');

        // If user not found, we still return success to prevent email enumeration (security best practice)
        // OR return 404 if you prefer explicit errors.
        if (!user) {
            return res.status(404).json({ msg: 'Email not registered' });
        }

        // 2. Generate Reset Code (6 digits)
        const resetCode = Math.floor(100000 + Math.random() * 900000).toString();

        // 3. Save code and expiration to DB
        user.resetPasswordToken = crypto
            .createHash('sha256')
            .update(resetCode)
            .digest('hex');

        // Code expires in 10 minutes
        user.resetPasswordExpire = Date.now() + 10 * 60 * 1000; 

        await user.save();

        // 4. Create Reset Message
        const message = `
            <h1>Password Reset Code</h1>
            <p>You requested a password reset for Ashura's Tribe.</p>
            <p>Your password reset code is: <strong>${resetCode}</strong></p>
            <p>Enter this code on the password reset page to set a new password.</p>
            <p>To reset your password, visit: <a href="http://localhost:3001/reset-password">Reset Password Page</a></p>
            <p>This code expires in 10 minutes.</p>
        `;

        // 5. Send Email
        try {
            console.log('Attempting to send email to:', user.email);
            console.log('Using email user:', process.env.EMAIL_USER);
            
            await transporter.sendMail({
                from: process.env.EMAIL_USER,
                to: user.email,
                subject: 'Ashura\'s Tribe Password Reset',
                html: message
            });
            
            console.log('Email sent successfully to:', user.email);

            res.json({ msg: 'Reset code sent to your email' });
        } catch (emailError) {
            console.error("Email send failed:", emailError.message);
            console.error("Error code:", emailError.code);
            console.error("Error response:", emailError.response);
            user.resetPasswordToken = undefined;
            user.resetPasswordExpire = undefined;
            await user.save();
            return res.status(500).json({ msg: 'Email could not be sent. Check server logs for details.' });
        }

    } catch (err) {
        console.error(err);
        res.status(500).json({ msg: 'Server Error' });
    }
});

// @route   POST api/auth/verify-reset-code
// @desc    Verify reset code
router.post('/verify-reset-code', async (req, res) => {
    const { email, code } = req.body;

    try {
        // Hash the code to compare with DB
        const resetPasswordToken = crypto
            .createHash('sha256')
            .update(code)
            .digest('hex');

        // Find user with matching code AND valid expiration
        let user = await Admin.findOne({
            email,
            resetPasswordToken,
            resetPasswordExpire: { $gt: Date.now() }
        });

        if (!user) {
            user = await Fighter.findOne({
                email,
                resetPasswordToken,
                resetPasswordExpire: { $gt: Date.now() }
            });
        }

        if (!user) {
            return res.status(400).json({ msg: 'Invalid or expired code' });
        }

        res.json({ msg: 'Code verified successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// @route   PUT api/auth/reset-password
// @desc    Reset password with code
router.put('/reset-password', async (req, res) => {
    const { email, code, password } = req.body;

    try {
        // Hash the code to compare with DB
        const resetPasswordToken = crypto
            .createHash('sha256')
            .update(code)
            .digest('hex');

        // Find user with matching code AND valid expiration
        let user = await Admin.findOne({
            email,
            resetPasswordToken,
            resetPasswordExpire: { $gt: Date.now() }
        });

        if (!user) {
            user = await Fighter.findOne({
                email,
                resetPasswordToken,
                resetPasswordExpire: { $gt: Date.now() }
            });
        }

        if (!user) {
            return res.status(400).json({ msg: 'Invalid or expired code' });
        }

        // Set new password
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);
        
        // Clear reset fields
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;

        await user.save();

        res.json({ msg: 'Password updated successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// @route   GET api/auth/user
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
router.get('/admin-id', auth, async (req, res) => {
    try {
        let adminId;
        if (req.user.role === 'admin') {
            adminId = req.user.id;
        } else {
            const targetAdminId = '68bc3872c7f20dc76f9da534';
            const targetAdmin = await Admin.findById(targetAdminId);
            if (targetAdmin) {
                adminId = targetAdminId;
            } else {
                const admin = await Admin.findOne({ role: 'admin' }).select('_id');
                if (!admin) {
                    return res.status(404).json({ msg: 'No admin accounts found.' });
                }
                adminId = admin._id;
            }
        }
        res.json({ adminId: adminId });
    } catch (err) {
        console.error('Error fetching admin ID:', err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST api/auth/logout
router.post('/logout', auth, (req, res) => {
    res.json({ msg: 'User logged out successfully' });
});

// @route   GET api/auth/list-admins
router.get('/list-admins', auth, async (req, res) => {
    try {
        const admins = await Admin.find().select('_id email role');
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
router.get('/current-admin', auth, async (req, res) => {
    try {
        const targetAdminId = '68bc3872c7f20dc76f9da534';
        const admin = await Admin.findById(targetAdminId).select('_id email');
        if (!admin) {
            return res.status(404).json({ msg: 'Target admin not found.' });
        }
        res.json({ adminId: admin._id, adminEmail: admin.email });
    } catch (err) {
        console.error('Error fetching current admin:', err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET api/auth/debug-users
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
            allFighters: allFighters.slice(0, 5)
        });
    } catch (err) {
        console.error('Error in debug endpoint:', err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET api/auth/admin
router.get('/admin', auth, async (req, res) => {
    try {
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
