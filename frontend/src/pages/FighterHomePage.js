import React, { useState, useEffect } from 'react';
import FighterDashboard from '../components/FighterDashboard'; //
import EnhancedLevelProgress from '../components/EnhancedLevelProgress'; // Import the new enhanced component

const FighterHomePage = ({ user }) => {
    const [activeTab, setActiveTab] = useState('dashboard'); //

    // Attendance functionality has been removed

    const renderContent = () => {
        if (activeTab === 'dashboard') {
            return <FighterDashboard user={user} />; //
        }
        // --- Replace the old Fighter Level tab with the new EnhancedLevelProgress ---
        if (activeTab === 'fighterLevel') {
            return <EnhancedLevelProgress fighterData={user} />;
        }
        return null; //
    };

    return (
        <div className="bg-white p-6 md:p-8 rounded-xl shadow-lg">
            <div className="mb-6">
                <h2 className="text-3xl font-bold text-gray-800">Welcome, {user?.name || 'Fighter'}!</h2>
                <p className="text-gray-500 mt-1">Here's your personal dashboard.</p>
            </div>
            
            {/* Tabs */}
            <div className="border-b border-gray-200 mb-6">
                <nav className="-mb-px flex space-x-6">
                    <button
                        onClick={() => setActiveTab('dashboard')}
                        className={`py-3 px-1 font-semibold text-lg transition-colors duration-200 ${
                            activeTab === 'dashboard'
                                ? 'border-b-2 border-blue-600 text-blue-600'
                                : 'text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        Dashboard
                    </button>
                    {/* --- Update the button label to be more descriptive --- */}
                     <button
                        onClick={() => setActiveTab('fighterLevel')}
                        className={`py-3 px-1 font-semibold text-lg transition-colors duration-200 ${
                            activeTab === 'fighterLevel'
                                ? 'border-b-2 border-blue-600 text-blue-600'
                                : 'text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        Real-Time Level
                    </button>
                </nav>
            </div>

            {/* Tab Content */}
            <div>
                {renderContent()}
            </div>
        </div>
    );
};

export default FighterHomePage;