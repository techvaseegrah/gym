import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaTimes } from 'react-icons/fa';

const StatusPopup = ({ isOpen, message, type = 'success', onClose }) => {
    // Auto-close after 3 seconds
    useEffect(() => {
        if (isOpen) {
            const timer = setTimeout(() => {
                onClose();
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const isSuccess = type === 'success';

    return (
        <AnimatePresence>
            <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 backdrop-blur-sm p-4">
                <motion.div 
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.5, opacity: 0 }}
                    className="bg-white rounded-2xl p-6 md:p-8 flex flex-col items-center max-w-sm w-full shadow-2xl relative"
                >
                    {/* Close Button (Optional manual close) */}
                    <button 
                        onClick={onClose}
                        className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                    >
                        <FaTimes />
                    </button>

                    {/* Animation Container */}
                    <div className="w-24 h-24 mb-4 relative flex items-center justify-center">
                        {isSuccess ? (
                            // --- Success Checkmark Animation ---
                            <svg className="w-full h-full" viewBox="0 0 52 52">
                                <motion.circle 
                                    cx="26" cy="26" r="25" fill="none" 
                                    stroke="#25b43b" strokeWidth="2"
                                    initial={{ pathLength: 0 }}
                                    animate={{ pathLength: 1 }}
                                    transition={{ duration: 0.5 }}
                                />
                                <motion.path 
                                    fill="none" 
                                    stroke="#25b43b" strokeWidth="3"
                                    d="M14.1 27.2l7.1 7.2 16.7-16.8"
                                    initial={{ pathLength: 0 }}
                                    animate={{ pathLength: 1 }}
                                    transition={{ delay: 0.5, duration: 0.3 }}
                                    strokeLinecap="round" 
                                    strokeLinejoin="round"
                                />
                            </svg>
                        ) : (
                            // --- Error Cross Animation ---
                            <svg className="w-full h-full" viewBox="0 0 52 52">
                                <motion.circle 
                                    cx="26" cy="26" r="25" fill="none" 
                                    stroke="#EF4444" strokeWidth="2"
                                    initial={{ pathLength: 0 }}
                                    animate={{ pathLength: 1 }}
                                    transition={{ duration: 0.5 }}
                                />
                                <motion.path 
                                    fill="none" 
                                    stroke="#EF4444" strokeWidth="3"
                                    d="M16 16 L36 36 M36 16 L16 36"
                                    initial={{ pathLength: 0 }}
                                    animate={{ pathLength: 1 }}
                                    transition={{ delay: 0.5, duration: 0.3 }}
                                    strokeLinecap="round" 
                                    strokeLinejoin="round"
                                />
                            </svg>
                        )}
                    </div>

                    <h3 className={`text-xl font-bold text-center mb-2 ${isSuccess ? 'text-green-600' : 'text-red-600'}`}>
                        {isSuccess ? 'Success!' : 'Error'}
                    </h3>
                    <p className="text-gray-600 text-center">{message}</p>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default StatusPopup;
