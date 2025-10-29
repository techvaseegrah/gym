import React, { useState, useEffect } from 'react';
import api from '../api/api';
import { FaIdCard, FaSignInAlt, FaSignOutAlt, FaCheckCircle } from 'react-icons/fa';

const AdminAttendanceModulePage = () => {
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    
    // New state for RFID handling
    const [rfid, setRfid] = useState('');
    const [punchStatus, setPunchStatus] = useState(null);
    const [punchLoading, setPunchLoading] = useState(false);

    const recalculateDuration = (day) => {
        // Filter out 'late' check-ins, which are actually completions of the previous day's out-punch
        const dailyCheckIns = day.checkIns.filter(p => !p.late);
        const dailyCheckOuts = day.checkOuts;

        let totalMilliseconds = 0;
        const pairs = Math.min(dailyCheckIns.length, dailyCheckOuts.length);

        for (let i = 0; i < pairs; i++) {
            // Ensure the punches exist before trying to access their time property
            if (dailyCheckIns[i] && dailyCheckOuts[i]) {
                const inTime = new Date(dailyCheckIns[i].time).getTime();
                const outTime = new Date(dailyCheckOuts[i].time).getTime();

                if (!isNaN(inTime) && !isNaN(outTime) && outTime > inTime) {
                    totalMilliseconds += (outTime - inTime);
                }
            }
        }

        // If there's an incomplete session for the current day, show 'Pending...'
        if (dailyCheckIns.length > dailyCheckOuts.length) {
            return 'Pending';
        }

        // If no valid duration was calculated, return 00:00:00
        if (totalMilliseconds <= 0) {
            return '00:00:00';
        }

        // Format and return the calculated duration
        const hours = Math.floor(totalMilliseconds / 3600000);
        const minutes = Math.floor((totalMilliseconds % 3600000) / 60000);
        const seconds = Math.floor(((totalMilliseconds % 3600000) % 60000) / 1000);

        return [
            hours.toString().padStart(2, '0'),
            minutes.toString().padStart(2, '0'),
            seconds.toString().padStart(2, '0')
        ].join(':');
    };

    useEffect(() => {
        fetchAttendanceRecords();
    }, []);

    const fetchAttendanceRecords = async () => {
        try {
            const { data } = await api.get('/attendance/all');

            // Process records to recalculate duration for each day for each fighter
            const processedRecords = data.map(record => {
                if (record.fighter && record.fighter.attendance) {
                    const updatedAttendance = record.fighter.attendance.map(day => {
                        const newDuration = recalculateDuration(day);
                        return { ...day, duration: newDuration };
                    });
                    return { ...record, fighter: { ...record.fighter, attendance: updatedAttendance } };
                }
                return record;
            });

            setRecords(processedRecords);
        } catch (err) {
            setError('Failed to fetch attendance records.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };
    
    const handleRfidSubmit = async (e) => {
        e.preventDefault();
        // The trim() function removes any accidental whitespace from the start or end.
        const trimmedRfid = rfid.trim();

        if (!trimmedRfid) {
            setPunchStatus({ type: 'error', message: 'Please enter a valid Fighter RFID.' });
            return;
        }

        setPunchLoading(true);
        setPunchStatus(null);

        try {
            // Get location before submitting
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
                    locationError = 'Could not get your location.';
                }
            }

            // Send the trimmed RFID and location to the server.
            const { data } = await api.post('/attendance/admin/rfid', { rfid: trimmedRfid, location });
            
            // Show success message with location warning if applicable
            let message = data.msg;
            if (locationError) {
                message += ` Note: ${locationError}`;
            }
            
            setPunchStatus({ type: 'success', message, fighter: data.fighter });
            setRfid(''); // Clear input on success
            fetchAttendanceRecords(); // Refresh the list
        } catch (err) {
            const message = err.response?.data?.msg || 'An error occurred. Please try again.';
            setPunchStatus({ type: 'error', message });
        } finally {
            setPunchLoading(false);
            // Clear the status message after 5 seconds
            setTimeout(() => setPunchStatus(null), 5000);
        }
    };

    return (
        <div className="p-4 md:p-8 bg-gray-50">
            <h2 className="text-3xl font-bold text-gray-800 mb-6">Attendance Module</h2>
            
            {/* RFID Punch In/Out Section */}
            <div className="mb-8 bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-semibold text-gray-700 mb-4">RFID Punch In / Out</h3>
                <form onSubmit={handleRfidSubmit} className="flex flex-col sm:flex-row items-start gap-4">
                    <div className="relative flex-grow w-full">
                        <FaIdCard className="absolute top-1/2 left-3 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            value={rfid}
                            onChange={(e) => setRfid(e.target.value)}
                            placeholder="Enter Fighter RFID"
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                            disabled={punchLoading}
                        />
                    </div>
                    <button
                        type="submit"
                        className="w-full sm:w-auto bg-red-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-red-700 transition duration-300 flex items-center justify-center gap-2 shadow-md hover:shadow-lg disabled:bg-gray-400"
                        disabled={punchLoading}
                    >
                        {punchLoading ? 'Processing...' : 'Submit'}
                    </button>
                </form>

                {punchStatus && (
                    <div className={`mt-4 p-4 rounded-lg flex items-start gap-3 ${punchStatus.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        <FaCheckCircle className={`text-2xl ${punchStatus.type === 'success' ? 'text-green-500' : 'text-red-500'}`} />
                        <div>
                            <p className="font-semibold">{punchStatus.message}</p>
                            {punchStatus.fighter && <p className="text-sm">{`Fighter: ${punchStatus.fighter.name} (${punchStatus.fighter.fighterBatchNo})`}</p>}
                        </div>
                    </div>
                )}
            </div>

            {/* Attendance Log Section */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <h3 className="text-xl font-semibold text-gray-700 p-6">Today's Attendance Log</h3>
                <div className="overflow-x-auto">
                    {loading ? (
                        <div className="text-center p-8">Loading records...</div>
                    ) : error ? (
                        <div className="text-center p-8 text-red-500">{error}</div>
                    ) : (
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fighter</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Check In</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Check Out</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Method</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {records.length > 0 ? (
                                    records.map(record => (
                                        <tr key={record._id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                {record.fighterId ? record.fighterId.name : 'N/A'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {new Date(record.checkIn).toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {record.checkOut ? new Date(record.checkOut).toLocaleString() : <span className="text-gray-400 italic">Not checked out</span>}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">
                                                {record.method}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="4" className="px-6 py-4 text-center text-sm text-gray-500">
                                            No attendance records found for today.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminAttendanceModulePage;