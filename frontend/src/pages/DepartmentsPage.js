import React, { useState, useEffect } from 'react';
import api from '../api/api';
import { useNavigate } from 'react-router-dom';

const DepartmentsPage = () => {
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [message, setMessage] = useState('');
    const [isError, setIsError] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        fetchDepartments();
    }, []);

    const fetchDepartments = async () => {
        try {
            const response = await api.get('/departments');
            setDepartments(response.data);
            setLoading(false);
        } catch (err) {
            console.error('Error fetching departments:', err);
            setError('Failed to load departments');
            setLoading(false);
        }
    };

    const handleEdit = (department) => {
        navigate(`/admin/departments/edit/${department.name}`);
    };
    
    const handleDelete = async (deptName) => {
        if (window.confirm(`Are you sure you want to delete the ${deptName} department? This action cannot be undone.`)) {
            try {
                // Use the actual department name from the data, not a transformed version
                await api.delete(`/departments/${deptName}`);
                setDepartments(departments.filter(dept => dept.name !== deptName));
                setMessage(`Department ${deptName} deleted successfully!`);
                setIsError(false);
            } catch (err) {
                console.error('Error deleting department:', err);
                setMessage(err.response?.data?.msg || 'Error deleting department. Please try again.');
                setIsError(true);
            }
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-4">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center">
                        <h1 className="text-3xl font-bold text-gray-900 mb-8">Departments</h1>
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
                    </div>
                </div>
            </div>
        );
    }
    
    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-4">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center">
                        <h1 className="text-3xl font-bold text-gray-900 mb-8">Departments</h1>
                        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
                            <strong className="font-bold">Error: </strong>
                            <span className="block sm:inline">{error}</span>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
    
    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-4">
            <div className="max-w-6xl mx-auto">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">Departments</h1>
                    <p className="text-gray-600 mt-2">Manage fighter departments and view department statistics</p>
                </div>
                
                {message && (
                    <div className={`p-4 rounded-xl flex items-center mb-6 ${isError ? 'bg-red-50 border border-red-200 text-red-800' : 'bg-green-50 border border-green-200 text-green-800'}`}>
                        <span className="font-medium">{message}</span>
                    </div>
                )}
                
                <div className="flex justify-end mb-6">
                    <button 
                        onClick={() => navigate('/admin/departments/add')}
                        className="bg-red-600 text-white px-5 py-2.5 rounded-lg font-semibold hover:bg-red-700 transition duration-300 shadow-md flex items-center"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                        </svg>
                        Add Department
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {departments.map((dept) => (
                        <div key={dept.name} className="bg-white rounded-xl shadow-lg p-6 border border-gray-200 hover:shadow-xl transition-shadow duration-300">
                            <div className="flex items-center mb-4">
                                <div className="bg-red-100 p-3 rounded-lg mr-4">
                                    <div className="text-red-600 font-bold text-lg flex items-center">
                                        {dept.name.charAt(0).toUpperCase() + dept.name.slice(1)}
                                        {dept.isDefault && (
                                            <span className="ml-2 bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">Default</span>
                                        )}
                                    </div>
                                    <div className="text-red-500 text-xs mt-1">(Code: {dept.name})</div>
                                </div>
                                <div className="ml-auto flex space-x-2">
                                    <button 
                                        onClick={() => handleEdit(dept)}
                                        className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50"
                                        title="Edit Department"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                        </svg>
                                    </button>
                                    {!dept.isDefault && (
                                        <button 
                                            onClick={async () => {
                                                if (window.confirm(`Are you sure you want to set ${dept.name} as the default department?`)) {
                                                    try {
                                                        await api.put(`/departments/${dept.name}/set-default`);
                                                        setMessage(`${dept.name} set as default department!`);
                                                        setIsError(false);
                                                        fetchDepartments(); // Refresh the list
                                                    } catch (err) {
                                                        console.error('Error setting default department:', err);
                                                        setMessage(err.response?.data?.msg || 'Error setting default department. Please try again.');
                                                        setIsError(true);
                                                    }
                                                }
                                            }}
                                            className="text-green-600 hover:text-green-800 p-1 rounded hover:bg-green-50"
                                            title="Set as Default"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                            </svg>
                                        </button>
                                    )}
                                    <button 
                                        onClick={() => handleDelete(dept.name)}
                                        className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50"
                                        title="Delete Department"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-600">Fighters:</span>
                                    <span className="font-semibold text-gray-900">{dept.fighterCount}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-600">Active Subscriptions:</span>
                                    <span className="font-semibold text-gray-900">{dept.activeSubscriptions}</span>
                                </div>
                                {dept.feeStructure && (
                                    <div className="pt-2 border-t border-gray-200">
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-gray-600">Fee:</span>
                                            <span className="font-semibold text-green-600">₹{dept.feeStructure.totalFee}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-gray-600">Duration:</span>
                                            <span className="font-semibold text-gray-700">{dept.feeStructure.durationMonths} months</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {departments.length === 0 && (
                    <div className="text-center py-12">
                        <div className="text-gray-500 text-lg">No departments found</div>
                        <p className="text-gray-400 mt-2">Add a new department to get started</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DepartmentsPage;