import React, { useState, useEffect } from 'react';
import api from '../api/api';

const FighterLevelViewPage = () => {
    const [fighterData, setFighterData] = useState(null);
    const [loading, setLoading] = useState(true);

    const technicalSkills = ['stance', 'jab', 'straight', 'left_hook', 'right_hook', 'thigh_kick', 'rib_kick', 'face_slap_kick', 'inner_kick', 'outer_kick', 'front_kick', 'rise_kick', 'boxing_movements', 'push_ups', 'cambo'];
    const skillAdvantages = ['stamina', 'speed', 'flexibility', 'power', 'martial_arts_knowledge', 'discipline'];

    useEffect(() => {
        const fetchFighterData = async () => {
            try {
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

    if (loading) {
        return <div className="p-8 text-white">Loading Skill Assessment...</div>;
    }

    if (!fighterData || !fighterData.assessment) {
        return (
            <div className="p-8 text-white">
                <h1 className="text-3xl font-bold mb-6 text-red-500">My Skill Assessment</h1>
                <div className="bg-gray-800 p-6 rounded-lg shadow-lg h-64 flex items-center justify-center">
                    <p className="text-xl text-gray-400">Your assessment has not been recorded by an admin yet.</p>
                </div>
            </div>
        );
    }

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
        <div className="p-4 sm:p-6 lg:p-8 text-white bg-gray-900 min-h-full">
            <div className="max-w-7xl mx-auto">
                 <div className="mb-6 border-b-2 border-red-500 pb-2">
                    <h1 className="text-3xl font-bold text-white">My Skill Assessment</h1>
                </div>
                <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8">
                        <div>
                            <h3 className="text-xl font-semibold mb-4 text-red-400">Technical Advantage</h3>
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b-2 border-gray-600">
                                        <th className="py-2 px-2 text-left text-sm font-bold text-gray-400">Skill</th>
                                        <th className="py-2 px-2 text-center text-sm font-bold text-gray-400">My Score</th>
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
                                        <th className="py-2 px-2 text-center text-sm font-bold text-gray-400">My Score</th>
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
                    <div className="mt-6 pt-4 border-t border-gray-700">
                        <p className="text-lg text-white">
                            <span className="font-bold text-gray-400">My Special Grade Score: </span>
                            {fighterData.assessment.specialGradeScore || 'N/A'}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FighterLevelViewPage;