import React from 'react';
import { FaUserCheck, FaSignInAlt, FaSignOutAlt, FaTimes } from 'react-icons/fa';

const AttendanceConfirmationModal = ({ isOpen, onClose, onConfirm, data }) => {
    if (!isOpen || !data) return null;

    const { punchType, fighter } = data;
    const isPunchIn = punchType === 'in';

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm mx-4 text-center">
                <div className="flex justify-end">
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <FaTimes size={20} />
                    </button>
                </div>
                
                <FaUserCheck className="text-6xl text-green-500 mx-auto mb-4" />
                
                <h3 className="text-2xl font-bold text-gray-800 mb-2">{fighter.name}</h3>
                <p className="text-md text-gray-500 mb-6">{fighter.fighterBatchNo}</p>
                
                <div className={`p-4 rounded-lg mb-6 ${isPunchIn ? 'bg-green-100' : 'bg-red-100'}`}>
                    <p className="text-lg font-semibold flex items-center justify-center">
                        {isPunchIn ? 
                            <FaSignInAlt className="mr-3 text-green-600" /> : 
                            <FaSignOutAlt className="mr-3 text-red-600" />
                        }
                        <span className={isPunchIn ? 'text-green-800' : 'text-red-800'}>
                            Confirm Punch {isPunchIn ? 'IN' : 'OUT'}
                        </span>
                    </p>
                </div>

                <div className="flex justify-center space-x-4">
                    <button
                        onClick={onClose}
                        className="px-8 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        className={`px-8 py-2 text-white rounded-lg ${isPunchIn ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'}`}
                    >
                        Confirm
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AttendanceConfirmationModal;