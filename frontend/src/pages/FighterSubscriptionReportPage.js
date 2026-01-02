import React, { useState, useEffect } from 'react';
import api from '../api/api';
import { exportToExcel, exportToPDF } from '../utils/exportUtils';

const FighterSubscriptionReportPage = () => {
    const [subscriptions, setSubscriptions] = useState([]);
    const [currentSubscription, setCurrentSubscription] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [exportLoading, setExportLoading] = useState(false);

    const planDetails = {
        fixed_commitment: { name: 'Quarterly Membership', price: 4000 },
        free: { name: 'Free Plan', price: 0 },
        custom: { name: 'Custom Plan', price: 'Variable' }
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
        if (!dateString) return 'N/A';
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
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    // Function to export data to Excel
    const exportToExcelHandler = async () => {
        try {
            setExportLoading(true);
            const res = await api.get('/subscriptions/export-my-report');
            
            // Format data for export
            const exportData = res.data.subscriptions.map(sub => ({
                'Plan Type': sub.planType,
                'Total Fee': sub.totalFee,
                'Paid Amount': sub.paidAmount,
                'Remaining Balance': sub.remainingBalance,
                'Start Date': sub.startDate,
                'End Date': sub.endDate,
                'Status': sub.status,
                'Active': sub.isActive,
                'Created At': sub.createdAt,
                'Payment History Count': sub.paymentHistoryCount
            }));
            
            exportToExcel(exportData, `subscription_report_${res.data.fighter.name}_${new Date().toISOString().slice(0, 10)}`, 'Subscription Report');
        } catch (err) {
            console.error('Error exporting to Excel:', err);
            setError('Failed to export to Excel');
        } finally {
            setExportLoading(false);
        }
    };
    
    // Function to export data to PDF
    const exportToPDFHandler = async () => {
        try {
            setExportLoading(true);
            const res = await api.get('/subscriptions/export-my-report');
            
            // Define columns for PDF
            const columns = [
                { header: 'Plan Type', key: 'planType' },
                { header: 'Total Fee', key: 'totalFee' },
                { header: 'Paid Amount', key: 'paidAmount' },
                { header: 'Remaining', key: 'remainingBalance' },
                { header: 'Start Date', key: 'startDate' },
                { header: 'End Date', key: 'endDate' },
                { header: 'Status', key: 'status' },
                { header: 'Active', key: 'isActive' },
                { header: 'Created', key: 'createdAt' }
            ];
            
            // Format data for export
            const exportData = res.data.subscriptions.map(sub => ({
                planType: sub.planType,
                totalFee: sub.totalFee,
                paidAmount: sub.paidAmount,
                remainingBalance: sub.remainingBalance,
                startDate: sub.startDate,
                endDate: sub.endDate,
                status: sub.status,
                isActive: sub.isActive,
                createdAt: sub.createdAt
            }));
            
            exportToPDF(exportData, columns, `subscription_report_${res.data.fighter.name}_${new Date().toISOString().slice(0, 10)}`, `Subscription Report - ${res.data.fighter.name}`);
        } catch (err) {
            console.error('Error exporting to PDF:', err);
            setError('Failed to export to PDF');
        } finally {
            setExportLoading(false);
        }
    };
    
    return (
        <div className="max-w-4xl mx-auto p-4">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-800">My Subscription Report</h1>
                <div className="flex space-x-2">
                    <button 
                        onClick={exportToExcelHandler}
                        disabled={exportLoading}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center disabled:opacity-50"
                    >
                        {exportLoading ? 'Exporting...' : 'Export Excel'}
                    </button>
                    <button 
                        onClick={exportToPDFHandler}
                        disabled={exportLoading}
                        className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center disabled:opacity-50"
                    >
                        {exportLoading ? 'Exporting...' : 'Export PDF'}
                    </button>
                </div>
            </div>
            
            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
                    {error}
                </div>
            )}
            
            {/* Current Subscription */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-8">
                <h2 className="text-xl font-semibold mb-4 text-gray-800">Current Subscription</h2>
                {currentSubscription ? (
                    <div className="border border-gray-200 rounded-lg p-6">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
                            <div>
                                <h3 className="font-semibold text-lg">{planDetails[currentSubscription.planType]?.name || currentSubscription.planType}</h3>
                                <p className="text-gray-600 mt-1">Plan Type: {currentSubscription.planType.charAt(0).toUpperCase() + currentSubscription.planType.slice(1)}</p>
                            </div>
                            <div className="mt-2 md:mt-0">
                                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(currentSubscription.status)}`}>
                                    {currentSubscription.status.charAt(0).toUpperCase() + currentSubscription.status.slice(1)}
                                </span>
                            </div>
                        </div>
                        
                        {/* Payment Details */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div className="p-3 bg-blue-50 rounded-lg">
                                <p className="text-sm text-gray-600">Total Fee</p>
                                <p className="text-lg font-semibold text-gray-800">₹{currentSubscription.totalFee || currentSubscription.amount}</p>
                            </div>
                            <div className="p-3 bg-green-50 rounded-lg">
                                <p className="text-sm text-gray-600">Amount Paid</p>
                                <p className="text-lg font-semibold text-gray-800">₹{currentSubscription.paidAmount || 0}</p>
                            </div>
                            <div className="p-3 bg-yellow-50 rounded-lg">
                                <p className="text-sm text-gray-600">Remaining Balance</p>
                                <p className="text-lg font-semibold text-gray-800">₹{currentSubscription.remainingBalance || (currentSubscription.totalFee - currentSubscription.paidAmount) || 0}</p>
                            </div>
                            <div className="p-3 bg-purple-50 rounded-lg">
                                <p className="text-sm text-gray-600">Payment Progress</p>
                                <p className="text-lg font-semibold text-gray-800">
                                    {currentSubscription.totalFee && currentSubscription.totalFee > 0 
                                        ? `${Math.round(((currentSubscription.paidAmount || 0) / currentSubscription.totalFee) * 100)}%` 
                                        : '0%'}
                                </p>
                            </div>
                        </div>
                        
                        {/* Progress Bar */}
                        {currentSubscription.totalFee && currentSubscription.totalFee > 0 && (
                            <div className="mb-4">
                                <div className="w-full bg-gray-200 rounded-full h-2.5">
                                    <div 
                                        className="bg-blue-600 h-2.5 rounded-full" 
                                        style={{ width: `${Math.min(100, Math.round(((currentSubscription.paidAmount || 0) / currentSubscription.totalFee) * 100))}%` }}
                                    ></div>
                                </div>
                                <div className="flex justify-between text-xs text-gray-500 mt-1">
                                    <span>0%</span>
                                    <span>100%</span>
                                </div>
                            </div>
                        )}
                        
                        {/* Period and Dates */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <p className="text-sm text-gray-600">Start Date</p>
                                <p className="font-medium">{formatDate(currentSubscription.startDate)}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">End Date</p>
                                <p className="font-medium">{formatDate(currentSubscription.endDate)}</p>
                            </div>
                        </div>
                        
                        {/* Status Message */}
                        {currentSubscription.status === 'paid' && (
                            <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
                                <p className="text-green-700 font-medium flex items-center">
                                    <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                    Your subscription is fully paid and active!
                                </p>
                            </div>
                        )}
                        {currentSubscription.status === 'partial_payment' && (
                            <div className="mt-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                                <p className="text-yellow-700 font-medium flex items-center">
                                    <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                    </svg>
                                    Partial payment received. Please complete remaining balance.
                                </p>
                            </div>
                        )}
                        {currentSubscription.status === 'active' && currentSubscription.planType === 'free' && (
                            <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                                <p className="text-blue-700 font-medium flex items-center">
                                    <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                    Your free plan subscription is active!
                                </p>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="border border-gray-200 rounded-lg p-6 text-center bg-gray-50">
                        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <h3 className="mt-2 text-lg font-medium text-gray-900">No Active Subscription</h3>
                        <p className="mt-1 text-gray-500">You don't have an active subscription. Contact admin to get started.</p>
                    </div>
                )}
            </div>
            
            {/* Subscription History */}
            <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold mb-4 text-gray-800">Subscription History</h2>
                {subscriptions.length > 0 ? (
                    <div className="space-y-4">
                        {subscriptions.map((sub) => (
                            <div key={sub._id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                                <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                                    <div className="flex-1">
                                        <h3 className="font-semibold text-lg">{planDetails[sub.planType]?.name || sub.planType}</h3>
                                        <p className="text-gray-600">Plan Type: {sub.planType.charAt(0).toUpperCase() + sub.planType.slice(1)}</p>
                                    </div>
                                    <div className="mt-2 md:mt-0">
                                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(sub.status)}`}>
                                            {sub.status.charAt(0).toUpperCase() + sub.status.slice(1)}
                                        </span>
                                    </div>
                                </div>
                                
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                                    <div>
                                        <p className="text-sm text-gray-600">Total Fee</p>
                                        <p className="font-medium">₹{sub.totalFee || sub.amount}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-600">Paid Amount</p>
                                        <p className="font-medium">₹{sub.paidAmount || 0}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-600">Remaining</p>
                                        <p className="font-medium">₹{sub.remainingBalance || (sub.totalFee - sub.paidAmount) || 0}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-600">Created</p>
                                        <p className="font-medium">{formatDate(sub.createdAt)}</p>
                                    </div>
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                                    <div>
                                        <p className="text-sm text-gray-600">Start Date</p>
                                        <p className="font-medium">{formatDate(sub.startDate)}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-600">End Date</p>
                                        <p className="font-medium">{formatDate(sub.endDate)}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-8">
                        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        <h3 className="mt-2 text-lg font-medium text-gray-900">No Subscription History</h3>
                        <p className="mt-1 text-gray-500">You haven't had any subscriptions yet.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default FighterSubscriptionReportPage;
