const nodemailer = require('nodemailer');

// Create a transporter object using SMTP transport
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'your_email@gmail.com',
    pass: process.env.EMAIL_PASS || 'your_app_password'
  }
});

// Verify transporter configuration
transporter.verify((error, success) => {
  if (error) {
    console.log('Email transporter configuration error:', error);
  } else {
    console.log('Email transporter is ready to send emails');
  }
});

// Function to send OTP email
const sendOTPEmail = async (to, otp) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER || 'your_email@gmail.com',
      to: to,
      subject: 'Password Reset OTP',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Password Reset Request</h2>
          <p>You have requested to reset your password. Please use the following OTP to proceed:</p>
          <div style="background-color: #f5f5f5; padding: 20px; text-align: center; border-radius: 5px; margin: 20px 0;">
            <h3 style="margin: 0; color: #e53e3e; font-size: 32px; letter-spacing: 5px;">${otp}</h3>
          </div>
          <p>This OTP will expire in 10 minutes.</p>
          <p>If you did not request this, please ignore this email.</p>
          <hr style="margin: 30px 0;">
          <p style="font-size: 12px; color: #666;">This is an automated message, please do not reply to this email.</p>
        </div>
      `
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('OTP email sent successfully');
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('Error sending OTP email:', error);
    return { success: false, error: error.message };
  }
};

module.exports = { sendOTPEmail };