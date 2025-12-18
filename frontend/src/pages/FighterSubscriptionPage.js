import React, { useState, useEffect } from 'react';
import api from '../api/api';

const FighterSubscriptionPage = () => {
    const [subscriptions, setSubscriptions] = useState([]);
    const [currentSubscription, setCurrentSubscription] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedPlan, setSelectedPlan] = useState('monthly');
    const [processing, setProcessing] = useState(false);
    // Add state for popup notification
    const [popup, setPopup] = useState({ show: false, message: '', type: '' });

    const planDetails = {
        monthly: {
            name: 'Monthly Plan',
            price: 500,
            description: 'Perfect for regular training sessions'
        },
        quarterly: {
            name: 'Quarterly Plan',
            price: 1200,
            description: 'Save ₹300 with our quarterly package'
        },
        yearly: {
            name: 'Yearly Plan',
            price: 4000,
            description: 'Best value! Save ₹2000 annually'
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

    const handleSubscribe = async () => {
        try {
            setProcessing(true);
            setError('');
            
            // Create order
            const orderRes = await api.post('/subscriptions/create-order', {
                planType: selectedPlan
            });
            
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

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
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
            {/* Popup Notification */}
            {popup.show && (
                <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg transition-opacity duration-300 ${
                    popup.type === 'success' ? 'bg-green-500 text-white' : 
                    popup.type === 'error' ? 'bg-red-500 text-white' : 'bg-blue-500 text-white'
                }`}>
                    <div className="flex items-center">
                        <span className="mr-2">
                            {popup.type === 'success' ? '✅' : 
                             popup.type === 'error' ? '❌' : 'ℹ️'}
                        </span>
                        <span>{popup.message}</span>
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
            
            {/* Current Subscription */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-8">
                <h2 className="text-xl font-semibold mb-4 text-gray-800">Current Subscription</h2>
                {currentSubscription ? (
                    <div className="border border-gray-200 rounded-lg p-4">
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="font-medium text-lg">{planDetails[currentSubscription.planType]?.name || currentSubscription.planType}</h3>
                                <p className="text-gray-600">₹{currentSubscription.amount}</p>
                                <p className="text-gray-600">
                                    Valid from {formatDate(currentSubscription.startDate)} to {formatDate(currentSubscription.endDate)}
                                </p>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(currentSubscription.status)}`}>
                                {currentSubscription.status.charAt(0).toUpperCase() + currentSubscription.status.slice(1)}
                            </span>
                        </div>
                        {currentSubscription.status === 'paid' && (
                            <div className="mt-4 p-3 bg-green-50 rounded-lg">
                                <p className="text-green-700 font-medium">✅ Your subscription is active!</p>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="border border-gray-200 rounded-lg p-4 text-center">
                        <p className="text-gray-600">You don't have an active subscription.</p>
                    </div>
                )}
            </div>
            
            {/* Subscription Plans */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-8">
                <h2 className="text-xl font-semibold mb-4 text-gray-800">Choose a Plan</h2>
                <div className="hidden md:grid grid-cols-1 md:grid-cols-3 gap-6">
                    {Object.entries(planDetails).map(([planKey, plan]) => (
                        <div 
                            key={planKey}
                            className={`border rounded-lg p-6 cursor-pointer transition-all ${
                                selectedPlan === planKey 
                                    ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200' 
                                    : 'border-gray-200 hover:border-blue-300'
                            }`}
                            onClick={() => setSelectedPlan(planKey)}
                        >
                            <h3 className="font-semibold text-lg mb-2">{plan.name}</h3>
                            <p className="text-2xl font-bold text-blue-600 mb-2">₹{plan.price}</p>
                            <p className="text-gray-600 mb-4">{plan.description}</p>
                            <div className="flex items-center">
                                <input
                                    type="radio"
                                    id={planKey}
                                    name="plan"
                                    checked={selectedPlan === planKey}
                                    onChange={() => setSelectedPlan(planKey)}
                                    className="h-4 w-4 text-blue-600"
                                />
                                <label htmlFor={planKey} className="ml-2 text-gray-700">
                                    Select this plan
                                </label>
                            </div>
                        </div>
                    ))}
                </div>
                
                {/* Mobile view with individual pay buttons */}
                <div className="md:hidden space-y-4">
                    {Object.entries(planDetails).map(([planKey, plan]) => (
                        <div 
                            key={planKey}
                            className={`border rounded-lg p-6 transition-all ${
                                selectedPlan === planKey 
                                    ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200' 
                                    : 'border-gray-200'
                            }`}
                        >
                            <h3 className="font-semibold text-lg mb-2">{plan.name}</h3>
                            <p className="text-2xl font-bold text-blue-600 mb-2">₹{plan.price}</p>
                            <p className="text-gray-600 mb-4">{plan.description}</p>
                            
                            {/* Pay Button for mobile view */}
                            <button
                                onClick={() => {
                                    setSelectedPlan(planKey);
                                    handleSubscribe();
                                }}
                                disabled={processing}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed mb-3"
                            >
                                {processing && selectedPlan === planKey ? 'Processing...' : 'Pay Now'}
                            </button>
                            
                            <div className="flex items-center">
                                <input
                                    type="radio"
                                    id={`${planKey}-mobile`}
                                    name="plan-mobile"
                                    checked={selectedPlan === planKey}
                                    onChange={() => setSelectedPlan(planKey)}
                                    className="h-4 w-4 text-blue-600"
                                />
                                <label htmlFor={`${planKey}-mobile`} className="ml-2 text-gray-700">
                                    Select this plan
                                </label>
                            </div>
                        </div>
                    ))}
                </div>
                
                {/* Desktop payment button */}
                <div className="hidden md:block mt-8">
                    <button
                        onClick={handleSubscribe}
                        disabled={processing}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {processing ? 'Processing...' : `Pay ₹${planDetails[selectedPlan].price}`}
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
                                            ₹{sub.amount}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {formatDate(sub.startDate)} - {formatDate(sub.endDate)}
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
