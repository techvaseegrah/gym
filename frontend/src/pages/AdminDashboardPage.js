import React, { useState, useEffect } from 'react';
import api from '../api/api';
import FighterList from '../components/FighterList';
import { Link } from 'react-router-dom';

const AdminDashboardPage = () => {
    const [fighters, setFighters] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchFighters = async () => {
            try {
                const fightersRes = await api.get('/fighters/roster');
                setFighters(fightersRes.data);
            } catch (err) {
                console.error('Error fetching fighters:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchFighters();
    }, []);

    const handleDelete = async (fighterId) => {
        if (window.confirm('Are you sure you want to delete this fighter?')) {
            try {
                await api.delete(`/fighters/${fighterId}`);
                setFighters(fighters.filter(fighter => fighter._id !== fighterId));
                alert('Fighter deleted successfully!');
            } catch (err) {
                console.error('Error deleting fighter:', err);
                alert('Error deleting fighter.');
            }
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-full">
                <div className="text-center text-gray-500">
                    <div className="loader ease-linear rounded-full border-8 border-t-8 border-gray-200 h-32 w-32 mb-4"></div>
                    <h2 className="text-xl font-semibold">Loading Fighters...</h2>
                    <p>Please wait a moment.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white p-6 md:p-8 rounded-xl shadow-lg">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-gray-800">Fighters Dashboard</h2>
                    <p className="text-gray-500 mt-1">Manage and view all registered fighters.</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    <Link
                        to="/admin/add-fighter"
                        className="bg-red-600 text-white px-5 py-2.5 rounded-lg font-semibold hover:bg-red-700 transition duration-300 text-center shadow-md hover:shadow-lg"
                    >
                        + Add Fighter
                    </Link>
                </div>
            </div>
            <FighterList fighters={fighters} handleDelete={handleDelete} />
        </div>
    );
};

export default AdminDashboardPage;