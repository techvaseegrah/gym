// client/src/pages/AdminSubscriptionManagementPage.js

import React, { useState, useEffect, useCallback, useRef } from 'react';
import api from '../api/api';
import { exportToExcel, exportToPDF } from '../utils/exportUtils';

const AdminSubscriptionManagementPage = ({ refreshUser }) => {
    const [fighters, setFighters] = useState([]);
    const [allFighters, setAllFighters] = useState([]); // Cache for all fighters
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
        department: '', // New department filter
        limit: 20
    });
    
    // State for department data
    const [departments, setDepartments] = useState([]);
    // State to toggle between fighters view and subscription history
    const [showSubscriptionHistory, setShowSubscriptionHistory] = useState(false);
    
    // Ref to hold current filters to avoid stale closures in debounced function
    const filtersRef = useRef();
    filtersRef.current = filters;

    const planDetails = {
        free: { name: 'Free Plan', price: 0 },
        fixed_commitment: { name: 'Quarterly Membership', totalFee: 4000, description: 'Fixed 3-month package with flexible installments' },
        custom: { name: 'Custom Plan', description: 'Custom fee and duration plan' }
    };
    
    // Department fee mapping - defaults, will be updated with actual department data
    const baseDepartmentFees = {
        'senior': 4000,
        'seniors': 4000,
        'junior': 4000,
        'silambam': 4000,
        'bharatanatyam': 3000
    };
    
    // Get fee for a specific department using live department data when available
    const getDepartmentFee = (department) => {
        if (!department) return 4000;
        
        // First, try to find the fee from the departments loaded from the backend
        const dept = departments.find(d => d.name.toLowerCase() === department.toLowerCase());
        if (dept && dept.feeStructure && dept.feeStructure.totalFee !== undefined) {
            return dept.feeStructure.totalFee;
        }
        
        // Fallback to base mapping
        const lowerDept = department.toLowerCase();
        return baseDepartmentFees[lowerDept] || 4000; // Default to 4000 if not found
    };
    

    
    // Get selected fighter's department fee
    const getSelectedFighterFee = () => {
        if (!selectedFighter) return 4000;
        const fighter = fighters.find(f => f._id === selectedFighter);
        return fighter ? getDepartmentFee(fighter.department) : 4000;
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
        // Make initial API calls with staggered loading to improve perceived performance
        const loadInitialData = async () => {
            setLoading(true); // Set loading state for initial load
            try {
                // Load essential data first (fighters and departments)
                await Promise.all([
                    fetchFighters(false), // Load fighters first to show the main table
                    fetchDepartments() // Load departments for filtering
                ]);
                
                // Load subscriptions in background after essential data is displayed
                setTimeout(async () => {
                    try {
                        await fetchAllSubscriptions();
                    } catch (err) {
                        console.error('Error fetching subscriptions:', err);
                        // Don't set error state for background task
                    }
                }, 100); // Small delay to ensure main UI renders first
            } catch (err) {
                console.error('Error during initial page load:', err);
                setError('Failed to load initial data');
            } finally {
                setLoading(false); // Ensure loading is turned off after main data loads
            }
        };
        
        loadInitialData();
    }, []);

    useEffect(() => {
        if (selectedFighter) {
            fetchFighterSubscriptions(selectedFighter);
        } else {
            setSubscriptions([]);
        }
    }, [selectedFighter]);

    useEffect(() => {
        if (showSubscriptionHistory) {
            fetchAllSubscriptions();
        } else {
            // If we already have data in allFighters, filter locally to avoid API loops
            if (allFighters.length > 0) {
                let result = [...allFighters];

                // Filter by Department
                if (filters.department) {
                    result = result.filter((f) => f.department === filters.department);
                }

                // Filter by Plan Type
                if (filters.planType) {
                    result = result.filter(
                        (f) => f.currentSubscription?.planType === filters.planType
                    );
                }

                // Filter by Status (Active/Inactive)
                if (filters.status) {
                    const now = new Date();
                    result = result.filter((f) => {
                        const isActive =
                            f.currentSubscription && new Date(f.currentSubscription.endDate) > now;
                        return filters.status === "active" ? isActive : !isActive;
                    });
                }

                // Filter by Search Term with prioritization
                if (filters.search) {
                    const term = filters.search.toLowerCase();
                    result = result.filter(
                        (f) =>
                            (f.name && f.name.toLowerCase().includes(term)) ||
                            (f.registrationNumber &&
                                f.registrationNumber.toLowerCase().includes(term))
                    );
                    
                    // Sort results to prioritize fighters whose names start with the search term
                    result.sort((a, b) => {
                        const aName = a.name ? a.name.toLowerCase() : '';
                        const bName = b.name ? b.name.toLowerCase() : '';
                        const termLower = term.toLowerCase();
                        
                        const aStartsWith = aName.startsWith(termLower);
                        const bStartsWith = bName.startsWith(termLower);
                        
                        // If one starts with the term and the other doesn't, prioritize the one that starts with the term
                        if (aStartsWith && !bStartsWith) {
                            return -1;
                        } else if (!aStartsWith && bStartsWith) {
                            return 1;
                        }
                        
                        // If both start with the term or neither starts with the term, sort alphabetically
                        return aName.localeCompare(bName);
                    });
                }

                setFighters(result);
            }
            // Don't fetchFighters() here to avoid infinite loop - it's handled in the initial useEffect
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [allFighters, filters, showSubscriptionHistory, pagination.page]);

    // Auto-hide success message after 3 seconds
    useEffect(() => {
        if (successMessage) {
            const timer = setTimeout(() => {
                setSuccessMessage('');
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [successMessage]);

    const fetchFighters = async (showLoading = true) => {
        try {
            // Only show spinner on initial load or explicit refresh
            if (showLoading) setLoading(true);
            
            // Use the optimized endpoint that returns fighters with their current subscription info
            const queryParams = new URLSearchParams({
                page: 1,
                limit: 1000, // Adjust as needed
                ...(filters.department && { department: filters.department }),
                ...(filters.planType && { planType: filters.planType }),
                ...(filters.status && { status: filters.status }),
                ...(filters.search && { search: filters.search })
            }).toString();
            
            const res = await api.get(`/subscriptions/fighters-with-subscriptions?${queryParams}`);
            const fighters = res.data.fighters;
            
            // Cache all fighters
            setAllFighters(fighters);
            setFighters(fighters);
        } catch (err) {
            console.error('Error fetching fighters:', err);
            setError('Failed to fetch fighters');
        } finally {
            // ALWAYS turn off loading, but only if we turned it on
            if (showLoading) setLoading(false);
        }
    };
    
    const fetchDepartments = async () => {
        try {
            const res = await api.get('/departments');
            setDepartments(res.data);
        } catch (err) {
            console.error('Error fetching departments:', err);
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
            
            // All status filters are now handled by the backend efficiently
            const params = new URLSearchParams({
                page: pagination.page,
                limit: filters.limit,
                ...(filters.planType && { planType: filters.planType }),
                ...(filters.search && { search: filters.search }),
                ...(filters.department && { department: filters.department }),
                ...(filters.status && { status: filters.status })
            }).toString();
            const res = await api.get(`/subscriptions/all?${params}`);
            setAllSubscriptions(res.data.subscriptions);
            setPagination({
                page: res.data.currentPage,
                totalPages: res.data.totalPages,
                total: res.data.total
            });
            setLoadingAllSubscriptions(false);
        } catch (err) {
            console.error('Error fetching all subscriptions:', err);
            setError('Failed to fetch subscription history');
            setLoadingAllSubscriptions(false);
        }
    };

    const handleManualSubscriptionChange = (e) => {
        const { name, value } = e.target;
        
        setManualSubscription(prev => {
            const updated = { ...prev, [name]: value };
            
            // Automatically calculate end date when customDuration changes for custom plans
            if (name === 'customDuration' && updated.planType === 'custom' && updated.startDate && value) {
                const startDate = new Date(updated.startDate);
                const endDate = new Date(startDate);
                endDate.setMonth(startDate.getMonth() + parseInt(value));
                updated.endDate = endDate.toISOString().split('T')[0];
            }
            
            return updated;
        });
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
            let endDate;
            
            if (manualSubscription.planType === 'free') {
                // For free plan, set end date to distant future (99 years) to match backend logic
                endDate = new Date(startDate);
                endDate.setFullYear(endDate.getFullYear() + 99);
            } else {
                // For paid plans, use the manually set end date
                endDate = new Date(manualSubscription.endDate);
            }
            
            // Prepare request data
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
            
            const res = await api.post(`/subscriptions/admin-create`, requestData);
            
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
            
            // Update state optimally without full refresh
            if (showSubscriptionHistory) {
                fetchAllSubscriptions(); // Only refresh subscription history if currently viewing it
                // Refresh fighters list as well to ensure currentSubscription is updated
                setTimeout(() => {
                    fetchFighters();
                }, 500); // Small delay to ensure backend data consistency
            } else {
                fetchFighters(); // Refresh fighters list if viewing fighters
            }
            
            // Refresh subscriptions if we're viewing the same fighter
            if (selectedFighter === manualSubscription.fighterId) {
                setTimeout(() => {
                    fetchFighterSubscriptions(selectedFighter);
                }, 300); // Shorter delay for fighter-specific subscription refresh
            }
            
            // Refresh the user data if it's the current user
            if (refreshUser && selectedFighter === localStorage.getItem('userId')) {
                await refreshUser();
            }
        } catch (err) {
            // Handle the new active subscription warning
            if (err.response && err.response.status === 400 && err.response.data && err.response.data.msg && err.response.data.msg.includes('active subscription')) {
                // Fetch fighter's payment status to get unpaid balance info
                try {
                    const paymentStatusRes = await api.get(`/subscriptions/check-payment-status/${manualSubscription.fighterId}`);
                    const paymentStatus = paymentStatusRes.data;
                    
                    // Store the pending subscription data and show confirmation dialog
                    setPendingSubscription({
                        requestData: {
                            fighterId: manualSubscription.fighterId,
                            planType: manualSubscription.planType,
                            startDate: manualSubscription.startDate,
                            endDate: manualSubscription.planType === 'free' 
                                ? new Date(new Date(manualSubscription.startDate).setFullYear(new Date(manualSubscription.startDate).getFullYear() + 99)).toISOString().split('T')[0]
                                : manualSubscription.endDate,
                            status: manualSubscription.status,
                            // Include custom plan specific fields
                            customFee: manualSubscription.customFee,
                            customDuration: manualSubscription.customDuration,
                            // Include initial payment amount
                            initialPaymentAmount: manualSubscription.initialPaymentAmount
                        },
                        errorMessage: err.response && err.response.data && err.response.data.msg,
                        paymentStatus: paymentStatus
                    });
                    setShowConfirmation(true);
                } catch (paymentErr) {
                    // Store the pending subscription data and show confirmation dialog
                    setPendingSubscription({
                        requestData: {
                            fighterId: manualSubscription.fighterId,
                            planType: manualSubscription.planType,
                            startDate: manualSubscription.startDate,
                            endDate: manualSubscription.planType === 'free' 
                                ? new Date(new Date(manualSubscription.startDate).setFullYear(new Date(manualSubscription.startDate).getFullYear() + 99)).toISOString().split('T')[0]
                                : manualSubscription.endDate,
                            status: manualSubscription.status,
                            // Include custom plan specific fields
                            customFee: manualSubscription.customFee,
                            customDuration: manualSubscription.customDuration,
                            // Include initial payment amount
                            initialPaymentAmount: manualSubscription.initialPaymentAmount
                        },
                        errorMessage: err.response && err.response.data && err.response.data.msg,
                        paymentStatus: null
                    });
                    setShowConfirmation(true);
                }
            } else if (err.response && err.response.status === 400 && err.response.data && err.response.data.msg && err.response.data.msg.includes('unpaid balances')) {
                // Show popup for unpaid balance warning
                showPopup('Cannot create new subscription. Fighter has existing subscriptions with unpaid balances that must be settled first.', 'error');
            } else {
                setError('Failed to create subscription: ' + (err.response && err.response.data && err.response.data.msg || err.message));
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
            if (requestData.planType === 'fixed_commitment' && pendingSubscription.requestData.initialPaymentAmount) {
                requestData.initialPaymentAmount = parseFloat(pendingSubscription.requestData.initialPaymentAmount);
            }
            
            // For custom plans, include custom fee and duration
            if (requestData.planType === 'custom') {
                // Get the original manual subscription data to access custom fields
                requestData.customFee = parseFloat(manualSubscription.customFee);
                requestData.customDuration = parseInt(manualSubscription.customDuration);
                
                // If initial payment amount is provided, include it
                if (pendingSubscription.requestData.initialPaymentAmount) {
                    requestData.initialPaymentAmount = parseFloat(pendingSubscription.requestData.initialPaymentAmount);
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
            
            // Update state optimally without full refresh
            if (selectedFighter === pendingSubscription.requestData.fighterId) {
                fetchFighterSubscriptions(selectedFighter);
            }
            if (showSubscriptionHistory) {
                fetchAllSubscriptions(); // Only refresh subscription history if currently viewing it
            } else {
                fetchFighters(); // Refresh fighters list if viewing fighters
            }
            
            // Also refresh the fighter list to ensure currentSubscription is updated
            setTimeout(() => {
                fetchFighters();
            }, 1000); // Small delay to ensure backend data consistency
            
            // Refresh the user data if it's the current user
            if (refreshUser && selectedFighter === localStorage.getItem('userId')) {
                await refreshUser();
            }
        } catch (err) {
            console.error('Error force creating subscription:', err);
            if (err.response && err.response.status === 400 && err.response.data && err.response.data.msg && err.response.data.msg.includes('unpaid balances')) {
                // Show popup for unpaid balance warning
                showPopup('Cannot create new subscription. Fighter has existing subscriptions with unpaid balances that must be settled first.', 'error');
                setShowConfirmation(false);
                setPendingSubscription(null);
            } else {
                setError('Failed to create subscription: ' + (err.response && err.response.data && err.response.data.msg || err.message));
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
                    
                    // Update state optimally without full refresh
                    if (showSubscriptionHistory) {
                        fetchAllSubscriptions(); // Only refresh subscription history if currently viewing it
                    } else {
                        fetchFighters(); // Refresh fighters list if viewing fighters
                    }
                    
                    // Also refresh the fighter list to ensure currentSubscription is updated
                    setTimeout(() => {
                        fetchFighters();
                    }, 1000); // Small delay to ensure backend data consistency
                    
                    // Show success message
                    setSuccessMessage('Cash payment recorded successfully!');
                    
                    // Refresh the user data if it's the current user
                    if (refreshUser && selectedSubscription.fighterId._id === localStorage.getItem('userId')) {
                        await refreshUser();
                    }
                } catch (err) {
                    console.error('Error recording cash payment:', err);
                    setInstallmentError('Failed to record cash payment. Server error: ' + (err.response && err.response.data && err.response.data.msg || err.message));
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
                        
                        // Update state optimally without full refresh
                        if (showSubscriptionHistory) {
                            fetchAllSubscriptions(); // Only refresh subscription history if currently viewing it
                        } else {
                            fetchFighters(); // Refresh fighters list if viewing fighters
                        }
                        
                        // Also refresh the fighter list to ensure currentSubscription is updated
                        setTimeout(() => {
                            fetchFighters();
                        }, 1000); // Small delay to ensure backend data consistency
                        
                        // Show success message
                        setSuccessMessage('Installment payment successful!');
                        
                        // Refresh the user data if it's the current user
                        if (refreshUser && selectedSubscription.fighterId._id === localStorage.getItem('userId')) {
                            await refreshUser();
                        }
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
                setInstallmentError('Failed to initiate installment payment. Server error: ' + (err.response.data && err.response.data.msg || err.response.data && err.response.data.error || err.response.statusText || 'Unknown server error'));
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
        // Ensure fighter department information is available
        let updatedSubscription = { ...subscription };
        
        // If fighterId exists but department is not available in the subscription, try to get it
        if (subscription.fighterId && !subscription.fighterId.department) {
            // Look for the fighter in our local fighters list
            const fighter = fighters.find(f => f._id === subscription.fighterId._id || f._id === subscription.fighterId);
            if (fighter && fighter.department) {
                updatedSubscription = {
                    ...subscription,
                    fighterId: {
                        ...subscription.fighterId,
                        department: fighter.department
                    }
                };
            }
        }
        
        // If this is a fixed commitment plan and we have department information, update the fee
        if (updatedSubscription.planType === 'fixed_commitment' && updatedSubscription.fighterId?.department) {
            const departmentFee = getDepartmentFee(updatedSubscription.fighterId.department);
            updatedSubscription.totalFee = departmentFee;
            updatedSubscription.remainingBalance = departmentFee - (updatedSubscription.paidAmount || 0);
        }
        
        setSelectedSubscription(updatedSubscription);
        setShowSubscriptionDetails(true);
    };
    
    // Function to close subscription details
    const closeSubscriptionDetails = () => {
        setShowSubscriptionDetails(false);
        setSelectedSubscription(null);
    };
    
    // Function to open edit subscription form
    const openEditSubscriptionForm = async (subscription) => {
        // Ensure fighter department information is available
        let updatedSubscription = { ...subscription };
        
        // If fighterId exists but department is not available in the subscription, try to get it
        if (subscription.fighterId && !subscription.fighterId.department) {
            // Look for the fighter in our local fighters list
            const fighter = fighters.find(f => f._id === subscription.fighterId._id || f._id === subscription.fighterId);
            if (fighter && fighter.department) {
                updatedSubscription = {
                    ...subscription,
                    fighterId: {
                        ...subscription.fighterId,
                        department: fighter.department
                    }
                };
            }
        }
        
        // If this is a fixed commitment plan and we have department information, update the fee
        if (updatedSubscription.planType === 'fixed_commitment' && updatedSubscription.fighterId?.department) {
            const departmentFee = getDepartmentFee(updatedSubscription.fighterId.department);
            updatedSubscription.totalFee = departmentFee;
            updatedSubscription.remainingBalance = departmentFee - (updatedSubscription.paidAmount || 0);
        }
        
        // If we don't have department information yet, try to get it from fighters cache
        if (updatedSubscription.fighterId && !updatedSubscription.fighterId.department) {
            // Search in allFighters cache
            const cachedFighter = allFighters.find(f => f._id === updatedSubscription.fighterId._id || f._id === updatedSubscription.fighterId);
            if (cachedFighter && cachedFighter.department) {
                updatedSubscription = {
                    ...updatedSubscription,
                    fighterId: {
                        ...updatedSubscription.fighterId,
                        department: cachedFighter.department
                    }
                };
                
                // If it's a fixed commitment plan, update the fee based on the newly found department
                if (updatedSubscription.planType === 'fixed_commitment' && updatedSubscription.fighterId?.department) {
                    const departmentFee = getDepartmentFee(updatedSubscription.fighterId.department);
                    updatedSubscription.totalFee = departmentFee;
                    updatedSubscription.remainingBalance = departmentFee - (updatedSubscription.paidAmount || 0);
                }
            }
        }
        
        setSelectedSubscription(updatedSubscription);
        setShowEditForm(true);
    };
    
    // Function to close edit subscription form
    const closeEditForm = () => {
        setShowEditForm(false);
        setSelectedSubscription(null);
    };
    
    // Function to update subscription
    const handleUpdateSubscription = async () => {
        if (!selectedSubscription) return;
        
        try {
            const updateData = {
                status: selectedSubscription.status,
                planType: selectedSubscription.planType,
                startDate: selectedSubscription.startDate,
                endDate: selectedSubscription.endDate
            };
            
            // Add payment-related fields only for fixed commitment or custom plans
            if (selectedSubscription.planType === 'fixed_commitment' || selectedSubscription.planType === 'custom') {
                // For fixed commitment plans, ensure we use department-specific fee if available
                if (selectedSubscription.planType === 'fixed_commitment' && selectedSubscription.fighterId?.department) {
                    updateData.totalFee = getDepartmentFee(selectedSubscription.fighterId.department);
                } else {
                    updateData.totalFee = selectedSubscription.totalFee;
                }
                updateData.paidAmount = selectedSubscription.paidAmount;
                updateData.installmentCount = selectedSubscription.installmentCount;
                updateData.maxInstallments = selectedSubscription.maxInstallments;
                
                // Calculate remaining balance
                updateData.remainingBalance = (updateData.totalFee || 0) - (selectedSubscription.paidAmount || 0);
            }
            
            // For custom plans, include customDuration if available
            if (selectedSubscription.planType === 'custom' && selectedSubscription.customDuration) {
                updateData.customDuration = selectedSubscription.customDuration;
            }
            
            // Don't update endDate for free plans
            if (selectedSubscription.planType === 'free') {
                delete updateData.endDate;
            }
            
            const res = await api.put(`/subscriptions/${selectedSubscription._id}`, updateData);
            
            // Show success message
            setSuccessMessage('Subscription updated successfully!');
            
            // Close the form
            closeEditForm();
            
            // Update state optimally without full refresh
            if (showSubscriptionHistory) {
                fetchAllSubscriptions(); // Only refresh subscription history if currently viewing it
                // Refresh fighters list as well to ensure currentSubscription is updated
                setTimeout(() => {
                    fetchFighters();
                }, 500); // Short delay to ensure backend data consistency
            } else {
                fetchFighters(); // Refresh fighters list if viewing fighters
            }
            
            // Also refresh the selected fighter's subscriptions if we're viewing a specific fighter
            if (selectedFighter) {
                setTimeout(() => {
                    fetchFighterSubscriptions(selectedFighter);
                }, 300); // Shorter delay for fighter-specific subscription refresh
            }
            
            // Refresh the user data if it's the current user
            if (refreshUser && selectedSubscription.fighterId._id === localStorage.getItem('userId')) {
                await refreshUser();
            }
        } catch (err) {
            console.error('Error updating subscription:', err);
            console.error('Error details:', err.response);
            
            setError('Failed to update subscription: ' + (err.response && err.response.data && err.response.data.msg || err.message));
        }
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
    
    // Safe function to get amount display for subscription
    const getSafeAmountDisplay = (sub) => {
        if (!sub) return 'N/A';
        
        // Handle different subscription types safely
        if (sub.planType === 'fixed_commitment' || sub.planType === 'custom') {
            const paidAmount = typeof sub.paidAmount !== 'undefined' ? sub.paidAmount : 0;
            const totalFee = typeof sub.totalFee !== 'undefined' ? sub.totalFee : 0;
            return `₹${paidAmount} of ₹${totalFee}`;
        } else {
            const amount = typeof sub.amount !== 'undefined' ? sub.amount : 0;
            return amount > 0 ? `₹${amount}` : 'N/A';
        }
    };
    
    // Safe function to get status display for fighter
    const getSafeStatusDisplay = (sub) => {
        if (!sub) return 'No Plan';
        
        if ((sub.planType === 'fixed_commitment' || sub.planType === 'custom') && 
            typeof sub.remainingBalance !== 'undefined' && sub.remainingBalance > 0) {
            return 'Active Plan (Balance Due)';
        } else {
            return 'Active Plan';
        }
    };
    
    // Get status display text
    const getStatusDisplayText = (status) => {
        if (!status) return 'Unknown';
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

    // Function to render the subscription history table
    const renderSubscriptionHistory = () => {
        if (loadingAllSubscriptions) {
            return (
                <div className="flex justify-center items-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                    <span className="ml-2 text-gray-600">Loading subscriptions...</span>
                </div>
            );
        }
        
        if (allSubscriptions.length === 0) {
            return <p className="text-gray-600 text-center py-4">No subscriptions found.</p>;
        }
        
        return (
            <div>
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
                                        {getSafeAmountDisplay(sub)}
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
            </div>
        );
    };

    // Function to render the fighters table
    const renderFightersTable = () => {
        if (loading) {
            return (
                <div className="flex justify-center items-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                    <span className="ml-2 text-gray-600">Loading fighters...</span>
                </div>
            );
        }
        
        if (fighters.length === 0) {
            return <div className="text-center py-4 text-gray-500">No fighters found.</div>;
        }
        
        return (
            <div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">RFID</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Join Date</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {fighters.map((fighter) => (
                                <tr key={fighter._id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        {fighter.name}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {fighter.rfid}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {fighter.department}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {fighter.currentSubscription && fighter.currentSubscription._id ? getSafeAmountDisplay(fighter.currentSubscription) : 'N/A'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {fighter.currentSubscription && fighter.currentSubscription._id ? getSafeStatusDisplay(fighter.currentSubscription) : 'No Plan'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {formatDate(fighter.dateOfJoining)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        <div className="flex space-x-2">
                                            {fighter.currentSubscription && fighter.currentSubscription._id ? (
                                                <button 
                                                    onClick={() => openSubscriptionDetails(fighter.currentSubscription)}
                                                    className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                                                >
                                                    View
                                                </button>
                                            ) : (
                                                <button 
                                                    onClick={() => {
                                                        setSelectedFighter(fighter._id);
                                                        // Set a default plan type to enable the create subscription button
                                                        setSelectedPlan('fixed_commitment');
                                                        handleCreateSubscription();
                                                        // Scroll to the subscription creation section
                                                        setTimeout(() => {
                                                            document.getElementById('create-subscription-section')?.scrollIntoView({ behavior: 'smooth' });
                                                        }, 100);
                                                    }}
                                                    className="text-green-600 hover:text-green-900 text-sm font-medium"
                                                >
                                                    Create
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    if (loading && allFighters.length === 0) {  // Only show main loader when no data is available
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
                            {pendingSubscription && pendingSubscription.paymentStatus && (
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
            
            {/* Subscription Details Modal */}
            {showSubscriptionDetails && selectedSubscription && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto transform transition-all duration-300 scale-100">
                        <div className="flex justify-between items-start mb-4">
                            <h3 className="text-lg leading-6 font-medium text-gray-900">
                                Subscription Details
                            </h3>
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
                                    <p className="text-sm font-medium text-gray-500">Fighter</p>
                                    <p className="text-sm text-gray-900">
                                        {selectedSubscription.fighterId?.name || selectedSubscription.fighterId?.rfid || 'Unknown'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-500">Department</p>
                                    <p className="text-sm text-gray-900">
                                        {selectedSubscription.fighterId?.department || 'N/A'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-500">Plan Type</p>
                                    <p className="text-sm text-gray-900">
                                        {planDetails[selectedSubscription.planType]?.name || selectedSubscription.planType}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-500">Status</p>
                                    <p className="text-sm text-gray-900">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getExtendedStatusColor(selectedSubscription.status)}`}>
                                            {getStatusDisplayText(selectedSubscription.status)}
                                        </span>
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-500">Amount</p>
                                    <p className="text-sm text-gray-900">{getSafeAmountDisplay(selectedSubscription)}</p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-500">Start Date</p>
                                    <p className="text-sm text-gray-900">{formatDate(selectedSubscription.startDate)}</p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-500">End Date</p>
                                    <p className="text-sm text-gray-900">{formatDate(selectedSubscription.endDate)}</p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-500">Created At</p>
                                    <p className="text-sm text-gray-900">{formatDate(selectedSubscription.createdAt)}</p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-500">Updated At</p>
                                    <p className="text-sm text-gray-900">{formatDate(selectedSubscription.updatedAt)}</p>
                                </div>
                            </div>
                            
                            {(selectedSubscription.planType === 'fixed_commitment' || selectedSubscription.planType === 'custom') && (
                                <div className="border-t pt-4 mt-4">
                                    <h4 className="text-md font-medium text-gray-900 mb-3">Payment Details</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div>
                                            <p className="text-sm font-medium text-gray-500">Total Fee</p>
                                            <p className="text-sm text-gray-900">₹{selectedSubscription.totalFee || '0'}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-gray-500">Paid Amount</p>
                                            <p className="text-sm text-gray-900">₹{selectedSubscription.paidAmount || '0'}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-gray-500">Remaining Balance</p>
                                            <p className="text-sm text-gray-900">₹{selectedSubscription.remainingBalance || '0'}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-gray-500">Max Installments</p>
                                            <p className="text-sm text-gray-900">{selectedSubscription.maxInstallments || 4}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-gray-500">Installment Count</p>
                                            <p className="text-sm text-gray-900">{selectedSubscription.installmentCount || '0'}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-gray-500">Payment Method</p>
                                            <p className="text-sm text-gray-900">{getPaymentMethod(selectedSubscription)}</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                            
                            {/* Additional Info */}
                            {(selectedSubscription.planType === 'fixed_commitment' || selectedSubscription.planType === 'custom') && (
                                <div className="border-t pt-4 mt-4">
                                    <h4 className="text-md font-medium text-gray-900 mb-2">Payment Information</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                        <div>
                                            <p className="text-sm font-medium text-gray-500">Total Fee</p>
                                            <p className="text-sm text-gray-900">₹{selectedSubscription.totalFee || '0'}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-gray-500">Paid Amount</p>
                                            <p className="text-sm text-gray-900">₹{selectedSubscription.paidAmount || '0'}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-gray-500">Remaining Balance</p>
                                            <p className="text-sm text-gray-900">₹{selectedSubscription.remainingBalance || '0'}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-gray-500">Max Installments</p>
                                            <p className="text-sm text-gray-900">{selectedSubscription.maxInstallments || 4}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-gray-500">Installment Count</p>
                                            <p className="text-sm text-gray-900">{selectedSubscription.installmentCount || '0'}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-gray-500">Payment Method</p>
                                            <p className="text-sm text-gray-900">{getPaymentMethod(selectedSubscription)}</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                            
                            {/* Actions */}
                            <div className="flex flex-wrap gap-2 pt-4">
                                <button
                                    onClick={() => {
                                        closeSubscriptionDetails();
                                        openEditSubscriptionForm(selectedSubscription);
                                    }}
                                    className="bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium py-2 px-4 rounded transition-colors"
                                >
                                    Edit
                                </button>
                                {(selectedSubscription.planType === 'fixed_commitment' || selectedSubscription.planType === 'custom') && (
                                    <button
                                        onClick={() => {
                                            closeSubscriptionDetails();
                                            openInstallmentForm(selectedSubscription);
                                        }}
                                        className="bg-yellow-500 hover:bg-yellow-600 text-white text-sm font-medium py-2 px-4 rounded transition-colors"
                                    >
                                        Add Installment
                                    </button>
                                )}
                                <button
                                    onClick={closeSubscriptionDetails}
                                    className="bg-gray-300 hover:bg-gray-400 text-gray-800 text-sm font-medium py-2 px-4 rounded transition-colors"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Installment Payment Form Modal */}
            {showInstallmentForm && selectedSubscription && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md transform transition-all duration-300 scale-100">
                        <div className="flex justify-between items-start mb-4">
                            <h3 className="text-lg leading-6 font-medium text-gray-900">
                                Add Installment Payment
                            </h3>
                            <button
                                onClick={closeInstallmentForm}
                                className="text-gray-400 hover:text-gray-500"
                            >
                                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        
                        <div className="space-y-4">
                            <div className="mb-4">
                                <p className="text-sm text-gray-600">
                                    Adding installment for: <span className="font-semibold">{selectedSubscription.fighterId?.name || selectedSubscription.fighterId?.rfid || 'Unknown'}</span>
                                </p>
                                <p className="text-sm text-gray-600">
                                    Plan: <span className="font-semibold">{planDetails[selectedSubscription.planType]?.name || selectedSubscription.planType}</span>
                                </p>
                                <p className="text-sm text-gray-600">
                                    Remaining Balance: <span className="font-semibold">₹{selectedSubscription.remainingBalance || '0'}</span>
                                </p>
                            </div>
                            
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Installment Amount (₹)</label>
                                <input
                                    type="number"
                                    value={installmentAmount}
                                    onChange={(e) => setInstallmentAmount(e.target.value)}
                                    min="1"
                                    max={selectedSubscription.remainingBalance || 0}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="Enter amount"
                                />
                                {installmentError && (
                                    <p className="mt-1 text-sm text-red-600">{installmentError}</p>
                                )}
                            </div>
                            
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                                <select
                                    value={paymentMethod}
                                    onChange={(e) => setPaymentMethod(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="upi">UPI/Razorpay</option>
                                    <option value="cash">Cash</option>
                                </select>
                            </div>
                            
                            {paymentMethod === 'cash' && (
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Cash Payment Notes</label>
                                    <textarea
                                        value={cashPaymentNotes}
                                        onChange={(e) => setCashPaymentNotes(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                        rows="3"
                                        placeholder="Enter notes about the cash payment..."
                                    />
                                </div>
                            )}
                            
                            <div className="flex space-x-3 pt-4">
                                <button
                                    onClick={handleInstallmentPayment}
                                    disabled={processing}
                                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {processing ? 'Processing...' : 'Pay Installment'}
                                </button>
                                <button
                                    onClick={closeInstallmentForm}
                                    className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-medium py-2 px-4 rounded-md transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Edit Subscription Form Modal */}
            {showEditForm && selectedSubscription && (
                <div 
                    className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
                    onClick={(e) => {
                        // Close modal when clicking outside the content box
                        if (e.target === e.currentTarget) {
                            closeEditForm();
                        }
                    }}
                    onTouchStart={(e) => {
                        const touchStartX = e.touches[0].clientX;
                        
                        const handleTouchMove = (moveEvent) => {
                            const touchEndX = moveEvent.touches[0].clientX;
                            
                            const diffX = touchStartX - touchEndX;
                            
                            // Horizontal swipe to dismiss
                            if (Math.abs(diffX) > 30) {
                                if (diffX > 30) { // Swipe right to left to dismiss
                                    closeEditForm();
                                }
                            }
                        };
                        
                        const handleTouchEnd = () => {
                            document.removeEventListener('touchmove', handleTouchMove);
                            document.removeEventListener('touchend', handleTouchEnd);
                        };
                        
                        document.addEventListener('touchmove', handleTouchMove);
                        document.addEventListener('touchend', handleTouchEnd);
                    }}
                >
                    <div 
                        className="bg-white rounded-lg shadow-xl w-full max-w-md flex flex-col max-h-[90vh] transform transition-all duration-300 scale-100"
                        onTouchStart={(e) => {
                            const touchStartX = e.touches[0].clientX;
                            const touchStartY = e.touches[0].clientY;
                            
                            const handleTouchMove = (moveEvent) => {
                                const touchEndX = moveEvent.touches[0].clientX;
                                const touchEndY = moveEvent.touches[0].clientY;
                                
                                const diffX = touchStartX - touchEndX;
                                const diffY = touchStartY - touchEndY;
                                
                                // Check if horizontal swipe is dominant (swipe to dismiss)
                                if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 50) {
                                    if (diffX > 50) { // Swipe right to left
                                        closeEditForm();
                                    }
                                }
                            };
                            
                            const handleTouchEnd = () => {
                                document.removeEventListener('touchmove', handleTouchMove);
                                document.removeEventListener('touchend', handleTouchEnd);
                            };
                            
                            document.addEventListener('touchmove', handleTouchMove);
                            document.addEventListener('touchend', handleTouchEnd);
                        }}
                    >
                        <div className="flex justify-between items-start mb-4 p-6 pt-6 pb-2">
                            <h3 className="text-lg leading-6 font-medium text-gray-900">
                                Edit Subscription
                            </h3>
                            <button
                                onClick={closeEditForm}
                                className="text-gray-400 hover:text-gray-500"
                            >
                                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        
                        <div className="space-y-4 overflow-y-auto flex-grow px-6 pb-2">
                            <div className="mb-4">
                                <p className="text-sm text-gray-600">
                                    Editing subscription for: <span className="font-semibold">{selectedSubscription.fighterId?.name || selectedSubscription.fighterId?.rfid || 'Unknown'}</span>
                                </p>
                                <p className="text-sm text-gray-600">
                                    Plan: <span className="font-semibold">{planDetails[selectedSubscription.planType]?.name || selectedSubscription.planType}</span>
                                </p>
                            </div>
                            
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Plan Type</label>
                                <select
                                    value={selectedSubscription.planType}
                                    onChange={(e) => {
                                        const newPlanType = e.target.value;
                                        const updatedSub = { ...selectedSubscription, planType: newPlanType };
                                        
                                        // Update amounts based on plan type
                                        if (newPlanType === 'fixed_commitment') {
                                            // For fixed commitment plan, get department-specific fee
                                            const departmentFee = selectedSubscription.fighterId?.department ? getDepartmentFee(selectedSubscription.fighterId.department) : getDepartmentFee('senior');
                                            updatedSub.totalFee = departmentFee;
                                            if (updatedSub.paidAmount === undefined || updatedSub.paidAmount === null) {
                                                updatedSub.paidAmount = 0;
                                            }
                                            updatedSub.remainingBalance = departmentFee - (updatedSub.paidAmount || 0);
                                        } else if (newPlanType === 'custom') {
                                            // For custom plan, preserve custom values if they exist, otherwise set defaults
                                            if (updatedSub.totalFee === undefined || updatedSub.totalFee === null || selectedSubscription.planType === 'fixed_commitment') {
                                                updatedSub.totalFee = 0;
                                                updatedSub.paidAmount = 0;
                                                updatedSub.remainingBalance = 0;
                                            }
                                        } else if (newPlanType === 'free') {
                                            // For free plan, set all amounts to 0
                                            updatedSub.totalFee = 0;
                                            updatedSub.paidAmount = 0;
                                            updatedSub.remainingBalance = 0;
                                        }
                                        
                                        // Recalculate end date based on new plan type
                                        if (newPlanType === 'fixed_commitment' && selectedSubscription.startDate) {
                                            // For fixed commitment, set end date to 3 months from start
                                            const startDate = new Date(selectedSubscription.startDate);
                                            const endDate = new Date(startDate);
                                            endDate.setMonth(startDate.getMonth() + 3);
                                            updatedSub.endDate = endDate.toISOString().split('T')[0];
                                        } else if (newPlanType === 'free' && selectedSubscription.startDate) {
                                            // For free plan, set end date to distant future
                                            const startDate = new Date(selectedSubscription.startDate);
                                            const endDate = new Date(startDate);
                                            endDate.setFullYear(startDate.getFullYear() + 99);
                                            updatedSub.endDate = endDate.toISOString().split('T')[0];
                                        } else if (newPlanType === 'custom' && selectedSubscription.customDuration && selectedSubscription.startDate) {
                                            // If changing to custom plan and we have customDuration, recalculate end date
                                            const startDate = new Date(selectedSubscription.startDate);
                                            const endDate = new Date(startDate);
                                            endDate.setMonth(startDate.getMonth() + parseInt(selectedSubscription.customDuration));
                                            updatedSub.endDate = endDate.toISOString().split('T')[0];
                                        }
                                        
                                        setSelectedSubscription(updatedSub);
                                    }}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="fixed_commitment">Quarterly Membership</option>
                                    <option value="free">Free (Indefinite)</option>
                                    <option value="custom">Custom Plan</option>
                                </select>
                                {selectedSubscription.planType === 'fixed_commitment' && (
                                    <p className="mt-1 text-xs text-gray-500">
                                        Department Fee: ₹{selectedSubscription.fighterId?.department ? getDepartmentFee(selectedSubscription.fighterId.department) : getDepartmentFee('senior')}
                                    </p>
                                )}
                            </div>
                            
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                                <select
                                    value={selectedSubscription.status}
                                    onChange={(e) => {
                                        const updatedSub = { ...selectedSubscription, status: e.target.value };
                                        setSelectedSubscription(updatedSub);
                                    }}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="paid">Paid</option>
                                    <option value="created">Created</option>
                                    <option value="expired">Expired</option>
                                    <option value="cancelled">Cancelled</option>
                                    <option value="partial_payment">Partial Payment</option>
                                </select>
                            </div>
                            
                            {(selectedSubscription.planType === 'fixed_commitment' || selectedSubscription.planType === 'custom') && (
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Total Fee (₹)</label>
                                    <input
                                        type="number"
                                        value={selectedSubscription.totalFee || ''}
                                        onChange={(e) => {
                                            const updatedSub = { 
                                                ...selectedSubscription, 
                                                totalFee: parseFloat(e.target.value) || 0,
                                                remainingBalance: (parseFloat(e.target.value) || 0) - (selectedSubscription.paidAmount || 0)
                                            };
                                            setSelectedSubscription(updatedSub);
                                        }}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="Enter total fee"
                                    />
                                </div>
                            )}
                            
                            {(selectedSubscription.planType === 'fixed_commitment' || selectedSubscription.planType === 'custom') && (
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Paid Amount (₹)</label>
                                    <input
                                        type="number"
                                        value={selectedSubscription.paidAmount || ''}
                                        onChange={(e) => {
                                            const newPaidAmount = parseFloat(e.target.value) || 0;
                                            const newTotalFee = selectedSubscription.totalFee || 0;
                                            const updatedSub = { 
                                                ...selectedSubscription, 
                                                paidAmount: newPaidAmount,
                                                remainingBalance: newTotalFee - newPaidAmount
                                            };
                                            setSelectedSubscription(updatedSub);
                                        }}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="Enter paid amount"
                                    />
                                </div>
                            )}
                            
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                                <input
                                    type="date"
                                    value={selectedSubscription.startDate}
                                    onChange={(e) => {
                                        const updatedSub = { ...selectedSubscription, startDate: e.target.value };
                                        
                                        // Recalculate end date based on plan type and start date
                                        if (selectedSubscription.planType === 'fixed_commitment') {
                                            // For fixed commitment plan, set end date to 3 months from start
                                            const newStart = new Date(e.target.value);
                                            const newEnd = new Date(newStart);
                                            newEnd.setMonth(newStart.getMonth() + 3);
                                            updatedSub.endDate = newEnd.toISOString().split('T')[0];
                                        } else if (selectedSubscription.planType === 'custom' && selectedSubscription.customDuration) {
                                            // For custom plan, recalculate end date based on start date and duration
                                            const newStart = new Date(e.target.value);
                                            const newEnd = new Date(newStart);
                                            newEnd.setMonth(newStart.getMonth() + parseInt(selectedSubscription.customDuration));
                                            
                                            updatedSub.endDate = newEnd.toISOString().split('T')[0];
                                        } else if (selectedSubscription.planType === 'free') {
                                            // For free plan, set end date to distant future
                                            const newStart = new Date(e.target.value);
                                            const newEnd = new Date(newStart);
                                            newEnd.setFullYear(newStart.getFullYear() + 99);
                                            updatedSub.endDate = newEnd.toISOString().split('T')[0];
                                        }
                                        
                                        setSelectedSubscription(updatedSub);
                                    }}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                            
                            {selectedSubscription.planType === 'custom' && (
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Duration (months)</label>
                                    <input
                                        type="number"
                                        value={selectedSubscription.customDuration || ''}
                                        onChange={(e) => {
                                            const updatedSub = { ...selectedSubscription, customDuration: e.target.value };
                                                                        
                                            // If we have a start date and duration, recalculate the end date
                                            if (updatedSub.startDate && e.target.value) {
                                                const startDate = new Date(updatedSub.startDate);
                                                const endDate = new Date(startDate);
                                                endDate.setMonth(startDate.getMonth() + parseInt(e.target.value));
                                                updatedSub.endDate = endDate.toISOString().split('T')[0];
                                            }
                                                                        
                                            setSelectedSubscription(updatedSub);
                                        }}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="Enter duration in months"
                                        min="1"
                                    />
                                </div>
                            )}
                            
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                                <input
                                    type="date"
                                    value={selectedSubscription.endDate}
                                    onChange={(e) => {
                                        const updatedSub = { ...selectedSubscription, endDate: e.target.value };
                                        setSelectedSubscription(updatedSub);
                                    }}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    disabled={selectedSubscription.planType === 'free' || (selectedSubscription.planType === 'custom' && selectedSubscription.customDuration)}
                                />
                                {selectedSubscription.planType === 'fixed_commitment' && (
                                    <p className="mt-1 text-xs text-gray-500">For Fixed Commitment plans, End Date is automatically updated when Start Date changes (3 months from start)</p>
                                )}
                            </div>
                            
                            {(selectedSubscription.planType === 'fixed_commitment' || selectedSubscription.planType === 'custom') && (
                                <>
                                    <div className="mb-4">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Installment Count</label>
                                        <input
                                            type="number"
                                            value={selectedSubscription.installmentCount || ''}
                                            onChange={(e) => {
                                                const updatedSub = { 
                                                    ...selectedSubscription, 
                                                    installmentCount: parseInt(e.target.value) || 0
                                                };
                                                setSelectedSubscription(updatedSub);
                                            }}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                            placeholder="Enter installment count"
                                            min="0"
                                        />
                                    </div>
                                    <div className="mb-4">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Max Installments</label>
                                        <input
                                            type="number"
                                            value={selectedSubscription.maxInstallments || ''}
                                            onChange={(e) => {
                                                const updatedSub = { 
                                                    ...selectedSubscription, 
                                                    maxInstallments: parseInt(e.target.value) || 0
                                                };
                                                setSelectedSubscription(updatedSub);
                                            }}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                            placeholder="Enter maximum installments"
                                            min="0"
                                        />
                                    </div>
                                </>
                            )}
                        </div>
                        
                        <div className="flex space-x-3 pt-4 px-6 pb-6 bg-white border-t border-gray-200">
                            <button
                                onClick={handleUpdateSubscription}
                                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
                            >
                                Save Changes
                            </button>
                            <button
                                onClick={closeEditForm}
                                className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-medium py-2 px-4 rounded-md transition-colors"
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
            <div id="create-subscription-section" className="bg-white rounded-lg shadow-md p-6 mb-8">
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
                            <option value="fixed_commitment">Quarterly Membership (₹{getSelectedFighterFee()})</option>
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
                                                <h4 className="font-semibold text-lg">{(planDetails[currentSub.planType] && planDetails[currentSub.planType].name) || currentSub.planType}</h4>
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
                                        
                                        if (newPlanType === 'fixed_commitment') {
                                            // For fixed commitment plan, set end date to 3 months from start
                                            if (manualSubscription.startDate) {
                                                const startDate = new Date(manualSubscription.startDate);
                                                const newEndDate = new Date(startDate);
                                                newEndDate.setMonth(startDate.getMonth() + 3);
                                                setManualSubscription(prev => ({
                                                    ...prev,
                                                    endDate: newEndDate.toISOString().split('T')[0]
                                                }));
                                            }
                                        } else if (newPlanType === 'free') {
                                            // For free plan, set end date to distant future (99 years)
                                            if (manualSubscription.startDate) {
                                                const startDate = new Date(manualSubscription.startDate);
                                                const newEndDate = new Date(startDate);
                                                newEndDate.setFullYear(startDate.getFullYear() + 99);
                                                setManualSubscription(prev => ({
                                                    ...prev,
                                                    endDate: newEndDate.toISOString().split('T')[0]
                                                }));
                                            }
                                        } else if (newPlanType === 'custom') {
                                            // For custom plan, calculate end date based on customDuration if available
                                            if (manualSubscription.startDate && manualSubscription.customDuration) {
                                                const startDate = new Date(manualSubscription.startDate);
                                                const newEndDate = new Date(startDate);
                                                newEndDate.setMonth(startDate.getMonth() + parseInt(manualSubscription.customDuration));
                                                setManualSubscription(prev => ({
                                                    ...prev,
                                                    endDate: newEndDate.toISOString().split('T')[0]
                                                }));
                                            }
                                        }
                                    }}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="fixed_commitment">Quarterly Membership (₹{getSelectedFighterFee()})</option>
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
                                    onChange={(e) => {
                                        handleManualSubscriptionChange(e);
                                        
                                        // When changing start date for custom plans, recalculate end date
                                        if (manualSubscription.planType === 'custom' && manualSubscription.customDuration) {
                                            const startDate = new Date(e.target.value);
                                            const newEndDate = new Date(startDate);
                                            newEndDate.setMonth(startDate.getMonth() + parseInt(manualSubscription.customDuration));
                                            setManualSubscription(prev => ({
                                                ...prev,
                                                endDate: newEndDate.toISOString().split('T')[0]
                                            }));
                                        }
                                    }}
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
                        {showSubscriptionHistory ? 'Subscription History' : 'Fighters'} ({showSubscriptionHistory ? pagination.total : fighters.length})
                    </h2>
                    <div className="flex flex-wrap gap-2">
                        <input
                            type="text"
                            placeholder="Search fighters..."
                            value={filters.search}
                            onChange={(e) => handleFilterChange('search', e.target.value)}
                            className="w-full sm:w-auto px-3 py-1 border border-gray-300 rounded-md text-sm"
                        />
                        <select
                            value={filters.department}
                            onChange={(e) => handleFilterChange('department', e.target.value)}
                            className="w-full sm:w-auto px-3 py-1 border border-gray-300 rounded-md text-sm"
                        >
                            <option value="">All Departments</option>
                            {departments.map(dept => (
                                <option key={dept.name} value={dept.name}>{dept.name}</option>
                            ))}
                        </select>
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
                        <button
                            onClick={() => setShowSubscriptionHistory(!showSubscriptionHistory)}
                            className={`px-3 py-1 rounded-md text-sm font-medium ${showSubscriptionHistory ? 'bg-gray-200 text-gray-800' : 'bg-blue-600 text-white'}`}
                        >
                            {showSubscriptionHistory ? 'Show Fighters' : 'Show History'}
                        </button>
                    </div>
                </div>
                
                {showSubscriptionHistory ? (
                    renderSubscriptionHistory()
                ) : (
                    renderFightersTable()
                )}
            </div>
        </div>
    );
}

export default AdminSubscriptionManagementPage;
