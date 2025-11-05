import React, { useState } from 'react';
import api from '../api/api';

const AdminAssessment = ({ fighterId }) => {
    const [scores, setScores] = useState({
        technical: {},
        skill: {},
        specialGradeScore: 0
    });

    const technicalSkills = ['Stance', 'Jab', 'Straight', 'Left Hook', 'Right Hook', 'Thigh Kick', 'Rib Kick', 'Face Slap Kick', 'Inner Kick', 'Outer Kick', 'Front Kick', 'Rise Kick', 'Boxing Movements', 'Push Ups', 'Cambo'];
    const skillAdvantages = ['Stamina', 'Speed', 'Flexibility', 'Power', 'Martial Arts Knowledge', 'Discipline'];

    const handleScoreChange = (type, skill, key, value) => {
        setScores(prev => ({
            ...prev,
            [type]: {
                ...prev[type],
                [skill]: {
                    ...prev[type][skill],
                    [key]: value
                }
            }
        }));
    };

    const handleSpecialGradeChange = (e) => {
        setScores(prev => ({
            ...prev,
            specialGradeScore: e.target.value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await api.post(`/fighters/assess/${fighterId}`, {
                ...scores
            });
            alert('Assessment saved successfully!');
        } catch (err) {
            console.error('Error saving assessment:', err);
            alert('Error saving assessment.');
        }
    };

    const renderScoreTable = (title, skills, type) => (
        <div className="mb-6">
            <h3 className="text-lg md:text-xl font-bold mb-3">{title}</h3>
            
            {/* Mobile view - compact layout */}
            <div className="md:hidden bg-white border border-gray-300 rounded overflow-hidden">
                <table className="w-full text-xs">
                    <thead>
                        <tr className="bg-gray-100">
                            <th className="py-2 px-2 text-left font-medium">Skill</th>
                            <th className="py-2 px-1 text-center font-medium">Fighter</th>
                            <th className="py-2 px-1 text-center font-medium">Master</th>
                            <th className="py-2 px-1 text-center font-medium">Diff</th>
                        </tr>
                    </thead>
                    <tbody>
                        {skills.map(skill => {
                            const fighterScore = scores[type][skill]?.fighterScore || '';
                            const masterScore = scores[type][skill]?.masterScore || '';
                            const diff = (fighterScore && masterScore) ? fighterScore - masterScore : '';
                            
                            return (
                                <tr key={skill} className="border-t border-gray-200">
                                    <td className="py-2 px-2">{skill}</td>
                                    <td className="py-2 px-1">
                                        <input 
                                            type="number" 
                                            onChange={(e) => handleScoreChange(type, skill, 'fighterScore', e.target.value)} 
                                            className="w-full border rounded p-1 text-center" 
                                            min="0"
                                            max="100"
                                            value={fighterScore}
                                        />
                                    </td>
                                    <td className="py-2 px-1">
                                        <input 
                                            type="number" 
                                            onChange={(e) => handleScoreChange(type, skill, 'masterScore', e.target.value)} 
                                            className="w-full border rounded p-1 text-center" 
                                            min="0"
                                            max="100"
                                            value={masterScore}
                                        />
                                    </td>
                                    <td className="py-2 px-1">
                                        <input 
                                            type="text" 
                                            readOnly 
                                            className="w-full bg-gray-50 border rounded p-1 text-center" 
                                            value={diff}
                                        />
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            
            {/* Desktop view - full table */}
            <div className="hidden md:block overflow-x-auto">
                <table className="min-w-full bg-white border border-gray-300">
                    <thead>
                        <tr className="bg-gray-100">
                            <th className="py-2 px-4 border-b text-left">Skill</th>
                            <th className="py-2 px-4 border-b text-center">Fighter Score</th>
                            <th className="py-2 px-4 border-b text-center">Master Score</th>
                            <th className="py-2 px-4 border-b text-center">Diff</th>
                        </tr>
                    </thead>
                    <tbody>
                        {skills.map(skill => (
                            <tr key={skill}>
                                <td className="py-2 px-4 border-b">{skill}</td>
                                <td className="py-2 px-4 border-b">
                                    <input 
                                        type="number" 
                                        onChange={(e) => handleScoreChange(type, skill, 'fighterScore', e.target.value)} 
                                        className="w-full border rounded p-1" 
                                        min="0"
                                        max="100"
                                    />
                                </td>
                                <td className="py-2 px-4 border-b">
                                    <input 
                                        type="number" 
                                        onChange={(e) => handleScoreChange(type, skill, 'masterScore', e.target.value)} 
                                        className="w-full border rounded p-1" 
                                        min="0"
                                        max="100"
                                    />
                                </td>
                                <td className="py-2 px-4 border-b">
                                    <input 
                                        type="text" 
                                        readOnly 
                                        className="w-full bg-gray-50 border rounded p-1 text-center" 
                                        value={(scores[type][skill]?.fighterScore && scores[type][skill]?.masterScore) ? scores[type][skill].fighterScore - scores[type][skill].masterScore : ''} 
                                    />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );

    return (
        <div className="bg-white rounded-lg p-4 md:p-6">
            <h2 className="text-xl md:text-2xl font-bold text-center text-red-600 mb-3">STRICKER - Fighter Level</h2>
            <div className="text-gray-700 text-xs md:text-sm mb-4 space-y-2">
                <p>"Fighter Batch no: ASHURA's! This is a Stricker - fighter level- The Foundation of your martial arts journey. A basic Level test to measure your skills. Score at least 75% to awaken Ashura's Aura Level and rise to Tribe Level 8. Upgrade your skill. stay focus and All The Best."</p>
                <p>"Your result will be evaluated by the Master and two senior fighter."</p>
                <p>"If you don't pass this Stricker Level test, don't be discouraged. Check your progress, your attendance, your practice - and most importantly, your focus on martial arts. Reflect. Refine. Rise. Upgrade yourself and come back stronger."</p>
                <p>"This assessment will be conducted three months from your entry date. The next level test will be held after another three months based on your progress."</p>
            </div>

            <div className="flex flex-wrap justify-around items-center text-center font-bold text-gray-800 my-4 gap-2">
                <div className="p-2 bg-red-200 rounded-md min-w-[90px]">
                    <div className="text-xs">AFL Score</div>
                    <div className="text-base">3000%</div>
                </div>
                <div className="p-2 bg-red-200 rounded-md min-w-[90px]">
                    <div className="text-xs">Ashuras Aura Level</div>
                    <div className="text-base">0.0</div>
                </div>
                <div className="p-2 bg-red-200 rounded-md min-w-[90px]">
                    <div className="text-xs">Tribe Level</div>
                    <div className="text-base">3000</div>
                </div>
            </div>

            <form onSubmit={handleSubmit}>
                {renderScoreTable("Technical Advantage", technicalSkills, 'technical')}
                {renderScoreTable("Skill Advantage", skillAdvantages, 'skill')}
                
                <div className="flex flex-col items-start space-y-2 mb-6">
                    <label className="font-bold text-base text-gray-800">Special Grade Score:</label>
                    <input 
                        type="number" 
                        onChange={handleSpecialGradeChange} 
                        className="border rounded-md p-2 w-full md:w-40" 
                        min="0"
                        max="100"
                    />
                </div>
                
                <button 
                    type="submit" 
                    className="w-full bg-red-600 text-white font-bold py-3 rounded-md hover:bg-red-700 transition duration-300"
                >
                    Save Assessment
                </button>
            </form>
        </div>
    );
};

export default AdminAssessment;