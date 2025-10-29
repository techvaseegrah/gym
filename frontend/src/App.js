// client/src/App.js

import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { FaBars, FaTimes } from 'react-icons/fa';

// Import Pages
import LoginPage from './pages/LoginPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import DashboardPage from './pages/DashboardPage';
import AddFighterPage from './pages/AddFighterPage';
import EditFighterPage from './pages/EditFighterPage';
import ViewFighterDetailsPage from './pages/ViewFighterDetailsPage';
import AdminSettingsPage from './pages/AdminSettingsPage';
import AdminAttendancePage from './pages/AdminAttendancePage';
import FighterHomePage from './pages/FighterHomePage';
import FighterAttendancePage from './pages/FighterAttendancePage';
import CompleteProfilePage from './pages/CompleteProfilePage';
import FighterLevelPage from './pages/FighterLevelPage';
import FighterLevelViewPage from './pages/FighterLevelViewPage';
import FighterFaceRecognitionPage from './pages/FighterFaceRecognitionPage';
import AskDoubtPage from './pages/AskDoubtPage';

// Import Components
import AdminSidebar from './components/AdminSidebar';
import FighterSidebar from './components/FighterSidebar';
import api from './api/api';

const App = () => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

    useEffect(() => {
        const loadUser = async () => {
            const token = localStorage.getItem('token');
            if (token) {
                try {
                    const { data } = await api.get('/auth/user');
                    setUser(data);
                } catch (error) {
                    console.error("Session expired or token is invalid.");
                    setUser(null);
                }
            }
            setLoading(false);
        };
        loadUser();
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('token');
        setUser(null);
        window.location.href = '/';
    };
    
    const confirmLogout = () => {
        setShowLogoutConfirm(true);
    };
    
    const performLogout = () => {
        handleLogout();
        setShowLogoutConfirm(false);
    };
    
    const cancelLogout = () => {
        setShowLogoutConfirm(false);
    };
    
    const ProtectedRoute = ({ children, role }) => {
        const location = useLocation();

        if (!user) {
            return <Navigate to="/" replace />;
        }
        
        if (role && user.role !== role) {
            return <Navigate to="/" replace />;
        }

        if (user.role === 'fighter' && !user.profile_completed) {
            if (location.pathname !== '/fighter/complete-profile') {
                return <Navigate to="/fighter/complete-profile" replace />;
            }
        }
        
        if (user.role === 'fighter' && user.profile_completed && location.pathname === '/fighter/complete-profile') {
             return <Navigate to="/fighter" replace />;
        }

        return children;
    };

    const AdminLayout = ({ children }) => {
        const [isSidebarOpen, setSidebarOpen] = useState(false);
        const closeSidebar = () => setSidebarOpen(false);
        return (
            <div className="relative min-h-screen bg-gray-100">
                {isSidebarOpen && <div className="fixed inset-0 z-20 bg-black opacity-50 lg:hidden" onClick={closeSidebar}></div>}
    
                <div className="lg:hidden flex justify-between items-center bg-gray-800 text-white p-4 sticky top-0 z-10">
                    <h1 className="text-xl font-bold">Admin Panel</h1>
                    <button onClick={() => setSidebarOpen(!isSidebarOpen)}>
                        {isSidebarOpen ? <FaTimes size={24} /> : <FaBars size={24} />}
                    </button>
                </div>
    
                <aside className={`fixed inset-y-0 left-0 z-30 w-64 bg-gray-800 text-white transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 ease-in-out lg:translate-x-0`}>
                    <AdminSidebar handleLogout={confirmLogout} closeSidebar={closeSidebar} />
                </aside>
    
                <main className="lg:ml-64 p-4 sm:p-6 lg:p-8 min-h-screen">{children}</main>
                
                {/* Logout Confirmation Modal for Admin */}
                {showLogoutConfirm && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-lg p-6 w-96">
                            <h3 className="text-xl font-bold mb-4">Confirm Logout</h3>
                            <p className="mb-6">Are you sure you want to logout?</p>
                            <div className="flex justify-end space-x-4">
                                <button 
                                    onClick={cancelLogout}
                                    className="px-4 py-2 bg-gray-300 rounded-lg hover:bg-gray-400"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={performLogout}
                                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                                >
                                    Logout
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const FighterLayout = ({ children }) => {
        const [isSidebarOpen, setSidebarOpen] = useState(false);
        const closeSidebar = () => setSidebarOpen(false);
        return (
            <div className="relative min-h-screen bg-gray-100">
                {isSidebarOpen && <div className="fixed inset-0 z-20 bg-black opacity-50 lg:hidden" onClick={closeSidebar}></div>}
    
                <div className="lg:hidden flex justify-between items-center bg-gray-800 text-white p-4 sticky top-0 z-10">
                    <h1 className="text-xl font-bold">Fighter Portal</h1>
                    <button onClick={() => setSidebarOpen(!isSidebarOpen)}>
                        {isSidebarOpen ? <FaTimes size={24} /> : <FaBars size={24} />}
                    </button>
                </div>
    
                <aside className={`fixed inset-y-0 left-0 z-30 w-64 bg-gray-800 text-white transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 ease-in-out lg:translate-x-0`}>
                    <FighterSidebar handleLogout={confirmLogout} closeSidebar={closeSidebar} />
                </aside>
    
                <main className="lg:ml-64 p-4 sm:p-6 lg:p-8 min-h-screen">{children}</main>
                
                {/* Logout Confirmation Modal for Fighter */}
                {showLogoutConfirm && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-lg p-6 w-96">
                            <h3 className="text-xl font-bold mb-4">Confirm Logout</h3>
                            <p className="mb-6">Are you sure you want to logout?</p>
                            <div className="flex justify-end space-x-4">
                                <button 
                                    onClick={cancelLogout}
                                    className="px-4 py-2 bg-gray-300 rounded-lg hover:bg-gray-400"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={performLogout}
                                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                                >
                                    Logout
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    };
    
    if (loading) {
        return <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white"><h1 className="text-2xl">Loading Gym...</h1></div>;
    }

    return (
        <Router>
            <Routes>
                {/* --- THIS IS THE CORRECTED LOGIN ROUTE --- */}
                {/* It now passes the 'user' state down and always renders LoginPage */
                }
                <Route path="/" element={<LoginPage setUser={setUser} user={user} />} />

                {/* Admin Routes */}
                <Route path="/fighter/level" element={<ProtectedRoute role="fighter"><FighterLayout><FighterLevelViewPage /></FighterLayout></ProtectedRoute>} />
                <Route path="/admin/dashboard" element={<ProtectedRoute role="admin"><AdminLayout><DashboardPage /></AdminLayout></ProtectedRoute>} />
                <Route path="/admin" element={<ProtectedRoute role="admin"><AdminLayout><AdminDashboardPage /></AdminLayout></ProtectedRoute>} />
                <Route path="/admin/add-fighter" element={<ProtectedRoute role="admin"><AdminLayout><AddFighterPage /></AdminLayout></ProtectedRoute>} />
                <Route path="/admin/edit-fighter/:id" element={<ProtectedRoute role="admin"><AdminLayout><EditFighterPage /></AdminLayout></ProtectedRoute>} />
                <Route path="/admin/fighter/:id" element={<ProtectedRoute role="admin"><AdminLayout><ViewFighterDetailsPage /></AdminLayout></ProtectedRoute>} />
                <Route path="/admin/attendance" element={<ProtectedRoute role="admin"><AdminLayout><AdminAttendancePage /></AdminLayout></ProtectedRoute>} />
                <Route path="/admin/settings" element={<ProtectedRoute role="admin"><AdminLayout><AdminSettingsPage /></AdminLayout></ProtectedRoute>} />
                <Route path="/fighter/attendance/face" element={<ProtectedRoute role="fighter"><FighterLayout><FighterFaceRecognitionPage /></FighterLayout></ProtectedRoute>} />
                <Route path="/admin/ask-doubt" element={<ProtectedRoute role="admin"><AdminLayout><AskDoubtPage /></AdminLayout></ProtectedRoute>} />
                <Route path="/admin/fighter-level" element={<ProtectedRoute role="admin"><AdminLayout><FighterLevelPage /></AdminLayout></ProtectedRoute>} />
                {/* Fighter Routes */}
                <Route path="/fighter/ask-doubt" element={<ProtectedRoute role="fighter"><FighterLayout><AskDoubtPage /></FighterLayout></ProtectedRoute>} />
                <Route path="/fighter/complete-profile" element={<ProtectedRoute role="fighter"><CompleteProfilePage /></ProtectedRoute>} />
                <Route path="/fighter" element={<ProtectedRoute role="fighter"><FighterLayout><FighterHomePage user={user} /></FighterLayout></ProtectedRoute>} />
                <Route path="/fighter/attendance" element={<ProtectedRoute role="fighter"><FighterLayout><FighterAttendancePage user={user} /></FighterLayout></ProtectedRoute>} />
            </Routes>
        </Router>
    );
};

export default App;