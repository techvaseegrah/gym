const express = require('express');
const bcrypt = require('bcryptjs');
const Admin = require('../models/Admin');
const Fighter = require('../models/Fighter');
const { sendOTPEmail } = require('../utils/emailService');
const crypto = require('crypto');

const router = express.Router();

// Store OTPs in memory (in production, use Redis or database)
const otpStore = new Map();

// Generate a 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// @route   POST api/forgot-password/request-otp
// @desc    Request OTP for password reset
// @access  Public
router.post('/request-otp', async (req, res) => {
  const { email, role } = req.body;

  try {
    // Validate input
    if (!email || !role) {
      return res.status(400).json({ msg: 'Email and role are required' });
    }

    // Check if user exists based on role
    let user;
    if (role === 'admin') {
      user = await Admin.findOne({ email });
    } else if (role === 'fighter') {
      user = await Fighter.findOne({ email });
    } else {
      return res.status(400).json({ msg: 'Invalid role specified' });
    }

    if (!user) {
      return res.status(404).json({ msg: 'User not found with this email' });
    }

    // Generate OTP
    const otp = generateOTP();
    
    // Store OTP with expiration (10 minutes)
    const otpExpiry = Date.now() + 10 * 60 * 1000;
    otpStore.set(email, { otp, expiry: otpExpiry, role });

    // Send OTP via email
    const emailResult = await sendOTPEmail(email, otp);
    
    if (emailResult.success) {
      res.json({ msg: 'OTP sent successfully to your email' });
    } else {
      res.status(500).json({ msg: 'Failed to send OTP email', error: emailResult.error });
    }
  } catch (err) {
    console.error('Forgot password request error:', err.message);
    res.status(500).send('Server error');
  }
});

// @route   POST api/forgot-password/verify-otp
// @desc    Verify OTP for password reset
// @access  Public
router.post('/verify-otp', (req, res) => {
  const { email, otp } = req.body;

  try {
    // Validate input
    if (!email || !otp) {
      return res.status(400).json({ msg: 'Email and OTP are required' });
    }

    // Check if OTP exists and is valid
    const storedOTP = otpStore.get(email);
    
    if (!storedOTP) {
      return res.status(400).json({ msg: 'OTP not requested or expired' });
    }

    // Check if OTP is expired
    if (Date.now() > storedOTP.expiry) {
      otpStore.delete(email); // Remove expired OTP
      return res.status(400).json({ msg: 'OTP has expired' });
    }

    // Verify OTP
    if (storedOTP.otp !== otp) {
      // Decrement attempts or add rate limiting here if needed
      return res.status(400).json({ msg: 'Invalid OTP. Please check the code and try again.' });
    }

    // OTP is valid, don't delete it yet as it will be used for password reset
    res.json({ msg: 'OTP verified successfully', role: storedOTP.role });
  } catch (err) {
    console.error('OTP verification error:', err.message);
    res.status(500).send('Server error');
  }
});

// @route   POST api/forgot-password/reset-password
// @desc    Reset password after OTP verification
// @access  Public
router.post('/reset-password', async (req, res) => {
  const { email, newPassword, confirmPassword } = req.body;

  try {
    // Validate input
    if (!email || !newPassword || !confirmPassword) {
      return res.status(400).json({ msg: 'All fields are required' });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ msg: 'Passwords do not match' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ msg: 'Password must be at least 6 characters' });
    }

    // Check if OTP was verified
    const storedOTP = otpStore.get(email);
    
    if (!storedOTP) {
      return res.status(400).json({ msg: 'OTP verification required' });
    }

    // Check if OTP is expired
    if (Date.now() > storedOTP.expiry) {
      otpStore.delete(email); // Remove expired OTP
      return res.status(400).json({ msg: 'OTP has expired, please request a new one' });
    }

    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update password based on role
    let user;
    if (storedOTP.role === 'admin') {
      user = await Admin.findOneAndUpdate(
        { email },
        { password: hashedPassword },
        { new: true }
      );
    } else if (storedOTP.role === 'fighter') {
      user = await Fighter.findOneAndUpdate(
        { email },
        { password: hashedPassword },
        { new: true }
      );
    }

    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    // Remove OTP from store after successful password reset
    otpStore.delete(email);

    res.json({ msg: 'Password reset successfully' });
  } catch (err) {
    console.error('Password reset error:', err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;