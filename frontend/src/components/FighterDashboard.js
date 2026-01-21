import React from 'react';
import { 
    FaIdCard, FaDumbbell, 
    FaStethoscope, FaTrophy, FaPhone, 
    FaMapMarkerAlt, FaBriefcase,
    FaCreditCard, FaCheckCircle, FaClock
} from 'react-icons/fa';
import ProfilePictureUpload from './ProfilePictureUpload';

const FighterDashboard = ({ user, refreshUser }) => {
    // Helper to format dates for membership and subscription info
    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    // Helper to determine subscription status color
    const getStatusColor = (status) => {
        switch (status?.toLowerCase()) {
            case 'active': return 'bg-green-100 text-green-700 border-green-200';
            case 'expired': return 'bg-red-100 text-red-700 border-red-200';
            default: return 'bg-yellow-100 text-yellow-700 border-yellow-200';
        }
    };

    return (
        <div className="max-w-full overflow-x-hidden space-y-4 md:space-y-6 pb-10">
            
            {/* --- HEADER SECTION --- */}
            <div className="bg-gradient-to-br from-blue-700 to-indigo-900 rounded-2xl p-5 md:p-8 text-white shadow-lg">
                <div className="flex flex-col items-center md:flex-row md:justify-between">
                    <div className="flex flex-col items-center md:flex-row md:space-x-6">
                        <ProfilePictureUpload 
                            user={user}
                            onUpdateSuccess={refreshUser}
                            className="w-20 h-20 md:w-24 md:h-24 mb-3 md:mb-0"
                        />
                        <div className="text-center md:text-left">
                            <h3 className="text-xl md:text-3xl font-bold uppercase tracking-tight">{user?.name || 'Fighter'}</h3>
                            <p className="text-blue-200 text-sm md:text-base italic mt-1 opacity-90">"{user?.motto || 'No motto set'}"</p>
                        </div>
                    </div>

                    {/* Department Badge */}
                    <div className="mt-5 md:mt-0 w-full md:w-auto bg-white/10 backdrop-blur-md px-6 py-3 rounded-xl border border-white/20 text-center">
                        <p className="text-[10px] uppercase tracking-widest font-black text-blue-200 mb-1">Assigned Department</p>
                        <p className="text-xl md:text-2xl font-black capitalize">
                            {user?.department || 'Seniors'}
                        </p>
                    </div>
                </div>
            </div>

            {/* --- SUBSCRIPTION DETAILS (New Section) --- */}
            <div className="bg-white rounded-xl p-5 shadow-sm border border-blue-100">
                <h4 className="text-md font-bold text-gray-800 mb-4 flex items-center">
                    <FaCreditCard className="mr-2 text-blue-600" /> Subscription Status
                </h4>
                {user?.currentSubscription ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="p-3 rounded-lg bg-gray-50 border border-gray-100">
                            <p className="text-[10px] text-gray-400 uppercase font-bold">Plan Name</p>
                            <p className="font-bold text-gray-800 capitalize">{user.currentSubscription.planName || user.package}</p>
                        </div>
                        <div className="p-3 rounded-lg bg-gray-50 border border-gray-100">
                            <p className="text-[10px] text-gray-400 uppercase font-bold">Expiry Date</p>
                            <div className="flex items-center text-gray-800 font-bold">
                                <FaClock className="mr-2 text-orange-400 size-3" />
                                {formatDate(user.currentSubscription.endDate)}
                            </div>
                        </div>
                        <div className={`p-3 rounded-lg border flex items-center justify-center ${getStatusColor(user.currentSubscription.status)}`}>
                            <FaCheckCircle className="mr-2" />
                            <span className="font-black uppercase text-sm tracking-wider">
                                {user.currentSubscription.status || 'Active'}
                            </span>
                        </div>
                    </div>
                ) : (
                    <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-100 text-center">
                        <p className="text-sm text-yellow-700 font-medium">No active subscription found. Please contact the admin panel to renew your {user?.package || 'package'}.</p>
                    </div>
                )}
            </div>

            {/* --- INFO CARDS GRID --- */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                
                {/* Identification */}
                <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                    <h4 className="text-md font-bold text-gray-800 mb-4 flex items-center border-b border-gray-50 pb-2">
                        <FaIdCard className="mr-2 text-blue-600" /> Fighter Profile
                    </h4>
                    <div className="space-y-3 text-sm">
                        <div className="flex justify-between">
                            <span className="text-gray-500">Batch No:</span>
                            <span className="font-bold">{user?.fighterBatchNo || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500">RFID:</span>
                            <span className="font-bold text-blue-600">{user?.rfid || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500">Joined:</span>
                            <span className="font-bold">{formatDate(user?.dateOfJoining)}</span>
                        </div>
                    </div>
                </div>

                {/* Physical Stats */}
                <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                    <h4 className="text-md font-bold text-gray-800 mb-4 flex items-center border-b border-gray-50 pb-2">
                        <FaDumbbell className="mr-2 text-indigo-600" /> Physical Stats
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-gray-50 p-2 rounded text-center">
                            <p className="text-[10px] text-gray-400 uppercase">Height</p>
                            <p className="font-bold">{user?.height || '--'}</p>
                        </div>
                        <div className="bg-gray-50 p-2 rounded text-center">
                            <p className="text-[10px] text-gray-400 uppercase">Weight</p>
                            <p className="font-bold">{user?.weight || '--'}</p>
                        </div>
                        <div className="bg-gray-50 p-2 rounded text-center">
                            <p className="text-[10px] text-gray-400 uppercase">Age</p>
                            <p className="font-bold">{user?.age || '--'}</p>
                        </div>
                        <div className="bg-gray-50 p-2 rounded text-center">
                            <p className="text-[10px] text-gray-400 uppercase">Blood</p>
                            <p className="font-bold text-red-600">{user?.bloodGroup || '--'}</p>
                        </div>
                    </div>
                </div>

                {/* Contact & Misc */}
                <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 md:col-span-2 lg:col-span-1">
                    <h4 className="text-md font-bold text-gray-800 mb-4 flex items-center border-b border-gray-50 pb-2">
                        <FaPhone className="mr-2 text-gray-600" /> Contact & Info
                    </h4>
                    <div className="space-y-3 text-sm">
                        <p className="flex items-center text-gray-700">
                            <FaPhone className="mr-3 text-blue-500 shrink-0" /> {user?.phNo || 'No phone'}
                        </p>
                        <p className="flex items-center text-gray-700">
                            <FaBriefcase className="mr-3 text-gray-400 shrink-0" /> {user?.occupation || 'Occupation not set'}
                        </p>
                        <p className="flex items-start text-gray-700">
                            <FaMapMarkerAlt className="mr-3 mt-1 text-red-500 shrink-0" /> 
                            <span className="line-clamp-2">{user?.address || 'No address'}</span>
                        </p>
                    </div>
                </div>
            </div>

            {/* --- GOALS & ACHIEVEMENTS --- */}
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                <h4 className="text-md font-bold text-gray-800 mb-4 flex items-center border-b border-gray-50 pb-2">
                    <FaTrophy className="mr-2 text-yellow-500" /> Achievements & Goals
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <p className="text-[10px] text-gray-400 font-bold uppercase mb-2">My Goals</p>
                        <div className="flex flex-wrap gap-2">
                            {user?.goals?.length > 0 ? user.goals.map((g, i) => (
                                <span key={i} className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-semibold rounded-full border border-blue-100">{g}</span>
                            )) : <span className="text-xs italic text-gray-400">No goals set</span>}
                        </div>
                    </div>
                    <div>
                        <p className="text-[10px] text-gray-400 font-bold uppercase mb-2">Record</p>
                        <p className="text-sm text-gray-600 bg-yellow-50 p-3 rounded-lg border border-yellow-100 italic">
                            {user?.achievements || "Keep training to unlock achievements!"}
                        </p>
                    </div>
                </div>
                {user?.medicalIssue && (
                    <div className="mt-4 p-3 bg-red-50 rounded-lg border border-red-100 flex items-start">
                        <FaStethoscope className="text-red-500 mr-2 mt-1 shrink-0" />
                        <div>
                            <p className="text-[10px] text-red-400 font-bold uppercase">Medical Note</p>
                            <p className="text-sm text-red-700">{user.medicalIssue}</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default FighterDashboard;