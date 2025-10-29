// client/src/components/AdminSidebar.js

import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
    FaTachometerAlt,
    FaUsers,
    FaUserPlus,
    FaListAlt,
    FaCalendarCheck,
    FaCog,
    FaSignOutAlt,
    FaAngleDown,
    FaAngleUp,
    FaChartLine,
    FaQuestionCircle ,
    FaEnvelope
} from 'react-icons/fa';

const AdminSidebar = ({ handleLogout, closeSidebar }) => {
    // State for the dropdown menu is okay to keep
    const [isManageFightersOpen, setIsManageFightersOpen] = useState(false);

    const linkClasses = "flex items-center w-full px-4 py-3 text-gray-300 hover:bg-gray-700 hover:text-white rounded-lg transition-colors duration-200";
    const activeLinkClasses = "bg-red-600 text-white";
    const subLinkClasses = "flex items-center w-full pl-11 pr-4 py-2 text-sm text-gray-400 hover:bg-gray-700 hover:text-white rounded-lg transition-colors duration-200";
    const activeSubLinkClasses = "bg-red-600/50 text-white";

    // This function will be called for all navigation links
    const handleLinkClick = () => {
        // We don't need to close the dropdown on every click, just the sidebar
        closeSidebar();
    };

    // The entire content of the sidebar is defined here
    const sidebarContent = (
        <div className="flex flex-col h-full">
            {/* Logo and Title */}
            <div className="p-4 mb-4 text-center">
                <img
                    src="/logo.png"
                    alt="Logo"
                    className="w-24 h-24 mx-auto mb-2 rounded-full object-cover border-2 border-gray-600"
                />
                <h1 className="text-xl font-bold text-white tracking-wider">ADMIN</h1>
            </div>

            {/* Navigation Links */}
            <nav className="flex-grow px-4 space-y-2">
                <NavLink to="/admin/dashboard" className={({ isActive }) => isActive ? `${linkClasses} ${activeLinkClasses}` : linkClasses} onClick={handleLinkClick}>
                    <FaTachometerAlt className="mr-3" /> Dashboard
                </NavLink>

                {/* Manage Fighters Dropdown */}
                <div>
                    <button
                        onClick={() => setIsManageFightersOpen(!isManageFightersOpen)}
                        className={`${linkClasses} justify-between`}
                    >
                        <div className="flex items-center">
                            <FaUsers className="mr-3" /> Manage Fighters
                        </div>
                        {isManageFightersOpen ? <FaAngleUp /> : <FaAngleDown />}
                    </button>
                    {isManageFightersOpen && (
                        <div className="mt-2 space-y-2">
                            <NavLink
                                to="/admin/add-fighter"
                                className={({ isActive }) => `${subLinkClasses} ${isActive ? activeSubLinkClasses : ''}`}
                                onClick={handleLinkClick}
                            >
                                <FaUserPlus className="mr-3" /> Add Fighter
                            </NavLink>
                            <NavLink
                                to="/admin"
                                end
                                className={({ isActive }) => `${subLinkClasses} ${isActive ? activeSubLinkClasses : ''}`}
                                onClick={handleLinkClick}
                            >
                                <FaListAlt className="mr-3" /> View Fighters
                            </NavLink>
                        </div>
                    )}
                </div>

                <NavLink
                    to="/admin/fighter-level"
                    className={({ isActive }) => `${linkClasses} ${isActive ? activeLinkClasses : ''}`}
                    onClick={handleLinkClick}
                >
                    <FaChartLine className="mr-3" /> Fighter Level
                </NavLink>

                <NavLink
                    to="/admin/attendance"
                    className={({ isActive }) => `${linkClasses} ${isActive ? activeLinkClasses : ''}`}
                    onClick={handleLinkClick}
                >
                    <FaCalendarCheck className="mr-3" /> Attendance
                </NavLink>
                <NavLink
                    to="/admin/ask-doubt"
                    className={({ isActive }) => `${linkClasses} ${isActive ? activeLinkClasses : ''}`}
                    onClick={handleLinkClick}
                >
                    <FaEnvelope className="mr-3" /> Ask Doubt
                </NavLink>
                <NavLink
                    to="/admin/settings"
                    className={({ isActive }) => `${linkClasses} ${isActive ? activeLinkClasses : ''}`}
                    onClick={handleLinkClick}
                >
                    <FaCog className="mr-3" /> Settings
                </NavLink>
            </nav>

            {/* Logout Button */}
            <div className="p-4">
                <button onClick={() => { handleLogout(); handleLinkClick(); }} className={linkClasses}>
                    <FaSignOutAlt className="mr-3" /> Logout
                </button>
            </div>
        </div>
    );

    // The component now ONLY returns the sidebar content.
    // The parent component (App.js) will handle showing/hiding it.
    return sidebarContent;
};

export default AdminSidebar;