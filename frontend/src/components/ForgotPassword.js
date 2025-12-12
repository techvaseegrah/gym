import React, { useState, useEffect } from 'react';
import { FaArrowLeft, FaPaperPlane, FaKey, FaLock } from 'react-icons/fa';
import api from '../api/api';

const ForgotPassword = ({ onBack, role, email: initialEmail }) => {
  const [step, setStep] = useState('request'); // request, verify, reset
  const [email, setEmail] = useState(initialEmail || '');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // If initialEmail is provided, set it and move to verify step
  useEffect(() => {
    if (initialEmail) {
      setEmail(initialEmail);
    }
  }, [initialEmail]);

  const handleRequestOTP = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    
    try {
      const res = await api.post('/forgot-password/request-otp', { email, role });
      setMessage(res.data.msg);
      setStep('verify');
    } catch (err) {
      setError(err.response?.data?.msg || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    
    // Validate that we have an email
    if (!email) {
      setError('Email is required');
      setLoading(false);
      return;
    }
    
    // Validate that we have an OTP
    if (!otp) {
      setError('OTP is required');
      setLoading(false);
      return;
    }
    
    console.log('Sending OTP verification request with:', { email, otp });
    
    try {
      const res = await api.post('/forgot-password/verify-otp', { email, otp });
      setMessage(res.data.msg);
      setStep('reset');
    } catch (err) {
      // Provide more specific error messages
      if (err.response?.data?.msg) {
        setError(err.response.data.msg);
      } else if (err.response?.status === 400) {
        setError('Invalid OTP. Please check the code and try again.');
      } else {
        setError('Failed to verify OTP. Please try again.');
      }
      
      console.log('OTP verification error:', err.response || err);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }
    
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }
    
    // Debugging: Log the password reset request
    console.log('Sending password reset request with:', { email, newPassword, confirmPassword });
    
    try {
      const res = await api.post('/forgot-password/reset-password', {
        email,
        newPassword,
        confirmPassword
      });
      setMessage(res.data.msg);
      // Reset form and show success message
      setTimeout(() => {
        onBack(); // Go back to login
      }, 2000);
    } catch (err) {
      if (err.response?.data?.msg) {
        setError(err.response.data.msg);
      } else {
        setError('Failed to reset password. Please try again.');
      }
      
      // Debugging: Log the error response
      console.log('Password reset error:', err.response || err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="bg-gradient-to-r from-red-600 to-red-800 p-6">
          <h2 className="text-2xl font-bold text-white text-center">
            {step === 'request' && 'Forgot Password'}
            {step === 'verify' && 'Verify OTP'}
            {step === 'reset' && 'Reset Password'}
          </h2>
        </div>
        
        <div className="p-6">
          {error && (
            <div className="bg-red-500/20 border-2 border-red-500/50 text-red-300 p-4 mb-4 rounded-lg text-center font-medium animate-pulse">
              <div className="flex items-center justify-center">
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"></path>
                </svg>
                {error}
              </div>
            </div>
          )}
          
          {message && (
            <div className="bg-green-500/20 border-2 border-green-500/50 text-green-300 p-4 mb-4 rounded-lg text-center font-medium">
              <div className="flex items-center justify-center">
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path>
                </svg>
                {message}
              </div>
            </div>
          )}
          
          {step === 'request' && (
            <form onSubmit={handleRequestOTP}>
              <div className="mb-4">
                <label className="block text-gray-300 text-sm font-medium mb-2" htmlFor="email">
                  Registered Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FaPaperPlane className="text-gray-400" />
                  </div>
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-gray-700 text-white px-4 py-3 pl-10 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="Enter your email"
                    required
                    readOnly={!!initialEmail} // If email is pre-filled, make it read-only
                  />
                </div>
              </div>
              
              <button
                type="submit"
                className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-4 rounded-lg transition duration-300 flex items-center justify-center"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Sending OTP...
                  </>
                ) : (
                  <>
                    <FaPaperPlane className="mr-2" />
                    Send OTP
                  </>
                )}
              </button>
            </form>
          )}
          
          {step === 'verify' && (
            <form onSubmit={handleVerifyOTP}>
              <div className="mb-4">
                <label className="block text-gray-300 text-sm font-medium mb-2" htmlFor="otp">
                  Enter OTP
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FaKey className="text-gray-400" />
                  </div>
                  <input
                    type="text"
                    id="otp"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    className="w-full bg-gray-700 text-white px-4 py-3 pl-10 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="Enter 6-digit OTP"
                    maxLength="6"
                    required
                  />
                </div>
                <p className="text-gray-400 text-xs mt-2">
                  Please check your email for the OTP. It will expire in 10 minutes.
                </p>
              </div>
              
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => setStep('request')}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-semibold py-3 px-4 rounded-lg transition duration-300 flex items-center justify-center"
                >
                  <FaArrowLeft className="mr-2" />
                  Back
                </button>
                
                <button
                  type="submit"
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-4 rounded-lg transition duration-300 flex items-center justify-center"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Verifying...
                    </>
                  ) : (
                    <>
                      <FaKey className="mr-2" />
                      Verify
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
          
          {step === 'reset' && (
            <form onSubmit={handleResetPassword}>
              <div className="mb-4">
                <label className="block text-gray-300 text-sm font-medium mb-2" htmlFor="newPassword">
                  New Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FaLock className="text-gray-400" />
                  </div>
                  <input
                    type="password"
                    id="newPassword"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-gray-700 text-white px-4 py-3 pl-10 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="Enter new password"
                    minLength="6"
                    required
                  />
                </div>
              </div>
              
              <div className="mb-6">
                <label className="block text-gray-300 text-sm font-medium mb-2" htmlFor="confirmPassword">
                  Confirm Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FaLock className="text-gray-400" />
                  </div>
                  <input
                    type="password"
                    id="confirmPassword"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-gray-700 text-white px-4 py-3 pl-10 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="Confirm new password"
                    minLength="6"
                    required
                  />
                </div>
              </div>
              
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => setStep('verify')}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-semibold py-3 px-4 rounded-lg transition duration-300 flex items-center justify-center"
                >
                  <FaArrowLeft className="mr-2" />
                  Back
                </button>
                
                <button
                  type="submit"
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-4 rounded-lg transition duration-300 flex items-center justify-center"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Resetting...
                    </>
                  ) : (
                    <>
                      <FaLock className="mr-2" />
                      Reset Password
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
          
          <div className="mt-6 text-center">
            <button
              onClick={onBack}
              className="text-gray-400 hover:text-white flex items-center justify-center mx-auto"
            >
              <FaArrowLeft className="mr-2" />
              Back to Login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;