import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FaEye, FaEdit, FaTrash } from 'react-icons/fa';
import api from '../api/api';

const FighterList = () => {
    const [fighters, setFighters] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const fetchFighters = async () => {
            try {
                const res = await api.get('/fighters/roster');
                setFighters(res.data);
            } catch (err) {
                setError('Failed to fetch fighters.');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchFighters();
    }, []);

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this fighter?')) {
            try {
                await api.delete(`/fighters/${id}`);
                setFighters(fighters.filter(f => f._id !== id));
            } catch (err) {
                setError('Failed to delete fighter.');
                console.error(err);
            }
        }
    };

    const filteredFighters = fighters.filter(fighter =>
        fighter.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        fighter.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        fighter.fighterBatchNo.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) return <p>Loading fighters...</p>;
    if (error) return <p className="text-red-500">{error}</p>;

    return (
        <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-2xl font-bold mb-4">Fighter Roster</h2>
            <input
                type="text"
                placeholder="Search fighters..."
                className="mb-4 p-2 border rounded w-full"
                onChange={(e) => setSearchTerm(e.target.value)}
            />
            <div className="overflow-x-auto">
                <table className="min-w-full bg-white">
                    <thead>
                        <tr>
                            <th className="py-2 px-4 border-b">Fighter Name</th>
                            <th className="py-2 px-4 border-b">Batch Number</th>
                            {/* --- Start of New Code --- */}
                            <th className="py-2 px-4 border-b">RFID</th>
                            {/* --- End of New Code --- */}
                            <th className="py-2 px-4 border-b">Email</th>
                            <th className="py-2 px-4 border-b">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredFighters.map(fighter => (
                            <tr key={fighter._id}>
                                <td className="py-2 px-4 border-b text-center">{fighter.name}</td>
                                <td className="py-2 px-4 border-b text-center">{fighter.fighterBatchNo}</td>
                                {/* --- Start of New Code --- */}
                                <td className="py-2 px-4 border-b text-center">{fighter.rfid}</td>
                                {/* --- End of New Code --- */}
                                <td className="py-2 px-4 border-b text-center">{fighter.email}</td>
                                <td className="py-2 px-4 border-b text-center">
                                    <div className="flex justify-center items-center space-x-2">
                                        <Link to={`/admin/fighter/${fighter._id}`} className="text-blue-500 hover:text-blue-700">
                                            <FaEye />
                                        </Link>
                                        <Link to={`/admin/edit-fighter/${fighter._id}`} className="text-green-500 hover:text-green-700">
                                            <FaEdit />
                                        </Link>
                                        <button onClick={() => handleDelete(fighter._id)} className="text-red-500 hover:text-red-700">
                                            <FaTrash />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default FighterList;