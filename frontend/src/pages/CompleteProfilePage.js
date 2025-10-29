// client/src/pages/CompleteProfilePage.js

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/api';
import { FaMedal } from 'react-icons/fa'; // Import medal icon

const CompleteProfilePage = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        age: '',
        gender: 'male',
        phNo: '',
        address: '',
        height: '',
        weight: '',
        bloodGroup: '',
        occupation: '',
        package: 'monthly',
        previousExperience: '',
        medicalIssue: '',
        motto: '',
        martialArtsKnowledge: '',
        goals: [],
        referral: '',
        achievements: '', // Added achievements field
        agreement: false,
    });
    const [error, setError] = useState('');

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleGoalChange = (e) => {
        const { value, checked } = e.target;
        setFormData(prev => {
            if (checked) {
                return { ...prev, goals: [...prev.goals, value] };
            } else {
                return { ...prev, goals: prev.goals.filter(goal => goal !== value) };
            }
        });
    };

    const handleAgreementChange = (e) => {
        setFormData(prev => ({ ...prev, agreement: e.target.checked }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.agreement) {
            setError('You must agree to the terms and conditions to proceed.');
            return;
        }
        setError('');
        try {
            await api.post('/fighters/profile', formData);
            // On success, force a reload to update the user state in App.js
            window.location.href = '/fighter'; 
        } catch (err) {
            console.error('Profile update error:', err);
            setError(err.response?.data?.msg || 'Failed to update profile. Please try again.');
        }
    };

    return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
            <div className="max-w-4xl w-full bg-gray-800 text-white rounded-lg shadow-xl p-8">
                <h1 className="text-3xl font-bold text-center mb-6 text-red-500">Complete Your Fighter Profile</h1>
                <p className="text-center text-gray-400 mb-8">Please fill out your details to access your dashboard.</p>
                <form onSubmit={handleSubmit} className="space-y-8">
                    {/* Personal Info */}
                    <div className="p-6 bg-gray-700 rounded-lg">
                        <h2 className="text-xl font-semibold mb-4 border-b border-gray-600 pb-2">Personal Info</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <input type="number" name="age" placeholder="Age" onChange={handleChange} required className="input-style" />
                            <select name="gender" onChange={handleChange} className="input-style">
                                <option value="male">Male</option>
                                <option value="female">Female</option>
                                <option value="other">Other</option>
                            </select>
                            <input type="tel" name="phNo" placeholder="Phone Number" onChange={handleChange} required className="input-style" />
                            <input type="text" name="address" placeholder="Address" onChange={handleChange} required className="input-style" />
                        </div>
                    </div>

                    {/* Fighter Details */}
                    <div className="p-6 bg-gray-700 rounded-lg">
                        <h2 className="text-xl font-semibold mb-4 border-b border-gray-600 pb-2">Fighter Details</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <input type="text" name="height" placeholder="Height (cm)" onChange={handleChange} required className="input-style" />
                            <input type="text" name="weight" placeholder="Weight (kg)" onChange={handleChange} required className="input-style" />
                            <input type="text" name="bloodGroup" placeholder="Blood Group" onChange={handleChange} className="input-style" />
                            <input type="text" name="occupation" placeholder="Occupation" onChange={handleChange} className="input-style" />
                            <select name="package" onChange={handleChange} className="input-style">
                                <option value="monthly">Monthly</option>
                                <option value="quarterly">Quarterly</option>
                                <option value="yearly">Yearly</option>
                            </select>
                            <input type="text" name="previousExperience" placeholder="Previous Martial Arts Experience?" onChange={handleChange} className="input-style" />
                             <textarea name="medicalIssue" placeholder="Any Medical Issues?" onChange={handleChange} className="input-style md:col-span-2" rows="2"></textarea>
                            <textarea name="motto" placeholder="What is your Motto?" onChange={handleChange} className="input-style md:col-span-2" rows="2"></textarea>
                            <textarea name="martialArtsKnowledge" placeholder="Knowledge in Martial Arts" onChange={handleChange} className="input-style md:col-span-2" rows="2"></textarea>
                        </div>
                    </div>

                    {/* Goals & Referral */}
                    <div className="p-6 bg-gray-700 rounded-lg">
                        <h2 className="text-xl font-semibold mb-4 border-b border-gray-600 pb-2">Goals & Referral</h2>
                        <div>
                            <label className="block mb-2">What are your goals?</label>
                            <div className="flex flex-wrap gap-4">
                                {['Fitness', 'Self-defense', 'Competition', 'Discipline'].map(goal => (
                                    <label key={goal} className="flex items-center space-x-2">
                                        <input type="checkbox" value={goal} onChange={handleGoalChange} className="h-4 w-4 bg-gray-600 border-gray-500 rounded text-red-500 focus:ring-red-500" />
                                        <span>{goal}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                        <input type="text" name="referral" placeholder="How did you hear about us?" onChange={handleChange} className="input-style mt-4" />
                    </div>

                    {/* Achievements section with heading and medal icon */}
                    <div className="p-6 bg-gray-700 rounded-lg">
                        <div className="flex items-center mb-4 border-b border-gray-600 pb-2">
                            <FaMedal className="text-yellow-400 mr-2" size={24} />
                            <h2 className="text-xl font-semibold">Achievements</h2>
                        </div>
                        <textarea 
                            name="achievements" 
                            placeholder="Your Achievements..." 
                            onChange={handleChange} 
                            className="input-style mt-2" 
                            rows="3"
                            value={formData.achievements}
                        ></textarea>
                    </div>

                     {/* Agreement */}
                    <div className="p-6 bg-gray-700 rounded-lg">
                        <label className="flex items-center space-x-3 cursor-pointer">
                            <input type="checkbox" checked={formData.agreement} onChange={handleAgreementChange} className="h-5 w-5 bg-gray-600 border-gray-500 rounded text-red-500 focus:ring-red-500" />
                            <span className="text-gray-300">I agree to the terms and conditions and the gym's code of conduct.</span>
                        </label>
                    </div>

                    {error && <p className="text-red-400 text-center">{error}</p>}
                    
                    <button type="submit" className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded-lg transition duration-300">
                        Submit Profile
                    </button>
                </form>
            </div>
            {/* Simple CSS in JS for input styling */}
            <style>{`
                .input-style {
                    background-color: #4A5568; /* gray-700 */
                    border: 1px solid #718096; /* gray-500 */
                    color: white;
                    padding: 0.75rem 1rem;
                    border-radius: 0.5rem;
                    width: 100%;
                }
                .input-style::placeholder {
                    color: #A0AEC0; /* gray-400 */
                }
                .input-style:focus {
                    outline: none;
                    border-color: #F56565; /* red-500 */
                    box-shadow: 0 0 0 2px #F56565;
                }
            `}</style>
        </div>
    );
};

export default CompleteProfilePage;