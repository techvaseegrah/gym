import React, { useState, useEffect } from 'react';
import api from '../api/api';
import { useNavigate } from 'react-router-dom';

const FighterDashboard = ({ user }) => {
    const [fighterData, setFighterData] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchFighterData = async () => {
            try {
                // The API needs to be updated to get a single fighter's data for the fighter role
                const res = await api.get('/fighters/me');
                setFighterData(res.data);
            } catch (err) {
                console.error('Error fetching fighter data:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchFighterData();
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('token');
        navigate('/');
        window.location.reload();
    };

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center bg-gray-100">Loading your profile...</div>;
    }

    if (!fighterData) {
        return <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-8 text-center">
            <h1 className="text-3xl font-bold text-gray-800 mb-4">Profile Not Found</h1>
            <p className="text-gray-600">Please contact the administrator for assistance.</p>
        </div>;
    }

    return (
        <div className="min-h-screen bg-gray-100 p-4 md:p-8">
            <div className="max-w-6xl mx-auto">
                <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                    <h1 className="text-2xl md:text-3xl font-bold text-red-600 text-center w-full">My Fighter Profile</h1>
                    {/* Profile Photo Display Area */}
                    <div className="flex items-center justify-center space-x-4 w-full">
                        {fighterData.profilePhoto ? (
                            <img 
                                src={fighterData.profilePhoto} 
                                alt={fighterData.name} 
                                className="w-16 h-16 md:w-24 md:h-24 rounded-full object-cover border-2 border-gray-300"
                            />
                        ) : (
                            <div className="w-16 h-16 md:w-24 md:h-24 rounded-full bg-gray-200 border-2 border-gray-300 flex items-center justify-center">
                                <span className="text-gray-500 text-xs text-center">No Photo</span>
                            </div>
                        )}
                    </div>
                </div>
                
                {/* Personal Info Card */}
                <div className="bg-white shadow-lg rounded-lg p-4 md:p-6 mb-6">
                    <h2 className="text-xl md:text-2xl font-semibold text-gray-800 mb-4 pb-2 border-b text-center">Personal Info</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-700">
                        <div><strong>NAME:</strong> {fighterData.name}</div>
                        <div><strong>FIGHTER BATCH NO:</strong> {fighterData.fighterBatchNo}</div>
                        <div><strong>RFID:</strong> {fighterData.rfid}</div>
                        <div><strong>Age:</strong> {fighterData.age}</div>
                        <div><strong>Gender:</strong> {fighterData.gender}</div>
                        <div><strong>Ph No:</strong> {fighterData.phNo}</div>
                        <div className="md:col-span-2"><strong>Address:</strong> {fighterData.address}</div>
                    </div>
                </div>

                {/* Fighter Details Card */}
                <div className="bg-white shadow-lg rounded-lg p-4 md:p-6 mb-6">
                    <h2 className="text-xl md:text-2xl font-semibold text-gray-800 mb-4 pb-2 border-b text-center">Fighter Details</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-700">
                        <div><strong>Height:</strong> {fighterData.height}</div>
                        <div><strong>Weight:</strong> {fighterData.weight}</div>
                        <div><strong>Blood group:</strong> {fighterData.bloodGroup}</div>
                        <div><strong>Occupation:</strong> {fighterData.occupation}</div>
                        <div><strong>Date of Joining:</strong> {new Date(fighterData.dateOfJoining).toLocaleDateString()}</div>
                        <div><strong>Package:</strong> {fighterData.package}</div>
                        <div><strong>Previous Experience:</strong> {fighterData.previousExperience}</div>
                        <div><strong>Medical Issue/ Injury:</strong> {fighterData.medicalIssue}</div>
                        <div className="md:col-span-2"><strong>Motto:</strong> {fighterData.motto}</div>
                        <div className="md:col-span-2"><strong>Martial Arts Knowledge:</strong> {fighterData.martialArtsKnowledge}</div>
                    </div>
                </div>

                {/* Goals & Referral Card */}
                <div className="bg-white shadow-lg rounded-lg p-4 md:p-6">
                    <h2 className="text-xl md:text-2xl font-semibold text-gray-800 mb-4 pb-2 border-b text-center">Goals & Referral</h2>
                    <div className="text-gray-700">
                        <p className="mb-2"><strong>Goals:</strong> {fighterData.goals?.join(', ') || 'None specified'}</p>
                        <p className="mb-2"><strong>How did u know about us?:</strong> {fighterData.referral || 'Not specified'}</p>
                        {/* Achievements */}
                        {fighterData.achievements && (
                            <p><strong>Achievements:</strong> {fighterData.achievements}</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FighterDashboard;