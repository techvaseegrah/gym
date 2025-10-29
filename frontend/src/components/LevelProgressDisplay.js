import React, { useState, useEffect } from 'react';
import api from '../api/api';

const LevelProgressDisplay = () => {
    const [fighterData, setFighterData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Technical skills and advantages for calculations
    const technicalSkills = ['stance', 'jab', 'straight', 'left_hook', 'right_hook', 'thigh_kick', 'rib_kick', 'face_slap_kick', 'inner_kick', 'outer_kick', 'front_kick', 'rise_kick', 'boxing_movements', 'push_ups', 'cambo'];
    const skillAdvantages = ['stamina', 'speed', 'flexibility', 'power', 'martial_arts_knowledge', 'discipline'];

    useEffect(() => {
        const fetchFighterData = async () => {
            try {
                const res = await api.get('/fighters/me');
                setFighterData(res.data);
            } catch (err) {
                console.error('Error fetching fighter data:', err);
                setError('Failed to load fighter data');
            } finally {
                setLoading(false);
            }
        };

        fetchFighterData();

        // Set up polling for real-time updates
        const interval = setInterval(fetchFighterData, 5000); // Poll every 5 seconds

        // Clean up interval on component unmount
        return () => clearInterval(interval);
    }, []);

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
            ? Math.round((totalTechnicalScore / maxTechnicalScore) * 100) 
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
            ? Math.round((totalSkillScore / maxSkillScore) * 100) 
            : 0;

        // Calculate overall progress
        const overallProgress = technicalSkillsCount + skillAdvantagesCount > 0
            ? Math.round(((technicalProgress * technicalSkillsCount + skillProgress * skillAdvantagesCount) / 
                         (technicalSkillsCount + skillAdvantagesCount)))
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

    // Render progress bar
    const ProgressBar = ({ label, percentage, color }) => (
        <div className="mb-4">
            <div className="flex justify-between mb-1">
                <span className="text-sm font-medium text-gray-700">{label}</span>
                <span className="text-sm font-medium text-gray-700">{percentage}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div 
                    className={`h-2.5 rounded-full ${color}`}
                    style={{ width: `${percentage}%` }}
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
                    <p className="text-gray-500 mt-2">Please contact your administrator</p>
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
                <h3 className="text-xl font-semibold text-gray-800 mb-2">Level Progress</h3>
                <p className="text-gray-600 text-sm">Real-time progress updates based on your assessments</p>
            </div>

            {/* Overall Progress */}
            <div className="mb-6 p-4 bg-gradient-to-r from-red-50 to-orange-50 rounded-lg border border-red-100">
                <div className="flex justify-between items-center mb-2">
                    <span className="font-bold text-gray-800">Overall Progress</span>
                    <span className="text-lg font-bold text-red-600">{progressData.overallProgress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-4">
                    <div 
                        className="h-4 rounded-full bg-gradient-to-r from-red-500 to-orange-500"
                        style={{ width: `${progressData.overallProgress}%` }}
                    ></div>
                </div>
            </div>

            {/* Progress Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <h4 className="font-semibold text-gray-700 mb-3">Technical Skills</h4>
                    <ProgressBar 
                        label="Techniques" 
                        percentage={progressData.technicalProgress} 
                        color={getProgressColor(progressData.technicalProgress)} 
                    />
                </div>
                <div>
                    <h4 className="font-semibold text-gray-700 mb-3">Skill Advantages</h4>
                    <ProgressBar 
                        label="Attributes" 
                        percentage={progressData.skillProgress} 
                        color={getProgressColor(progressData.skillProgress)} 
                    />
                </div>
            </div>

            {/* Tribe Level */}
            <div className="mt-6 pt-4 border-t border-gray-200">
                <div className="flex justify-between items-center mb-2">
                    <span className="font-bold text-gray-800">Tribe Level</span>
                    <span className="text-lg font-bold text-purple-600">{progressData.tribeLevel}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                        className="h-3 rounded-full bg-gradient-to-r from-purple-500 to-indigo-500"
                        style={{ width: `${Math.min(100, progressData.tribeLevel)}%` }}
                    ></div>
                </div>
                <p className="text-xs text-gray-500 mt-1">Based on your special grade score</p>
            </div>

            {/* Special Grade Score */}
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <div className="flex justify-between">
                    <span className="text-sm font-medium text-gray-700">Special Grade Score</span>
                    <span className="text-sm font-bold text-blue-600">{progressData.specialGradeScore}</span>
                </div>
            </div>
        </div>
    );
};

export default LevelProgressDisplay;