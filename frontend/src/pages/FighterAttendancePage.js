import React, { useState, useEffect } from 'react';
import api from '../api/api';
import { FaClock, FaIdCard, FaCamera, FaExclamationTriangle } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import RFIDPunchModal from '../components/RFIDPunchModal';
import AttendanceConfirmationModal from '../components/AttendanceConfirmationModal';

const FighterAttendancePage = () => {
    const [attendance, setAttendance] = useState([]);
    const [loading, setLoading] = useState(true);
    const [punching, setPunching] = useState(false);
    const [message, setMessage] = useState('');
    const [lastPunchStatus, setLastPunchStatus] = useState('out');
    const navigate = useNavigate();
    const [isRfidModalOpen, setIsRfidModalOpen] = useState(false);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [confirmModalData, setConfirmModalData] = useState(null);

    const recalculateDuration = (day) => {
        // Use the server-calculated duration directly
        // The server already handles all the logic for late checkouts and forgotten punchouts
        return day.duration || '00:00:00';
    };

    const fetchAndProcessAttendance = async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/attendance/me');

            // Process data to handle missing out-punches and recalculate duration
            const processedData = data.map(day => {
                const newDuration = recalculateDuration(day);
                return { ...day, duration: newDuration };
            });

            setAttendance(processedData);

            // Correctly determine punch status from the PROCESSED data
            if (processedData.length > 0) {
                const latestDay = processedData[0];
                const ins = latestDay.checkIns.filter(p => !p.late).length;
                const outs = latestDay.checkOuts.length;
                if (ins > outs) {
                    setLastPunchStatus('in');
                } else {
                    setLastPunchStatus('out');
                }
            }
        } catch (error) {
            console.error("Error fetching attendance:", error);
            setMessage('Failed to load attendance data.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAndProcessAttendance();
    }, []);

    // Handles the actual punch-in or punch-out action
    const handlePunch = async () => {
        setPunching(true);
        setMessage('');
        try {
            // Get location before punching
            let location = null;
            let locationError = '';
            
            if (navigator.geolocation) {
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
                    
                    location = {
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude
                    };
                } catch (error) {
                    // Handle location error but don't prevent punching
                    locationError = 'Could not get your location. Attendance will be marked without location verification.';
                }
            }
            
            // Send location data with the punch request
            const { data } = await api.post('/attendance/punch', { location });
            setMessage(data.msg); // Display success message from the server
            
            // Show location warning if applicable
            if (locationError) {
                setMessage(prev => `${prev} Note: ${locationError}`);
            }
            
            await fetchAndProcessAttendance(); // Refresh the attendance list
        } catch (err) {
            const errorMsg = err.response?.data?.msg || 'An error occurred.';
            setMessage(`Error: ${errorMsg}`);
        } finally {
            setPunching(false);
        }
    };

    // Handles submission from the RFID input modal
    const handleRfidSubmit = async (rfid, location) => {
        setPunching(true);
        setMessage('');
        try {
            // Send both RFID and location data to the server
            const { data } = await api.post('/attendance/rfid-status', { rfid, location });
            setConfirmModalData(data); // Save fighter data and punch type
            setIsRfidModalOpen(false);
            setIsConfirmModalOpen(true);
        } catch (err) {
            const errorMsg = err.response?.data?.msg || 'An error occurred.';
            setMessage(`Error: ${errorMsg}`);
            setIsRfidModalOpen(false); // Close RFID modal on error
        } finally {
            setPunching(false);
        }
    };

    // Handles the final confirmation from the confirmation modal
    const handleConfirmPunch = async () => {
        setIsConfirmModalOpen(false);
        await handlePunch(); // Reuse the existing manual punch logic
    };

    if (loading) {
        return <div className="text-center p-8">Loading attendance...</div>;
    }

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-6 border-b pb-2">My Attendance</h1>

            {/* Punch In/Out Section */}
            <div className="bg-white shadow-lg rounded-lg p-6 mb-8">
                <h2 className="text-2xl font-semibold text-gray-700 mb-4">Record Your Attendance</h2>
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setIsRfidModalOpen(true)}
                        className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-4 rounded-lg transition-transform transform hover:scale-105 duration-300 flex items-center justify-center text-sm shadow-md"
                    >
                        <FaIdCard className="mr-2" />
                        RFID PUNCH
                    </button>
                    <button
                        onClick={() => navigate('/fighter/attendance/face')}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-transform transform hover:scale-105 duration-300 flex items-center justify-center text-sm shadow-md"
                    >
                        <FaCamera className="mr-2" />
                        FACE PUNCH
                    </button>
                </div>
                {message && (
                    <p className={`mt-6 text-center text-sm font-medium ${message.includes('Error') ? 'text-red-600' : 'text-green-600'}`}>
                        {message}
                    </p>
                )}
            </div>

            {/* Attendance History Table */}
            <div className="bg-white shadow-lg rounded-lg overflow-hidden">
                <div className="p-6">
                    <h3 className="text-xl font-semibold text-gray-700 flex items-center"><FaClock className="mr-3 text-gray-500" />Attendance History</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">                  
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">RFID</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Check-Ins</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Check-Outs</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                            </tr>
                        </thead>
                     
                        <tbody className="bg-white divide-y divide-gray-200">
                            {attendance.length > 0 ? (
                                attendance.map((day) => {
                                    // Separate punches into correct visual categories
                                    const regularCheckIns = day.checkIns.filter(p => !p.late);
                                    const allCheckOuts = [
                                        ...day.checkIns.filter(p => p.late),
                                        ...day.checkOuts
                                    ];

                                    return (
                                        <tr key={day.id || day.date} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-700">
                                                {day.rfid}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                {(() => {
                                                    const date = new Date(day.date);
                                                    const d = String(date.getDate()).padStart(2, '0');
                                                    const m = String(date.getMonth() + 1).padStart(2, '0');
                                                    const y = date.getFullYear().toString().slice(-2);
                                                    return `${d}/${m}/${y}`;
                                                })()}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                {/* RENDER REGULAR CHECK-INS */}
                                                {regularCheckIns.map((punch, index) => (
                                                    <div key={`in-${index}`} className="flex items-center gap-2">
                                                        <span className="text-green-600 font-semibold">
                                                            {new Date(punch.time).toLocaleTimeString()}
                                                        </span>
                                                    </div>
                                                ))}
                                            </td>
                                            <td className="px-5 py-3 whitespace-nowrap text-sm">
                                                {/* RENDER ALL CHECK-OUTS (LATE AND REGULAR) */}
                                                <div className="flex flex-col space-y-0.1">
                                                    {allCheckOuts.map((punch, index) => (
                                                        <div key={`out-${index}`} className="flex items-center gap-2 ">
                                                            {punch.late ? (
                                                                // Style for a LATE (corrected) punch-out
                                                                <div className="flex items-center gap-2 px-1 rounded w-full">
                                                                    <span className="text-gray-500 font-semibold">
                                                                        {new Date(punch.time).toLocaleTimeString()}
                                                                    </span>
                                                                    <FaExclamationTriangle 
                                                                        className="text-yellow-500" 
                                                                        title="Indicates a late punch-out from a previous day" 
                                                                    />
                                                                </div>
                                                            ) : (
                                                                // Style for a NORMAL punch-out
                                                                <span className="text-red-600 font-semibold pl-1">
                                                                    {new Date(punch.time).toLocaleTimeString()}
                                                                </span>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-800">
                                                {day.duration}
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan="5" className="px-6 py-4 text-center text-sm text-gray-500">
                                        No attendance records found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            
            {isRfidModalOpen && (
                <RFIDPunchModal
                    isOpen={isRfidModalOpen}
                    onClose={() => setIsRfidModalOpen(false)}
                    onSubmit={handleRfidSubmit}
                    loading={punching}
                />
            )}

            {isConfirmModalOpen && confirmModalData && (
                <AttendanceConfirmationModal
                    isOpen={isConfirmModalOpen}
                    onClose={() => setIsConfirmModalOpen(false)}
                    onConfirm={handleConfirmPunch}
                    data={confirmModalData}
                />
            )}
        </div>
    );
};

export default FighterAttendancePage;