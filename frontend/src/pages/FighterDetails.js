import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api/api.js';
import EnhancedLevelProgress from '../components/EnhancedLevelProgress';

// Get user context by accessing the global user state from localStorage
const getUserFromStorage = () => {
    const token = localStorage.getItem('token');
    if (token) {
        // In a real implementation, you'd decode the JWT token or make an API call
        // For now, we'll use a simple approach by checking if token exists
        // and assume the user role is stored in a global context or can be retrieved
        try {
            // Decode JWT token to get user info (simplified approach)
            const tokenParts = token.split('.');
            if (tokenParts.length === 3) {
                const payload = JSON.parse(atob(tokenParts[1]));
                return { role: payload.role, id: payload.id };
            }
        } catch (e) {
            console.warn('Could not decode token');
        }
    }
    return null;
};

// CoreLevelChart component has been replaced with EnhancedLevelProgress


const FighterDetails = () => {
    const { id } = useParams();
    const [fighterData, setFighterData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [subscriptions, setSubscriptions] = useState([]);
    const [loadingSubscriptions, setLoadingSubscriptions] = useState(true);
    const [error, setError] = useState('');
    // Payment widget state
    const [showInstallmentForm, setShowInstallmentForm] = useState(false);
    const [installmentAmount, setInstallmentAmount] = useState('');
    const [processing, setProcessing] = useState(false);
    const [paymentError, setPaymentError] = useState('');

    const technicalSkills = ['stance', 'jab', 'straight', 'left_hook', 'right_hook', 'thigh_kick', 'rib_kick', 'face_slap_kick', 'inner_kick', 'outer_kick', 'front_kick', 'rise_kick', 'boxing_movements', 'push_ups', 'cambo'];
    const skillAdvantages = ['stamina', 'speed', 'flexibility', 'power', 'martial_arts_knowledge', 'discipline'];

    const planDetails = {
        free: { name: 'Free Plan', price: 0, description: 'Indefinite access to gym facilities' },
        fixed_commitment: { name: 'Quarterly Membership', totalFee: 4000, description: 'Fixed 3-month package with flexible installments' },
        custom: { name: 'Custom Plan', description: 'Custom fee and duration plan' }
    };

    useEffect(() => {
        const fetchFighterDetails = async () => {
            try {
                const res = await api.get(`/fighters/${id}`);
                setFighterData(res.data);
            } catch (err) {
                console.error('Error fetching fighter details:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchFighterDetails();
    }, [id]);

    useEffect(() => {
        const fetchSubscriptions = async () => {
            try {
                setLoadingSubscriptions(true);
                const res = await api.get(`/subscriptions/fighter/${id}`);
                setSubscriptions(res.data);
                setLoadingSubscriptions(false);
            } catch (err) {
                console.error('Error fetching subscriptions:', err);
                setError('Failed to fetch subscription details');
                setLoadingSubscriptions(false);
            }
        };
        
        if (id) {
            fetchSubscriptions();
        }
    }, [id]);

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

    // Function to get the current active subscription from the subscriptions list
    const getCurrentSubscription = (subs) => {
        if (!subs || subs.length === 0) return null;
        
        const now = new Date();
        // Sort by creation date descending to get the most recent first
        const sortedSubs = [...subs].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        
        // First check for active paid subscriptions
        for (const sub of sortedSubs) {
            // Skip expired or cancelled subscriptions
            if (sub.status === 'expired' || sub.status === 'cancelled') continue;
            
            // Check if subscription is currently active
            const startDate = new Date(sub.startDate);
            const endDate = new Date(sub.endDate);
            
            if (startDate <= now && endDate >= now) {
                // For fixed commitment and custom plans, check if it has paid or partial_payment status
                if ((sub.planType === 'fixed_commitment' || sub.planType === 'custom') && (sub.status === 'paid' || sub.status === 'partial_payment')) {
                    return sub;
                }
                // For other plans, check if it's paid
                else if (sub.planType !== 'fixed_commitment' && sub.planType !== 'custom' && sub.status === 'paid') {
                    return sub;
                }
                // For free plans, they're always active if status is paid
                else if (sub.planType === 'free' && sub.status === 'paid') {
                    return sub;
                }
            }
        }
        
        // If no active subscription found, return null
        return null;
    };

    // Function to handle installment payment
    const handleInstallmentPayment = async () => {
        try {
            setProcessing(true);
            setPaymentError('');
            
            // Get current user to determine if admin or fighter
            const currentUser = getUserFromStorage();
            const isAdmin = currentUser && currentUser.role === 'admin';
            
            // Get current subscription
            const currentSub = getCurrentSubscription(subscriptions);
            if (!currentSub) {
                setPaymentError('No active subscription found');
                setProcessing(false);
                return;
            }
            
            // Validate installment amount
            const amount = parseFloat(installmentAmount);
            if (!amount || amount <= 0) {
                setPaymentError('Please enter a valid installment amount');
                setProcessing(false);
                return;
            }
            
            if (amount > currentSub.remainingBalance) {
                setPaymentError(`Installment amount cannot exceed remaining balance of ₹${currentSub.remainingBalance}`);
                setProcessing(false);
                return;
            }
            
            // Determine which endpoints to use based on user role
            const makeInstallmentEndpoint = isAdmin 
                ? '/subscriptions/admin-make-installment' 
                : '/subscriptions/make-installment';
            const verifyInstallmentEndpoint = isAdmin 
                ? '/subscriptions/admin-verify-installment' 
                : '/subscriptions/verify-installment';
            
            // Create installment order
            const orderRes = await api.post(makeInstallmentEndpoint, {
                subscriptionId: currentSub._id,
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
                description: `Installment Payment for ${planDetails[currentSub.planType]?.name || currentSub.planType}`,
                order_id: orderId,
                handler: async function (response) {
                    try {
                        // Verify installment payment using appropriate endpoint
                        await api.post(verifyInstallmentEndpoint, {
                            razorpayOrderId: response.razorpay_order_id,
                            razorpayPaymentId: response.razorpay_payment_id,
                            razorpaySignature: response.razorpay_signature,
                            subscriptionId: subscriptionId
                        });
                        
                        // Close the installment form
                        setShowInstallmentForm(false);
                        setInstallmentAmount('');
                        
                        // Refresh subscription data
                        const res = await api.get(`/subscriptions/fighter/${id}`);
                        setSubscriptions(res.data);
                        
                        // Show success message
                        alert('Installment payment successful!');
                    } catch (err) {
                        console.error('Error verifying installment payment:', err);
                        setPaymentError('Installment payment verification failed. Please contact support.');
                    }
                },
                prefill: {
                    name: fighterData?.name || '',
                    email: '',
                    contact: fighterData?.phNo || ''
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
                setPaymentError(`Payment failed: ${response.error.description}`);
                setProcessing(false);
            });
            
            rzp.open();
        } catch (err) {
            console.error('Error creating installment order:', err);
            if (err.response) {
                setPaymentError('Failed to initiate installment payment. Server error: ' + (err.response.data?.msg || err.response.data?.error || err.response.statusText || 'Unknown server error'));
            } else if (err.request) {
                setPaymentError('Failed to initiate installment payment. Network error: No response from server.');
            } else {
                setPaymentError('Failed to initiate installment payment. Error: ' + (err.message || 'Unknown error'));
            }
        } finally {
            setProcessing(false);
        }
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

    // Function to determine if subscription has balance due
    const hasBalanceDue = (subscription) => {
        return (subscription.planType === 'fixed_commitment' || subscription.planType === 'custom') && 
               subscription.remainingBalance > 0 && 
               (subscription.status === 'paid' || subscription.status === 'partial_payment');
    };

    // Function to get amount display for subscription
    const getAmountDisplay = (sub) => {
        if (sub.planType === 'fixed_commitment' || sub.planType === 'custom') {
            return sub.paidAmount > 0 ? `₹${sub.paidAmount} of ₹${sub.totalFee}` : `₹0 of ₹${sub.totalFee}`;
        } else {
            return sub.amount > 0 ? `₹${sub.amount}` : 'N/A';
        }
    };

    // Function to get status display text
    const getStatusDisplayText = (status) => {
        switch (status) {
            case 'paid': return 'Active';
            case 'created': return 'Inactive';
            case 'expired': return 'Expired';
            case 'cancelled': return 'Cancelled';
            case 'partial_payment': return 'Partial Payment';
            default: return status.charAt(0).toUpperCase() + status.slice(1);
        }
    };

    // Function to get status color for different statuses
    const getExtendedStatusColor = (status) => {
        switch (status) {
            case 'paid': return 'bg-green-100 text-green-800';
            case 'created': return 'bg-yellow-100 text-yellow-800';
            case 'expired': return 'bg-red-100 text-red-800';
            case 'cancelled': return 'bg-gray-100 text-gray-800';
            case 'partial_payment': return 'bg-orange-100 text-orange-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center bg-gray-100">Loading fighter details...</div>;
    }

    if (!fighterData) {
        return <div className="min-h-screen flex items-center justify-center bg-gray-100 p-8">Fighter not found.</div>;
    }

    const DetailItem = ({ label, value }) => (
        <div>
            <p className="text-sm text-gray-400">{label}</p>
            <p className="text-white font-medium">{value || 'N/A'}</p>
        </div>
    );
    
    const SkillDisplayRow = ({ skill }) => {
        const skillData = fighterData.assessment?.[skill] || {};
        const fighterScore = skillData.fighterScore || 0;
        const masterScore = skillData.masterScore || 0;
        const scoreDiff = masterScore - fighterScore;

        return (
            <tr className="border-b border-gray-700">
                <td className="py-2 px-2 capitalize text-gray-300 font-medium">{skill.replace(/_/g, ' ')}</td>
                <td className="py-2 px-2 text-center text-white">{fighterScore}</td>
                <td className="py-2 px-2 text-center text-white">{masterScore}</td>
                <td className="py-2 px-2 text-center text-white font-bold">{scoreDiff}</td>
            </tr>
        );
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8 bg-gray-100 min-h-full">
            <div className="max-w-7xl mx-auto">
                <div className="text-center mb-8 border-b pb-4">
                    <h1 className="text-4xl font-bold text-gray-800">
                        Fighter Profile
                    </h1>
                </div>
                
                <div className="bg-white shadow-lg rounded-lg p-6">
                    {/* Personal Info */}
                    <div className="bg-gray-800 p-6 rounded-lg shadow-lg mb-8">
                        <h2 className="text-2xl font-bold border-b-2 border-red-500 pb-2 mb-6 text-white">Personal Info</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="md:col-span-1 flex flex-col items-center text-center">
                                {fighterData.profilePhoto ? (
                                    <img 
                                        src={fighterData.profilePhoto} 
                                        alt={fighterData.name} 
                                        className="w-32 h-32 rounded-full mb-4 border-2 border-gray-600 object-cover"
                                    />
                                ) : (
                                    <div className="w-32 h-32 bg-gray-700 rounded-full mb-4 border-2 border-gray-600 flex items-center justify-center">
                                        <span className="text-gray-500">No Image</span>
                                    </div>
                                )}
                                <h3 className="text-2xl font-bold text-white">{fighterData.name}</h3>
                            </div>
                            <div className="md:col-span-2">
                                <div className="grid grid-cols-2 gap-x-4 gap-y-5">
                                    <DetailItem label="RFID:" value={fighterData.rfid} />
                                    <DetailItem label="Batch No:" value={fighterData.fighterBatchNo} />
                                    <DetailItem label="Age:" value={fighterData.age} />
                                    <DetailItem label="Gender:" value={fighterData.gender} />
                                    <DetailItem label="Phone:" value={fighterData.phNo} />
                                    <DetailItem label="Blood Group:" value={fighterData.bloodGroup} />
                                    <div className="col-span-2"><DetailItem label="Address:" value={fighterData.address} /></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Fighter Details */}
                    <div className="bg-gray-800 p-6 rounded-lg shadow-lg mb-8">
                        <h2 className="text-2xl font-bold border-b-2 border-red-500 pb-2 mb-6 text-white">Fighter Details</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-5">
                            <DetailItem label="Height:" value={fighterData.height} />
                            <DetailItem label="Weight:" value={fighterData.weight} />
                            <DetailItem label="Occupation:" value={fighterData.occupation} />
                            <DetailItem label="Package:" value={fighterData.package} />
                            <DetailItem label="Joining Date:" value={new Date(fighterData.dateOfJoining).toLocaleDateString()} />
                            <DetailItem label="Motto:" value={fighterData.motto} />
                            <div className="col-span-2"><DetailItem label="Previous Experience:" value={fighterData.previousExperience} /></div>
                            <div className="col-span-2"><DetailItem label="Medical Issues:" value={fighterData.medicalIssue} /></div>
                            <div className="col-span-2"><DetailItem label="Martial Arts Knowledge:" value={fighterData.martialArtsKnowledge} /></div>
                        </div>
                    </div>

                    {/* Goals & Referral */}
                    <div className="bg-gray-800 p-6 rounded-lg shadow-lg mb-8">
                        <h2 className="text-2xl font-bold border-b-2 border-red-500 pb-2 mb-6 text-white">Goals & Referral</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-5">
                            <div className="col-span-2">
                                <p className="text-sm text-gray-400">Goals:</p>
                                <p className="text-white font-medium">{fighterData.goals?.join(', ') || 'N/A'}</p>
                            </div>
                            <div className="col-span-2">
                                <p className="text-sm text-gray-400">How did they know about us?</p>
                                <p className="text-white font-medium">{fighterData.referral || 'N/A'}</p>
                            </div>
                            {/* Achievements section */}
                            {fighterData.achievements && (
                                <div className="col-span-2">
                                    <p className="text-sm text-gray-400">Achievements:</p>
                                    <p className="text-white font-medium whitespace-pre-line">{fighterData.achievements}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Subscription Information */}
                    <div className="bg-gray-800 p-6 rounded-lg shadow-lg mb-8">
                        <h2 className="text-2xl font-bold border-b-2 border-red-500 pb-2 mb-6 text-white">Subscription Information</h2>
                        {error && (
                            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                                {error}
                            </div>
                        )}
                        
                        {loadingSubscriptions ? (
                            <div className="flex justify-center items-center py-8">
                                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                                <span className="ml-2 text-gray-300">Loading subscription information...</span>
                            </div>
                        ) : subscriptions.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-700">
                                    <thead>
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Plan</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Amount</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Period</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Status</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Created</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-700">
                                        {subscriptions.map((sub) => (
                                            <tr key={sub._id}>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                                                    {planDetails[sub.planType]?.name || sub.planType}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                                                    {getAmountDisplay(sub)}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                                                    {formatDate(sub.startDate)} - {formatDate(sub.endDate)}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getExtendedStatusColor(sub.status)}`}>
                                                        {getStatusDisplayText(sub.status)}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                                                    {formatDate(sub.createdAt)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <p className="text-gray-300 text-center py-4">No subscription history found for this fighter.</p>
                        )}
                        
                        {/* Payment Widget for Fixed Commitment and Custom Plans */}
                        {getCurrentSubscription(subscriptions) && hasBalanceDue(getCurrentSubscription(subscriptions)) && (
                            <div className="mt-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                                    <div>
                                        <p className="text-yellow-800 font-medium">Balance Due: ₹{getCurrentSubscription(subscriptions).remainingBalance}</p>
                                        <p className="text-yellow-700 text-sm">Make an installment payment to reduce the balance</p>
                                    </div>
                                    <button
                                        onClick={() => setShowInstallmentForm(true)}
                                        className="bg-yellow-500 hover:bg-yellow-600 text-white font-medium py-2 px-4 rounded transition-colors"
                                    >
                                        Pay Installment
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Installment Payment Form Modal */}
                    {showInstallmentForm && getCurrentSubscription(subscriptions) && (
                        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                            <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
                                <div className="p-6">
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="text-lg font-semibold text-gray-900">Pay Installment</h3>
                                        <button 
                                            onClick={() => {
                                                setShowInstallmentForm(false);
                                                setInstallmentAmount('');
                                                setPaymentError('');
                                            }}
                                            className="text-gray-400 hover:text-gray-500"
                                        >
                                            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    </div>
                                    
                                    {paymentError && (
                                        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg">
                                            {paymentError}
                                        </div>
                                    )}
                                    
                                    <div className="mb-4">
                                        <p className="text-gray-600 mb-2">Current Balance: <span className="font-semibold">₹{getCurrentSubscription(subscriptions).remainingBalance}</span></p>
                                        <p className="text-gray-600 mb-4">Total Paid: <span className="font-semibold">₹{getCurrentSubscription(subscriptions).paidAmount}</span> of ₹{getCurrentSubscription(subscriptions).totalFee}</p>
                                        
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Installment Amount (₹)
                                        </label>
                                        <input
                                            type="number"
                                            min="1"
                                            max={getCurrentSubscription(subscriptions).remainingBalance}
                                            placeholder={`Enter amount (₹1-₹${getCurrentSubscription(subscriptions).remainingBalance})`}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                            value={installmentAmount || ''}
                                            onChange={(e) => setInstallmentAmount(e.target.value)}
                                        />
                                        <p className="mt-2 text-sm text-gray-500">
                                            Enter any amount between ₹1 and ₹{getCurrentSubscription(subscriptions).remainingBalance}
                                        </p>
                                    </div>
                                    
                                    <div className="flex justify-end space-x-3">
                                        <button
                                            onClick={() => {
                                                setShowInstallmentForm(false);
                                                setInstallmentAmount('');
                                                setPaymentError('');
                                            }}
                                            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleInstallmentPayment}
                                            disabled={processing || !installmentAmount || installmentAmount <= 0 || installmentAmount > getCurrentSubscription(subscriptions).remainingBalance}
                                            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {processing ? 'Processing...' : 'Pay Installment'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                    
                    {/* Assessment */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
                         <div className="lg:col-span-3">
                            {fighterData.assessment ? (
                                <EnhancedLevelProgress fighterData={fighterData} />
                            ) : null}
                        </div>
                    </div>
                    
                    {fighterData.assessment && (
                        <div className="mt-8">
                            <div className="bg-gray-800 p-4 rounded-lg shadow-lg">
                                <h2 className="text-xl md:text-2xl font-bold border-b-2 border-red-500 pb-2 mb-4 text-white">Skill Assessment</h2>
                                
                                {/* Mobile view - stacked layout with compact tables */}
                                <div className="md:hidden space-y-6">
                                    <div>
                                        <h3 className="text-lg font-semibold mb-3 text-red-400">Technical Advantage</h3>
                                        <div className="bg-gray-700 rounded overflow-hidden">
                                            <table className="w-full text-xs">
                                                <thead>
                                                    <tr className="bg-gray-600">
                                                        <th className="py-2 px-2 text-left font-medium text-gray-300">Skill</th>
                                                        <th className="py-2 px-1 text-center font-medium text-gray-300">Fighter</th>
                                                        <th className="py-2 px-1 text-center font-medium text-gray-300">Master</th>
                                                        <th className="py-2 px-1 text-center font-medium text-gray-300">Diff</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {technicalSkills.map(skill => (
                                                        <tr key={skill} className="border-t border-gray-600">
                                                            <td className="py-2 px-2 text-gray-300 capitalize">{skill.replace(/_/g, ' ')}</td>
                                                            <td className="py-2 px-1 text-center text-white">{fighterData.assessment[skill]?.fighterScore || 0}</td>
                                                            <td className="py-2 px-1 text-center text-white">{fighterData.assessment[skill]?.masterScore || 0}</td>
                                                            <td className="py-2 px-1 text-center text-white font-medium">
                                                                {(fighterData.assessment[skill]?.masterScore || 0) - (fighterData.assessment[skill]?.fighterScore || 0)}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                    
                                    <div>
                                        <h3 className="text-lg font-semibold mb-3 text-red-400">Skill Advantage</h3>
                                        <div className="bg-gray-700 rounded overflow-hidden">
                                            <table className="w-full text-xs">
                                                <thead>
                                                    <tr className="bg-gray-600">
                                                        <th className="py-2 px-2 text-left font-medium text-gray-300">Skill</th>
                                                        <th className="py-2 px-1 text-center font-medium text-gray-300">Fighter</th>
                                                        <th className="py-2 px-1 text-center font-medium text-gray-300">Master</th>
                                                        <th className="py-2 px-1 text-center font-medium text-gray-300">Diff</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {skillAdvantages.map(skill => (
                                                        <tr key={skill} className="border-t border-gray-600">
                                                            <td className="py-2 px-2 text-gray-300 capitalize">{skill.replace(/_/g, ' ')}</td>
                                                            <td className="py-2 px-1 text-center text-white">{fighterData.assessment[skill]?.fighterScore || 0}</td>
                                                            <td className="py-2 px-1 text-center text-white">{fighterData.assessment[skill]?.masterScore || 0}</td>
                                                            <td className="py-2 px-1 text-center text-white font-medium">
                                                                {(fighterData.assessment[skill]?.masterScore || 0) - (fighterData.assessment[skill]?.fighterScore || 0)}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                                
                                {/* Desktop view - side by side layout */}
                                <div className="hidden md:grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <h3 className="text-xl font-semibold mb-4 text-red-400">Technical Advantage</h3>
                                        <table className="w-full">
                                            <thead>
                                                <tr className="border-b-2 border-gray-600">
                                                    <th className="py-2 px-2 text-left text-sm font-bold text-gray-400">Skill</th>
                                                    <th className="py-2 px-2 text-center text-sm font-bold text-gray-400">Fighter Score</th>
                                                    <th className="py-2 px-2 text-center text-sm font-bold text-gray-400">Master Score</th>
                                                    <th className="py-2 px-2 text-center text-sm font-bold text-gray-400">Diff</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {technicalSkills.map(skill => <SkillDisplayRow key={skill} skill={skill} />)}
                                            </tbody>
                                        </table>
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-semibold mb-4 text-red-400">Skill Advantage</h3>
                                        <table className="w-full">
                                            <thead>
                                                 <tr className="border-b-2 border-gray-600">
                                                    <th className="py-2 px-2 text-left text-sm font-bold text-gray-400">Skill</th>
                                                    <th className="py-2 px-2 text-center text-sm font-bold text-gray-400">Fighter Score</th>
                                                    <th className="py-2 px-2 text-center text-sm font-bold text-gray-400">Master Score</th>
                                                    <th className="py-2 px-2 text-center text-sm font-bold text-gray-400">Diff</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {skillAdvantages.map(skill => <SkillDisplayRow key={skill} skill={skill} />)}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                                
                                <div className="mt-4 pt-4 border-t border-gray-700">
                                    <p className="text-base md:text-lg text-white">
                                        <span className="font-bold text-gray-400">Special Grade Score: </span>
                                        <span className="font-medium">{fighterData.assessment.specialGradeScore || 'N/A'}</span>
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                    
                    {/* --- This section has been removed as requested --- */}
                    {/* <div className="mt-8">
                        <AdminAssessment fighterId={fighterData._id} />
                    </div>
                    */}
                </div>
            </div>
        </div>
    );
};

export default FighterDetails;
