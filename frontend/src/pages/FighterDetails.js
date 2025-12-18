import React, { useState, useEffect } from 'react';
import api from '../api/api.js';
import { useParams } from 'react-router-dom';
import EnhancedLevelProgress from '../components/EnhancedLevelProgress';

// CoreLevelChart component has been replaced with EnhancedLevelProgress


const FighterDetails = () => {
    const { id } = useParams();
    const [fighterData, setFighterData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [subscriptions, setSubscriptions] = useState([]);
    const [loadingSubscriptions, setLoadingSubscriptions] = useState(true);
    const [error, setError] = useState('');

    const technicalSkills = ['stance', 'jab', 'straight', 'left_hook', 'right_hook', 'thigh_kick', 'rib_kick', 'face_slap_kick', 'inner_kick', 'outer_kick', 'front_kick', 'rise_kick', 'boxing_movements', 'push_ups', 'cambo'];
    const skillAdvantages = ['stamina', 'speed', 'flexibility', 'power', 'martial_arts_knowledge', 'discipline'];

    const planDetails = {
        monthly: { name: 'Monthly Plan', price: 500 },
        quarterly: { name: 'Quarterly Plan', price: 1200 },
        yearly: { name: 'Yearly Plan', price: 4800 }
    };

    useEffect(() => {
        const fetchFighterDetails = async () => {
            try {
                const res = await api.get(`/fighters/${id}`);
                setFighterData(res.data);
            } catch (err) {
                console.error('Error fetching fighter details:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchFighterDetails();
    }, [id]);

    useEffect(() => {
        const fetchSubscriptions = async () => {
            try {
                setLoadingSubscriptions(true);
                const res = await api.get(`/subscriptions/fighter/${id}`);
                setSubscriptions(res.data);
                setLoadingSubscriptions(false);
            } catch (err) {
                console.error('Error fetching subscriptions:', err);
                setError('Failed to fetch subscription details');
                setLoadingSubscriptions(false);
            }
        };
        
        if (id) {
            fetchSubscriptions();
        }
    }, [id]);

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'paid': return 'bg-green-100 text-green-800';
            case 'created': return 'bg-yellow-100 text-yellow-800';
            case 'expired': return 'bg-red-100 text-red-800';
            case 'cancelled': return 'bg-gray-100 text-gray-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center bg-gray-100">Loading fighter details...</div>;
    }

    if (!fighterData) {
        return <div className="min-h-screen flex items-center justify-center bg-gray-100 p-8">Fighter not found.</div>;
    }

    const DetailItem = ({ label, value }) => (
        <div>
            <p className="text-sm text-gray-400">{label}</p>
            <p className="text-white font-medium">{value || 'N/A'}</p>
        </div>
    );
    
    const SkillDisplayRow = ({ skill }) => {
        const skillData = fighterData.assessment?.[skill] || {};
        const fighterScore = skillData.fighterScore || 0;
        const masterScore = skillData.masterScore || 0;
        const scoreDiff = masterScore - fighterScore;

        return (
            <tr className="border-b border-gray-700">
                <td className="py-2 px-2 capitalize text-gray-300 font-medium">{skill.replace(/_/g, ' ')}</td>
                <td className="py-2 px-2 text-center text-white">{fighterScore}</td>
                <td className="py-2 px-2 text-center text-white">{masterScore}</td>
                <td className="py-2 px-2 text-center text-white font-bold">{scoreDiff}</td>
            </tr>
        );
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8 bg-gray-100 min-h-full">
            <div className="max-w-7xl mx-auto">
                <div className="text-center mb-8 border-b pb-4">
                    <h1 className="text-4xl font-bold text-gray-800">
                        Fighter Profile
                    </h1>
                </div>
                
                <div className="bg-white shadow-lg rounded-lg p-6">
                    {/* Personal Info */}
                    <div className="bg-gray-800 p-6 rounded-lg shadow-lg mb-8">
                        <h2 className="text-2xl font-bold border-b-2 border-red-500 pb-2 mb-6 text-white">Personal Info</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="md:col-span-1 flex flex-col items-center text-center">
                                {fighterData.profilePhoto ? (
                                    <img 
                                        src={fighterData.profilePhoto} 
                                        alt={fighterData.name} 
                                        className="w-32 h-32 rounded-full mb-4 border-2 border-gray-600 object-cover"
                                    />
                                ) : (
                                    <div className="w-32 h-32 bg-gray-700 rounded-full mb-4 border-2 border-gray-600 flex items-center justify-center">
                                        <span className="text-gray-500">No Image</span>
                                    </div>
                                )}
                                <h3 className="text-2xl font-bold text-white">{fighterData.name}</h3>
                            </div>
                            <div className="md:col-span-2">
                                <div className="grid grid-cols-2 gap-x-4 gap-y-5">
                                    <DetailItem label="RFID:" value={fighterData.rfid} />
                                    <DetailItem label="Batch No:" value={fighterData.fighterBatchNo} />
                                    <DetailItem label="Age:" value={fighterData.age} />
                                    <DetailItem label="Gender:" value={fighterData.gender} />
                                    <DetailItem label="Phone:" value={fighterData.phNo} />
                                    <DetailItem label="Blood Group:" value={fighterData.bloodGroup} />
                                    <div className="col-span-2"><DetailItem label="Address:" value={fighterData.address} /></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Fighter Details */}
                    <div className="bg-gray-800 p-6 rounded-lg shadow-lg mb-8">
                        <h2 className="text-2xl font-bold border-b-2 border-red-500 pb-2 mb-6 text-white">Fighter Details</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-5">
                            <DetailItem label="Height:" value={fighterData.height} />
                            <DetailItem label="Weight:" value={fighterData.weight} />
                            <DetailItem label="Occupation:" value={fighterData.occupation} />
                            <DetailItem label="Package:" value={fighterData.package} />
                            <DetailItem label="Joining Date:" value={new Date(fighterData.dateOfJoining).toLocaleDateString()} />
                            <DetailItem label="Motto:" value={fighterData.motto} />
                            <div className="col-span-2"><DetailItem label="Previous Experience:" value={fighterData.previousExperience} /></div>
                            <div className="col-span-2"><DetailItem label="Medical Issues:" value={fighterData.medicalIssue} /></div>
                            <div className="col-span-2"><DetailItem label="Martial Arts Knowledge:" value={fighterData.martialArtsKnowledge} /></div>
                        </div>
                    </div>

                    {/* Goals & Referral */}
                    <div className="bg-gray-800 p-6 rounded-lg shadow-lg mb-8">
                        <h2 className="text-2xl font-bold border-b-2 border-red-500 pb-2 mb-6 text-white">Goals & Referral</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-5">
                            <div className="col-span-2">
                                <p className="text-sm text-gray-400">Goals:</p>
                                <p className="text-white font-medium">{fighterData.goals?.join(', ') || 'N/A'}</p>
                            </div>
                            <div className="col-span-2">
                                <p className="text-sm text-gray-400">How did they know about us?</p>
                                <p className="text-white font-medium">{fighterData.referral || 'N/A'}</p>
                            </div>
                            {/* Achievements section */}
                            {fighterData.achievements && (
                                <div className="col-span-2">
                                    <p className="text-sm text-gray-400">Achievements:</p>
                                    <p className="text-white font-medium whitespace-pre-line">{fighterData.achievements}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Subscription Information */}
                    <div className="bg-gray-800 p-6 rounded-lg shadow-lg mb-8">
                        <h2 className="text-2xl font-bold border-b-2 border-red-500 pb-2 mb-6 text-white">Subscription Information</h2>
                        {error && (
                            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                                {error}
                            </div>
                        )}
                        
                        {loadingSubscriptions ? (
                            <div className="flex justify-center items-center py-8">
                                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                                <span className="ml-2 text-gray-300">Loading subscription information...</span>
                            </div>
                        ) : subscriptions.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-700">
                                    <thead>
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Plan</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Amount</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Period</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Status</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Created</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-700">
                                        {subscriptions.map((sub) => (
                                            <tr key={sub._id}>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                                                    {planDetails[sub.planType]?.name || sub.planType}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                                                    ₹{sub.amount}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                                                    {formatDate(sub.startDate)} - {formatDate(sub.endDate)}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(sub.status)}`}>
                                                        {sub.status.charAt(0).toUpperCase() + sub.status.slice(1)}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                                                    {formatDate(sub.createdAt)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <p className="text-gray-300 text-center py-4">No subscription history found for this fighter.</p>
                        )}
                    </div>

                    {/* Assessment */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
                         <div className="lg:col-span-3">
                            {fighterData.assessment ? (
                                <EnhancedLevelProgress fighterData={fighterData} />
                            ) : null}
                        </div>
                    </div>
                    
                    {fighterData.assessment && (
                        <div className="mt-8">
                            <div className="bg-gray-800 p-4 rounded-lg shadow-lg">
                                <h2 className="text-xl md:text-2xl font-bold border-b-2 border-red-500 pb-2 mb-4 text-white">Skill Assessment</h2>
                                
                                {/* Mobile view - stacked layout with compact tables */}
                                <div className="md:hidden space-y-6">
                                    <div>
                                        <h3 className="text-lg font-semibold mb-3 text-red-400">Technical Advantage</h3>
                                        <div className="bg-gray-700 rounded overflow-hidden">
                                            <table className="w-full text-xs">
                                                <thead>
                                                    <tr className="bg-gray-600">
                                                        <th className="py-2 px-2 text-left font-medium text-gray-300">Skill</th>
                                                        <th className="py-2 px-1 text-center font-medium text-gray-300">Fighter</th>
                                                        <th className="py-2 px-1 text-center font-medium text-gray-300">Master</th>
                                                        <th className="py-2 px-1 text-center font-medium text-gray-300">Diff</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {technicalSkills.map(skill => (
                                                        <tr key={skill} className="border-t border-gray-600">
                                                            <td className="py-2 px-2 text-gray-300 capitalize">{skill.replace(/_/g, ' ')}</td>
                                                            <td className="py-2 px-1 text-center text-white">{fighterData.assessment[skill]?.fighterScore || 0}</td>
                                                            <td className="py-2 px-1 text-center text-white">{fighterData.assessment[skill]?.masterScore || 0}</td>
                                                            <td className="py-2 px-1 text-center text-white font-medium">
                                                                {(fighterData.assessment[skill]?.masterScore || 0) - (fighterData.assessment[skill]?.fighterScore || 0)}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                    
                                    <div>
                                        <h3 className="text-lg font-semibold mb-3 text-red-400">Skill Advantage</h3>
                                        <div className="bg-gray-700 rounded overflow-hidden">
                                            <table className="w-full text-xs">
                                                <thead>
                                                    <tr className="bg-gray-600">
                                                        <th className="py-2 px-2 text-left font-medium text-gray-300">Skill</th>
                                                        <th className="py-2 px-1 text-center font-medium text-gray-300">Fighter</th>
                                                        <th className="py-2 px-1 text-center font-medium text-gray-300">Master</th>
                                                        <th className="py-2 px-1 text-center font-medium text-gray-300">Diff</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {skillAdvantages.map(skill => (
                                                        <tr key={skill} className="border-t border-gray-600">
                                                            <td className="py-2 px-2 text-gray-300 capitalize">{skill.replace(/_/g, ' ')}</td>
                                                            <td className="py-2 px-1 text-center text-white">{fighterData.assessment[skill]?.fighterScore || 0}</td>
                                                            <td className="py-2 px-1 text-center text-white">{fighterData.assessment[skill]?.masterScore || 0}</td>
                                                            <td className="py-2 px-1 text-center text-white font-medium">
                                                                {(fighterData.assessment[skill]?.masterScore || 0) - (fighterData.assessment[skill]?.fighterScore || 0)}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                                
                                {/* Desktop view - side by side layout */}
                                <div className="hidden md:grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <h3 className="text-xl font-semibold mb-4 text-red-400">Technical Advantage</h3>
                                        <table className="w-full">
                                            <thead>
                                                <tr className="border-b-2 border-gray-600">
                                                    <th className="py-2 px-2 text-left text-sm font-bold text-gray-400">Skill</th>
                                                    <th className="py-2 px-2 text-center text-sm font-bold text-gray-400">Fighter Score</th>
                                                    <th className="py-2 px-2 text-center text-sm font-bold text-gray-400">Master Score</th>
                                                    <th className="py-2 px-2 text-center text-sm font-bold text-gray-400">Diff</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {technicalSkills.map(skill => <SkillDisplayRow key={skill} skill={skill} />)}
                                            </tbody>
                                        </table>
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-semibold mb-4 text-red-400">Skill Advantage</h3>
                                        <table className="w-full">
                                            <thead>
                                                 <tr className="border-b-2 border-gray-600">
                                                    <th className="py-2 px-2 text-left text-sm font-bold text-gray-400">Skill</th>
                                                    <th className="py-2 px-2 text-center text-sm font-bold text-gray-400">Fighter Score</th>
                                                    <th className="py-2 px-2 text-center text-sm font-bold text-gray-400">Master Score</th>
                                                    <th className="py-2 px-2 text-center text-sm font-bold text-gray-400">Diff</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {skillAdvantages.map(skill => <SkillDisplayRow key={skill} skill={skill} />)}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                                
                                <div className="mt-4 pt-4 border-t border-gray-700">
                                    <p className="text-base md:text-lg text-white">
                                        <span className="font-bold text-gray-400">Special Grade Score: </span>
                                        <span className="font-medium">{fighterData.assessment.specialGradeScore || 'N/A'}</span>
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                    
                    {/* --- This section has been removed as requested --- */}
                    {/* <div className="mt-8">
                        <AdminAssessment fighterId={fighterData._id} />
                    </div>
                    */}
                </div>
            </div>
        </div>
    );
};

export default FighterDetails;
