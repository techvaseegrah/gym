import React, { useState, useEffect } from 'react';
import api from '../api/api';

const FighterSubscriptionReportPage = () => {
    const [subscriptions, setSubscriptions] = useState([]);
    const [currentSubscription, setCurrentSubscription] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const planDetails = {
        monthly: { name: 'Monthly Plan', price: 500 },
        quarterly: { name: 'Quarterly Plan', price: 1200 },
        yearly: { name: 'Yearly Plan', price: 4800 }
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

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto p-4">
            <h1 className="text-2xl font-bold mb-6 text-gray-800">My Subscription Reports</h1>
            
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
            
            {/* Payment History */}
            <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold mb-4 text-gray-800">Payment History</h2>
                {subscriptions.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Plan</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Period</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
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
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {formatDate(sub.createdAt)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <p className="text-gray-600 text-center py-4">No payment history found.</p>
                )}
            </div>
        </div>
    );
};

export default FighterSubscriptionReportPage;
