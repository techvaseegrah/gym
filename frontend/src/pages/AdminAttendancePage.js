import React, { useState, useEffect, useRef } from 'react';
import api from '../api/api';
import { FaIdCard, FaCheckCircle, FaCamera, FaUserTag, FaTimes, FaExclamationTriangle, FaCalendarAlt, FaFilter, FaFileExcel, FaFilePdf } from 'react-icons/fa';
import Webcam from 'react-webcam';
import * as tf from '@tensorflow/tfjs';
import * as faceapi from 'face-api.js';
import { exportToExcel, exportToPDF, formatAttendanceDataForExport } from '../utils/exportUtils';

const AdminAttendancePage = () => {
    // State for showing the modal
    const [attendanceMethod, setAttendanceMethod] = useState(null);

    // State for the attendance records list
    const [records, setRecords] = useState([]);
    const [recordsLoading, setRecordsLoading] = useState(true);
    const [recordsError, setRecordsError] = useState('');
    
    // State for RFID handling
    const [rfid, setRfid] = useState('');
    const [punchStatus, setPunchStatus] = useState(null);
    const [punchLoading, setPunchLoading] = useState(false);
    const [allRfids, setAllRfids] = useState([]);

    // State and refs for Face Recognition
    const webcamRef = useRef(null);
    const [modelsLoaded, setModelsLoaded] = useState(false);
    const [captureInterval, setCaptureInterval] = useState(null);
    const [fighterForPunch, setFighterForPunch] = useState(null); 

    // State for fighter attendance report modal
    const [showFighterReport, setShowFighterReport] = useState(false);
    const [selectedFighter, setSelectedFighter] = useState(null);
    const [fighterAttendance, setFighterAttendance] = useState([]);
    const [fighterReportLoading, setFighterReportLoading] = useState(false);
    const [dateFilter, setDateFilter] = useState({
        startDate: '',
        endDate: ''
    });

    // --- DATA FETCHING ---
    useEffect(() => {
        const loadModels = async () => {
            try {
                // Enable TensorFlow.js optimizations for better performance
                if (tf.env().flagRegistry.GPGPU) {
                    tf.env().set('WEBGL_FORCE_F16_TEXTURES', true);
                }
                
                // Load the most accurate models for face detection and recognition (same as FighterFaceRecognitionPage)
                await Promise.all([
                    faceapi.nets.ssdMobilenetv1.loadFromUri('/models'), // Most accurate face detection
                    faceapi.nets.faceLandmark68Net.loadFromUri('/models'), // Detailed face landmarks
                    faceapi.nets.faceRecognitionNet.loadFromUri('/models')  // High accuracy face recognition
                ]);
                setModelsLoaded(true);
            } catch (error) {
                console.error("Error loading face-api models:", error);
            }
        };
        loadModels();
        fetchAttendanceRecords();
        fetchAllRfids();
    }, []);

    const fetchAttendanceRecords = async () => {
        try {
            setRecordsLoading(true);
            const { data } = await api.get('/attendance/all');
            setRecords(data);
        } catch (err) {
            setRecordsError('Failed to fetch attendance records.');
        } finally {
            setRecordsLoading(false);
        }
    };

    const fetchAllRfids = async () => {
        try {
            const { data } = await api.get('/fighters/rfids');
            setAllRfids(data);
        } catch (err) {
            console.error('Failed to fetch RFIDs for autosuggest.', err);
        }
    };

    // --- MODAL AND SCANNING LOGIC ---
    const openModal = (method) => {
        setRfid('');
        setPunchStatus(null);
        setFighterForPunch(null);
        setAttendanceMethod(method);
        if (method === 'face') {
            startFaceScan();
        }
    };

    const closeModal = () => {
        stopFaceScan();
        setAttendanceMethod(null);
    };

    const startFaceScan = () => {
        // Debounce to prevent multiple intervals
        if (captureInterval) return;

        const interval = setInterval(async () => {
            if (webcamRef.current && modelsLoaded) {
                const imageSrc = webcamRef.current.getScreenshot();
                if (!imageSrc) return;

                const img = await faceapi.fetchImage(imageSrc);
                // Use high-accuracy face detection with TensorFlow.js (same as FighterFaceRecognitionPage)
                const detections = await faceapi.detectSingleFace(img, new faceapi.SsdMobilenetv1Options({ 
                    minConfidence: 0.75  // Increased confidence threshold for better accuracy
                }))
                    .withFaceLandmarks()
                    .withFaceDescriptor();
                
                if (detections) {
                    stopFaceScan(); // Stop scanning immediately
                    setPunchLoading(true);
                    try {
                        // Send the face descriptor to the server for recognition
                        const faceDescriptor = Array.from(detections.descriptor);
                        const { data } = await api.post('/attendance/admin/face-recognition', { faceDescriptor });
                        
                        setPunchStatus({ 
                            type: 'success', 
                            message: data.msg, 
                            fighter: data.fighter 
                        });
                        fetchAttendanceRecords();
                    } catch (err) {
                        // Handle the 2-minute restriction error
                        const message = err.response?.data?.msg || 'Recognition failed.';
                        setPunchStatus({ type: 'error', message });
                                        
                        // If it's a 2-minute restriction error, keep the modal open so user can see the error
                        if (err.response?.status === 400) {
                            setPunchLoading(false);
                            return; // Don't close the modal
                        }
                    } finally {
                        setPunchLoading(false);
                        setTimeout(() => closeModal(), 3000); // Close modal after showing message
                    }
                }
            }
        }, 1000);
        setCaptureInterval(interval);
    };

    const stopFaceScan = () => {
        if (captureInterval) {
            clearInterval(captureInterval);
            setCaptureInterval(null);
        }
    };

    // --- THIS IS THE NEW STEP 1: FIND THE FIGHTER ---
    const handleFindFighterByRfid = async (e) => {
        e.preventDefault();
        const trimmedRfid = rfid.trim();
        if (!trimmedRfid) {
            setPunchStatus({ type: 'error', message: 'Please enter a valid RFID.' });
            return;
        }
        setPunchLoading(true);
        setPunchStatus(null);
        setFighterForPunch(null);

        try {
            // Use the new status endpoint
            const { data } = await api.get(`/attendance/status/${trimmedRfid}`);
            setFighterForPunch(data); // Save fighter details and next action
        } catch (err) {
            const message = err.response?.data?.msg || 'An error occurred.';
            setPunchStatus({ type: 'error', message });
        } finally {
            setPunchLoading(false);
        }
    };

    // --- THIS IS THE NEW STEP 2: CONFIRM THE PUNCH ---
    const handlePunchConfirmation = async () => {
        if (!fighterForPunch) return;

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

            // Use the original endpoint to record the punch
            const { data } = await api.post('/attendance/admin/rfid', { rfid: fighterForPunch.fighter.rfid, location });
            
            // Show success message with location warning if applicable
            let message = data.msg;
            if (locationError) {
                message += ` Note: ${locationError}`;
            }
            
            setPunchStatus({ type: 'success', message, fighter: data.fighter });
            setRfid('');
            fetchAttendanceRecords();
            setTimeout(() => closeModal(), 3000); // Close modal on success
        } catch (err) {
            const message = err.response?.data?.msg || 'An error occurred.';
            setPunchStatus({ type: 'error', message });
        } finally {
            setPunchLoading(false);
            setFighterForPunch(null); // Reset after punch attempt
        }
    };

    // Function to fetch fighter attendance report
    const fetchFighterAttendance = async (fighterId) => {
        setFighterReportLoading(true);
        try {
            // Build query parameters for date filtering
            let url = `/attendance/fighter/${fighterId}`;
            const params = new URLSearchParams();
            
            if (dateFilter.startDate && dateFilter.endDate) {
                params.append('startDate', dateFilter.startDate);
                params.append('endDate', dateFilter.endDate);
            }
            
            if (params.toString()) {
                url += `?${params.toString()}`;
            }
            
            const { data } = await api.get(url);
            setFighterAttendance(data);
        } catch (err) {
            console.error('Failed to fetch fighter attendance:', err);
        } finally {
            setFighterReportLoading(false);
        }
    };

    // Effect to fetch attendance when date filter changes
    useEffect(() => {
        if (showFighterReport && selectedFighter) {
            // Only fetch if both start and end dates are set, or if both are empty
            if ((dateFilter.startDate && dateFilter.endDate) || (!dateFilter.startDate && !dateFilter.endDate)) {
                fetchFighterAttendance(selectedFighter.id);
            }
        }
    }, [dateFilter, showFighterReport, selectedFighter]);

    // Function to open fighter report modal
    const openFighterReport = async (fighterName, record) => {
        // Extract fighter ID from the record
        let fighterId = record.fighterId;
        
        // If fighterId is not directly available, try to extract from the record ID
        if (!fighterId && record.id) {
            // The record ID format is "fighterId-date", so we split by "-" and take the first part
            fighterId = record.id.split('-')[0];
        }
        
        if (fighterId) {
            setSelectedFighter({ name: fighterName, id: fighterId });
            setShowFighterReport(true);
            await fetchFighterAttendance(fighterId);
        }
    };

    // Function to close fighter report modal
    const closeFighterReport = () => {
        setShowFighterReport(false);
        setSelectedFighter(null);
        setFighterAttendance([]);
        setDateFilter({ startDate: '', endDate: '' });
    };

    // Function to filter attendance by date range
    const filterAttendanceByDate = async () => {
        if (!dateFilter.startDate || !dateFilter.endDate) {
            alert('Please select both start and end dates.');
            return;
        }
        
        // Check if start date is after end date
        if (new Date(dateFilter.startDate) > new Date(dateFilter.endDate)) {
            alert('Start date cannot be after end date.');
            return;
        }
        
        if (selectedFighter) {
            await fetchFighterAttendance(selectedFighter.id);
        }
    };

    // Function to reset date filter
    const resetDateFilter = async () => {
        setDateFilter({ startDate: '', endDate: '' });
        if (selectedFighter) {
            // Wait a bit for state to update, then fetch all data
            setTimeout(async () => {
                await fetchFighterAttendance(selectedFighter.id);
            }, 100);
        }
    };

    return (
        <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
            <h2 className="text-3xl font-bold text-gray-800 mb-6">Attendance Management</h2>

            {/* Recent Attendance Records Table */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="flex justify-between items-center p-6">
                    <h3 className="text-xl font-semibold text-gray-700">Recent Attendance Records</h3>
                    <div className="flex gap-4">
                        <button onClick={() => openModal('rfid')} className="flex items-center gap-2 bg-blue-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-600 transition duration-300">
                            <FaUserTag /> RFID
                        </button>
                        <button onClick={() => openModal('face')} className="flex items-center gap-2 bg-teal-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-teal-600 transition duration-300" disabled={!modelsLoaded}>
                            <FaCamera /> {modelsLoaded ? 'Face ID' : 'Loading...'}
                        </button>
                    </div>
                </div>
                
                <div className="overflow-x-auto">
                    {recordsLoading ? (
                        <div className="text-center p-8 text-gray-500">Loading records...</div>
                    ) : recordsError ? (
                        <div className="text-center p-8 text-red-500">{recordsError}</div>
                    ) : (
                        <table className="min-w-full divide-y divide-gray-200">
                           <thead className="bg-gray-50">
                                <tr>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fighter Name</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">RFID</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Check In</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Check Out</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {records.length > 0 ? (
                                    records.map(record => (
                                        <tr key={record.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                <button 
                                                    onClick={() => openFighterReport(record.fighterName, record)}
                                                    className="text-blue-600 hover:text-blue-800 hover:underline"
                                                >
                                                    {record.fighterName}
                                                </button>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{record.rfid}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {(() => {
                                                    const date = new Date(record.date);
                                                    const day = String(date.getUTCDate()).padStart(2, '0');
                                                    const month = String(date.getUTCMonth() + 1).padStart(2, '0'); // Months are 0-indexed
                                                    const year = date.getUTCFullYear().toString().slice(-2);
                                                    return `${day}/${month}/${year}`;
                                                })()}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        <div>
                                            {record.checkIns.map((punch, index) => (
                                                <div key={`in-${index}`} className="flex items-center gap-2">
                                                    {punch.missed && (
                                                        <FaExclamationTriangle 
                                                            className="text-red-500" 
                                                            title="Indicates a missed punch-out on the previous day" 
                                                        />
                                                    )}
                                                    <span className="text-green-600 font-semibold">
                                                        {new Date(punch.time).toLocaleTimeString()}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                    <div>
                                        {record.checkOuts.map((punch, index) => (
                                            <div key={`out-${index}`} className="flex items-center gap-2">
                                                {punch.late ? (
                                                    // Style for a LATE (corrected) punch-out
                                                    <><span className="text-gray-500 font-semibold">
                                                            {new Date(punch.time).toLocaleTimeString()}
                                                        </span>
                                                        <FaExclamationTriangle 
                                                            className="text-yellow-400" 
                                                            title="Indicates a late punch-out from a previous day" 
                                                        />
                                                    </>
                                                ) : (
                                                    // Style for a NORMAL punch-out
                                                    <span className="text-red-600 font-semibold">
                                                        {new Date(punch.time).toLocaleTimeString()}
                                                    </span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-700">{record.duration}</td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr><td colSpan="6" className="px-6 py-4 text-center text-sm text-gray-500">No attendance records found.</td></tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* Fighter Attendance Report Modal */}
            {showFighterReport && selectedFighter && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="flex justify-between items-center p-6 border-b">
                            <h3 className="text-xl font-semibold text-gray-800">
                                Attendance Report for {selectedFighter.name}
                            </h3>
                            <button 
                                onClick={closeFighterReport} 
                                className="text-gray-500 hover:text-gray-800 text-2xl"
                            >
                                <FaTimes />
                            </button>
                        </div>
                        
                        {/* Date Filter */}
                        <div className="p-6 border-b bg-gray-50">
                            <div className="flex items-center gap-4 flex-wrap">
                                <div className="flex items-center gap-2">
                                    <FaCalendarAlt className="text-gray-500" />
                                    <span className="font-medium text-gray-700">Date Filter:</span>
                                </div>
                                <div className="flex gap-2 flex-wrap">
                                    <input
                                        type="date"
                                        value={dateFilter.startDate}
                                        onChange={(e) => setDateFilter({...dateFilter, startDate: e.target.value})}
                                        className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                                        placeholder="Start Date"
                                    />
                                    <span className="flex items-center text-gray-500">to</span>
                                    <input
                                        type="date"
                                        value={dateFilter.endDate}
                                        onChange={(e) => setDateFilter({...dateFilter, endDate: e.target.value})}
                                        className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                                        placeholder="End Date"
                                    />
                                </div>
                                <div className="flex gap-2">
                                    <button 
                                        onClick={filterAttendanceByDate}
                                        className="flex items-center gap-2 bg-blue-500 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-600"
                                    >
                                        <FaFilter /> Apply Filter
                                    </button>
                                    <button 
                                        onClick={resetDateFilter}
                                        className="flex items-center gap-2 bg-gray-500 text-white px-4 py-2 rounded-md text-sm hover:bg-gray-600"
                                    >
                                        Reset
                                    </button>
                                </div>
                            </div>
                        </div>
                        
                        {/* Attendance Report Table */}
                        <div className="flex-grow overflow-auto">
                            {fighterReportLoading ? (
                                <div className="text-center p-8 text-gray-500">Loading attendance report...</div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50 sticky top-0">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Check-Ins</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Check-Outs</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {fighterAttendance.length > 0 ? (
                                                fighterAttendance.map((day) => {
                                                    // Separate punches into correct visual categories
                                                    const regularCheckIns = day.checkIns.filter(p => !p.late);
                                                    const allCheckOuts = [
                                                        ...day.checkIns.filter(p => p.late),
                                                        ...day.checkOuts
                                                    ];

                                                    return (
                                                        <tr key={day.id || day.date} className="hover:bg-gray-50">
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
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                                {/* RENDER ALL CHECK-OUTS (LATE AND REGULAR) */}
                                                                <div className="flex flex-col space-y-0.1">
                                                                    {allCheckOuts.map((punch, index) => (
                                                                        <div key={`out-${index}`} className="flex items-center gap-2">
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
                                                    <td colSpan="4" className="px-6 py-4 text-center text-sm text-gray-500">
                                                        No attendance records found for this fighter.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                        
                        {/* Export and Summary Section */}
                        <div className="p-6 border-t bg-gray-50">
                            <div className="flex justify-between items-center flex-wrap gap-4">
                                <div className="flex gap-2 flex-wrap">
                                    <button 
                                        onClick={() => {
                                            const formattedData = formatAttendanceDataForExport(fighterAttendance);
                                            exportToExcel(formattedData, `attendance_${selectedFighter.name.replace(/\s+/g, '_')}`, 'Attendance');
                                        }}
                                        className="flex items-center gap-2 bg-green-500 text-white px-3 py-1 rounded-md font-semibold hover:bg-green-600 transition duration-300 text-sm"
                                        disabled={fighterReportLoading || fighterAttendance.length === 0}
                                    >
                                        <FaFileExcel /> Excel
                                    </button>
                                    <button 
                                        onClick={() => {
                                            const formattedData = formatAttendanceDataForExport(fighterAttendance);
                                            const columns = [
                                                { header: 'Date', key: 'date' },
                                                { header: 'Check-Ins', key: 'checkIns' },
                                                { header: 'Check-Outs', key: 'checkOuts' },
                                                { header: 'Duration', key: 'duration' }
                                            ];
                                            exportToPDF(formattedData, columns, `attendance_${selectedFighter.name.replace(/\s+/g, '_')}`, `Attendance Report - ${selectedFighter.name}`);
                                        }}
                                        className="flex items-center gap-2 bg-red-500 text-white px-3 py-1 rounded-md font-semibold hover:bg-red-600 transition duration-300 text-sm"
                                        disabled={fighterReportLoading || fighterAttendance.length === 0}
                                    >
                                        <FaFilePdf /> PDF
                                    </button>
                                </div>
                                <div className="flex flex-col items-end">
                                    <div className="text-sm text-gray-600">
                                        Total Days: {fighterAttendance.length}
                                    </div>
                                    <div className="text-sm text-gray-600">
                                        Total Duration: {(() => {
                                            const totalSeconds = fighterAttendance.reduce((total, day) => {
                                                // Parse duration string (HH:MM:SS) and add to total
                                                const [hours, minutes, seconds] = day.duration.split(':').map(Number);
                                                return total + (hours * 3600) + (minutes * 60) + seconds;
                                            }, 0);
                                            
                                            const hours = Math.floor(totalSeconds / 3600);
                                            const minutes = Math.floor((totalSeconds % 3600) / 60);
                                            const secs = totalSeconds % 60;
                                            
                                            return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
                                        })()}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* --- MODAL FOR RFID AND FACE RECOGNITION --- */}
            {attendanceMethod && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-2xl p-6 w-full max-w-md relative">
                        <button onClick={closeModal} className="absolute top-3 right-3 text-gray-500 hover:text-gray-800 text-2xl">
                            <FaTimes />
                        </button>
                        
                        <h3 className="text-xl font-semibold text-gray-800 mb-4">
                            {attendanceMethod === 'rfid' ? 'RFID Punch In / Out' : 'Face Recognition'}
                        </h3>

                        {attendanceMethod === 'rfid' && (
                            <div>
                                {/* If no fighter is found yet, show the input form */}
                                {!fighterForPunch ? (
                                    <form onSubmit={handleFindFighterByRfid} className="flex flex-col gap-4">
                                        <div className="relative">
                                            <FaIdCard className="absolute top-1/2 left-3 -translate-y-1/2 text-gray-400" />
                                            <input
                                                type="text"
                                                value={rfid}
                                                onChange={(e) => setRfid(e.target.value)}
                                                placeholder="Enter or select Fighter RFID"
                                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg"
                                                disabled={punchLoading}
                                                autoFocus
                                                list="rfid-suggestions"
                                            />
                                            <datalist id="rfid-suggestions">
                                                {allRfids.map((id, index) => (<option key={index} value={id} />))}
                                            </datalist>
                                        </div>
                                        <button type="submit" className="w-full bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400" disabled={punchLoading}>
                                            {punchLoading ? 'Searching...' : 'Find Fighter'}
                                        </button>
                                    </form>
                                ) : (
                                    // If a fighter is found, show the confirmation view
                                    <div className="text-center">
                                        <p className="text-lg font-medium text-gray-800">Fighter: <span className="font-bold">{fighterForPunch.fighter.name}</span></p>
                                        <p className="text-sm text-gray-500 mb-4">RFID: {fighterForPunch.fighter.rfid}</p>
                                        <button 
                                            onClick={handlePunchConfirmation} 
                                            className={`w-full px-6 py-3 rounded-lg font-bold text-white text-lg disabled:bg-gray-400 ${fighterForPunch.nextAction === 'in' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
                                            disabled={punchLoading}
                                        >
                                            {punchLoading ? 'Processing...' : `Confirm Punch ${fighterForPunch.nextAction.toUpperCase()}`}
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Face Recognition Section */}
                        {attendanceMethod === 'face' && (
                            <div className="text-center">
                                <div className="relative w-full border-4 border-gray-300 rounded-lg overflow-hidden">
                                    <Webcam ref={webcamRef} audio={false} screenshotFormat="image/jpeg" className="w-full h-auto" />
                                    {punchLoading && <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center text-white text-lg font-semibold">Processing...</div>}
                                </div>
                                <p className="mt-2 text-sm text-gray-500">Position face in the frame. Scan will start automatically.</p>
                                <p className="mt-1 text-xs text-gray-400">Make sure the fighter's face is well-lit and centered.</p>
                            </div>
                        )}
                        
                        {punchStatus && (
                            <div className={`mt-4 p-3 rounded-lg flex items-center gap-3 text-sm ${punchStatus.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                <FaCheckCircle />
                                <div>
                                    <p className="font-semibold">{punchStatus.message}</p>
                                    {punchStatus.fighter?.name && <p>{`Fighter: ${punchStatus.fighter.name}`}</p>}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminAttendancePage;
