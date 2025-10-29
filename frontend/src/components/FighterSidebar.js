import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { FaHome, FaCalendarCheck, FaSignOutAlt, FaChartLine, FaEnvelope } from 'react-icons/fa';
import api from '../api/api';

const FighterSidebar = ({ handleLogout, closeSidebar }) => {
    const [fighterName, setFighterName] = useState('FIGHTER');

    const linkClasses = "flex items-center px-4 py-3 text-gray-300 hover:bg-gray-700 hover:text-white rounded-lg transition-colors duration-200";
    const activeLinkClasses = "bg-blue-600 text-white";

    // Fetch fighter data when component mounts
    useEffect(() => {
        const fetchFighterData = async () => {
            try {
                const res = await api.get('/fighters/me');
                if (res.data && res.data.name) {
                    setFighterName(res.data.name);
                }
            } catch (err) {
                console.error('Error fetching fighter data:', err);
                // Keep default name if fetch fails
            }
        };

        fetchFighterData();
    }, []);

    // The entire content of the sidebar is defined here
    const sidebarContent = (
        <div className="flex flex-col h-full">
            {/* Logo and Title */}
            <div className="p-4 mb-4 text-center">
                <img src="/logo.png" alt="Logo" className="w-24 h-24 mx-auto mb-2 rounded-full object-cover border-2 border-gray-600" />
                <h1 className="text-xl font-bold text-white tracking-wider">{fighterName}</h1>
            </div>

            {/* Navigation Links */}
            <nav className="flex-grow px-4 space-y-2">
                <NavLink to="/fighter" end className={({ isActive }) => `${linkClasses} ${isActive ? activeLinkClasses : ''}`} onClick={closeSidebar}>
                    <FaHome className="mr-3" /> Home
                </NavLink>
                <NavLink to="/fighter/attendance" className={({ isActive }) => `${linkClasses} ${isActive ? activeLinkClasses : ''}`} onClick={closeSidebar}>
                    <FaCalendarCheck className="mr-3" /> My Attendance
                </NavLink>
                <NavLink to="/fighter/level" className={({ isActive }) => `${linkClasses} ${isActive ? activeLinkClasses : ''}`} onClick={closeSidebar}>
                    <FaChartLine className="mr-3" /> Fighter Level
                </NavLink>
                <NavLink to="/fighter/ask-doubt" className={({ isActive }) => `${linkClasses} ${isActive ? activeLinkClasses : ''}`} onClick={closeSidebar}>
                    <FaEnvelope className="mr-3" /> Ask Doubt
                </NavLink>
            </nav>

            {/* Logout Button */}
            <div className="p-4">
                <button onClick={() => { handleLogout(); closeSidebar(); }} className="w-full flex items-center justify-center px-4 py-3 text-gray-300 bg-gray-700 hover:bg-red-700 hover:text-white rounded-lg transition-colors duration-200">
                    <FaSignOutAlt className="mr-3" /> Logout
                </button>
            </div>
        </div>
    );

    // The component now ONLY returns the sidebar content.
    // The parent component (App.js) will handle showing/hiding it.
    return sidebarContent;
};

export default FighterSidebar;