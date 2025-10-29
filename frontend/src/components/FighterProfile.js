import React, { useState } from 'react';
import api from '../api/api';
import { useNavigate } from 'react-router-dom';

const FighterProfile = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        name: '', fighterBatchNo: '', age: '', gender: '', phNo: '', address: '',
        height: '', weight: '', bloodGroup: '', occupation: '', dateOfJoining: '',
        package: '', previousExperience: '', medicalIssue: '', motto: '',
        martialArtsKnowledge: '', goals: [], referral: '', agreement: false
    });

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleGoalChange = (e) => {
        const { value, checked } = e.target;
        setFormData(prev => {
            const goals = checked ? [...prev.goals, value] : prev.goals.filter(goal => goal !== value);
            return { ...prev, goals };
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await api.post('/fighters/profile', formData);
            alert('Profile saved successfully!');
            navigate('/fighter');
        } catch (err) {
            console.error(err);
            alert('Error saving profile.');
        }
    };

    const rules = `"Rules & Regulations – Discipline. Dedication."
Respect the Dojo and Its Warriors
Punctuality is Power
Uniform & Appearance
Attendance & Commitment
Code of Conduct
Discipline in Combat
Progression & Tests
Weapons & Equipment
Outside the Dojo
Zero Tolerance Policy
Motto: "Train not for belts, but for balance. Fight not for pride, but for purpose.”`;

    return (
        <div className="min-h-screen bg-gray-100 p-8">
            <div className="max-w-4xl mx-auto bg-white shadow-lg rounded-lg p-6">
                <h1 className="text-3xl font-bold text-center text-red-600 mb-6">Fighter Profile Form</h1>
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Personal Info */}
                    <fieldset className="border p-4 rounded-md">
                        <legend className="text-xl font-semibold text-gray-800">Personal Info</legend>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="NAME" className="border p-2 rounded w-full" required />
                            <input type="text" name="fighterBatchNo" value={formData.fighterBatchNo} onChange={handleChange} placeholder="FIGHTER BATCH NO" className="border p-2 rounded w-full" required />
                            <input type="number" name="age" value={formData.age} onChange={handleChange} placeholder="Age" className="border p-2 rounded w-full" required />
                            <select name="gender" value={formData.gender} onChange={handleChange} className="border p-2 rounded w-full" required>
                                <option value="">Gender</option>
                                <option value="male">Male</option>
                                <option value="female">Female</option>
                            </select>
                            <input type="tel" name="phNo" value={formData.phNo} onChange={handleChange} placeholder="Ph No" className="border p-2 rounded w-full" required />
                            <input type="text" name="address" value={formData.address} onChange={handleChange} placeholder="Address" className="border p-2 rounded w-full" required />
                        </div>
                    </fieldset>

                    {/* Fighter Details */}
                    <fieldset className="border p-4 rounded-md">
                        <legend className="text-xl font-semibold text-gray-800">Fighter Details</legend>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <input type="text" name="height" value={formData.height} onChange={handleChange} placeholder="Height" className="border p-2 rounded w-full" />
                            <input type="text" name="weight" value={formData.weight} onChange={handleChange} placeholder="Weight" className="border p-2 rounded w-full" />
                            <input type="text" name="bloodGroup" value={formData.bloodGroup} onChange={handleChange} placeholder="Blood group" className="border p-2 rounded w-full" />
                            <input type="text" name="occupation" value={formData.occupation} onChange={handleChange} placeholder="Occupation" className="border p-2 rounded w-full" />
                            <label className="block">Date of Joining: <input type="date" name="dateOfJoining" value={formData.dateOfJoining} onChange={handleChange} className="border p-2 rounded w-full" required /></label>
                            <input type="text" name="package" value={formData.package} onChange={handleChange} placeholder="Package" className="border p-2 rounded w-full" />
                            <input type="text" name="previousExperience" value={formData.previousExperience} onChange={handleChange} placeholder="Any previous Experience In Martial Arts" className="border p-2 rounded w-full" />
                            <input type="text" name="medicalIssue" value={formData.medicalIssue} onChange={handleChange} placeholder="Medical Issue/ Injury" className="border p-2 rounded w-full" />
                        </div>
                        <textarea name="motto" value={formData.motto} onChange={handleChange} placeholder="Motto of learning martial arts" className="border p-2 rounded w-full mt-4"></textarea>
                        <textarea name="martialArtsKnowledge" value={formData.martialArtsKnowledge} onChange={handleChange} placeholder="Just Share your martial arts Knowledge" className="border p-2 rounded w-full mt-4"></textarea>
                    </fieldset>

                    {/* Goals & Referral */}
                    <fieldset className="border p-4 rounded-md">
                        <legend className="text-xl font-semibold text-gray-800">Goals & Referral</legend>
                        <div className="space-y-2">
                            <label className="block">
                                <input type="checkbox" name="goals" value="Champion" onChange={handleGoalChange} className="mr-2" />Want to be Champion
                            </label>
                            <label className="block">
                                <input type="checkbox" name="goals" value="Self Defence" onChange={handleGoalChange} className="mr-2" />For Self Defence only
                            </label>
                            <label className="block">
                                <input type="checkbox" name="goals" value="Fitness/Skill" onChange={handleGoalChange} className="mr-2" />Just Want to Learn for fitness/Skill
                            </label>
                        </div>
                        <input type="text" name="referral" value={formData.referral} onChange={handleChange} placeholder="How did u know about us?" className="border p-2 rounded w-full mt-4" />
                    </fieldset>

                    {/* Agreement & Rules */}
                    <fieldset className="border p-4 rounded-md">
                        <legend className="text-xl font-semibold text-gray-800">Agreement & Rules</legend>
                        <div className="flex items-center mb-4">
                            <input type="checkbox" name="agreement" checked={formData.agreement} onChange={handleChange} className="mr-2" required />
                            <label className="text-sm text-gray-600">
                                I hereby agree to join the Mutants Academy and Ashurastribe and Stay consistant, maintain discipline and promise to never use this knowledge improperly and bring shame to this art. I won't participate in any unnecessary fights and use equipments without proper training. I take responsibility for any Injury that may occur.
                            </label>
                        </div>
                        <pre className="bg-gray-50 p-4 rounded-md text-sm text-gray-700 whitespace-pre-wrap">{rules}</pre>
                    </fieldset>

                    <button type="submit" className="w-full bg-red-600 text-white font-bold py-3 rounded-md hover:bg-red-700 transition duration-300">Submit Profile</button>
                </form>
            </div>
        </div>
    );
};

export default FighterProfile;