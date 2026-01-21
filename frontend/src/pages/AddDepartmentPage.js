import React, { useState } from 'react';
import api from '../api/api';
import { useNavigate } from 'react-router-dom';

const AddDepartmentPage = () => {
    const [formData, setFormData] = useState({
        name: '',
        feeStructure: {
            totalFee: 4000,
            durationMonths: 3
        }
    });
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [isError, setIsError] = useState(false);
    const navigate = useNavigate();

    const handleChange = (e) => {
        const { name, value } = e.target;
        if (name.startsWith('feeStructure.')) {
            const feeField = name.split('.')[1];
            setFormData(prev => ({
                ...prev,
                feeStructure: {
                    ...prev.feeStructure,
                    [feeField]: value
                }
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                [name]: value
            }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');
        setIsError(false);

        try {
            const payload = {
                name: formData.name,
                feeStructure: formData.feeStructure
            };

            await api.post('/departments', payload);
            
            setMessage('Department added successfully!');
            setIsError(false);
            
            // Reset form
            setFormData({
                name: '',
                feeStructure: {
                    totalFee: 4000,
                    durationMonths: 3
                }
            });
            
            // Optionally redirect after a delay
            setTimeout(() => {
                navigate('/admin/departments');
            }, 1500);
        } catch (err) {
            console.error('Error adding department:', err);
            setMessage(err.response?.data?.msg || 'Error adding department. Please try again.');
            setIsError(true);
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = () => {
        navigate('/admin/departments');
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-4">
            <div className="max-w-4xl mx-auto">
                <div className="text-center mb-8">
                    <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Add New Department</h1>
                    <p className="text-gray-600 max-w-2xl mx-auto">
                        Create a new department with its fee structure
                    </p>
                </div>
                
                <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                    <div className="bg-gradient-to-r from-red-600 to-red-700 px-6 py-4">
                        <h2 className="text-xl font-semibold text-white">Department Information</h2>
                    </div>
                    
                    <div className="p-6 md:p-8">
                        <form onSubmit={handleSubmit} className="space-y-8">
                            {message && (
                                <div className={`p-4 rounded-xl flex items-center ${isError ? 'bg-red-50 border border-red-200 text-red-800' : 'bg-green-50 border border-green-200 text-green-800'}`}>
                                    <span className="font-medium">{message}</span>
                                </div>
                            )}
                            
                            {/* Department Information Section */}
                            <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                                <div className="flex items-center mb-6">
                                    <div className="bg-red-100 p-2 rounded-lg mr-3">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                        </svg>
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-800">Department Details</h3>
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="name">
                                            Department Name <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            id="name"
                                            name="name"
                                            value={formData.name}
                                            onChange={handleChange}
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                            placeholder="Enter department name (e.g., Kung Fu, Taekwondo, etc.)"
                                            required
                                        />
                                    </div>
                                    
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="feeStructure.totalFee">
                                            Total Fee (₹)
                                        </label>
                                        <input
                                            type="number"
                                            id="feeStructure.totalFee"
                                            name="feeStructure.totalFee"
                                            value={formData.feeStructure.totalFee}
                                            onChange={handleChange}
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                            placeholder="Enter total fee amount"
                                        />
                                    </div>
                                    
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="feeStructure.durationMonths">
                                            Duration (Months)
                                        </label>
                                        <input
                                            type="number"
                                            id="feeStructure.durationMonths"
                                            name="feeStructure.durationMonths"
                                            value={formData.feeStructure.durationMonths}
                                            onChange={handleChange}
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                            placeholder="Enter duration in months"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex flex-col sm:flex-row justify-end gap-4 pt-4">
                                <button 
                                    type="button" 
                                    onClick={handleCancel} 
                                    className="w-full sm:w-auto bg-gray-200 text-gray-800 font-bold py-3 px-6 rounded-lg hover:bg-gray-300 transition duration-300"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="w-full sm:w-auto bg-gradient-to-r from-red-600 to-red-700 text-white font-bold py-3 px-6 rounded-lg hover:from-red-700 hover:to-red-800 transition duration-300 disabled:opacity-50 shadow-md"
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <span className="flex items-center justify-center">
                                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Adding Department...
                                        </span>
                                    ) : 'Add Department'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AddDepartmentPage;