// client/src/pages/AdminSubscriptionManagementPage.js

import React, { useState, useEffect } from 'react';
import api from '../api/api';

const AdminSubscriptionManagementPage = () => {
    const [fighters, setFighters] = useState([]);
    const [selectedFighter, setSelectedFighter] = useState('');
    const [selectedPlan, setSelectedPlan] = useState('');
    const [subscriptions, setSubscriptions] = useState([]);
    const [allSubscriptions, setAllSubscriptions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingSubscriptions, setLoadingSubscriptions] = useState(false);
    const [loadingAllSubscriptions, setLoadingAllSubscriptions] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState(''); // For popup notification
    const [showManualForm, setShowManualForm] = useState(false);
    const [manualSubscription, setManualSubscription] = useState({
        fighterId: '',
        planType: 'monthly',
        startDate: '',
        endDate: '',
        status: 'paid'
    });
    
    // Pagination and filtering states
    const [pagination, setPagination] = useState({
        page: 1,
        totalPages: 1,
        total: 0
    });
    
    const [filters, setFilters] = useState({
        planType: '',
        status: '',
        limit: 20
    });

    const planDetails = {
        monthly: { name: 'Monthly Plan', price: 500 },
        quarterly: { name: 'Quarterly Plan', price: 1200 },
        yearly: { name: 'Yearly Plan', price: 4800 }
    };

    const statusOptions = [
        { value: '', label: 'All Statuses' },
        { value: 'active', label: 'Active' },
        { value: 'inactive', label: 'Inactive' },
        { value: 'expired', label: 'Expired' },
        { value: 'no_subscription', label: 'No Subscription' }
    ];

    const planTypeOptions = [
        { value: '', label: 'All Plans' },
        { value: 'monthly', label: 'Monthly' },
        { value: 'quarterly', label: 'Quarterly' },
        { value: 'yearly', label: 'Yearly' }
    ];

    useEffect(() => {
        fetchFighters();
        fetchAllSubscriptions(); // Load all subscriptions on page load
    }, []);

    useEffect(() => {
        if (selectedFighter) {
            fetchFighterSubscriptions(selectedFighter);
        } else {
            setSubscriptions([]);
        }
    }, [selectedFighter]);

    useEffect(() => {
        fetchAllSubscriptions();
    }, [filters, pagination.page]);

    // Auto-hide success message after 3 seconds
    useEffect(() => {
        if (successMessage) {
            const timer = setTimeout(() => {
                setSuccessMessage('');
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [successMessage]);

    const fetchFighters = async () => {
        try {
            setLoading(true);
            const res = await api.get('/fighters/roster');
            setFighters(res.data);
            setLoading(false);
        } catch (err) {
            console.error('Error fetching fighters:', err);
            setError('Failed to fetch fighters');
            setLoading(false);
        }
    };

    const fetchFighterSubscriptions = async (fighterId) => {
        try {
            setLoadingSubscriptions(true);
            const res = await api.get(`/subscriptions/fighter/${fighterId}`);
            setSubscriptions(res.data);
            setLoadingSubscriptions(false);
        } catch (err) {
            console.error('Error fetching subscriptions:', err);
            setError('Failed to fetch subscriptions');
            setLoadingSubscriptions(false);
        }
    };
    
    const fetchAllSubscriptions = async () => {
        try {
            setLoadingAllSubscriptions(true);
            const queryParams = new URLSearchParams({
                page: pagination.page,
                limit: filters.limit,
                ...(filters.planType && { planType: filters.planType }),
                ...((filters.status && filters.status !== 'no_subscription' && filters.status !== 'active' && filters.status !== 'inactive') && { status: filters.status })
            }).toString();
            
            // Special handling for "No Subscription" filter
            if (filters.status === 'no_subscription') {
                // Fetch all fighters and identify those without subscriptions
                const fightersRes = await api.get('/fighters/roster');
                const allFighters = fightersRes.data;
                
                // Fetch subscriptions for all fighters to determine who has none
                const fightersWithoutSubscriptions = [];
                for (const fighter of allFighters) {
                    try {
                        const subRes = await api.get(`/subscriptions/fighter/${fighter._id}`);
                        if (subRes.data.length === 0) {
                            // Mark as "no subscription" fighter
                            fightersWithoutSubscriptions.push({
                                _id: fighter._id,
                                fighterId: fighter,
                                planType: 'none',
                                amount: 0,
                                startDate: null,
                                endDate: null,
                                status: 'no_subscription',
                                createdAt: fighter.createdAt
                            });
                        }
                    } catch (err) {
                        console.error(`Error fetching subscriptions for fighter ${fighter._id}:`, err);
                    }
                }
                
                // For pagination simulation with "no subscription" filter
                const startIndex = (pagination.page - 1) * filters.limit;
                const endIndex = startIndex + filters.limit;
                const paginatedResults = fightersWithoutSubscriptions.slice(startIndex, endIndex);
                
                setAllSubscriptions(paginatedResults);
                setPagination({
                    page: pagination.page,
                    totalPages: Math.ceil(fightersWithoutSubscriptions.length / filters.limit),
                    total: fightersWithoutSubscriptions.length
                });
            } 
            // Special handling for "Active" filter
            else if (filters.status === 'active') {
                const res = await api.get(`/subscriptions/all?status=paid&${queryParams}`);
                setAllSubscriptions(res.data.subscriptions);
                setPagination({
                    page: res.data.currentPage,
                    totalPages: res.data.totalPages,
                    total: res.data.total
                });
            }
            // Special handling for "Inactive" filter
            else if (filters.status === 'inactive') {
                const res = await api.get(`/subscriptions/all?status=created&${queryParams}`);
                setAllSubscriptions(res.data.subscriptions);
                setPagination({
                    page: res.data.currentPage,
                    totalPages: res.data.totalPages,
                    total: res.data.total
                });
            }
            // Special handling for "Expired" filter
            else if (filters.status === 'expired') {
                const res = await api.get(`/subscriptions/all?status=expired&${queryParams}`);
                setAllSubscriptions(res.data.subscriptions);
                setPagination({
                    page: res.data.currentPage,
                    totalPages: res.data.totalPages,
                    total: res.data.total
                });
            }
            // Normal subscription fetching for "All" or no filter
            else {
                // Fetch all subscriptions except cancelled ones
                const res = await api.get(`/subscriptions/all?${queryParams}`);
                // Filter out cancelled subscriptions from the response
                const filteredSubscriptions = res.data.subscriptions.filter(sub => sub.status !== 'cancelled');
                setAllSubscriptions(filteredSubscriptions);
                setPagination({
                    page: res.data.currentPage,
                    totalPages: res.data.totalPages,
                    total: res.data.total
                });
            }
            setLoadingAllSubscriptions(false);
        } catch (err) {
            console.error('Error fetching all subscriptions:', err);
            setError('Failed to fetch subscription history');
            setLoadingAllSubscriptions(false);
        }
    };

    const handleManualSubscriptionChange = (e) => {
        const { name, value } = e.target;
        setManualSubscription(prev => ({
            ...prev,
            [name]: value
        }));
    };
    
    const handleFilterChange = (name, value) => {
        setFilters(prev => ({
            ...prev,
            [name]: value
        }));
        // Reset to first page when filters change
        setPagination(prev => ({
            ...prev,
            page: 1
        }));
    };

    const handleCreateManualSubscription = async (e) => {
        e.preventDefault();
        try {
            // Calculate end date based on plan type
            const startDate = new Date(manualSubscription.startDate);
            const endDate = new Date(startDate);
            
            if (manualSubscription.planType === 'monthly') {
                endDate.setMonth(endDate.getMonth() + 1);
            } else if (manualSubscription.planType === 'quarterly') {
                endDate.setMonth(endDate.getMonth() + 3);
            } else if (manualSubscription.planType === 'yearly') {
                endDate.setFullYear(endDate.getFullYear() + 1);
            }
            
            const res = await api.post(`/subscriptions/admin-create`, {
                fighterId: manualSubscription.fighterId,
                planType: manualSubscription.planType,
                startDate: manualSubscription.startDate,
                endDate: endDate.toISOString().split('T')[0], // Format as YYYY-MM-DD
                status: manualSubscription.status
            });
            
            // Show success message in popup instead of alert
            setSuccessMessage('Subscription created successfully!');
            setShowManualForm(false);
            setManualSubscription({
                fighterId: '',
                planType: 'monthly',
                startDate: '',
                endDate: '',
                status: 'paid'
            });
            
            // Refresh subscriptions if we're viewing the same fighter
            if (selectedFighter === manualSubscription.fighterId) {
                fetchFighterSubscriptions(selectedFighter);
            }
            
            // Refresh global view
            fetchAllSubscriptions();
        } catch (err) {
            console.error('Error creating subscription:', err);
            setError('Failed to create subscription: ' + (err.response?.data?.msg || err.message));
        }
    };
    
    const handlePageChange = (newPage) => {
        setPagination(prev => ({
            ...prev,
            page: newPage
        }));
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'paid': 
            case 'active': 
                return 'bg-green-100 text-green-800';
            case 'created': 
            case 'inactive': 
                return 'bg-yellow-100 text-yellow-800';
            case 'expired': 
                return 'bg-red-100 text-red-800';
            case 'cancelled': 
                return 'bg-gray-100 text-gray-800';
            case 'no_subscription': 
                return 'bg-purple-100 text-purple-800';
            default: 
                return 'bg-gray-100 text-gray-800';
        }
    };

    // Function to determine payment method
    const getPaymentMethod = (subscription) => {
        // If it's a "no subscription" entry, return N/A
        if (subscription.status === 'no_subscription') {
            return 'N/A';
        }
        
        // Check if razorpayPaymentId exists
        if (subscription.razorpayPaymentId) {
            return 'Razorpay';
        }
        
        // Otherwise, it was created by admin
        return 'Admin';
    };

    // Function to determine payment success status
    const getPaymentStatus = (subscription) => {
        // If it's a "no subscription" entry, return N/A
        if (subscription.status === 'no_subscription') {
            return 'N/A';
        }
        
        // Map status to payment success
        switch (subscription.status) {
            case 'paid':
            case 'active':
                return 'Successful';
            case 'created':
            case 'inactive':
                return 'Pending';
            case 'expired':
                return 'Expired';
            case 'cancelled':
                return 'Cancelled';
            default:
                return 'Unknown';
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
        <div className="max-w-6xl mx-auto p-4 relative">
            {/* Success Popup Notification */}
            {successMessage && (
                <div className="fixed top-4 right-4 z-50">
                    <div className="bg-green-500 text-white px-4 py-2 rounded-md shadow-lg flex items-center">
                        <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>{successMessage}</span>
                    </div>
                </div>
            )}
            
            <h1 className="text-2xl font-bold mb-6 text-gray-800">Subscription Management</h1>
            
            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
                    {error}
                </div>
            )}
            
            {/* First Box - Selection and Plan */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-8">
                <h2 className="text-xl font-semibold mb-4 text-gray-800">Create/Update Subscription</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Select Fighter</label>
                        <select
                            value={selectedFighter}
                            onChange={(e) => setSelectedFighter(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="">Select a fighter</option>
                            {fighters.map(fighter => (
                                <option key={fighter._id} value={fighter._id}>
                                    {fighter.name} ({fighter.rfid})
                                </option>
                            ))}
                        </select>
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Select Plan</label>
                        <select
                            value={selectedPlan}
                            onChange={(e) => setSelectedPlan(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="">Select a plan</option>
                            <option value="monthly">Monthly (₹500)</option>
                            <option value="quarterly">Quarterly (₹1200)</option>
                            <option value="yearly">Yearly (₹4800)</option>
                        </select>
                    </div>
                    
                    <div className="flex items-end">
                        <button
                            onClick={() => {
                                if (selectedFighter && selectedPlan) {
                                    // Set default dates
                                    const today = new Date();
                                    const endDate = new Date(today);
                                    
                                    if (selectedPlan === 'monthly') {
                                        endDate.setMonth(endDate.getMonth() + 1);
                                    } else if (selectedPlan === 'quarterly') {
                                        endDate.setMonth(endDate.getMonth() + 3);
                                    } else if (selectedPlan === 'yearly') {
                                        endDate.setFullYear(endDate.getFullYear() + 1);
                                    }
                                    
                                    setManualSubscription(prev => ({
                                        ...prev,
                                        fighterId: selectedFighter,
                                        planType: selectedPlan,
                                        startDate: today.toISOString().split('T')[0],
                                        endDate: endDate.toISOString().split('T')[0]
                                    }));
                                    setShowManualForm(true);
                                } else {
                                    alert('Please select both fighter and plan');
                                }
                            }}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
                        >
                            Create Subscription
                        </button>
                    </div>
                </div>
            </div>
            
            {/* Manual Subscription Form */}
            {showManualForm && (
                <div className="bg-white rounded-lg shadow-md p-6 mb-8">
                    <h2 className="text-xl font-semibold mb-4 text-gray-800">Manual Subscription Details</h2>
                    <form onSubmit={handleCreateManualSubscription}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Fighter</label>
                                <select
                                    name="fighterId"
                                    value={manualSubscription.fighterId}
                                    onChange={handleManualSubscriptionChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    required
                                >
                                    <option value="">Select a fighter</option>
                                    {fighters.map(fighter => (
                                        <option key={fighter._id} value={fighter._id}>
                                            {fighter.name} ({fighter.rfid})
                                        </option>
                                    ))}
                                </select>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Plan Type</label>
                                <select
                                    name="planType"
                                    value={manualSubscription.planType}
                                    onChange={handleManualSubscriptionChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="monthly">Monthly (₹500)</option>
                                    <option value="quarterly">Quarterly (₹1200)</option>
                                    <option value="yearly">Yearly (₹4800)</option>
                                </select>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                                <input
                                    type="date"
                                    name="startDate"
                                    value={manualSubscription.startDate}
                                    onChange={handleManualSubscriptionChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    required
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                                <input
                                    type="date"
                                    name="endDate"
                                    value={manualSubscription.endDate}
                                    onChange={handleManualSubscriptionChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    required
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                                <select
                                    name="status"
                                    value={manualSubscription.status}
                                    onChange={handleManualSubscriptionChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="paid">Paid</option>
                                    <option value="created">Created</option>
                                    <option value="expired">Expired</option>
                                    <option value="cancelled">Cancelled</option>
                                </select>
                            </div>
                        </div>
                        
                        <div className="mt-6 flex space-x-4">
                            <button
                                type="submit"
                                className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
                            >
                                Create Subscription
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowManualForm(false)}
                                className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-medium py-2 px-4 rounded-md transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            )}
            
            {/* Second Box - Subscription History with Filters */}
            <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 gap-4">
                    <h2 className="text-xl font-semibold text-gray-800">
                        Subscription History ({pagination.total})
                    </h2>
                    <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                        <select
                            value={filters.planType}
                            onChange={(e) => handleFilterChange('planType', e.target.value)}
                            className="w-full sm:w-auto px-3 py-1 border border-gray-300 rounded-md text-sm"
                        >
                            {planTypeOptions.map(option => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                        </select>
                        <select
                            value={filters.status}
                            onChange={(e) => handleFilterChange('status', e.target.value)}
                            className="w-full sm:w-auto px-3 py-1 border border-gray-300 rounded-md text-sm"
                        >
                            {statusOptions.map(option => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                        </select>
                    </div>
                </div>
                
                {loadingAllSubscriptions ? (
                    <div className="flex justify-center items-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                        <span className="ml-2 text-gray-600">Loading subscriptions...</span>
                    </div>
                ) : allSubscriptions.length > 0 ? (
                    <>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fighter</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Plan</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Period</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment Method</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment Status</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {allSubscriptions.map((sub) => (
                                        <tr key={sub._id || sub.fighterId._id}>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                {sub.fighterId?.name || sub.fighterId?.rfid || 'Unknown Fighter'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {sub.planType === 'none' ? 'No Plan' : (planDetails[sub.planType]?.name || sub.planType)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {sub.amount > 0 ? `₹${sub.amount}` : 'N/A'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {sub.startDate ? `${formatDate(sub.startDate)} - ${formatDate(sub.endDate)}` : 'N/A'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(sub.status)}`}>
                                                    {sub.status === 'no_subscription' ? 'No Subscription' : 
                                                     sub.status === 'paid' ? 'Active' :
                                                     sub.status === 'created' ? 'Inactive' :
                                                     sub.status.charAt(0).toUpperCase() + sub.status.slice(1)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {getPaymentMethod(sub)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {getPaymentStatus(sub)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {formatDate(sub.createdAt)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        
                        {/* Pagination */}
                        {pagination.totalPages > 1 && (
                            <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
                                <div className="flex flex-1 justify-between sm:hidden">
                                    <button
                                        onClick={() => handlePageChange(pagination.page - 1)}
                                        disabled={pagination.page === 1}
                                        className={`relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium ${pagination.page === 1 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-700 hover:bg-gray-50'}`}
                                    >
                                        Previous
                                    </button>
                                    <button
                                        onClick={() => handlePageChange(pagination.page + 1)}
                                        disabled={pagination.page === pagination.totalPages}
                                        className={`relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium ${pagination.page === pagination.totalPages ? 'text-gray-300 cursor-not-allowed' : 'text-gray-700 hover:bg-gray-50'}`}
                                    >
                                        Next
                                    </button>
                                </div>
                                <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                                    <div>
                                        <p className="text-sm text-gray-700">
                                            Showing <span className="font-medium">{(pagination.page - 1) * filters.limit + 1}</span> to{' '}
                                            <span className="font-medium">{Math.min(pagination.page * filters.limit, pagination.total)}</span> of{' '}
                                            <span className="font-medium">{pagination.total}</span> results
                                        </p>
                                    </div>
                                    <div>
                                        <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                                            <button
                                                onClick={() => handlePageChange(pagination.page - 1)}
                                                disabled={pagination.page === 1}
                                                className={`relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 ${pagination.page === 1 ? 'cursor-not-allowed' : ''}`}
                                            >
                                                <span className="sr-only">Previous</span>
                                                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                    <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
                                                </svg>
                                            </button>
                                            
                                            {/* Page numbers */}
                                            {[...Array(pagination.totalPages)].map((_, i) => {
                                                const pageNum = i + 1;
                                                if (
                                                    pageNum === 1 ||
                                                    pageNum === pagination.totalPages ||
                                                    (pageNum >= pagination.page - 1 && pageNum <= pagination.page + 1)
                                                ) {
                                                    return (
                                                        <button
                                                            key={pageNum}
                                                            onClick={() => handlePageChange(pageNum)}
                                                            className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${pageNum === pagination.page ? 'z-10 bg-indigo-600 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600' : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50'}`}
                                                        >
                                                            {pageNum}
                                                        </button>
                                                    );
                                                } else if (pageNum === pagination.page - 2 || pageNum === pagination.page + 2) {
                                                    return (
                                                        <span key={pageNum} className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-700 ring-1 ring-inset ring-gray-300">
                                                            ...
                                                        </span>
                                                    );
                                                }
                                                return null;
                                            })}
                                            
                                            <button
                                                onClick={() => handlePageChange(pagination.page + 1)}
                                                disabled={pagination.page === pagination.totalPages}
                                                className={`relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 ${pagination.page === pagination.totalPages ? 'cursor-not-allowed' : ''}`}
                                            >
                                                <span className="sr-only">Next</span>
                                                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                    <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                                                </svg>
                                            </button>
                                        </nav>
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                ) : (
                    <p className="text-gray-600 text-center py-4">No subscriptions found.</p>
                )}
            </div>
        </div>
    );
};

export default AdminSubscriptionManagementPage;
