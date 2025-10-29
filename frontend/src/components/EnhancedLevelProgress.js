import React, { useState, useEffect } from 'react';
import api from '../api/api';

const EnhancedLevelProgress = ({ fighterData: propFighterData }) => {
    const [fighterData, setFighterData] = useState(propFighterData || null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Technical skills and advantages for calculations
    const technicalSkills = ['stance', 'jab', 'straight', 'left_hook', 'right_hook', 'thigh_kick', 'rib_kick', 'face_slap_kick', 'inner_kick', 'outer_kick', 'front_kick', 'rise_kick', 'boxing_movements', 'push_ups', 'cambo'];
    const skillAdvantages = ['stamina', 'speed', 'flexibility', 'power', 'martial_arts_knowledge', 'discipline'];

    useEffect(() => {
        // If fighterData was passed as a prop, use it and don't fetch from API
        if (propFighterData) {
            setFighterData(propFighterData);
            setLoading(false);
            return;
        }

        const fetchFighterData = async () => {
            try {
                const res = await api.get('/fighters/me');
                setFighterData(res.data);
            } catch (err) {
                console.error('Error fetching fighter data:', err);
                if (err.response?.status === 401 || err.response?.status === 403) {
                    setError('Please log in to view your level progress');
                } else {
                    setError('Failed to load fighter data. Please try again later.');
                }
            } finally {
                setLoading(false);
            }
        };

        fetchFighterData();

        // Set up polling for real-time updates (only for /fighters/me)
        const interval = setInterval(fetchFighterData, 3000); // Poll every 3 seconds for more responsive updates

        // Clean up interval on component unmount
        return () => clearInterval(interval);
    }, [propFighterData]);

    // Calculate level progress percentages
    const calculateLevelProgress = () => {
        if (!fighterData || !fighterData.assessment) {
            return {
                overallProgress: 0,
                tribeLevel: 0,
                technicalProgress: 0,
                skillProgress: 0,
                specialGradeScore: 0
            };
        }

        const assessment = fighterData.assessment;

        // Calculate technical skills progress
        let totalTechnicalScore = 0;
        let maxTechnicalScore = 0;
        let technicalSkillsCount = 0;

        technicalSkills.forEach(skill => {
            const skillData = assessment[skill] || {};
            const fighterScore = parseInt(skillData.fighterScore) || 0;
            const masterScore = parseInt(skillData.masterScore) || 0;
            
            if (masterScore > 0) {
                totalTechnicalScore += fighterScore;
                maxTechnicalScore += masterScore;
                technicalSkillsCount++;
            }
        });

        const technicalProgress = maxTechnicalScore > 0 
            ? Math.min(100, Math.round((totalTechnicalScore / maxTechnicalScore) * 100)) 
            : 0;

        // Calculate skill advantages progress
        let totalSkillScore = 0;
        let maxSkillScore = 0;
        let skillAdvantagesCount = 0;

        skillAdvantages.forEach(skill => {
            const skillData = assessment[skill] || {};
            const fighterScore = parseInt(skillData.fighterScore) || 0;
            const masterScore = parseInt(skillData.masterScore) || 0;
            
            if (masterScore > 0) {
                totalSkillScore += fighterScore;
                maxSkillScore += masterScore;
                skillAdvantagesCount++;
            }
        });

        const skillProgress = maxSkillScore > 0 
            ? Math.min(100, Math.round((totalSkillScore / maxSkillScore) * 100)) 
            : 0;

        // Calculate overall progress
        const overallProgress = technicalSkillsCount + skillAdvantagesCount > 0
            ? Math.min(100, Math.round(((technicalProgress * technicalSkillsCount + skillProgress * skillAdvantagesCount) / 
                         (technicalSkillsCount + skillAdvantagesCount))))
            : 0;

        // Calculate tribe level (based on special grade score)
        const specialGradeScore = parseInt(assessment.specialGradeScore) || 0;
        const tribeLevel = Math.min(100, Math.max(0, specialGradeScore)); // Assuming max is 100

        return {
            overallProgress,
            tribeLevel,
            technicalProgress,
            skillProgress,
            specialGradeScore
        };
    };

    // Get progress bar color based on percentage
    const getProgressColor = (percentage) => {
        if (percentage < 30) return 'bg-red-500';
        if (percentage < 70) return 'bg-yellow-500';
        return 'bg-green-500';
    };

    // Get progress bar gradient based on percentage
    const getProgressGradient = (percentage) => {
        if (percentage < 30) return 'from-red-400 to-red-600';
        if (percentage < 70) return 'from-yellow-400 to-yellow-600';
        return 'from-green-400 to-green-600';
    };

    // Render circular progress bar
    const CircularProgress = ({ percentage, label, size = 120 }) => {
        const strokeWidth = 8;
        const radius = (size - strokeWidth) / 2;
        const circumference = radius * 2 * Math.PI;
        const offset = circumference - (Math.min(100, percentage) / 100) * circumference;
        
        return (
            <div className="flex flex-col items-center">
                <div className="relative">
                    <svg width={size} height={size} className="transform -rotate-90">
                        <circle
                            cx={size / 2}
                            cy={size / 2}
                            r={radius}
                            stroke="currentColor"
                            strokeWidth={strokeWidth}
                            fill="transparent"
                            className="text-gray-200"
                        />
                        <circle
                            cx={size / 2}
                            cy={size / 2}
                            r={radius}
                            stroke="currentColor"
                            strokeWidth={strokeWidth}
                            fill="transparent"
                            strokeDasharray={circumference}
                            strokeDashoffset={offset}
                            className={`text-${getProgressColor(percentage).split('-')[1]}-500`}
                            strokeLinecap="round"
                        />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-xl font-bold text-gray-800">{percentage}%</span>
                    </div>
                </div>
                <span className="mt-2 text-sm font-medium text-gray-600">{label}</span>
            </div>
        );
    };

    // Render progress bar with animation
    const AnimatedProgressBar = ({ label, percentage, color }) => (
        <div className="mb-4">
            <div className="flex justify-between mb-1">
                <span className="text-sm font-medium text-gray-700">{label}</span>
                <span className="text-sm font-medium text-gray-700">{percentage}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
                <div 
                    className={`h-3 rounded-full bg-gradient-to-r ${getProgressGradient(percentage)} transition-all duration-1000 ease-out`}
                    style={{ width: `${Math.min(100, percentage)}%` }}
                ></div>
            </div>
        </div>
    );

    if (loading) {
        return (
            <div className="bg-white p-6 rounded-lg shadow-md">
                <div className="text-center p-8">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading level progress...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-white p-6 rounded-lg shadow-md">
                <div className="text-center p-8">
                    <div className="text-red-500 text-2xl mb-2">⚠️</div>
                    <p className="text-red-600 font-medium">{error}</p>
                    {error.includes('log in') ? (
                        <p className="text-gray-500 mt-2">Please log in to view your level progress</p>
                    ) : (
                        <p className="text-gray-500 mt-2">Please contact your administrator</p>
                    )}
                </div>
            </div>
        );
    }

    if (!fighterData || !fighterData.assessment) {
        return (
            <div className="bg-white p-6 rounded-lg shadow-md">
                <div className="text-center p-8">
                    <div className="text-gray-400 text-4xl mb-2">📊</div>
                    <h3 className="text-xl font-semibold text-gray-700 mb-2">Level Progress</h3>
                    <p className="text-gray-500">Your assessment has not been recorded by an admin yet.</p>
                    <p className="text-gray-400 text-sm mt-2">Check back later for updates.</p>
                </div>
            </div>
        );
    }

    const progressData = calculateLevelProgress();

    return (
        <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="mb-6">
                <h3 className="text-xl font-semibold text-gray-800 mb-2">Real-Time Level Progress</h3>
                <p className="text-gray-600 text-sm">Dynamically updated based on admin assessments</p>
            </div>

            {/* Overall Progress with Circular Indicator */}
            <div className="flex flex-col items-center mb-6">
                <CircularProgress 
                    percentage={progressData.overallProgress} 
                    label="Overall Progress" 
                    size={140}
                />
            </div>

            {/* Progress Details in Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-gray-700 mb-3 flex items-center">
                        <span className="w-3 h-3 bg-blue-500 rounded-full mr-2"></span>
                        Technical Skills
                    </h4>
                    <AnimatedProgressBar 
                        label="Techniques Mastery" 
                        percentage={progressData.technicalProgress} 
                        color={getProgressColor(progressData.technicalProgress)} 
                    />
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-gray-700 mb-3 flex items-center">
                        <span className="w-3 h-3 bg-purple-500 rounded-full mr-2"></span>
                        Skill Advantages
                    </h4>
                    <AnimatedProgressBar 
                        label="Attributes Development" 
                        percentage={progressData.skillProgress} 
                        color={getProgressColor(progressData.skillProgress)} 
                    />
                </div>
            </div>

            {/* Tribe Level with Enhanced Visualization */}
            <div className="mb-6 pt-4 border-t border-gray-200">
                <div className="flex justify-between items-center mb-3">
                    <h4 className="font-semibold text-gray-700 flex items-center">
                        <span className="w-3 h-3 bg-indigo-500 rounded-full mr-2"></span>
                        Tribe Level
                    </h4>
                    <span className="text-lg font-bold text-indigo-600">{progressData.tribeLevel}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-4">
                    <div 
                        className="h-4 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-1000 ease-out"
                        style={{ width: `${Math.min(100, progressData.tribeLevel)}%` }}
                    ></div>
                </div>
                <p className="text-xs text-gray-500 mt-2">Based on your special grade score</p>
            </div>

            {/* Special Grade Score with Badge */}
            <div className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
                <span className="font-medium text-gray-700">Special Grade Score</span>
                <span className="px-3 py-1 bg-blue-500 text-white font-bold rounded-full text-sm">
                    {progressData.specialGradeScore}
                </span>
            </div>

            {/* Real-time Update Indicator */}
            <div className="mt-4 flex items-center justify-center text-xs text-gray-500">
                <span className="flex h-2 w-2 mr-1">
                    <span className="animate-ping absolute h-2 w-2 rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative h-2 w-2 rounded-full bg-green-500"></span>
                </span>
                Live updates enabled
            </div>
        </div>
    );
};

export default EnhancedLevelProgress;