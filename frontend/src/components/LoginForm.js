import React, { useState, useEffect } from 'react';
import { FaTimes } from 'react-icons/fa';

const LoginForm = ({ fighter, onLogin, onClose, loading, error, setError }) => {
    const [password, setPassword] = useState('');

    useEffect(() => {
        // Automatically focus the password input when the modal opens
        document.getElementById('fighter-password-modal')?.focus();
        // Clear any previous error when the modal opens
        setError(null);
    }, [setError]);

    const handleSubmit = (e) => {
        e.preventDefault();
        onLogin(password);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 text-white rounded-xl shadow-2xl p-8 w-full max-w-sm relative animate-fade-in-up">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
                    aria-label="Close"
                >
                    <FaTimes size={20} />
                </button>

                <div className="text-center mb-6">
                    <img
                        src="/logo.png" // Assuming logo is in public folder
                        alt="Profile"
                        className="w-24 h-24 mx-auto mb-4 rounded-full object-cover border-2 border-gray-600"
                    />
                    <h2 className="text-xl font-semibold">Password for</h2>
                    <p className="text-2xl font-bold text-blue-400">{fighter.name}</p>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label htmlFor="fighter-password-modal" className="sr-only">Password</label>
                        <input
                            id="fighter-password-modal"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter your password"
                            className="w-full bg-gray-900 text-white px-4 py-3 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-center"
                            required
                        />
                    </div>

                    {error && (
                        <p className="text-red-500 text-sm text-center mb-4">{error}</p>
                    )}

                    <button
                        type="submit"
                        className="w-full bg-blue-600 font-semibold py-3 rounded-lg hover:bg-blue-700 transition duration-300 disabled:bg-gray-600"
                        disabled={loading}
                    >
                        {loading ? 'Signing in...' : 'Sign in'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default LoginForm;