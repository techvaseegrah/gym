import React from 'react';
import AddFighter from './AddFighter';
import { useNavigate } from 'react-router-dom';

const AddFighterPage = () => {
    const navigate = useNavigate();

    const handleAddSuccess = () => {
        navigate('/admin');
    };

    const handleCancel = () => {
        navigate('/admin');
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-4 sm:px-6">
            <div className="max-w-4xl mx-auto">
                <div className="text-center mb-8">
                    <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Register New Fighter</h1>
                    <p className="text-gray-600 max-w-2xl mx-auto">
                        Add a new fighter to the system. Fill in the required information and optionally set up face recognition for attendance tracking.
                    </p>
                </div>
                
                <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                    <div className="bg-gradient-to-r from-red-600 to-red-700 px-6 py-4">
                        <h2 className="text-xl font-semibold text-white">Fighter Registration Form</h2>
                    </div>
                    
                    <div className="p-6 md:p-8">
                        <AddFighter 
                            onAddSuccess={handleAddSuccess} 
                            onCancel={handleCancel} 
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AddFighterPage;