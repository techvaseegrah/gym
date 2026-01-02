// client/src/pages/AdminSubscriptionManagementPage.js

import React, { useState, useEffect } from 'react';
import api from '../api/api';
import { exportToExcel, exportToPDF } from '../utils/exportUtils';

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
        planType: 'fixed_commitment',
        startDate: '',
        endDate: '',
        status: 'paid',
        initialPaymentAmount: '',
        customFee: '',
        customDuration: ''
    });
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [pendingSubscription, setPendingSubscription] = useState(null);
        // Installment payment state
        const [showInstallmentForm, setShowInstallmentForm] = useState(false);
        const [showSubscriptionDetails, setShowSubscriptionDetails] = useState(false);
        const [showEditForm, setShowEditForm] = useState(false);
        const [installmentAmount, setInstallmentAmount] = useState('');
        const [selectedSubscription, setSelectedSubscription] = useState(null);
        const [processing, setProcessing] = useState(false);
        const [installmentError, setInstallmentError] = useState('');
        const [fighterPaymentStatus, setFighterPaymentStatus] = useState(null);
        const [paymentMethod, setPaymentMethod] = useState('upi'); // 'upi' or 'cash'
        const [cashPaymentNotes, setCashPaymentNotes] = useState('');
        // Popup notification state
        const [popup, setPopup] = useState({ show: false, message: '', type: '' });
        // Export state
        const [exportLoading, setExportLoading] = useState({ excel: false, pdf: false });
    
    // Pagination and filtering states
    const [pagination, setPagination] = useState({
        page: 1,
        totalPages: 1,
        total: 0
    });
    
    const [filters, setFilters] = useState({
        planType: '',
        status: '',
        search: '',
        limit: 20
    });

    const planDetails = {
        free: { name: 'Free Plan', price: 0 },
        fixed_commitment: { name: 'Quarterly Membership', totalFee: 4000, description: 'Fixed 3-month package with flexible installments' },
        custom: { name: 'Custom Plan', description: 'Custom fee and duration plan' }
    };

    const statusOptions = [
        { value: '', label: 'All Statuses' },
        { value: 'paid', label: 'Paid' },
        { value: 'partial_payment', label: 'Partial Payment' },
        { value: 'active', label: 'Active' },
        { value: 'inactive', label: 'Inactive' },
        { value: 'expired', label: 'Expired' },
        { value: 'cancelled', label: 'Cancelled' },
        { value: 'no_subscription', label: 'No Subscription' }
    ];

    const planTypeOptions = [
        { value: '', label: 'All Plans' },
        { value: 'free', label: 'Free' },
        { value: 'fixed_commitment', label: 'Fixed Commitment' },
        { value: 'custom', label: 'Custom' }
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
                ...(filters.search && { search: filters.search }),
                ...((filters.status && filters.status !== 'no_subscription' && filters.status !== 'active' && filters.status !== 'inactive' && filters.status !== 'partial_payment' && filters.status !== 'paid' && filters.status !== 'cancelled') && { status: filters.status })
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
                const params = new URLSearchParams({
                    page: pagination.page,
                    limit: filters.limit,
                    ...(filters.planType && { planType: filters.planType }),
                    ...(filters.search && { search: filters.search }),
                    status: 'paid'
                }).toString();
                const res = await api.get(`/subscriptions/all?${params}`);
                setAllSubscriptions(res.data.subscriptions);
                setPagination({
                    page: res.data.currentPage,
                    totalPages: res.data.totalPages,
                    total: res.data.total
                });
            }
            // Special handling for "Inactive" filter
            else if (filters.status === 'inactive') {
                const params = new URLSearchParams({
                    page: pagination.page,
                    limit: filters.limit,
                    ...(filters.planType && { planType: filters.planType }),
                    ...(filters.search && { search: filters.search }),
                    status: 'created'
                }).toString();
                const res = await api.get(`/subscriptions/all?${params}`);
                setAllSubscriptions(res.data.subscriptions);
                setPagination({
                    page: res.data.currentPage,
                    totalPages: res.data.totalPages,
                    total: res.data.total
                });
            }
            // Special handling for "Paid" filter
            else if (filters.status === 'paid') {
                const params = new URLSearchParams({
                    page: pagination.page,
                    limit: filters.limit,
                    ...(filters.planType && { planType: filters.planType }),
                    ...(filters.search && { search: filters.search }),
                    status: 'paid'
                }).toString();
                const res = await api.get(`/subscriptions/all?${params}`);
                setAllSubscriptions(res.data.subscriptions);
                setPagination({
                    page: res.data.currentPage,
                    totalPages: res.data.totalPages,
                    total: res.data.total
                });
            }
            // Special handling for "Partial Payment" filter
            else if (filters.status === 'partial_payment') {
                const params = new URLSearchParams({
                    page: pagination.page,
                    limit: filters.limit,
                    ...(filters.planType && { planType: filters.planType }),
                    ...(filters.search && { search: filters.search }),
                    status: 'partial_payment'
                }).toString();
                const res = await api.get(`/subscriptions/all?${params}`);
                setAllSubscriptions(res.data.subscriptions);
                setPagination({
                    page: res.data.currentPage,
                    totalPages: res.data.totalPages,
                    total: res.data.total
                });
            }
            // Special handling for "Cancelled" filter
            else if (filters.status === 'cancelled') {
                const params = new URLSearchParams({
                    page: pagination.page,
                    limit: filters.limit,
                    ...(filters.planType && { planType: filters.planType }),
                    ...(filters.search && { search: filters.search }),
                    status: 'cancelled'
                }).toString();
                const res = await api.get(`/subscriptions/all?${params}`);
                setAllSubscriptions(res.data.subscriptions);
                setPagination({
                    page: res.data.currentPage,
                    totalPages: res.data.totalPages,
                    total: res.data.total
                });
            }
            // Special handling for "Expired" filter
            else if (filters.status === 'expired') {
                const params = new URLSearchParams({
                    page: pagination.page,
                    limit: filters.limit,
                    ...(filters.planType && { planType: filters.planType }),
                    ...(filters.search && { search: filters.search }),
                    status: 'expired'
                }).toString();
                const res = await api.get(`/subscriptions/all?${params}`);
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
                const params = new URLSearchParams({
                    page: pagination.page,
                    limit: filters.limit,
                    ...(filters.planType && { planType: filters.planType }),
                    ...(filters.search && { search: filters.search })
                }).toString();
                const res = await api.get(`/subscriptions/all?${params}`);
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
            console.log('=== Starting manual subscription creation ===');
            console.log('Current manualSubscription state:', manualSubscription);
            
            // Calculate end date based on plan type
            const startDate = new Date(manualSubscription.startDate);
            let endDate;
            
            if (manualSubscription.planType === 'free') {
                // For free plan, set end date to distant future (99 years) to match backend logic
                endDate = new Date(startDate);
                endDate.setFullYear(endDate.getFullYear() + 99);
                console.log('Setting end date for free plan to distant future:', endDate);
            } else {
                // For paid plans, use the manually set end date
                endDate = new Date(manualSubscription.endDate);
                console.log('Using provided end date for paid plan:', endDate);
            }
            
            // Log the data being sent for debugging
            const requestData = {
                fighterId: manualSubscription.fighterId,
                planType: manualSubscription.planType,
                startDate: manualSubscription.startDate,
                endDate: endDate.toISOString().split('T')[0], // Format as YYYY-MM-DD
                status: manualSubscription.status
            };
            
            // For fixed commitment plans, include initial payment amount
            if (manualSubscription.planType === 'fixed_commitment' && manualSubscription.initialPaymentAmount) {
                requestData.initialPaymentAmount = parseFloat(manualSubscription.initialPaymentAmount);
            }
            
            // For custom plans, include custom fee and duration
            if (manualSubscription.planType === 'custom') {
                requestData.customFee = parseFloat(manualSubscription.customFee);
                requestData.customDuration = parseInt(manualSubscription.customDuration);
                
                // If initial payment amount is provided, include it
                if (manualSubscription.initialPaymentAmount) {
                    requestData.initialPaymentAmount = parseFloat(manualSubscription.initialPaymentAmount);
                }
            }
            
            console.log('Prepared request data:', requestData);
            
            // Also log the raw data before processing
            console.log('Raw manualSubscription data:', manualSubscription);
            
            // Validate dates before sending
            console.log('Validating dates...');
            console.log('Start date string:', manualSubscription.startDate);
            console.log('Parsed start date:', startDate);
            console.log('Is start date valid?', !isNaN(startDate.getTime()));
            
            if (manualSubscription.planType !== 'free') {
                console.log('End date string:', manualSubscription.endDate);
                console.log('Parsed end date:', endDate);
                console.log('Is end date valid?', !isNaN(endDate.getTime()));
            }
            
            console.log('Sending POST request to /subscriptions/admin-create');
            console.log('Request payload:', JSON.stringify(requestData, null, 2));
            
            // SPECIAL DEBUGGING: Log each field individually
            console.log('=== FIELD DEBUGGING ===');
            console.log('fighterId:', requestData.fighterId, typeof requestData.fighterId);
            console.log('planType:', requestData.planType, typeof requestData.planType);
            console.log('startDate:', requestData.startDate, typeof requestData.startDate);
            console.log('endDate:', requestData.endDate, typeof requestData.endDate);
            console.log('status:', requestData.status, typeof requestData.status);
            
            const res = await api.post(`/subscriptions/admin-create`, requestData);
            
            console.log('Received successful response:', res.data);
            
            // Show success message in popup instead of alert
            setSuccessMessage('Subscription created successfully!');
            setShowManualForm(false);
            setManualSubscription({
                fighterId: '',
                planType: 'fixed_commitment',
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
            console.error('=== ERROR in handleCreateManualSubscription ===');
            console.error('Error creating subscription:', err);
            console.error('Full error details:', err.response);
            console.error('Error status:', err.response?.status);
            console.error('Error data:', err.response?.data);
            
            // Prepare request data for potential confirmation dialog
            const requestData = {
                fighterId: manualSubscription.fighterId,
                planType: manualSubscription.planType,
                startDate: manualSubscription.startDate,
                endDate: manualSubscription.planType === 'free' 
                    ? new Date(new Date(manualSubscription.startDate).setFullYear(new Date(manualSubscription.startDate).getFullYear() + 99)).toISOString().split('T')[0]
                    : manualSubscription.endDate,
                status: manualSubscription.status
            };
            
            // Handle the new active subscription warning
            if (err.response?.status === 400 && err.response?.data?.msg?.includes('active subscription')) {
                // Fetch fighter's payment status to get unpaid balance info
                try {
                    const paymentStatusRes = await api.get(`/subscriptions/check-payment-status/${manualSubscription.fighterId}`);
                    const paymentStatus = paymentStatusRes.data;
                    
                    // Store the pending subscription data and show confirmation dialog
                    setPendingSubscription({
                        requestData,
                        errorMessage: err.response?.data?.msg,
                        paymentStatus: paymentStatus
                    });
                    setShowConfirmation(true);
                } catch (paymentErr) {
                    console.error('Error fetching payment status:', paymentErr);
                    // Store the pending subscription data and show confirmation dialog
                    setPendingSubscription({
                        requestData,
                        errorMessage: err.response?.data?.msg,
                        paymentStatus: null
                    });
                    setShowConfirmation(true);
                }
            } else if (err.response?.status === 400 && err.response?.data?.msg?.includes('unpaid balances')) {
                // Show popup for unpaid balance warning
                showPopup('Cannot create new subscription. Fighter has existing subscriptions with unpaid balances that must be settled first.', 'error');
            } else {
                setError('Failed to create subscription: ' + (err.response?.data?.msg || err.message));
            }
        }
    };
    
    // Function to force create subscription despite active subscription warning
    const handleForceCreateSubscription = async () => {
        if (!pendingSubscription) return;
        
        try {
            // Add a flag to force creation
            const requestData = {
                ...pendingSubscription.requestData,
                forceCreate: true // Flag to bypass active subscription check
            };
            
            // For fixed commitment plans, include initial payment amount
            if (requestData.planType === 'fixed_commitment' && requestData.initialPaymentAmount) {
                requestData.initialPaymentAmount = parseFloat(requestData.initialPaymentAmount);
            }
            
            // For custom plans, include custom fee and duration
            if (requestData.planType === 'custom') {
                requestData.customFee = parseFloat(requestData.customFee);
                requestData.customDuration = parseInt(requestData.customDuration);
                
                // If initial payment amount is provided, include it
                if (requestData.initialPaymentAmount) {
                    requestData.initialPaymentAmount = parseFloat(requestData.initialPaymentAmount);
                }
            }
            
            const res = await api.post(`/subscriptions/admin-create`, requestData);
            
            // Show success message
            setSuccessMessage('Subscription created successfully!');
            setShowConfirmation(false);
            setPendingSubscription(null);
            setShowManualForm(false);
            setManualSubscription({
                fighterId: '',
                planType: 'fixed_commitment',
                startDate: '',
                endDate: '',
                status: 'paid'
            });
            
            // Refresh subscriptions
            if (selectedFighter === pendingSubscription.requestData.fighterId) {
                fetchFighterSubscriptions(selectedFighter);
            }
            fetchAllSubscriptions();
        } catch (err) {
            console.error('Error force creating subscription:', err);
            if (err.response?.status === 400 && err.response?.data?.msg?.includes('unpaid balances')) {
                // Show popup for unpaid balance warning
                showPopup('Cannot create new subscription. Fighter has existing subscriptions with unpaid balances that must be settled first.', 'error');
                setShowConfirmation(false);
                setPendingSubscription(null);
            } else {
                setError('Failed to create subscription: ' + (err.response?.data?.msg || err.message));
                setShowConfirmation(false);
                setPendingSubscription(null);
            }
        }
    };
    
    // Function to cancel subscription creation
    const handleCancelSubscription = () => {
        setShowConfirmation(false);
        setPendingSubscription(null);
    };
    
    // Function to show popup notification
    const showPopup = (message, type = 'info') => {
        setPopup({ show: true, message, type });
        // Auto hide popup after 5 seconds
        setTimeout(() => {
            setPopup({ show: false, message: '', type: '' });
        }, 5000);
    };
    
    // Function to export fighter subscription report to Excel
    const exportFighterReportToExcel = async (fighterId) => {
        try {
            setExportLoading(prev => ({ ...prev, excel: true }));
            const res = await api.get(`/subscriptions/export-report/${fighterId}`);
            
            // Format data for export
            const exportData = res.data.subscriptions.map(sub => ({
                'Fighter Name': res.data.fighter.name,
                'Fighter RFID': res.data.fighter.rfid,
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
            setExportLoading(prev => ({ ...prev, excel: false }));
        }
    };
    
    // Function to export fighter subscription report to PDF
    const exportFighterReportToPDF = async (fighterId) => {
        try {
            setExportLoading(prev => ({ ...prev, pdf: true }));
            const res = await api.get(`/subscriptions/export-report/${fighterId}`);
            
            // Define columns for PDF
            const columns = [
                { header: 'Fighter', key: 'fighterName' },
                { header: 'RFID', key: 'fighterRFID' },
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
                fighterName: res.data.fighter.name,
                fighterRFID: res.data.fighter.rfid,
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
            setExportLoading(prev => ({ ...prev, pdf: false }));
        }
    };
    
    // Function to handle installment payment
    const handleInstallmentPayment = async () => {
        try {
            setProcessing(true);
            setInstallmentError('');
            
            // Check if installment limit has been reached
            if (selectedSubscription.installmentCount >= selectedSubscription.maxInstallments) {
                setInstallmentError(`Maximum number of installments (${selectedSubscription.maxInstallments}) reached for this subscription.`);
                setProcessing(false);
                return;
            }
            
            // Validate installment amount
            const amount = parseFloat(installmentAmount);
            if (!amount || amount <= 0) {
                setInstallmentError('Please enter a valid installment amount');
                setProcessing(false);
                return;
            }
            
            if (amount > selectedSubscription.remainingBalance) {
                setInstallmentError(`Installment amount cannot exceed remaining balance of ₹${selectedSubscription.remainingBalance}`);
                setProcessing(false);
                return;
            }
            
            // Handle cash payment
            if (paymentMethod === 'cash') {
                try {
                    // Record cash payment using admin endpoint
                    await api.post('/subscriptions/admin-record-cash-payment', {
                        subscriptionId: selectedSubscription._id,
                        paymentAmount: amount,
                        paymentNotes: cashPaymentNotes
                    });
                    
                    // Close the installment form
                    setShowInstallmentForm(false);
                    setInstallmentAmount('');
                    setSelectedSubscription(null);
                    setCashPaymentNotes('');
                    setPaymentMethod('upi');
                    
                    // Refresh subscription data
                    fetchAllSubscriptions();
                    
                    // Show success message
                    setSuccessMessage('Cash payment recorded successfully!');
                } catch (err) {
                    console.error('Error recording cash payment:', err);
                    setInstallmentError('Failed to record cash payment. Server error: ' + (err.response?.data?.msg || err.message));
                } finally {
                    setProcessing(false);
                }
                return;
            }
            
            // Handle UPI/Razorpay payment (existing logic)
            // Create installment order using admin endpoint
            const orderRes = await api.post('/subscriptions/admin-make-installment', {
                subscriptionId: selectedSubscription._id,
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
                description: `Installment Payment for ${planDetails[selectedSubscription.planType].name}`,
                order_id: orderId,
                handler: async function (response) {
                    try {
                        // Verify installment payment using admin endpoint
                        await api.post('/subscriptions/admin-verify-installment', {
                            razorpayOrderId: response.razorpay_order_id,
                            razorpayPaymentId: response.razorpay_payment_id,
                            razorpaySignature: response.razorpay_signature,
                            subscriptionId: subscriptionId
                        });
                        
                        // Close the installment form
                        setShowInstallmentForm(false);
                        setInstallmentAmount('');
                        setSelectedSubscription(null);
                        
                        // Refresh subscription data
                        fetchAllSubscriptions();
                        
                        // Show success message
                        setSuccessMessage('Installment payment successful!');
                    } catch (err) {
                        console.error('Error verifying installment payment:', err);
                        setInstallmentError('Installment payment verification failed. Please contact support.');
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
                setInstallmentError(`Payment failed: ${response.error.description}`);
                setProcessing(false);
            });
            
            rzp.open();
        } catch (err) {
            console.error('Error creating installment order:', err);
            if (err.response) {
                setInstallmentError('Failed to initiate installment payment. Server error: ' + (err.response.data?.msg || err.response.data?.error || err.response.statusText || 'Unknown server error'));
            } else if (err.request) {
                setInstallmentError('Failed to initiate installment payment. Network error: No response from server.');
            } else {
                setInstallmentError('Failed to initiate installment payment. Error: ' + (err.message || 'Unknown error'));
            }
        } finally {
            setProcessing(false);
        }
    };
    
    // Function to open installment form for a subscription
    const openInstallmentForm = (subscription) => {
        setSelectedSubscription(subscription);
        setShowInstallmentForm(true);
    };
    
    // Function to close installment form
    const closeInstallmentForm = () => {
        setShowInstallmentForm(false);
        setInstallmentAmount('');
        setSelectedSubscription(null);
        setInstallmentError('');
        setPaymentMethod('upi');
        setCashPaymentNotes('');
    };
    
    // Function to open subscription details
    const openSubscriptionDetails = (subscription) => {
        setSelectedSubscription(subscription);
        setShowSubscriptionDetails(true);
    };
    
    // Function to close subscription details
    const closeSubscriptionDetails = () => {
        setShowSubscriptionDetails(false);
        setSelectedSubscription(null);
    };
    
    // Function to open edit subscription form
    const openEditSubscriptionForm = (subscription) => {
        setSelectedSubscription(subscription);
        setShowEditForm(true);
    };
    
    // Function to close edit subscription form
    const closeEditForm = () => {
        setShowEditForm(false);
        setSelectedSubscription(null);
    };
    
    const handlePageChange = (newPage) => {
        setPagination(prev => ({
            ...prev,
            page: newPage
        }));
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
    
    // Function to check fighter's payment status
    const checkFighterPaymentStatus = async (fighterId) => {
        try {
            const res = await api.get(`/subscriptions/check-payment-status/${fighterId}`);
            setFighterPaymentStatus(res.data);
            return res.data;
        } catch (err) {
            console.error('Error checking fighter payment status:', err);
            setFighterPaymentStatus(null);
            return null;
        }
    };
    
    // Function to handle fighter selection and check payment status
    const handleFighterSelection = async (fighterId) => {
        setSelectedFighter(fighterId);
        if (fighterId) {
            await checkFighterPaymentStatus(fighterId);
        } else {
            setFighterPaymentStatus(null);
        }
    };
    
    // Function to handle plan selection
    const handlePlanSelection = (plan) => {
        setSelectedPlan(plan);
    };
    
    // Function to create subscription based on fighter's payment status
    const handleCreateSubscription = async () => {
        if (selectedFighter && selectedPlan) {
            // Check fighter's payment status first
            const paymentStatus = await checkFighterPaymentStatus(selectedFighter);
            
            // Set default dates
            const today = new Date();
            const endDate = new Date(today);
            
            if (selectedPlan === 'fixed_commitment') {
                // For fixed commitment plan, set end date to 3 months from start
                endDate.setMonth(endDate.getMonth() + 3);
            } else if (selectedPlan === 'free') {
                // For free plan, set end date to distant future (99 years)
                // This reflects the backend logic where free plans are indefinite
                endDate.setFullYear(endDate.getFullYear() + 99);
            } else if (selectedPlan === 'custom') {
                // For custom plan, we'll let the admin set the end date manually in the form
                // Set a default of 1 month for now
                endDate.setMonth(endDate.getMonth() + 1);
            }
            
            // If fighter has made payments and has a fixed commitment plan, we should update that plan
            if (paymentStatus && paymentStatus.hasMadePayments && paymentStatus.hasFixedCommitment && selectedPlan === 'fixed_commitment') {
                // Instead of preventing creation, open the installment form for the existing plan
                openInstallmentForm(paymentStatus.fixedCommitmentSub);
                return;
            }
            
            // If fighter already has a subscription but hasn't made payments, allow admin to create a new one
            // The backend will handle the conflict with a warning dialog
            
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
    };

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
    
    // Function to determine the current active subscription from the subscriptions list
    const getCurrentSubscription = (subs) => {
        if (!subs || subs.length === 0) return null;
        
        const now = new Date();
        // Sort by creation date descending to get the most recent first
        const sortedSubs = [...subs].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        
        // First check for active paid subscriptions
        for (const sub of sortedSubs) {
            if (sub.status === 'paid' && 
                new Date(sub.startDate) <= now && 
                new Date(sub.endDate) >= now) {
                return sub;
            }
        }
        
        // Then check for fixed commitment and custom plans with partial payments
        for (const sub of sortedSubs) {
            if ((sub.planType === 'fixed_commitment' || sub.planType === 'custom') && 
                sub.status === 'partial_payment' &&
                new Date(sub.startDate) <= now && 
                new Date(sub.endDate) >= now) {
                return sub;
            }
        }
        
        // Then check for free plans (which are always considered active)
        for (const sub of sortedSubs) {
            if (sub.status === 'paid' && sub.planType === 'free') {
                return sub;
            }
        }
        
        return null;
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
            {/* Success Popup Notification - Centered Modal */}
            {successMessage && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                    <div className="bg-green-500 text-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4 transform transition-all duration-300 scale-100">
                        <div className="flex flex-col items-center text-center">
                            <span className="text-4xl mb-3">✅</span>
                            <p className="text-lg font-medium">{successMessage}</p>
                            <button 
                                onClick={() => setSuccessMessage('')}
                                className="mt-4 px-4 py-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg font-medium transition-all"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Confirmation Dialog - Centered Modal */}
            {showConfirmation && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md transform transition-all duration-300 scale-100">
                        <div className="flex flex-col items-center text-center mb-4">
                            <div className="flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100 mb-3">
                                <svg className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </div>
                            <h3 className="text-lg leading-6 font-medium text-gray-900">
                                Active Subscription Found
                            </h3>
                            <div className="mt-2">
                                <p className="text-sm text-gray-500">
                                    The selected fighter already has an active subscription. Are you sure you want to create another subscription?
                                </p>
                            </div>
                            {pendingSubscription?.paymentStatus && (
                                <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-left">
                                    <p className="text-sm font-medium text-yellow-800 mb-1">Payment Details:</p>
                                    <ul className="text-sm text-gray-700 space-y-1">
                                        <li className="flex justify-between">
                                            <span>Total Paid:</span>
                                            <span className="font-medium">₹{pendingSubscription.paymentStatus.totalPaidAmount}</span>
                                        </li>
                                        <li className="flex justify-between">
                                            <span>Has Made Payments:</span>
                                            <span className="font-medium">{pendingSubscription.paymentStatus.hasMadePayments ? 'Yes' : 'No'}</span>
                                        </li>
                                        {pendingSubscription.paymentStatus.hasFixedCommitment && (
                                            <li className="flex justify-between">
                                                <span>Has Fixed Commitment:</span>
                                                <span className="font-medium">Yes</span>
                                            </li>
                                        )}
                                    </ul>
                                </div>
                            )}
                        </div>
                        <div className="mt-5 sm:mt-4 flex flex-col sm:flex-row-reverse gap-3">
                            <button
                                type="button"
                                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:w-auto sm:text-sm"
                                onClick={handleForceCreateSubscription}
                            >
                                Create Anyway
                            </button>
                            <button
                                type="button"
                                className="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:w-auto sm:text-sm"
                                onClick={handleCancelSubscription}
                            >
                                Cancel
                            </button>
                        </div>
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
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold text-gray-800">Create/Update Subscription</h2>
                    {selectedFighter && (
                        <div className="flex space-x-2">
                            <button 
                                onClick={() => exportFighterReportToExcel(selectedFighter)}
                                disabled={exportLoading.excel}
                                className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm flex items-center disabled:opacity-50"
                            >
                                {exportLoading.excel ? 'Exporting...' : 'Export Excel'}
                            </button>
                            <button 
                                onClick={() => exportFighterReportToPDF(selectedFighter)}
                                disabled={exportLoading.pdf}
                                className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm flex items-center disabled:opacity-50"
                            >
                                {exportLoading.pdf ? 'Exporting...' : 'Export PDF'}
                            </button>
                            <button 
                                onClick={() => {
                                    // Navigate to fighter details page
                                    window.location.href = `/fighters/${selectedFighter}`;
                                }}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm flex items-center disabled:opacity-50"
                            >
                                View Fighter
                            </button>
                        </div>
                    )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Select Fighter</label>
                        <select
                            value={selectedFighter}
                            onChange={(e) => handleFighterSelection(e.target.value)}
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
                            onChange={(e) => handlePlanSelection(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="">Select a plan</option>
                            <option value="fixed_commitment">Quarterly Membership (₹4000)</option>
                            <option value="free">Free (₹0)</option>
                            <option value="custom">Custom Plan</option>
                        </select>
                    </div>
                    
                    <div className="flex items-end">
                        <button
                            onClick={handleCreateSubscription}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
                        >
                            Create Subscription
                        </button>
                    </div>
                </div>
                
                {/* Fighter Payment Status Display */}
                {selectedFighter && fighterPaymentStatus && (
                    <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <h4 className="font-semibold text-blue-800 mb-2">Fighter Payment Status</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                            <div>
                                <span className="font-medium">Total Paid:</span> ₹{fighterPaymentStatus.totalPaidAmount}
                            </div>
                            <div>
                                <span className="font-medium">Has Made Payments:</span> {fighterPaymentStatus.hasMadePayments ? 'Yes' : 'No'}
                            </div>
                            <div>
                                <span className="font-medium">Has Fixed Commitment:</span> {fighterPaymentStatus.hasFixedCommitment ? 'Yes' : 'No'}
                            </div>
                        </div>
                    </div>
                )}
                
                {/* Current Subscription Display for Selected Fighter */}
                {selectedFighter && (
                    <div className="mt-6 pt-6 border-t border-gray-200">
                        <h3 className="text-lg font-medium text-gray-800 mb-4">Current Subscription</h3>
                        {loadingSubscriptions ? (
                            <div className="flex justify-center items-center py-4">
                                <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500"></div>
                                <span className="ml-2 text-gray-600">Loading current subscription...</span>
                            </div>
                        ) : subscriptions.length > 0 ? (
                            (() => {
                                const currentSub = getCurrentSubscription(subscriptions);
                                return currentSub ? (
                                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                                            <div>
                                                <h4 className="font-semibold text-lg">{planDetails[currentSub.planType]?.name || currentSub.planType}</h4>
                                                <p className="text-gray-600">Amount: {currentSub.planType === 'fixed_commitment' ? `₹${currentSub.paidAmount} of ₹${currentSub.totalFee}` : `₹${currentSub.amount}`}</p>
                                                <p className="text-gray-600">Period: {formatPeriod(currentSub.startDate, currentSub.endDate, currentSub.planType)}</p>
                                                {(currentSub.planType === 'fixed_commitment' || currentSub.planType === 'custom') && (
                                                    <p className="text-gray-600">Installments: {currentSub.installmentCount || 0} of {currentSub.maxInstallments || 4}</p>
                                                )}
                                            </div>
                                            <div className="mt-2 md:mt-0">
                                                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(currentSub.status)}`}>
                                                    {currentSub.status.charAt(0).toUpperCase() + currentSub.status.slice(1)}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="mt-3 p-3 bg-green-100 rounded-lg">
                                            <p className="text-green-700 font-medium">✅ Active subscription</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                                        <p className="text-yellow-700">No active subscription found for this fighter.</p>
                                    </div>
                                );
                            })()
                        ) : (
                            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                                <p className="text-gray-600">No subscription history found for this fighter.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
            
            {/* Manual Subscription Form */}
            {showManualForm && (
                <div className="bg-white rounded-lg shadow-md p-6 mb-8">
                    <h2 className="text-xl font-semibold mb-4 text-gray-800">Manual Subscription Details</h2>
                    <form onSubmit={(e) => {
                        console.log('=== Form submit event triggered ===');
                        console.log('Event object:', e);
                        console.log('Event type:', e.type);
                        handleCreateManualSubscription(e);
                    }}>
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
                                    onChange={(e) => {
                                        handleManualSubscriptionChange(e);
                                        
                                        // When changing plan type, update end date accordingly
                                        const newPlanType = e.target.value;
                                        const today = new Date();
                                        const newEndDate = new Date(today);
                                        
                                        if (newPlanType === 'fixed_commitment') {
                                            // For fixed commitment plan, set end date to 3 months from start
                                            newEndDate.setMonth(newEndDate.getMonth() + 3);
                                        } else if (newPlanType === 'free') {
                                            // For free plan, set end date to distant future (99 years)
                                            newEndDate.setFullYear(newEndDate.getFullYear() + 99);
                                        } else if (newPlanType === 'custom') {
                                            // For custom plan, we'll let the admin set the end date manually
                                            // So we don't change the end date automatically
                                            return;
                                        }
                                        
                                        setManualSubscription(prev => ({
                                            ...prev,
                                            endDate: newEndDate.toISOString().split('T')[0]
                                        }));
                                    }}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="fixed_commitment">Quarterly Membership (₹4000)</option>
                                    <option value="free">Free (Indefinite)</option>
                                    <option value="custom">Custom Plan</option>
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
                                    // Make endDate required only for paid plans, not for free plans
                                    required={manualSubscription.planType !== 'free'}
                                    // Disable end date for free plan since it's indefinite
                                    disabled={manualSubscription.planType === 'free'}
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
                            
                            {/* Initial Payment Amount for Fixed Commitment Plans */}
                            {manualSubscription.planType === 'fixed_commitment' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Initial Payment Amount (₹)</label>
                                    <input
                                        type="number"
                                        name="initialPaymentAmount"
                                        min="500"
                                        max="4000"
                                        placeholder="Enter amount (₹500-₹4000)"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                        value={manualSubscription.initialPaymentAmount || ''}
                                        onChange={handleManualSubscriptionChange}
                                    />
                                    <p className="mt-1 text-xs text-gray-500">Enter initial payment amount for this fixed commitment plan</p>
                                </div>
                            )}
                            
                            {/* Custom Plan Fields */}
                            {manualSubscription.planType === 'custom' && (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Custom Fee (₹)</label>
                                        <input
                                            type="number"
                                            name="customFee"
                                            min="1"
                                            placeholder="Enter custom fee amount"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                            value={manualSubscription.customFee || ''}
                                            onChange={handleManualSubscriptionChange}
                                        />
                                    </div>
                                    
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Duration (months)</label>
                                        <input
                                            type="number"
                                            name="customDuration"
                                            min="1"
                                            placeholder="Enter duration in months"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                            value={manualSubscription.customDuration || ''}
                                            onChange={handleManualSubscriptionChange}
                                        />
                                    </div>
                                    
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Initial Payment Amount (₹)</label>
                                        <input
                                            type="number"
                                            name="initialPaymentAmount"
                                            min="1"
                                            placeholder="Enter initial payment amount"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                            value={manualSubscription.initialPaymentAmount || ''}
                                            onChange={handleManualSubscriptionChange}
                                        />
                                        <p className="mt-1 text-xs text-gray-500">Enter initial payment amount for this custom plan</p>
                                    </div>
                                </>
                            )}
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
                        <input
                            type="text"
                            placeholder="Search fighters..."
                            value={filters.search}
                            onChange={(e) => handleFilterChange('search', e.target.value)}
                            className="w-full sm:w-auto px-3 py-1 border border-gray-300 rounded-md text-sm"
                        />
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
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
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
                                                {getAmountDisplay(sub)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {sub.startDate ? formatPeriod(sub.startDate, sub.endDate, sub.planType) : 'N/A'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getExtendedStatusColor(sub.status)}`}>
                                                    {getStatusDisplayText(sub.status)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {getPaymentMethod(sub)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {getPaymentStatus(sub)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                <button
                                                    onClick={() => openSubscriptionDetails(sub)}
                                                    className="bg-blue-500 hover:bg-blue-600 text-white text-xs font-medium py-1 px-2 rounded transition-colors mr-2"
                                                >
                                                    View Details
                                                </button>
                                                {(sub.planType === 'fixed_commitment' || sub.planType === 'custom') && (
                                                    <button
                                                        onClick={() => openInstallmentForm(sub)}
                                                        className="bg-yellow-500 hover:bg-yellow-600 text-white text-xs font-medium py-1 px-2 rounded transition-colors"
                                                    >
                                                        Add Installment
                                                    </button>
                                                )}
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
                        
                        {/* Installment Payment Form Modal */}
                        {showInstallmentForm && selectedSubscription && (
                            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                                <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
                                    <div className="p-6">
                                        <div className="flex justify-between items-center mb-4">
                                            <h3 className="text-lg font-semibold text-gray-900">Pay Installment</h3>
                                            <button 
                                                onClick={closeInstallmentForm}
                                                className="text-gray-400 hover:text-gray-500"
                                            >
                                                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            </button>
                                        </div>
                                        
                                        {installmentError && (
                                            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg">
                                                {installmentError}
                                            </div>
                                        )}
                                        
                                        <div className="mb-4">
                                            <p className="text-gray-600 mb-2">Current Balance: <span className="font-semibold">₹{selectedSubscription.remainingBalance}</span></p>
                                            <p className="text-gray-600 mb-2">Total Paid: <span className="font-semibold">₹{selectedSubscription.paidAmount}</span> of ₹{selectedSubscription.totalFee}</p>
                                            <p className="text-gray-600 mb-4">Installments: <span className="font-semibold">{selectedSubscription.installmentCount || 0} of {selectedSubscription.maxInstallments || 4}</span></p>
                                            
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Installment Amount (₹)
                                            </label>
                                            <input
                                                type="number"
                                                min="1"
                                                max={selectedSubscription.remainingBalance}
                                                placeholder={`Enter amount (₹1-₹${selectedSubscription.remainingBalance})`}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                                value={installmentAmount || ''}
                                                onChange={(e) => setInstallmentAmount(e.target.value)}
                                            />
                                            <p className="mt-2 text-sm text-gray-500">
                                                Enter any amount between ₹1 and ₹{selectedSubscription.remainingBalance}
                                            </p>
                                        </div>
                                        
                                        {/* Payment Method Selection */}
                                        <div className="mb-4">
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Payment Method
                                            </label>
                                            <div className="flex space-x-4">
                                                <label className="inline-flex items-center">
                                                    <input
                                                        type="radio"
                                                        className="form-radio"
                                                        name="paymentMethod"
                                                        value="upi"
                                                        checked={paymentMethod === 'upi'}
                                                        onChange={(e) => setPaymentMethod(e.target.value)}
                                                    />
                                                    <span className="ml-2">UPI/Razorpay</span>
                                                </label>
                                                <label className="inline-flex items-center">
                                                    <input
                                                        type="radio"
                                                        className="form-radio"
                                                        name="paymentMethod"
                                                        value="cash"
                                                        checked={paymentMethod === 'cash'}
                                                        onChange={(e) => setPaymentMethod(e.target.value)}
                                                    />
                                                    <span className="ml-2">Cash</span>
                                                </label>
                                            </div>
                                        </div>
                                        
                                        {/* Cash Payment Notes */}
                                        {paymentMethod === 'cash' && (
                                            <div className="mb-4">
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Payment Notes (Optional)
                                                </label>
                                                <textarea
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                                    placeholder="Add any notes about this cash payment..."
                                                    rows="3"
                                                    value={cashPaymentNotes}
                                                    onChange={(e) => setCashPaymentNotes(e.target.value)}
                                                />
                                            </div>
                                        )}
                                        
                                        <div className="flex justify-end space-x-3">
                                            <button
                                                onClick={closeInstallmentForm}
                                                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={handleInstallmentPayment}
                                                disabled={processing || !installmentAmount || installmentAmount <= 0 || installmentAmount > selectedSubscription.remainingBalance}
                                                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                {processing ? 'Processing...' : (paymentMethod === 'cash' ? 'Record Cash Payment' : 'Pay Installment')}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                ) : (
                    <p className="text-gray-600 text-center py-4">No subscriptions found.</p>
                )}
            </div>
            
            {/* Subscription Details Modal */}
            {showSubscriptionDetails && selectedSubscription && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-96 overflow-y-auto">
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-semibold text-gray-900">Subscription Details</h3>
                                <button 
                                    onClick={closeSubscriptionDetails}
                                    className="text-gray-400 hover:text-gray-500"
                                >
                                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                            
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Fighter</label>
                                        <p className="mt-1 text-sm text-gray-900">{selectedSubscription.fighterId?.name || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">RFID</label>
                                        <p className="mt-1 text-sm text-gray-900">{selectedSubscription.fighterId?.rfid || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Plan Type</label>
                                        <p className="mt-1 text-sm text-gray-900">{planDetails[selectedSubscription.planType]?.name || selectedSubscription.planType}</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Status</label>
                                        <p className="mt-1 text-sm text-gray-900">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getExtendedStatusColor(selectedSubscription.status)}`}>
                                                {getStatusDisplayText(selectedSubscription.status)}
                                            </span>
                                        </p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Total Fee</label>
                                        <p className="mt-1 text-sm text-gray-900">₹{selectedSubscription.totalFee || selectedSubscription.amount || 0}</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Paid Amount</label>
                                        <p className="mt-1 text-sm text-gray-900">₹{selectedSubscription.paidAmount || 0}</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Remaining Balance</label>
                                        <p className="mt-1 text-sm text-gray-900">₹{selectedSubscription.remainingBalance || 0}</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Installments</label>
                                        <p className="mt-1 text-sm text-gray-900">{selectedSubscription.installmentCount || 0} of {selectedSubscription.maxInstallments || 4}</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Max Installments</label>
                                        <p className="mt-1 text-sm text-gray-900">{selectedSubscription.maxInstallments || 4}</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Start Date</label>
                                        <p className="mt-1 text-sm text-gray-900">{formatDate(selectedSubscription.startDate)}</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">End Date</label>
                                        <p className="mt-1 text-sm text-gray-900">{formatDate(selectedSubscription.endDate)}</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Created At</label>
                                        <p className="mt-1 text-sm text-gray-900">{formatDate(selectedSubscription.createdAt)}</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Active</label>
                                        <p className="mt-1 text-sm text-gray-900">{selectedSubscription.isActive ? 'Yes' : 'No'}</p>
                                    </div>
                                </div>
                                
                                {/* Payment History */}
                                {selectedSubscription.paymentHistory && selectedSubscription.paymentHistory.length > 0 && (
                                    <div className="mt-6">
                                        <h4 className="text-md font-medium text-gray-900 mb-3">Payment History</h4>
                                        <div className="overflow-x-auto">
                                            <table className="min-w-full divide-y divide-gray-200">
                                                <thead className="bg-gray-50">
                                                    <tr>
                                                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                                                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Method</th>
                                                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Transaction ID</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="bg-white divide-y divide-gray-200">
                                                    {selectedSubscription.paymentHistory.map((payment, index) => (
                                                        <tr key={index}>
                                                            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">{formatDate(payment.date)}</td>
                                                            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">₹{payment.amount}</td>
                                                            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">{payment.paymentMethod || 'Online'}</td>
                                                            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">{payment.razorpayPaymentId || 'N/A'}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </div>
                            
                            <div className="mt-6 flex justify-end space-x-3">
                                <button
                                    onClick={async () => {
                                        if (window.confirm('Are you sure you want to cancel this subscription? This will deactivate the subscription and prevent the fighter from accessing gym features.')) {
                                            try {
                                                setProcessing(true);
                                                const response = await api.put(`/subscriptions/${selectedSubscription._id}/cancel`);
                                                
                                                if (response.status === 200) {
                                                    setPopup({ show: true, message: response.data.msg || 'Subscription cancelled successfully!', type: 'success' });
                                                    closeSubscriptionDetails();
                                                    fetchAllSubscriptions(); // Refresh the subscription list
                                                } else {
                                                    setPopup({ show: true, message: response.data?.msg || 'Failed to cancel subscription', type: 'error' });
                                                }
                                            } catch (error) {
                                                setPopup({ show: true, message: 'Error cancelling subscription', type: 'error' });
                                            } finally {
                                                setProcessing(false);
                                            }
                                        }
                                    }}
                                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-md transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => {
                                        closeSubscriptionDetails();
                                        openEditSubscriptionForm(selectedSubscription);
                                    }}
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition-colors"
                                >
                                    Edit
                                </button>
                                <button
                                    onClick={closeSubscriptionDetails}
                                    className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 font-medium rounded-md transition-colors"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Edit Subscription Form Modal */}
            {showEditForm && selectedSubscription && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-semibold text-gray-900">Edit Subscription</h3>
                                <button 
                                    onClick={closeEditForm}
                                    className="text-gray-400 hover:text-gray-500"
                                >
                                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                            
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Total Fee (₹)</label>
                                    <input
                                        type="number"
                                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                        value={selectedSubscription.totalFee || selectedSubscription.amount || ''}
                                        onChange={(e) => {
                                            const updatedSub = { ...selectedSubscription };
                                            updatedSub.totalFee = parseFloat(e.target.value);
                                            updatedSub.remainingBalance = (updatedSub.totalFee || 0) - (updatedSub.paidAmount || 0);
                                            setSelectedSubscription(updatedSub);
                                        }}
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Paid Amount (₹)</label>
                                    <input
                                        type="number"
                                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                        value={selectedSubscription.paidAmount || ''}
                                        onChange={(e) => {
                                            const updatedSub = { ...selectedSubscription };
                                            updatedSub.paidAmount = parseFloat(e.target.value);
                                            updatedSub.remainingBalance = (updatedSub.totalFee || updatedSub.amount || 0) - (updatedSub.paidAmount || 0);
                                            // Update status based on payment
                                            if (updatedSub.paidAmount >= (updatedSub.totalFee || updatedSub.amount || 0)) {
                                                updatedSub.status = 'paid';
                                            } else if (updatedSub.paidAmount > 0) {
                                                updatedSub.status = 'partial_payment';
                                            } else {
                                                updatedSub.status = 'unpaid';
                                            }
                                            setSelectedSubscription(updatedSub);
                                        }}
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Start Date</label>
                                    <input
                                        type="date"
                                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                        value={selectedSubscription.startDate ? new Date(selectedSubscription.startDate).toISOString().split('T')[0] : ''}
                                        onChange={(e) => {
                                            const updatedSub = { ...selectedSubscription };
                                            updatedSub.startDate = e.target.value;
                                            setSelectedSubscription(updatedSub);
                                        }}
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">End Date</label>
                                    <input
                                        type="date"
                                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                        value={selectedSubscription.endDate ? new Date(selectedSubscription.endDate).toISOString().split('T')[0] : ''}
                                        onChange={(e) => {
                                            const updatedSub = { ...selectedSubscription };
                                            updatedSub.endDate = e.target.value;
                                            setSelectedSubscription(updatedSub);
                                        }}
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Status</label>
                                    <select
                                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                        value={selectedSubscription.status}
                                        onChange={(e) => {
                                            const updatedSub = { ...selectedSubscription };
                                            updatedSub.status = e.target.value;
                                            setSelectedSubscription(updatedSub);
                                        }}
                                    >
                                        <option value="unpaid">Unpaid</option>
                                        <option value="partial_payment">Partial Payment</option>
                                        <option value="paid">Paid</option>
                                        <option value="expired">Expired</option>
                                    </select>
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Active</label>
                                    <div className="mt-1">
                                        <label className="inline-flex items-center">
                                            <input
                                                type="checkbox"
                                                className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                                                checked={selectedSubscription.isActive}
                                                onChange={(e) => {
                                                    const updatedSub = { ...selectedSubscription };
                                                    updatedSub.isActive = e.target.checked;
                                                    setSelectedSubscription(updatedSub);
                                                }}
                                            />
                                            <span className="ml-2">Subscription is active</span>
                                        </label>
                                    </div>
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Installment Count</label>
                                    <input
                                        type="number"
                                        min="0"
                                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                        value={selectedSubscription.installmentCount || 0}
                                        onChange={(e) => {
                                            const updatedSub = { ...selectedSubscription };
                                            updatedSub.installmentCount = parseInt(e.target.value) || 0;
                                            setSelectedSubscription(updatedSub);
                                        }}
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Max Installments</label>
                                    <input
                                        type="number"
                                        min="1"
                                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                        value={selectedSubscription.maxInstallments || 4}
                                        onChange={(e) => {
                                            const updatedSub = { ...selectedSubscription };
                                            updatedSub.maxInstallments = parseInt(e.target.value) || 4;
                                            setSelectedSubscription(updatedSub);
                                        }}
                                    />
                                </div>
                            </div>
                            
                            <div className="mt-6 flex justify-end space-x-3">
                                <button
                                    onClick={async () => {
                                        try {
                                            setProcessing(true);
                                            const response = await api.put(`/subscriptions/${selectedSubscription._id}`, {
                                                totalFee: selectedSubscription.totalFee,
                                                paidAmount: selectedSubscription.paidAmount,
                                                remainingBalance: selectedSubscription.remainingBalance,
                                                startDate: selectedSubscription.startDate,
                                                endDate: selectedSubscription.endDate,
                                                status: selectedSubscription.status,
                                                isActive: selectedSubscription.isActive,
                                                installmentCount: selectedSubscription.installmentCount,
                                                maxInstallments: selectedSubscription.maxInstallments
                                            });
                                            
                                            if (response.status === 200) {
                                                setPopup({ show: true, message: response.data.msg || 'Subscription updated successfully!', type: 'success' });
                                                closeEditForm();
                                                fetchAllSubscriptions(); // Refresh the subscription list
                                            } else {
                                                setPopup({ show: true, message: response.data?.msg || 'Failed to update subscription', type: 'error' });
                                            }
                                        } catch (error) {
                                            setPopup({ show: true, message: 'Error updating subscription', type: 'error' });
                                        } finally {
                                            setProcessing(false);
                                        }
                                    }}
                                    disabled={processing}
                                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-md transition-colors disabled:opacity-50"
                                >
                                    {processing ? 'Updating...' : 'Update Subscription'}
                                </button>
                                <button
                                    onClick={closeEditForm}
                                    className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 font-medium rounded-md transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            
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
        </div>
    );
};

export default AdminSubscriptionManagementPage;
