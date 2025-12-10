import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../api/api';
import StatusPopup from '../components/StatusPopup'; // Updated Import

const ResetPasswordPage = () => {
    const location = useLocation();
    const navigate = useNavigate();

    const [step, setStep] = useState(location.state?.step || 'request');
    const [email, setEmail] = useState(location.state?.email || '');
    
    const [code, setCode] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);

    // --- Status Popup State ---
    const [statusPopup, setStatusPopup] = useState({ isOpen: false, type: 'success', message: '' });

    const showStatus = (type, message) => {
        setStatusPopup({ isOpen: true, type, message });
    };

    const handleRequestCode = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.post('/auth/forgot-password', { email });
            showStatus('success', 'Reset code sent successfully!');
            // We'll advance the step in handleStatusClose to let the user see the success popup
        } catch (err) {
            showStatus('error', err.response?.data?.msg || 'Error requesting reset code');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyCode = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.post('/auth/verify-reset-code', { email, code });
            showStatus('success', 'Code verified!');
            // Step advance handled in close
        } catch (err) {
            showStatus('error', err.response?.data?.msg || 'Invalid or expired code');
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            showStatus('error', "Passwords do not match");
            return;
        }
        if (password.length < 6) {
            showStatus('error', "Password must be at least 6 characters");
            return;
        }

        setLoading(true);
        
        try {
            await api.put('/auth/reset-password', { email, code, password });
            showStatus('success', 'Password Reset Successfully! Please login.');
        } catch (err) {
            showStatus('error', err.response?.data?.msg || 'Error resetting password');
        } finally {
            setLoading(false);
        }
    };

    const handleStatusClose = () => {
        const { type, message } = statusPopup;
        setStatusPopup({ ...statusPopup, isOpen: false });

        // Logic to navigate or switch steps based on successful actions
        if (type === 'success') {
            if (message.includes('Reset code sent')) {
                setStep('verify');
            } else if (message.includes('Code verified')) {
                setStep('reset');
            } else if (message.includes('Password Reset Successfully')) {
                navigate('/'); // Go to login
            }
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
            
            {/* Generic Status Popup */}
            <StatusPopup 
                isOpen={statusPopup.isOpen} 
                type={statusPopup.type}
                message={statusPopup.message} 
                onClose={handleStatusClose} 
            />

            <div className="bg-gray-800 p-8 rounded-lg w-96 shadow-lg border border-gray-700">
                <h2 className="text-2xl mb-6 font-bold text-center">Reset Password</h2>
                
                {step === 'request' && (
                    <form onSubmit={handleRequestCode}>
                        <p className="mb-4 text-gray-400">Enter your email to receive a reset code</p>
                        <input
                            type="email"
                            placeholder="Email Address"
                            className="w-full mb-4 p-3 rounded bg-gray-700 text-white border border-gray-600 focus:outline-none focus:border-red-500"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                        <button 
                            type="submit" 
                            className="w-full bg-red-600 py-3 rounded font-bold disabled:bg-gray-600 hover:bg-red-700 transition-colors"
                            disabled={loading}
                        >
                            {loading ? 'Sending Code...' : 'Send Reset Code'}
                        </button>
                    </form>
                )}
                
                {step === 'verify' && (
                    <form onSubmit={handleVerifyCode}>
                        <p className="mb-4 text-gray-400">Enter the 6-digit code sent to <br/><strong className="text-white">{email}</strong></p>
                        <input
                            type="text"
                            placeholder="000000"
                            className="w-full mb-4 p-3 rounded bg-gray-700 text-white text-center text-2xl tracking-[0.5em] font-mono border border-gray-600 focus:outline-none focus:border-red-500"
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            maxLength="6"
                            required
                        />
                        <button 
                            type="submit" 
                            className="w-full bg-red-600 py-3 rounded font-bold disabled:bg-gray-600 hover:bg-red-700 transition-colors"
                            disabled={loading}
                        >
                            {loading ? 'Verifying...' : 'Verify Code'}
                        </button>
                        <button 
                            type="button" 
                            className="w-full mt-3 text-sm text-gray-400 hover:text-white"
                            onClick={() => setStep('request')}
                        >
                            Wrong email? Go back
                        </button>
                    </form>
                )}
                
                {step === 'reset' && (
                    <form onSubmit={handleResetPassword}>
                        <p className="mb-4 text-gray-400">Enter your new password</p>
                        <input
                            type="password"
                            placeholder="New Password"
                            className="w-full mb-4 p-3 rounded bg-gray-700 text-white border border-gray-600 focus:outline-none focus:border-red-500"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                        <input
                            type="password"
                            placeholder="Confirm Password"
                            className="w-full mb-6 p-3 rounded bg-gray-700 text-white border border-gray-600 focus:outline-none focus:border-red-500"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                        />
                        <button 
                            type="submit" 
                            className="w-full bg-red-600 py-3 rounded font-bold disabled:bg-gray-600 hover:bg-red-700 transition-colors"
                            disabled={loading}
                        >
                            {loading ? 'Resetting...' : 'Reset Password'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
};

export default ResetPasswordPage;
