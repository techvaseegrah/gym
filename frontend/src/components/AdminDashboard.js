import React, { useState, useEffect } from 'react';
import api from '../api/api';
import { Link } from 'react-router-dom';
import AddFighter from '../pages/AddFighter'; // Import the AddFighter component
import { FaUserPlus, FaEye, FaEdit, FaTrash } from 'react-icons/fa'; // Import icons for buttons

const AdminDashboard = () => {
    const [fighters, setFighters] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false); // State to control the modal

    // Function to fetch or refresh the fighter list
    const fetchFighters = async () => {
        setLoading(true);
        try {
            const res = await api.get('/fighters/roster');
            setFighters(res.data);
        } catch (err) {
            console.error('Error fetching fighter roster:', err);
        } finally {
            setLoading(false);
        }
    };

    // Fetch fighters when the component first loads
    useEffect(() => {
        fetchFighters();
    }, []);

    const handleDelete = async (fighterId) => {
        if (window.confirm('Are you sure you want to delete this fighter?')) {
            try {
                await api.delete(`/fighters/${fighterId}`);
                // Refresh the list after deleting
                fetchFighters(); 
                alert('Fighter deleted successfully!');
            } catch (err) {
                console.error('Error deleting fighter:', err);
                alert('Error deleting fighter.');
            }
        }
    };

    // This function will be called by the AddFighter component on success
    const handleAddSuccess = () => {
        setShowAddModal(false); // Close the modal
        fetchFighters(); // Refresh the fighter list
    };

    if (loading) {
        return <div className="p-8 text-center text-gray-500">Loading fighter roster...</div>;
    }

    return (
        <div className="p-4 md:p-8">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">View Fighters</h2>
                <button 
                    onClick={() => setShowAddModal(true)}
                    className="bg-red-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-red-700 transition flex items-center"
                >
                    <FaUserPlus className="mr-2" />
                    Add Fighter
                </button>
            </div>
            
            {fighters.length === 0 ? (
                <p className="text-gray-600 text-center">No fighters registered yet. Add a new fighter to get started.</p>
            ) : (
                <div className="overflow-x-auto bg-white rounded-lg shadow">
                    <table className="min-w-full">
                        <thead>
                            <tr className="bg-gray-200 text-gray-600 uppercase text-sm leading-normal">
                                <th className="py-3 px-6 text-left">Name</th>
                                <th className="py-3 px-6 text-left">Batch No.</th>
                                {/* --- Start of New Code --- */}
                                <th className="py-3 px-6 text-left">RFID</th>
                                {/* --- End of New Code --- */}
                                <th className="py-3 px-6 text-left">Email</th>
                                <th className="py-3 px-6 text-center">Status</th>
                                <th className="py-3 px-6 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="text-gray-700 text-sm font-light">
                            {fighters.map(fighter => (
                                <tr key={fighter._id} className="border-b border-gray-200 hover:bg-gray-100">
                                    <td className="py-3 px-6 whitespace-nowrap">{fighter.name}</td>
                                    <td className="py-3 px-6">{fighter.fighterBatchNo}</td>
                                    {/* --- Start of New Code --- */}
                                    <td className="py-3 px-6">{fighter.rfid}</td>
                                    {/* --- End of New Code --- */}
                                    <td className="py-3 px-6">{fighter.email}</td>
                                    <td className="py-3 px-6 text-center">
                                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${fighter.profile_completed ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'}`}>
                                            {fighter.profile_completed ? 'Completed' : 'Pending'}
                                        </span>
                                    </td>
                                    <td className="py-3 px-6 text-center whitespace-nowrap">
                                        <div className="flex item-center justify-center space-x-4">
                                            <Link to={`/admin/fighter/${fighter._id}`} className="text-blue-500 hover:text-blue-700" title="View">
                                                <FaEye size={18} />
                                            </Link>
                                            <Link to={`/admin/edit-fighter/${fighter._id}`} className="text-green-500 hover:text-green-700" title="Edit">
                                                <FaEdit size={18} />
                                            </Link>
                                            <button onClick={() => handleDelete(fighter._id)} className="text-red-500 hover:text-red-700" title="Delete">
                                                <FaTrash size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Modal for adding a new fighter */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4">
                    <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
                        <AddFighter 
                            onAddSuccess={handleAddSuccess} 
                            onCancel={() => setShowAddModal(false)} 
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;