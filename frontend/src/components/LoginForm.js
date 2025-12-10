import React, { useState } from 'react';
import { FaEye, FaEyeSlash, FaTimes } from 'react-icons/fa';

const LoginForm = ({ fighter, onLogin, onClose, loading, error, setError, onForgotPassword }) => {
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const handleSubmit = (e) => {
        e.preventDefault();
        onLogin(password);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg max-w-md w-full p-6 relative border border-gray-700 shadow-xl animate-fade-in">
                {/* Close Button */}
                <button 
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
                >
                    <FaTimes size={20} />
                </button>

                {/* Header */}
                <div className="text-center mb-6">
                    <img 
                        src={fighter.profilePhoto || "/logo.png"} 
                        alt={fighter.name}
                        className="w-20 h-20 rounded-full mx-auto mb-3 object-cover border-2 border-red-600"
                    />
                    <h2 className="text-2xl font-bold text-white">{fighter.name}</h2>
                    <p className="text-gray-400 text-sm">RFID: {fighter.rfid}</p>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="bg-red-500/10 border border-red-500/50 text-red-200 p-3 rounded mb-4 text-sm text-center">
                        {error}
                    </div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="relative">
                        <label className="block text-sm font-medium text-gray-400 mb-1">
                            Enter Password
                        </label>
                        <div className="relative">
                            <input
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => {
                                    setPassword(e.target.value);
                                    if(error) setError(null);
                                }}
                                className="w-full bg-gray-700 text-white px-4 py-3 pr-12 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 border border-gray-600"
                                placeholder="••••••••"
                                autoFocus
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-white"
                            >
                                {showPassword ? <FaEyeSlash size={20} /> : <FaEye size={20} />}
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                        {/* Forgot Password Link inside Modal */}
                        <button
                            type="button"
                            onClick={onForgotPassword}
                            className="text-sm text-red-400 hover:text-red-300 hover:underline transition-colors"
                        >
                            Forgot Password?
                        </button>

                        <button
                            type="submit"
                            disabled={loading}
                            className={`px-6 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition duration-300 ${
                                loading ? 'opacity-50 cursor-not-allowed' : ''
                            }`}
                        >
                            {loading ? 'Verifying...' : 'Login'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default LoginForm;
