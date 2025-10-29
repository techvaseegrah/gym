import React, { useState, useEffect, useRef } from 'react';
import api from '../api/api.js';

const FighterLevelPage = () => {
    const [fighters, setFighters] = useState([]);
    const [selectedFighterId, setSelectedFighterId] = useState('');
    const [assessment, setAssessment] = useState({});
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);

    const technicalSkills = ['stance', 'jab', 'straight', 'left_hook', 'right_hook', 'thigh_kick', 'rib_kick', 'face_slap_kick', 'inner_kick', 'outer_kick', 'front_kick', 'rise_kick', 'boxing_movements', 'push_ups', 'cambo'];
    const skillAdvantages = ['stamina', 'speed', 'flexibility', 'power', 'martial_arts_knowledge', 'discipline'];

    const getInitialAssessment = () => {
        const initial = { specialGradeScore: '' };
        [...technicalSkills, ...skillAdvantages].forEach(skill => {
            initial[skill] = { fighterScore: '', masterScore: '' };
        });
        return initial;
    };

    useEffect(() => {
        const fetchFighters = async () => {
            try {
                const res = await api.get('/fighters/roster');
                setFighters(res.data);
            } catch (err) {
                console.error("Failed to fetch fighters", err);
            }
        };
        fetchFighters();
    }, []);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    useEffect(() => {
        if (!selectedFighterId) {
            setAssessment({});
            return;
        }
        const fetchAssessmentData = async () => {
            try {
                const res = await api.get(`/fighters/${selectedFighterId}`);
                setAssessment(res.data.assessment || getInitialAssessment());
            } catch (err) {
                console.error("Failed to fetch assessment", err);
            }
        };
        fetchAssessmentData();
    }, [selectedFighterId]);
    
    const handleSkillChange = (skill, scoreType, value) => {
        setAssessment(prev => ({
            ...prev,
            [skill]: {
                ...(prev[skill] || {}),
                [scoreType]: value
            }
        }));
    };

    const handleScoreChange = (e) => {
        setAssessment(prev => ({ ...prev, specialGradeScore: e.target.value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedFighterId) {
            setMessage('Please select a fighter first.');
            return;
        }
        setLoading(true);
        setMessage('');
        try {
            await api.post(`/fighters/assess/${selectedFighterId}`, assessment);
            setMessage('Assessment saved successfully!');
            setTimeout(() => setMessage(''), 3000);
        } catch (err) {
            setMessage('Failed to save assessment. Please try again.');
        } finally {
            setLoading(false);
        }
    };
    
    // --- This component now returns a table row <tr> ---
    const SkillRow = ({ skill }) => {
        const skillData = assessment[skill] || {};
        const fighterScore = skillData.fighterScore || '';
        const masterScore = skillData.masterScore || '';
        const scoreDiff = (masterScore || 0) - (fighterScore || 0);

        return (
            <tr className="border-b border-gray-200">
                <td className="py-2 px-2 capitalize text-gray-700 font-medium">{skill.replace(/_/g, ' ')}</td>
                <td className="py-2 px-2">
                    <input
                        type="number"
                        value={fighterScore}
                        onChange={(e) => handleSkillChange(skill, 'fighterScore', e.target.value)}
                        className="w-full p-2 bg-white border border-gray-300 rounded-md text-gray-800 text-center focus:ring-red-500 focus:border-red-500"
                    />
                </td>
                <td className="py-2 px-2">
                    <input
                        type="number"
                        value={masterScore}
                        onChange={(e) => handleSkillChange(skill, 'masterScore', e.target.value)}
                        className="w-full p-2 bg-white border border-gray-300 rounded-md text-gray-800 text-center focus:ring-red-500 focus:border-red-500"
                    />
                </td>
                <td className="py-2 px-2">
                    <div className="w-full p-2 bg-gray-200 border border-gray-300 rounded-md text-gray-800 text-center">
                        {scoreDiff}
                    </div>
                </td>
            </tr>
        );
    };

    const filteredFighters = fighters.filter(fighter =>
        fighter.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const selectedFighter = fighters.find(fighter => fighter._id === selectedFighterId);

    return (
        <div className="p-4 sm:p-6 lg:p-8 text-gray-800 bg-gray-100 min-h-full">
            <div className="max-w-7xl mx-auto">
                <div className="mb-6 border-b-2 border-red-500 pb-2">
                    <h1 className="text-3xl font-bold text-gray-800">Fighter Level Assessment</h1>
                </div>

                <div className="bg-white p-4 rounded-lg shadow-md mb-8">
                    <div className="relative" ref={dropdownRef}>
                        <button
                            type="button"
                            className="w-full p-3 bg-white border border-gray-300 rounded-md text-gray-800 focus:ring-red-500 focus:border-red-500 text-left"
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        >
                            {selectedFighter ? selectedFighter.name : "-- Select a Fighter --"}
                        </button>

                        {isDropdownOpen && (
                            <div className="absolute z-10 mt-1 w-full bg-white shadow-lg rounded-md border border-gray-300">
                                <div className="p-2">
                                    <input
                                        type="text"
                                        placeholder="Search for a fighter..."
                                        className="w-full p-2 border border-gray-300 rounded-md text-gray-800 placeholder-gray-400 focus:ring-red-500 focus:border-red-500"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        autoFocus
                                    />
                                </div>
                                <ul className="max-h-60 overflow-auto">
                                    {filteredFighters.length > 0 ? (
                                        filteredFighters.map(fighter => (
                                            <li
                                                key={fighter._id}
                                                className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                                                onClick={() => {
                                                    setSelectedFighterId(fighter._id);
                                                    setIsDropdownOpen(false);
                                                    setSearchTerm('');
                                                }}
                                            >
                                                {fighter.name}
                                            </li>
                                        ))
                                    ) : (
                                        <li className="px-4 py-2 text-gray-500">No fighters found</li>
                                    )}
                                </ul>
                            </div>
                        )}
                    </div>
                </div>

                {selectedFighterId ? (
                    <div className="bg-white p-6 rounded-lg shadow-md">
                        <form onSubmit={handleSubmit}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                                <div>
                                    <h3 className="text-xl font-semibold my-4 text-red-600">Technical Advantage</h3>
                                    {/* --- Switched to a table for proper alignment --- */}
                                    <table className="w-full">
                                        <thead>
                                            <tr className="border-b-2 border-gray-300">
                                                <th className="py-2 px-2 text-left text-sm font-bold text-gray-500">Skill</th>
                                                <th className="py-2 px-2 text-center text-sm font-bold text-gray-500">Fighter Score</th>
                                                <th className="py-2 px-2 text-center text-sm font-bold text-gray-500">Master Score</th>
                                                <th className="py-2 px-2 text-center text-sm font-bold text-gray-500">Diff</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {technicalSkills.map(skill => <SkillRow key={skill} skill={skill} />)}
                                        </tbody>
                                    </table>
                                </div>
                                <div>
                                    <h3 className="text-xl font-semibold my-4 text-red-600">Skill Advantage</h3>
                                    {/* --- Switched to a table for proper alignment --- */}
                                    <table className="w-full">
                                        <thead>
                                            <tr className="border-b-2 border-gray-300">
                                                <th className="py-2 px-2 text-left text-sm font-bold text-gray-500">Skill</th>
                                                <th className="py-2 px-2 text-center text-sm font-bold text-gray-500">Fighter Score</th>
                                                <th className="py-2 px-2 text-center text-sm font-bold text-gray-500">Master Score</th>
                                                <th className="py-2 px-2 text-center text-sm font-bold text-gray-500">Diff</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {skillAdvantages.map(skill => <SkillRow key={skill} skill={skill} />)}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                            
                            <div className="mt-8 pt-6 border-t grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                                <div>
                                    <label className="block text-lg font-medium mb-2 text-gray-700" htmlFor="special-grade">Special Grade Score</label>
                                    <input
                                        id="special-grade"
                                        type="number"
                                        value={assessment.specialGradeScore || ''}
                                        onChange={handleScoreChange}
                                        className="w-full p-3 bg-white border border-gray-300 rounded-md"
                                        placeholder="Enter score"
                                    />
                                </div>
                                <div className="text-center md:text-right mt-4 md:mt-0">
                                    <button type="submit" className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-8 rounded-lg transition disabled:bg-gray-500 w-full md:w-auto" disabled={loading}>
                                        {loading ? 'Saving...' : 'Save Assessment'}
                                    </button>
                                </div>
                            </div>
                        </form>
                        {message && <p className="text-center mt-6 text-green-600 font-medium">{message}</p>}
                    </div>
                ) : (
                    <div className="bg-white p-6 rounded-lg shadow-md h-64 flex items-center justify-center">
                        <p className="text-xl text-gray-500">Please search and select a fighter to view or edit their assessment.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default FighterLevelPage;