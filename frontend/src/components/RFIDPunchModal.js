import React, { useState } from 'react';
import { FaIdCard, FaTimes, FaSpinner } from 'react-icons/fa';

const RFIDPunchModal = ({ isOpen, onClose, onSubmit, loading }) => {
    const [rfid, setRfid] = useState('');
    const [location, setLocation] = useState(null);
    const [locationError, setLocationError] = useState('');

    if (!isOpen) return null;

    const getLocation = async () => {
        if (!navigator.geolocation) {
            setLocationError('Geolocation is not supported by your browser.');
            return null;
        }

        try {
            const position = await new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(
                    (position) => resolve(position),
                    (error) => reject(error),
                    {
                        enableHighAccuracy: true,
                        timeout: 10000,
                        maximumAge: 60000
                    }
                );
            });

            return {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude
            };
        } catch (error) {
            let errorMessage = '';
            switch(error.code) {
                case error.PERMISSION_DENIED:
                    errorMessage = 'Location access denied. Please enable location permissions for this site.';
                    break;
                case error.POSITION_UNAVAILABLE:
                    errorMessage = 'Location information is unavailable. Please check your device settings.';
                    break;
                case error.TIMEOUT:
                    errorMessage = 'Location request timed out. Please try again.';
                    break;
                default:
                    errorMessage = `Unknown location error: ${error.message}`;
                    break;
            }
            setLocationError(errorMessage);
            return null;
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (rfid) {
            // Get location before submitting
            setLocationError('');
            const userLocation = await getLocation();
            
            if (!userLocation && !locationError) {
                // If we couldn't get location but there's no explicit error, still proceed
                // but show a warning
                setLocationError('Could not get your location. Attendance will be marked without location verification.');
            }
            
            // Submit with location data
            onSubmit(rfid, userLocation);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
                <div className="flex justify-between items-center border-b pb-3 mb-4">
                    <h3 className="text-xl font-semibold text-gray-700 flex items-center">
                        <FaIdCard className="mr-3 text-yellow-500" />
                        Enter Your RFID
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <FaTimes size={20} />
                    </button>
                </div>
                
                <form onSubmit={handleSubmit}>
                    <p className="text-gray-600 mb-4">Please enter your RFID code below to check your attendance status.</p>
                    <input
                        type="text"
                        value={rfid}
                        onChange={(e) => setRfid(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                        placeholder="RFID Code"
                        autoFocus
                    />
                    
                    {locationError && (
                        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                            <p className="text-red-600 text-sm">{locationError}</p>
                        </div>
                    )}
                    
                    <div className="flex justify-end mt-6 space-x-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={!rfid || loading}
                            className="px-6 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 disabled:bg-yellow-300 flex items-center"
                        >
                            {loading ? (
                                <>
                                    <FaSpinner className="animate-spin mr-2" />
                                    Checking...
                                </>
                            ) : 'Check Status'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default RFIDPunchModal;