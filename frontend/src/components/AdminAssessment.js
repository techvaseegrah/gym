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
        <div className="mb-8">
            <h3 className="text-xl font-bold mb-4">{title}</h3>
            <div className="overflow-x-auto">
                <table className="min-w-full bg-white border border-gray-300">
                    <thead>
                        <tr className="bg-gray-100">
                            <th className="py-2 px-4 border-b">Skill</th>
                            <th className="py-2 px-4 border-b">Fighter Score</th>
                            <th className="py-2 px-4 border-b">Master Score</th>
                            <th className="py-2 px-4 border-b">Diff</th>
                        </tr>
                    </thead>
                    <tbody>
                        {skills.map(skill => (
                            <tr key={skill}>
                                <td className="py-2 px-4 border-b">{skill}</td>
                                <td className="py-2 px-4 border-b">
                                    <input type="number" onChange={(e) => handleScoreChange(type, skill, 'fighterScore', e.target.value)} className="w-full border rounded p-1" />
                                </td>
                                <td className="py-2 px-4 border-b">
                                    <input type="number" onChange={(e) => handleScoreChange(type, skill, 'masterScore', e.target.value)} className="w-full border rounded p-1" />
                                </td>
                                <td className="py-2 px-4 border-b">
                                    <input type="text" readOnly className="w-full bg-gray-50 border rounded p-1" value={(scores[type][skill]?.fighterScore && scores[type][skill]?.masterScore) ? scores[type][skill].fighterScore - scores[type][skill].masterScore : ''} />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );

    return (
        <div className="bg-white rounded-lg p-6">
            <h2 className="text-3xl font-bold text-center text-red-600 mb-2">STRICKER - Fighter Level</h2>
            <div className="text-gray-700 text-sm mb-6 space-y-2">
                <p>"Fighter Batch no: ASHURA's! This is a Stricker - fighter level- The Foundation of your martial arts journey. A basic Level test to measure your skills. Score at least 75% to awaken Ashura's Aura Level and rise to Tribe Level 8. Upgrade your skill. stay focus and All The Best."</p>
                <p>"Your result will be evaluated by the Master and two senior fighter."</p>
                <p>"If you don't pass this Stricker Level test, don't be discouraged. Check your progress, your attendance, your practice - and most importantly, your focus on martial arts. Reflect. Refine. Rise. Upgrade yourself and come back stronger."</p>
                <p>"This assessment will be conducted three months from your entry date. The next level test will be held after another three months based on your progress."</p>
            </div>

            <div className="flex flex-col md:flex-row justify-around items-center text-center font-bold text-gray-800 my-6 space-y-4 md:space-y-0">
                <div className="p-4 bg-red-200 rounded-md">AFL Score: 3000%</div>
                <div className="p-4 bg-red-200 rounded-md">Ashuras Aura Level: 0.0</div>
                <div className="p-4 bg-red-200 rounded-md">Tribe Level: 3000</div>
            </div>

            <form onSubmit={handleSubmit}>
                {renderScoreTable("Technical Advantage", technicalSkills, 'technical')}
                {renderScoreTable("Skill Advantage", skillAdvantages, 'skill')}
                
                <div className="flex items-center space-x-4 mb-8">
                    <label className="font-bold text-lg text-gray-800">Special Grade Score:</label>
                    <input type="number" onChange={handleSpecialGradeChange} className="border rounded-md p-2 w-32" />
                </div>
                
                <button type="submit" className="w-full bg-red-600 text-gray-800 font-bold py-3 rounded-md hover:bg-red-700 transition duration-300">Save Assessment</button>
            </form>
        </div>
    );
};

export default AdminAssessment;