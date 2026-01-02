import React, { useState, useEffect } from 'react';
import api from '../api/api';

const FighterSubscriptionPage = () => {
    const [subscriptions, setSubscriptions] = useState([]);
    const [currentSubscription, setCurrentSubscription] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedPlan, setSelectedPlan] = useState('fixed_commitment');
    const [initialPaymentAmount, setInitialPaymentAmount] = useState('');
    const [processing, setProcessing] = useState(false);
    const [showInstallmentForm, setShowInstallmentForm] = useState(false);
    const [installmentAmount, setInstallmentAmount] = useState('');
    // Add state for popup notification
    const [popup, setPopup] = useState({ show: false, message: '', type: '' });

    const planDetails = {
        free: {
            name: 'Free Plan',
            price: 0,
            description: 'Indefinite access to gym facilities'
        },
        fixed_commitment: {
            name: 'Quarterly Membership',
            totalFee: 4000,
            description: 'Fixed 3-month package with flexible installments'
        },
        custom: {
            name: 'Custom Plan',
            description: 'Custom fee and duration plan'
        }
    };

    // Function to show popup notification
    const showPopup = (message, type = 'info') => {
        setPopup({ show: true, message, type });
        // Auto hide popup after 5 seconds
        setTimeout(() => {
            setPopup({ show: false, message: '', type: '' });
        }, 5000);
    };

    const fetchSubscriptions = async () => {
        try {
            const res = await api.get('/subscriptions/my-subscriptions');
            setSubscriptions(res.data);
        } catch (err) {
            console.error('Error fetching subscriptions:', err);
            setError('Failed to load subscription history');
        }
    };

    const fetchCurrentSubscription = async () => {
        try {
            const res = await api.get('/subscriptions/current');
            setCurrentSubscription(res.data);
        } catch (err) {
            console.error('Error fetching current subscription:', err);
            //setError('Failed to load current subscription');
        }
    };

    useEffect(() => {
        const fetchData = async () => {
            await Promise.all([
                fetchSubscriptions(),
                fetchCurrentSubscription()
            ]);
            setLoading(false);
        };

        fetchData();
    }, []);

    // Reset installment form when current subscription changes
    useEffect(() => {
        if (!currentSubscription) {
            setShowInstallmentForm(false);
            setInstallmentAmount('');
        }
    }, [currentSubscription]);

    const handleSubscribe = async () => {
        try {
            setProcessing(true);
            setError('');
            
            // Check if fighter has an existing unpaid subscription
            console.log('Checking for existing unpaid subscription:', currentSubscription);
            console.log('Current subscription plan type:', currentSubscription?.planType);
            console.log('Current subscription paid amount:', currentSubscription?.paidAmount);
            console.log('Current subscription total fee:', currentSubscription?.totalFee);
            
            // More comprehensive check for existing active subscriptions
            if (currentSubscription) {
                console.log('Found current subscription:', currentSubscription);
                
                // Check for fixed commitment or custom plans with unpaid balances
                if ((currentSubscription.planType === 'fixed_commitment' || currentSubscription.planType === 'custom') &&
                    currentSubscription.paidAmount < currentSubscription.totalFee) {
                    
                    console.log('Found unpaid subscription, showing alert');
                    showPopup('You have an existing subscription with an unpaid balance. Please pay the remaining balance before purchasing a new subscription.', 'error');
                    setProcessing(false);
                    return;
                }
                
                // Also check for any active paid subscriptions
                if (currentSubscription.status === 'paid' && currentSubscription.isActive) {
                    console.log('Found active paid subscription, showing alert');
                    showPopup('You already have an active subscription. Please wait until it expires before purchasing a new one.', 'error');
                    setProcessing(false);
                    return;
                }
            }
            
            // For fixed commitment plan, validate initial payment amount
            if (selectedPlan === 'fixed_commitment') {
                if (!initialPaymentAmount || initialPaymentAmount < 1) {
                    setError('Minimum initial payment amount is ₹1 for fixed commitment plan');
                    setProcessing(false);
                    return;
                }
                
                if (initialPaymentAmount > 4000) {
                    setError('Initial payment amount cannot exceed total fee of ₹4000');
                    setProcessing(false);
                    return;
                }
            }
            
            // Create order
            const orderPayload = {
                planType: selectedPlan
            };
            
            // Add initial payment amount for fixed commitment plan
            if (selectedPlan === 'fixed_commitment') {
                orderPayload.initialPaymentAmount = parseFloat(initialPaymentAmount);
            }
            
            const orderRes = await api.post('/subscriptions/create-order', orderPayload);
            
            const { orderId, amount, currency, subscriptionId } = orderRes.data;
            
            // Check if Razorpay is loaded
            if (!window.Razorpay) {
                throw new Error('Razorpay SDK not loaded. Please refresh the page and try again.');
            }
            
            // Initialize Razorpay
            const options = {
                key: process.env.REACT_APP_RAZORPAY_KEY_ID,
                amount: amount,
                currency: currency,
                name: 'Mutants Academy & Ashuras Tribe',
                description: `Subscription for ${planDetails[selectedPlan].name}`,
                order_id: orderId,
                handler: async function (response) {
                    try {
                        // Verify payment
                        await api.post('/subscriptions/verify-payment', {
                            razorpayOrderId: response.razorpay_order_id,
                            razorpayPaymentId: response.razorpay_payment_id,
                            razorpaySignature: response.razorpay_signature,
                            subscriptionId: subscriptionId
                        });
                        
                        // Refresh subscription data
                        fetchSubscriptions();
                        fetchCurrentSubscription();
                        
                        // Show success popup instead of alert
                        showPopup('Payment successful! Your subscription is now active.', 'success');
                        
                        // Reset initial payment amount
                        if (selectedPlan === 'fixed_commitment') {
                            setInitialPaymentAmount('');
                        }
                    } catch (err) {
                        console.error('Error verifying payment:', err);
                        showPopup('Payment verification failed. Please contact support.', 'error');
                    }
                },
                prefill: {
                    name: '',
                    email: '',
                    contact: ''
                },
                theme: {
                    color: '#3399cc'
                },
                modal: {
                    ondismiss: function() {
                        console.log('Payment dialog closed by user');
                        setProcessing(false);
                    }
                }
            };
            
            const rzp = new window.Razorpay(options);
            
            // Add error handler
            rzp.on('payment.error', function(response) {
                console.error('Razorpay Error:', response.error);
                setError(`Payment failed: ${response.error.description}`);
                showPopup(`Payment failed: ${response.error.description}`, 'error');
                setProcessing(false);
            });
            
            rzp.open();
        } catch (err) {
            console.error('Error creating order:', err);
            // More detailed error logging
            if (err.response) {
                // Server responded with error status
                console.error('Error response data:', err.response.data);
                console.error('Error response status:', err.response.status);
                console.error('Error response headers:', err.response.headers);
                setError('Failed to initiate payment. Server error: ' + (err.response.data?.msg || err.response.data?.error || err.response.statusText || 'Unknown server error'));
                showPopup('Failed to initiate payment. Server error: ' + (err.response.data?.msg || err.response.data?.error || err.response.statusText || 'Unknown server error'), 'error');
            } else if (err.request) {
                // Request was made but no response received
                console.error('Error request:', err.request);
                setError('Failed to initiate payment. Network error: No response from server.');
                showPopup('Failed to initiate payment. Network error: No response from server.', 'error');
            } else {
                // Something else happened
                console.error('Error message:', err.message);
                setError('Failed to initiate payment. Error: ' + (err.message || 'Unknown error'));
                showPopup('Failed to initiate payment. Error: ' + (err.message || 'Unknown error'), 'error');
            }
        } finally {
            setProcessing(false);
        }
    };

    const handleInstallmentPayment = async () => {
        try {
            setProcessing(true);
            setError('');
            
            // Check if installment limit has been reached
            if (currentSubscription.installmentCount >= currentSubscription.maxInstallments) {
                setError(`Maximum number of installments (${currentSubscription.maxInstallments}) reached for this subscription.`);
                setProcessing(false);
                return;
            }
            
            // Validate installment amount
            const amount = parseFloat(installmentAmount);
            if (!amount || amount <= 0) {
                setError('Please enter a valid installment amount');
                setProcessing(false);
                return;
            }
            
            if (amount > currentSubscription.remainingBalance) {
                setError(`Installment amount cannot exceed remaining balance of ₹${currentSubscription.remainingBalance}`);
                setProcessing(false);
                return;
            }
            
            // Create installment order
            const orderRes = await api.post('/subscriptions/make-installment', {
                subscriptionId: currentSubscription._id,
                installmentAmount: amount
            });
            
            const { orderId, amount: orderAmount, currency, subscriptionId } = orderRes.data;
            
            // Check if Razorpay is loaded
            if (!window.Razorpay) {
                throw new Error('Razorpay SDK not loaded. Please refresh the page and try again.');
            }
            
            // Initialize Razorpay
            const options = {
                key: process.env.REACT_APP_RAZORPAY_KEY_ID,
                amount: orderAmount,
                currency: currency,
                name: 'Mutants Academy & Ashuras Tribe',
                description: `Installment Payment for ${planDetails[currentSubscription.planType].name}`,
                order_id: orderId,
                handler: async function (response) {
                    try {
                        // Verify installment payment
                        await api.post('/subscriptions/verify-installment', {
                            razorpayOrderId: response.razorpay_order_id,
                            razorpayPaymentId: response.razorpay_payment_id,
                            razorpaySignature: response.razorpay_signature,
                            subscriptionId: subscriptionId
                        });
                        
                        // Close the installment form
                        setShowInstallmentForm(false);
                        setInstallmentAmount('');
                        
                        // Refresh subscription data
                        fetchSubscriptions();
                        fetchCurrentSubscription();
                        
                        // Show success popup
                        showPopup('Installment payment successful!', 'success');
                    } catch (err) {
                        console.error('Error verifying installment payment:', err);
                        showPopup('Installment payment verification failed. Please contact support.', 'error');
                    }
                },
                prefill: {
                    name: '',
                    email: '',
                    contact: ''
                },
                theme: {
                    color: '#3399cc'
                },
                modal: {
                    ondismiss: function() {
                        console.log('Installment payment dialog closed by user');
                        setProcessing(false);
                    }
                }
            };
            
            const rzp = new window.Razorpay(options);
            
            // Add error handler
            rzp.on('payment.error', function(response) {
                console.error('Razorpay Error:', response.error);
                setError(`Payment failed: ${response.error.description}`);
                showPopup(`Payment failed: ${response.error.description}`, 'error');
                setProcessing(false);
            });
            
            rzp.open();
        } catch (err) {
            console.error('Error creating installment order:', err);
            // More detailed error logging
            if (err.response) {
                // Server responded with error status
                console.error('Error response data:', err.response.data);
                console.error('Error response status:', err.response.status);
                console.error('Error response headers:', err.response.headers);
                setError('Failed to initiate installment payment. Server error: ' + (err.response.data?.msg || err.response.data?.error || err.response.statusText || 'Unknown server error'));
                showPopup('Failed to initiate installment payment. Server error: ' + (err.response.data?.msg || err.response.data?.error || err.response.statusText || 'Unknown server error'), 'error');
            } else if (err.request) {
                // Request was made but no response received
                console.error('Error request:', err.request);
                setError('Failed to initiate installment payment. Network error: No response from server.');
                showPopup('Failed to initiate installment payment. Network error: No response from server.', 'error');
            } else {
                // Something else happened
                console.error('Error message:', err.message);
                setError('Failed to initiate installment payment. Error: ' + (err.message || 'Unknown error'));
                showPopup('Failed to initiate installment payment. Error: ' + (err.message || 'Unknown error'), 'error');
            }
        } finally {
            setProcessing(false);
        }
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };
    
    // Function to format period display, showing "Indefinite" for free plans
    const formatPeriod = (startDate, endDate, planType) => {
        if (!startDate || !endDate) return 'N/A';
        
        // For free plans, check if end date is in the distant future (99+ years)
        if (planType === 'free') {
            const end = new Date(endDate);
            const now = new Date();
            const yearsDifference = end.getFullYear() - now.getFullYear();
            
            // If end date is 90+ years in the future, consider it indefinite
            if (yearsDifference >= 90) {
                return `${formatDate(startDate)} - Indefinite`;
            }
        }
        
        return `${formatDate(startDate)} - ${formatDate(endDate)}`;
    };
    
    const getStatusColor = (status) => {
        switch (status) {
            case 'paid': return 'bg-green-100 text-green-800';
            case 'created': return 'bg-yellow-100 text-yellow-800';
            case 'expired': return 'bg-red-100 text-red-800';
            case 'cancelled': return 'bg-gray-100 text-gray-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    // Check if we're in test mode (Razorpay test keys usually start with 'rzp_test_')
    const isTestMode = process.env.REACT_APP_RAZORPAY_KEY_ID && 
                      process.env.REACT_APP_RAZORPAY_KEY_ID.startsWith('rzp_test_');

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto p-4">
            {/* Popup Notification - Centered Modal */}
            {popup.show && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                    <div className={`rounded-lg shadow-xl p-6 max-w-md w-full mx-4 transform transition-all duration-300 scale-100 ${
                        popup.type === 'success' ? 'bg-green-500 text-white' : 
                        popup.type === 'error' ? 'bg-red-500 text-white' : 'bg-blue-500 text-white'
                    }`}>
                        <div className="flex flex-col items-center text-center">
                            <span className="text-4xl mb-3">
                                {popup.type === 'success' ? '✅' : 
                                 popup.type === 'error' ? '❌' : 'ℹ️'}
                            </span>
                            <p className="text-lg font-medium">{popup.message}</p>
                            <button 
                                onClick={() => setPopup({ show: false, message: '', type: '' })}
                                className="mt-4 px-4 py-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg font-medium transition-all"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            <h1 className="text-2xl font-bold mb-6 text-gray-800">My Subscription</h1>
            
            {/* Test Mode Indicator */}
            {isTestMode && (
                <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-6">
                    <div className="flex">
                        <div className="py-1">
                            <svg className="h-6 w-6 text-yellow-500 mr-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                        <div>
                            <p className="font-bold">Test Mode Active</p>
                            <p className="text-sm">You are currently using Razorpay in test mode. No real payments will be processed.</p>
                        </div>
                    </div>
                </div>
            )}
            
            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
                    {error}
                </div>
            )}
            
            {/* Current Subscription - Enhanced Styling */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl shadow-lg p-6 mb-8 border border-blue-100">
                <h2 className="text-2xl font-bold mb-4 text-gray-800 flex items-center">
                    <span className="bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center mr-3">💳</span>
                    Current Subscription
                </h2>
                {currentSubscription ? (
                    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-300">
                        <div className="flex justify-between items-start flex-wrap gap-4">
                            <div className="flex-1 min-w-[200px]">
                                <div className="flex items-center mb-2">
                                    <h3 className="font-bold text-xl text-gray-800">{planDetails[currentSubscription.planType]?.name || currentSubscription.planType}</h3>
                                    {currentSubscription.planType === 'fixed_commitment' && (
                                        <span className="ml-2 bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">Flexible</span>
                                    )}
                                </div>
                                
                                {(currentSubscription.planType === 'fixed_commitment' || currentSubscription.planType === 'custom') ? (
                                    <div className="space-y-2 mt-4">
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Total Fee:</span>
                                            <span className="font-semibold text-gray-800">₹{currentSubscription.totalFee}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Paid Amount:</span>
                                            <span className="font-semibold text-green-600">₹{currentSubscription.paidAmount}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Remaining Balance:</span>
                                            <span className="font-semibold text-orange-600">₹{currentSubscription.remainingBalance}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Installments:</span>
                                            <span className="font-semibold text-blue-600">{currentSubscription.installmentCount || 0} of {currentSubscription.maxInstallments || 4}</span>
                                        </div>
                                        <div className="flex justify-between pt-2 border-t border-gray-100">
                                            <span className="text-gray-600">Validity:</span>
                                            <span className="font-medium text-gray-800">{formatDate(currentSubscription.startDate)} to {formatDate(currentSubscription.endDate)}</span>
                                        </div>
                                        
                                        {/* Circular Progress Bar */}
                                        <div className="mt-4 flex flex-col items-center">
                                            <div className="relative w-32 h-32">
                                                <svg className="w-full h-full" viewBox="0 0 100 100">
                                                    {/* Background circle */}
                                                    <circle 
                                                        cx="50" 
                                                        cy="50" 
                                                        r="45" 
                                                        fill="none" 
                                                        stroke="#e5e7eb" 
                                                        strokeWidth="8" 
                                                    />
                                                    {/* Progress circle */}
                                                    <circle 
                                                        cx="50" 
                                                        cy="50" 
                                                        r="45" 
                                                        fill="none" 
                                                        stroke="#3b82f6" 
                                                        strokeWidth="8" 
                                                        strokeLinecap="round"
                                                        strokeDasharray="283" 
                                                        strokeDashoffset={283 - (283 * (currentSubscription.paidAmount / currentSubscription.totalFee))}
                                                        transform="rotate(-90 50 50)"
                                                    />
                                                </svg>
                                                <div className="absolute inset-0 flex items-center justify-center">
                                                    <span className="text-lg font-bold text-blue-600">{Math.round((currentSubscription.paidAmount / currentSubscription.totalFee) * 100)}%</span>
                                                </div>
                                            </div>
                                            <p className="text-sm text-gray-600 mt-2">Payment Progress</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-2 mt-4">
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Amount:</span>
                                            <span className="font-semibold text-gray-800">₹{currentSubscription.amount}</span>
                                        </div>
                                        <div className="flex justify-between pt-2 border-t border-gray-100">
                                            <span className="text-gray-600">Validity:</span>
                                            <span className="font-medium text-gray-800">
                                                {formatDate(currentSubscription.startDate)} to {
                                                    currentSubscription.planType === 'free' && 
                                                    new Date(currentSubscription.endDate).getFullYear() - new Date().getFullYear() >= 90 
                                                        ? 'Indefinite' 
                                                        : formatDate(currentSubscription.endDate)
                                                }
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>
                            
                            <div className="flex flex-col items-end">
                                <span className={`px-4 py-2 rounded-full text-sm font-bold ${getStatusColor(currentSubscription.status)} shadow-sm`}>
                                    {currentSubscription.status.charAt(0).toUpperCase() + currentSubscription.status.slice(1)}
                                </span>
                                
                                {(currentSubscription.planType === 'fixed_commitment' || currentSubscription.planType === 'custom') && (
                                    <div className="mt-4 text-right">
                                        <p className="text-xs text-gray-500">Next milestone</p>
                                        <p className="text-sm font-semibold text-gray-700">₹{Math.max(500, Math.min(1000, currentSubscription.remainingBalance))}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                        
                        {currentSubscription.status === 'paid' && (
                            <div className="mt-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200 flex items-center">
                                <span className="text-2xl mr-3">✅</span>
                                <div>
                                    <p className="font-bold text-green-800">Your subscription is active!</p>
                                    <p className="text-sm text-green-600 mt-1">Enjoy full access to all gym facilities</p>
                                </div>
                            </div>
                        )}
                        
                        {/* Balance Due Widget for Fixed Commitment and Custom Plans */}
                        {(currentSubscription.planType === 'fixed_commitment' || currentSubscription.planType === 'custom') && currentSubscription.remainingBalance > 0 && (
                            <div className="mt-6 p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-200 flex flex-col sm:flex-row justify-between items-center">
                                <div className="mb-3 sm:mb-0 text-center sm:text-left">
                                    <p className="font-bold text-amber-800">Balance Due: ₹{currentSubscription.remainingBalance}</p>
                                    <p className="text-sm text-amber-600 mt-1">Make an installment payment to reduce your balance</p>
                                </div>
                                <button
                                    onClick={() => setShowInstallmentForm(true)}
                                    className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold py-2 px-6 rounded-full transition-all duration-300 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 flex items-center"
                                >
                                    <span className="mr-2">+</span> Pay Installment
                                </button>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="bg-white rounded-xl p-8 text-center border border-gray-200 shadow-sm">
                        <div className="text-5xl mb-4">💳</div>
                        <p className="text-gray-600 text-lg mb-4">You don't have an active subscription.</p>
                        <p className="text-gray-500 text-sm">Select a plan below to get started with your fitness journey!</p>
                    </div>
                )}
            </div>
            
            {/* Subscription Plans - Enhanced Styling */}
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl shadow-lg p-6 mb-8 border border-indigo-100">
                <h2 className="text-2xl font-bold mb-6 text-gray-800 flex items-center">
                    <span className="bg-indigo-500 text-white rounded-full w-8 h-8 flex items-center justify-center mr-3">📋</span>
                    Choose a Plan
                </h2>
                
                {/* Fixed Commitment Plan Card */}
                <div 
                    className={`rounded-2xl p-6 mb-6 cursor-pointer transition-all duration-300 transform hover:scale-[1.02] shadow-md hover:shadow-lg ${
                        selectedPlan === 'fixed_commitment' 
                            ? 'border-2 border-blue-500 bg-gradient-to-br from-blue-50 to-indigo-50 ring-2 ring-blue-200' 
                            : 'border border-gray-200 bg-white hover:border-blue-300'
                    }`}
                    onClick={() => setSelectedPlan('fixed_commitment')}
                >
                    <div className="flex justify-between items-start">
                        <div className="flex-1">
                            <div className="flex items-center mb-2">
                                <h3 className="font-bold text-xl mb-2 text-gray-800">{planDetails.fixed_commitment.name}</h3>
                                <span className="ml-2 bg-blue-100 text-blue-800 text-xs font-bold px-2.5 py-0.5 rounded-full">POPULAR</span>
                            </div>
                            <p className="text-3xl font-extrabold text-blue-600 mb-3">₹{planDetails.fixed_commitment.totalFee}</p>
                            <p className="text-gray-600 mb-4 leading-relaxed">{planDetails.fixed_commitment.description}</p>
                            
                            <div className="flex flex-wrap gap-2 mt-4">
                                <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">Flexible Payments</span>
                                <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">3-Month Duration</span>
                                <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">Installments</span>
                            </div>
                        </div>
                        <div className="flex items-start">
                            <div className="w-6 h-6 rounded-full border-2 border-blue-500 flex items-center justify-center">
                                {selectedPlan === 'fixed_commitment' ? (
                                    <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                                ) : null}
                            </div>
                        </div>
                    </div>
                    
                    {/* Initial Payment Input for Fixed Commitment Plan - Enhanced */}
                    {selectedPlan === 'fixed_commitment' && (
                        <div className="mt-6 p-5 bg-gradient-to-r from-amber-50 to-yellow-50 rounded-xl border border-amber-200 shadow-sm">
                            <div className="flex items-center mb-3">
                                <span className="bg-amber-500 text-white rounded-full w-6 h-6 flex items-center justify-center mr-2 text-sm">💰</span>
                                <label className="block text-sm font-bold text-gray-800">
                                    Amount to Pay Now
                                </label>
                            </div>
                            <p className="text-xs text-gray-600 mb-3">Minimum ₹1 required. You can pay the remaining balance in flexible installments.</p>
                            <input
                                type="number"
                                min="1"
                                max="4000"
                                placeholder="Enter amount (₹1-₹4000)"
                                className="w-full px-4 py-3 border-2 border-amber-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-lg font-bold text-center"
                                value={initialPaymentAmount || ''}
                                onChange={(e) => setInitialPaymentAmount(e.target.value)}
                            />
                            <div className="flex justify-between mt-2 text-xs text-amber-700">
                                <span>Min: ₹1</span>
                                <span>Max: ₹4000</span>
                            </div>
                        </div>
                    )}
                </div>

                
                {/* Installment Payment Form Modal */}
                {showInstallmentForm && currentSubscription && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
                            <div className="p-6">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-lg font-semibold text-gray-900">Pay Installment</h3>
                                    <button 
                                        onClick={() => {
                                            setShowInstallmentForm(false);
                                            setInstallmentAmount('');
                                        }}
                                        className="text-gray-400 hover:text-gray-500"
                                    >
                                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                                
                                <div className="mb-4">
                                    <p className="text-gray-600 mb-2">Current Balance: <span className="font-semibold">₹{currentSubscription.remainingBalance}</span></p>
                                    <p className="text-gray-600 mb-2">Total Paid: <span className="font-semibold">₹{currentSubscription.paidAmount}</span> of ₹{currentSubscription.totalFee}</p>
                                    <p className="text-gray-600 mb-4">Installments: <span className="font-semibold">{currentSubscription.installmentCount || 0} of {currentSubscription.maxInstallments || 4}</span></p>
                                    
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Installment Amount (₹)
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        max={currentSubscription.remainingBalance}
                                        placeholder={`Enter amount (₹1-₹${currentSubscription.remainingBalance})`}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                        value={installmentAmount || ''}
                                        onChange={(e) => setInstallmentAmount(e.target.value)}
                                    />
                                    <p className="mt-2 text-sm text-gray-500">
                                        Enter any amount between ₹1 and ₹{currentSubscription.remainingBalance}
                                    </p>
                                </div>
                                
                                <div className="flex justify-end space-x-3">
                                    <button
                                        onClick={() => {
                                            setShowInstallmentForm(false);
                                            setInstallmentAmount('');
                                        }}
                                        className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleInstallmentPayment}
                                        disabled={processing || !installmentAmount || installmentAmount <= 0 || installmentAmount > currentSubscription.remainingBalance}
                                        className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {processing ? 'Processing...' : 'Pay Installment'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                
                {/* Mobile view with individual pay buttons */}
                <div className="md:hidden space-y-4">
                    {/* Fixed Commitment Plan for Mobile */}
                    <div 
                        className={`border rounded-lg p-6 transition-all ${
                            selectedPlan === 'fixed_commitment' 
                                ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200' 
                                : 'border-gray-200'
                        }`}
                    >
                        <h3 className="font-semibold text-lg mb-2">{planDetails.fixed_commitment.name}</h3>
                        <p className="text-2xl font-bold text-blue-600 mb-2">₹{planDetails.fixed_commitment.totalFee}</p>
                        <p className="text-gray-600 mb-4">{planDetails.fixed_commitment.description}</p>
                        
                        {/* Initial Payment Input for Fixed Commitment Plan */}
                        <div className="mb-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Amount to Pay Now (Min ₹1)
                            </label>
                            <input
                                type="number"
                                min="1"
                                max="4000"
                                placeholder="Enter amount (₹1-₹4000)"
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                value={initialPaymentAmount || ''}
                                onChange={(e) => setInitialPaymentAmount(e.target.value)}
                            />
                        </div>
                        
                        {/* Pay Button for mobile view */}
                        <button
                            onClick={() => {
                                setSelectedPlan('fixed_commitment');
                                handleSubscribe();
                            }}
                            disabled={processing}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {processing ? 'Processing...' : `Pay ₹${initialPaymentAmount || 1}`}
                        </button>
                    </div>
                    
                    
                </div>
                
                {/* Desktop payment button */}
                <div className="hidden md:block mt-8">
                    <button
                        onClick={handleSubscribe}
                        disabled={processing || selectedPlan !== 'fixed_commitment'}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {processing ? 'Processing...' : 
                         selectedPlan === 'fixed_commitment' ? 
                         `Pay ₹${initialPaymentAmount || 1}` : 
                         'Select Fixed Commitment Plan'}
                    </button>
                </div>
            </div>
            
            {/* Subscription History */}
            <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold mb-4 text-gray-800">Subscription History</h2>
                {subscriptions.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Plan</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Period</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {subscriptions.map((sub) => (
                                    <tr key={sub._id}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                            {planDetails[sub.planType]?.name || sub.planType}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {sub.planType === 'fixed_commitment' || sub.planType === 'custom' ? (
                                                <>₹{sub.paidAmount} of ₹{sub.totalFee}</>
                                            ) : (
                                                <>₹{sub.amount}</>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {formatPeriod(sub.startDate, sub.endDate, sub.planType)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(sub.status)}`}>
                                                {sub.status.charAt(0).toUpperCase() + sub.status.slice(1)}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <p className="text-gray-600 text-center py-4">No subscription history found.</p>
                )}
            </div>
        </div>
    );
};

export default FighterSubscriptionPage;
