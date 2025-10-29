const express = require('express');
const router = express.Router();
const Attendance = require('../models/Attendance');
const Settings = require('../models/Settings');
const Fighter = require('../models/Fighter');
const auth = require('../middleware/authMiddleware');

// Utility function to calculate distance between two coordinates in meters
const haversineDistance = (coords1, coords2) => {
    const toRad = (x) => (x * Math.PI) / 180;
    const R = 6371e3; // metres
    const lat1 = toRad(coords1.latitude);
    const lat2 = toRad(coords2.latitude);
    const deltaLat = toRad(coords2.latitude - coords1.latitude);
    const deltaLon = toRad(coords2.longitude - coords1.longitude);

    const a =
        Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
        Math.cos(lat1) * Math.cos(lat2) *
        Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
};

// Utility function to verify user location against gym location
const verifyLocation = async (userLocation) => {
    try {
        // Validate user location
        if (!userLocation || !userLocation.latitude || !userLocation.longitude) {
            return { isValid: false, message: 'Invalid user location data' };
        }

        // Validate coordinate ranges
        if (userLocation.latitude < -90 || userLocation.latitude > 90 || 
            userLocation.longitude < -180 || userLocation.longitude > 180) {
            return { isValid: false, message: 'User coordinates out of valid range' };
        }

        // Get gym location from settings
        const settings = await Settings.findOne();
        if (!settings || !settings.location) {
            return { isValid: false, message: 'Gym location not configured' };
        }

        // Check if location verification is enabled
        if (!settings.location.enabled) {
            return { isValid: true, message: 'Location verification disabled' };
        }

        // Get the allowed radius (default to 100 meters if not set)
        const allowedRadius = settings.location.radius || 100;

        // Validate gym coordinates
        const gymLat = settings.location.latitude;
        const gymLng = settings.location.longitude;

        if (gymLat < -90 || gymLat > 90 || gymLng < -180 || gymLng > 180) {
            return { isValid: false, message: 'Gym coordinates out of valid range' };
        }

        // Calculate distance between user and gym
        const gymLocation = {
            latitude: gymLat,
            longitude: gymLng
        };

        const distance = haversineDistance(userLocation, gymLocation);
        
        // Check if within allowed radius
        if (distance <= allowedRadius) {
            return { isValid: true, message: `Location verified successfully. You are ${Math.round(distance)}m from the gym.` };
        } else {
            return { isValid: false, message: `You are too far from the gym (${Math.round(distance)}m). Must be within ${allowedRadius}m to mark attendance.` };
        }
    } catch (error) {
        console.error('Location verification error:', error.message);
        return { isValid: false, message: `Location verification failed: ${error.message}` };
    }
};

// @route   GET /api/attendance/all
// @desc    Admin gets all attendance records, with late punches moved to the correct day
// @access  Private (Admin only)
router.get('/all', auth, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ msg: 'Access denied. Admins only.' });
    }

    try {
        const allRecords = await Attendance.find({})
            .populate('fighterId', 'name rfid')
            .sort({ fighterId: 1, checkIn: 1 });

        const dailyRecordsMap = new Map();

        for (const record of allRecords) {
            if (!record.fighterId) continue;

            const fighterId = record.fighterId._id.toString();
            const checkInDateStr = new Date(record.checkIn).toISOString().split('T')[0];

            // --- Normal, same-day punches ---
            const checkInKey = `${fighterId}-${checkInDateStr}`;
            if (!dailyRecordsMap.has(checkInKey)) {
                dailyRecordsMap.set(checkInKey, {
                    id: checkInKey,
                    fighterName: record.fighterId.name,
                    rfid: record.fighterId.rfid,
                    date: checkInDateStr,
                    checkIns: [],
                    checkOuts: [],
                });
            }
            dailyRecordsMap.get(checkInKey).checkIns.push({ time: record.checkIn, late: false });

            if (record.checkOut) {
                const checkOutDateStr = new Date(record.checkOut).toISOString().split('T')[0];

                if (checkInDateStr === checkOutDateStr) {
                    // Normal OUT punch on the same day
                    dailyRecordsMap.get(checkInKey).checkOuts.push({ time: record.checkOut, late: false });
                } else {
                    // --- Late punch-out on a different day ---
                    const checkOutKey = `${fighterId}-${checkOutDateStr}`;
                    if (!dailyRecordsMap.has(checkOutKey)) {
                        dailyRecordsMap.set(checkOutKey, {
                            id: checkOutKey,
                            fighterName: record.fighterId.name,
                            rfid: record.fighterId.rfid,
                            date: checkOutDateStr,
                            checkIns: [],
                            checkOuts: [],
                        });
                    }
                    // Add the late punch-out to the NEXT day's record
                    dailyRecordsMap.get(checkOutKey).checkOuts.push({ time: record.checkOut, late: true });
                }
            }
        }

        // Process the final mapped data
        const processedRecords = Array.from(dailyRecordsMap.values()).map(dayData => {
            let totalDurationMs = 0;
            
            // For regular (non-late) punches, pair them as before
            const regularCheckIns = dayData.checkIns.filter(p => !p.late);
            const regularCheckOuts = dayData.checkOuts.filter(p => !p.late);
            const pairedPunches = Math.min(regularCheckIns.length, regularCheckOuts.length);

            for (let i = 0; i < pairedPunches; i++) {
                totalDurationMs += new Date(regularCheckOuts[i].time) - new Date(regularCheckIns[i].time);
            }
            
            // Handle late checkouts - but don't add duration for them
            // According to requirements, if someone forgets to punch out, that day shows 00:00:00
            // Late checkouts are just moved to the next day for record-keeping but don't contribute to duration
            const lateCheckOuts = dayData.checkOuts.filter(p => p.late);
            // We intentionally don't add duration for late checkouts to the current day
            // This ensures that days with forgotten punchouts show 00:00:00 duration

          // Ensure duration is not negative
            const safeTotalDurationMs = Math.max(0, totalDurationMs);

            const totalSeconds = Math.floor(safeTotalDurationMs / 1000);
            const hours = Math.floor(totalSeconds / 3600);
            const minutes = Math.floor((totalSeconds % 3600) / 60);
            const seconds = totalSeconds % 60;

            const formattedDuration = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

            return {
                ...dayData,
                duration: formattedDuration,
            };
        });

        processedRecords.sort((a, b) => {
            const getLatestTime = (record) => {
                const allTimes = [
                    ...record.checkIns.map(p => new Date(p.time).getTime()),
                    ...record.checkOuts.map(p => new Date(p.time).getTime())
                ];
                return allTimes.length > 0 ? Math.max(...allTimes) : 0;
            };
            return getLatestTime(b) - getLatestTime(a);
        });
        res.json(processedRecords);

    } catch (err) {
        console.error('Error fetching or processing attendance records:', err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET /api/attendance/me
// @desc    Fighter gets their own attendance records, processed by day
// @access  Private (Fighter only)
router.get('/me', auth, async (req, res) => {
    // Ensure the user is a fighter
    if (req.user.role !== 'fighter') {
        return res.status(403).json({ msg: 'Access denied' });
    }

    try {
        const fighterRecords = await Attendance.find({ fighterId: req.user.id })
            .populate('fighterId', 'name rfid')
            .sort({ checkIn: 1 });

        const dailyRecordsMap = new Map();

        for (const record of fighterRecords) {
            const checkInDateStr = new Date(record.checkIn).toISOString().split('T')[0];
            const checkInKey = `${req.user.id}-${checkInDateStr}`;

            if (!dailyRecordsMap.has(checkInKey)) {
                dailyRecordsMap.set(checkInKey, {
                    id: checkInKey,
                    fighterName: record.fighterId.name,
                    rfid: record.fighterId.rfid,
                    date: checkInDateStr,
                    checkIns: [],
                    checkOuts: [],
                });
            }
            dailyRecordsMap.get(checkInKey).checkIns.push({ time: record.checkIn, late: false });

            if (record.checkOut) {
                const checkOutDateStr = new Date(record.checkOut).toISOString().split('T')[0];
                if (checkInDateStr === checkOutDateStr) {
                    dailyRecordsMap.get(checkInKey).checkOuts.push({ time: record.checkOut, late: false });
                } else {
                    // Handle late punch-out on a different day for the fighter's view as well
                    const checkOutKey = `${req.user.id}-${checkOutDateStr}`;
                     if (!dailyRecordsMap.has(checkOutKey)) {
                        dailyRecordsMap.set(checkOutKey, {
                            id: checkOutKey,
                            fighterName: record.fighterId.name,
                            rfid: record.fighterId.rfid,
                            date: checkOutDateStr,
                            checkIns: [], // This will be empty for a late-punch-out day
                            checkOuts: [],
                        });
                    }
                    dailyRecordsMap.get(checkOutKey).checkOuts.push({ time: record.checkOut, late: true });
                }
            }
        }

        const processedRecords = Array.from(dailyRecordsMap.values()).map(dayData => {
            let totalDurationMs = 0;
            
            // For regular (non-late) punches, pair them as before
            const regularCheckIns = dayData.checkIns.filter(p => !p.late);
            const regularCheckOuts = dayData.checkOuts.filter(p => !p.late);
            const pairedPunches = Math.min(regularCheckIns.length, regularCheckOuts.length);

            for (let i = 0; i < pairedPunches; i++) {
                totalDurationMs += new Date(regularCheckOuts[i].time) - new Date(regularCheckIns[i].time);
            }
            
            // Handle late checkouts - but don't add duration for them
            // According to requirements, if someone forgets to punch out, that day shows 00:00:00
            // Late checkouts are just moved to the next day for record-keeping but don't contribute to duration
            const lateCheckOuts = dayData.checkOuts.filter(p => p.late);
            // We intentionally don't add duration for late checkouts to the current day
            // This ensures that days with forgotten punchouts show 00:00:00 duration

          // Ensure duration is not negative
            const safeTotalDurationMs = Math.max(0, totalDurationMs);

            const totalSeconds = Math.floor(safeTotalDurationMs / 1000);
            const hours = Math.floor(totalSeconds / 3600);
            const minutes = Math.floor((totalSeconds % 3600) / 60);
            const seconds = totalSeconds % 60;

            const formattedDuration = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

            return {
                ...dayData,
                duration: formattedDuration,
            };
        });
        
        // Sort by date descending to show the most recent first
        processedRecords.sort((a, b) => new Date(b.date) - new Date(a.date));

        res.json(processedRecords);

    } catch (err) {
        console.error("Fighter attendance fetch error:", err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST api/attendance/punch
// @desc    Punch in/out for a fighter with enhanced security and accuracy using Python face recognition
// @access  Private (Fighter)
router.post('/punch', auth, async (req, res) => {
    try {
        console.log('Punch request received:', { fighterId: req.user.id, body: req.body });
        const fighterId = req.user.id;
        const { faceDescriptor, location } = req.body;
        
        // Log the face descriptor details
        if (faceDescriptor) {
            console.log('Face descriptor type:', typeof faceDescriptor);
            console.log('Face descriptor isArray:', Array.isArray(faceDescriptor));
            if (Array.isArray(faceDescriptor)) {
                console.log('Face descriptor length:', faceDescriptor.length);
            }
        } else {
            console.log('No face descriptor provided');
        }
        
        // Check if the last punch was within 2 minutes (unified cooldown logic)
        console.log('Checking for recent punch for fighter:', fighterId);
        const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
        const recentPunch = await Attendance.findOne({ 
            fighterId: fighterId,
            $or: [
                { checkIn: { $gte: twoMinutesAgo } },
                { checkOut: { $gte: twoMinutesAgo } }
            ]
        });
        
        if (recentPunch) {
            console.log('Recent punch found, returning 400 error');
            return res.status(400).json({ 
                msg: 'Attendance can only be marked once every 2 minutes. Please wait before trying again.' 
            });
        }
        
        // If face descriptor is provided, verify the face before marking attendance
        if (faceDescriptor && Array.isArray(faceDescriptor)) {
            console.log('PYTHON-BASED HIGH ACCURACY Face recognition request received for fighter punch');
            console.log('Fighter ID:', fighterId);
            console.log('Face descriptor length:', faceDescriptor.length);
            
            // Validate face descriptor format
            if (faceDescriptor.length !== 128) {
                console.log('Invalid face descriptor length - returning 400 error');
                console.log('Expected 128 elements, got:', faceDescriptor.length);
                return res.status(400).json({ msg: 'Invalid face data. Please try again.' });
            }
            
            // Use Python-based face recognition for better accuracy
            console.log('Calling Python face recognition service');
            const faceRecognition = new PythonFaceRecognition();
            // Pass location data to face recognition service if provided
            console.log('Passing to Python service - fighterId:', fighterId, 'faceDescriptor length:', faceDescriptor.length);
            const recognitionResult = await faceRecognition.recognizeFace(fighterId, faceDescriptor, location);
            
            console.log('Python recognition result:', recognitionResult);
            if (!recognitionResult.success) {
                console.log(`PYTHON FACE RECOGNITION FAILED: ${recognitionResult.message}`);
                return res.status(400).json({ 
                    msg: recognitionResult.message
                });
            }
            
            console.log(`PYTHON HIGH ACCURACY Face verification successful: ${recognitionResult.message}`);
        }
        
        // If this is an RFID punch (no face descriptor), verify location before marking attendance
        if (!faceDescriptor) {
            // For RFID punches, location verification is required
            if (location) {
                const locationResult = await verifyLocation(location);
                if (!locationResult.isValid) {
                    return res.status(400).json({ 
                        msg: `SECURITY ALERT: Location verification failed. ${locationResult.message} Attendance NOT marked.` 
                    });
                }
            } else {
                // If no location data is provided for RFID punch, deny attendance
                return res.status(400).json({ 
                    msg: 'SECURITY ALERT: Location data is required for RFID attendance. Attendance NOT marked.' 
                });
            }
        }
        
        // Define the start and end of the current day to ensure punches are paired correctly
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

        // Find the last open attendance record for this fighter *for the current day*
        const todaysLastAttendance = await Attendance.findOne({ 
            fighterId: fighterId,
            checkIn: { $gte: startOfDay, $lt: endOfDay },
            checkOut: null // Find a record that hasn't been punched out yet today
        }).sort({ checkIn: -1 });

        // Prepare attendance record with location if available
        const attendanceData = {
            fighterId: fighterId,
            checkIn: new Date(),
            method: faceDescriptor ? 'face' : 'rfid'
        };
        
        // Add location data if provided
        if (location && location.latitude && location.longitude) {
            attendanceData.location = {
                latitude: location.latitude,
                longitude: location.longitude
            };
        }

        // If an open record exists for today, this is a PUNCH OUT
        if (todaysLastAttendance) {
            todaysLastAttendance.checkOut = new Date();
            todaysLastAttendance.method = faceDescriptor ? 'face' : 'rfid'; // Set method correctly
            
            // Add location for checkout if provided
            if (location && location.latitude && location.longitude) {
                todaysLastAttendance.location = {
                    latitude: location.latitude,
                    longitude: location.longitude
                };
            }
            
            await todaysLastAttendance.save();
            
            const checkInDate = new Date(todaysLastAttendance.checkIn).toDateString();
            const checkOutDate = new Date().toDateString();
            const message = checkInDate === checkOutDate 
                ? 'Checked out successfully!'
                : 'Recorded a late checkout from a previous session.';
                
            return res.json({ 
                msg: message,
                attendance: todaysLastAttendance 
            });
        } else {
            // Otherwise, this is a new PUNCH IN
            const newAttendance = new Attendance(attendanceData);
            await newAttendance.save();
            return res.json({ 
                msg: 'Checked in successfully!',
                attendance: newAttendance 
            });
        }
    } catch (err) {
        console.error('PYTHON-BASED HIGH SECURITY Punch error:', err.message);
        console.error('Error stack:', err.stack);
        
        // More detailed error response
        if (err.name === 'ValidationError') {
            return res.status(400).json({ 
                msg: 'Validation Error', 
                error: err.message,
                details: Object.keys(err.errors).map(key => ({
                    field: key,
                    message: err.errors[key].message
                }))
            });
        }
        
        if (err.code === 11000) {
            return res.status(400).json({ 
                msg: 'Duplicate entry error', 
                error: err.message 
            });
        }
        
        res.status(500).json({ 
            msg: 'Server Error: Security verification could not be completed. Attendance NOT marked.',
            error: err.message,
            stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
        });
    }
});

// @route   POST /api/attendance/rfid-status
// @desc    Fighter checks their punch status using their RFID with location verification and unified logic
// @access  Private (Fighter only)
router.post('/rfid-status', auth, async (req, res) => {
    if (req.user.role !== 'fighter') {
        return res.status(403).json({ msg: 'Access denied' });
    }

    const { rfid, location } = req.body;
    if (!rfid) {
        return res.status(400).json({ msg: 'RFID is required' });
    }

    try {
        const fighter = await Fighter.findOne({ rfid });
        if (!fighter) {
            return res.status(404).json({ msg: 'Fighter with this RFID not found' });
        }
        
        // Security check: ensure the RFID belongs to the logged-in fighter
        if (fighter._id.toString() !== req.user.id) {
            return res.status(403).json({ msg: 'This RFID does not belong to you.' });
        }

        // If location is provided, verify it
        if (location) {
            const locationResult = await verifyLocation(location);
            if (!locationResult.isValid) {
                return res.status(400).json({ 
                    msg: `SECURITY ALERT: Location verification failed. ${locationResult.message} Attendance NOT marked.` 
                });
            }
        }

        // Define the start and end of the current day to ensure punches are paired correctly
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

        // Find the last open attendance record for this fighter *for the current day*
        const todaysLastAttendance = await Attendance.findOne({ 
            fighterId: fighter._id,
            checkIn: { $gte: startOfDay, $lt: endOfDay },
            checkOut: null // Find a record that hasn't been punched out yet today
        }).sort({ checkIn: -1 });

        let punchType = 'in'; // Default to check-in
        if (todaysLastAttendance) {
            punchType = 'out'; // If there's an open punch, the next action is a check-out
        }
        
        res.json({
            punchType,
            fighter: {
                _id: fighter._id,
                name: fighter.name,
                fighterBatchNo: fighter.fighterBatchNo
            }
        });
    } catch (err) {
        console.error("RFID status check error:", err.message);
        res.status(500).send('Server Error');
    }
});


// @route   GET /api/attendance/me/status
// @desc    Fighter gets their own current punch status (for face recognition) with unified logic
// @access  Private (Fighter only)
router.get('/me/status', auth, async (req, res) => {
    if (req.user.role !== 'fighter') {
        return res.status(403).json({ msg: 'Access denied' });
    }

    try {
        const fighter = await Fighter.findById(req.user.id).select('name fighterBatchNo');
        if (!fighter) {
            return res.status(404).json({ msg: 'Fighter not found' });
        }

        // Define the start and end of the current day to ensure punches are paired correctly
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

        // Find the last open attendance record for this fighter *for the current day*
        const todaysLastAttendance = await Attendance.findOne({ 
            fighterId: req.user.id,
            checkIn: { $gte: startOfDay, $lt: endOfDay },
            checkOut: null // Find a record that hasn't been punched out yet today
        }).sort({ checkIn: -1 });

        let punchType = 'in'; // Default to check-in
        if (todaysLastAttendance) {
            punchType = 'out'; // If there's an open punch, the next action is a check-out
        }
        
        res.json({
            punchType,
            fighter
        });
    } catch (err) {
        console.error("Fighter status check error:", err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET /api/attendance/fighter
// @desc    Get attendance records for the current fighter (using token)
// @access  Private (Fighter only)
router.get('/fighter', auth, async (req, res) => {
    if (req.user.role !== 'fighter') {
        return res.status(403).json({ msg: 'Access denied' });
    }
    
    try {
        const attendanceRecords = await Attendance.find({ fighterId: req.user.id })
            .sort({ date: -1 })
            .limit(50);
        
        res.json(attendanceRecords);
    } catch (err) {
        console.error('Error fetching attendance records:', err.message);
        res.status(500).json({ msg: 'Server Error: ' + err.message });
    }
});

// @route   GET /api/attendance/status/:rfid
// @desc    Check the current punch-in/out status of a fighter by RFID with unified logic
// @access  Private (Admin only)
router.get('/status/:rfid', auth, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ msg: 'Access denied' });
    }

    try {
        const fighter = await Fighter.findOne({ rfid: { $regex: new RegExp(`^${req.params.rfid}$`, 'i') } });
        if (!fighter) {
            return res.status(404).json({ msg: 'Fighter with this RFID not found.' });
        }

        // Define the start and end of the current day to ensure punches are paired correctly
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

        // Find the last open attendance record for this fighter *for the current day*
        const todaysLastAttendance = await Attendance.findOne({ 
            fighterId: fighter._id,
            checkIn: { $gte: startOfDay, $lt: endOfDay },
            checkOut: null // Find a record that hasn't been punched out yet today
        }).sort({ checkIn: -1 });

        const nextAction = todaysLastAttendance ? 'out' : 'in';
        
        res.json({
            fighter: {
                id: fighter._id,
                name: fighter.name,
                rfid: fighter.rfid
            },
            nextAction
        });

    } catch (err) {
        console.error("Error fetching fighter status:", err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST /api/attendance/admin/rfid
// @desc    Admin logs attendance IN or OUT using a fighter's RFID, now with location verification and unified punch logic
// @access  Private (Admin only)
router.post('/admin/rfid', auth, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ msg: 'Access denied' });
    }

    const { rfid, location } = req.body;
    if (!rfid) {
        return res.status(400).json({ msg: 'Fighter RFID is required.' });
    }

    try {
        const fighter = await Fighter.findOne({ rfid: { $regex: new RegExp(`^${rfid}$`, 'i') } });
        if (!fighter) {
            return res.status(404).json({ msg: 'Fighter with this RFID not found.' });
        }

        // Check if the last punch for this fighter was within 2 minutes (unified cooldown logic)
        const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
        const recentPunch = await Attendance.findOne({ 
            fighterId: fighter._id,
            $or: [
                { checkIn: { $gte: twoMinutesAgo } },
                { checkOut: { $gte: twoMinutesAgo } }
            ]
        });
        
        if (recentPunch) {
            return res.status(400).json({ 
                msg: 'Attendance can only be marked once every 2 minutes. Please wait before trying again.' 
            });
        }

        // If location is provided, verify it before marking attendance
        if (location) {
            const locationResult = await verifyLocation(location);
            if (!locationResult.isValid) {
                return res.status(400).json({ 
                    msg: `SECURITY ALERT: Location verification failed. ${locationResult.message} Attendance NOT marked.` 
                });
            }
        }

        // Define the start and end of the current day to ensure punches are paired correctly
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

        // Find the last open attendance record for this fighter *for the current day*
        const todaysLastAttendance = await Attendance.findOne({ 
            fighterId: fighter._id,
            checkIn: { $gte: startOfDay, $lt: endOfDay },
            checkOut: null // Find a record that hasn't been punched out yet today
        }).sort({ checkIn: -1 });

        if (todaysLastAttendance) {
            // This is a PUNCH OUT
            todaysLastAttendance.checkOut = new Date();
            todaysLastAttendance.method = 'rfid'; // Ensure method is set correctly
            
            // Add location data if provided
            if (location) {
                todaysLastAttendance.location = {
                    latitude: location.latitude,
                    longitude: location.longitude
                };
            }
            
            await todaysLastAttendance.save();
            
            const checkInDate = new Date(todaysLastAttendance.checkIn).toDateString();
            const checkOutDate = new Date().toDateString();
            const message = checkInDate === checkOutDate 
                ? `Checked out ${fighter.name} successfully!`
                : `Recorded a late checkout for ${fighter.name} from a previous session.`;

            res.json({
                msg: message,
                type: 'checkout',
                fighter: { name: fighter.name, fighterBatchNo: fighter.fighterBatchNo },
                attendance: todaysLastAttendance
            });
        } else {
            // This is a PUNCH IN
            const newAttendance = new Attendance({
                fighterId: fighter._id,
                method: 'rfid', // Ensure method is set correctly
                checkIn: new Date()
            });
            
            // Add location data if provided
            if (location) {
                newAttendance.location = {
                    latitude: location.latitude,
                    longitude: location.longitude
                };
            }
            
            await newAttendance.save();
            res.json({
                msg: `Checked in ${fighter.name} successfully!`,
                type: 'checkin',
                fighter: { name: fighter.name, fighterBatchNo: fighter.fighterBatchNo },
                attendance: newAttendance
            });
        }
    } catch (err) {
        console.error("RFID attendance error:", err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST /api/attendance/admin/face-recognition
// @desc    Admin logs attendance using face recognition with unified punch logic
// @access  Private (Admin only)
router.post('/admin/face-recognition', auth, async (req, res) => {
    // Allow both admin and fighter roles to use this endpoint
    if (req.user.role !== 'admin' && req.user.role !== 'fighter') {
        return res.status(403).json({ msg: 'Access denied' });
    }

    try {
        const { faceDescriptor, location } = req.body;
        
        console.log('Face recognition request received');
        console.log('Face descriptor:', faceDescriptor ? 'Present' : 'Missing');
        console.log('Face descriptor type:', typeof faceDescriptor);
        console.log('Face descriptor is array:', Array.isArray(faceDescriptor));
        
        if (!faceDescriptor || !Array.isArray(faceDescriptor)) {
            console.log('Invalid face descriptor - returning 400 error');
            return res.status(400).json({ msg: 'Face descriptor is required' });
        }

        // For fighters, only compare against their own face encodings for security
        let fighters;
        if (req.user.role === 'fighter') {
            // Fighter can only match against their own face data
            const fighter = await Fighter.findById(req.user.id)
                .select('name fighterBatchNo faceEncodings');
            
            if (!fighter) {
                return res.status(404).json({ msg: 'Fighter not found' });
            }
            
            // Check if fighter has face encodings
            if (!fighter.faceEncodings || fighter.faceEncodings.length === 0) {
                return res.status(404).json({ 
                    msg: 'SECURITY ALERT: No face data found on your profile. Please contact an admin. Attendance NOT marked.' 
                });
            }
            
            fighters = [fighter];
        } else {
            // Admin can match against all fighters
            fighters = await Fighter.find({ 
                faceEncodings: { $exists: true, $ne: [] } 
            }).select('name fighterBatchNo faceEncodings');
        }

        console.log(`Found ${fighters.length} fighters with face encodings`);
        
        if (fighters.length === 0) {
            console.log('No fighters with face data found - returning 404 error');
            return res.status(404).json({ msg: 'No fighters with face data found' });
        }

        // Convert the detected face descriptor to Float32Array
        console.log('Converting face descriptor to Float32Array');
        const detectedDescriptor = new Float32Array(faceDescriptor);

        // Enhanced face matching with higher accuracy requirements (same as Python implementation)
        console.log('Starting enhanced face matching process');
        let bestMatch = null;
        let lowestDistance = Infinity;
        const strictThreshold = 0.4; // Stricter threshold for high accuracy (same as Python)
        const requiredMatchPercentage = 0.6; // 60% of encodings must match (same as Python)

        for (const fighter of fighters) {
            console.log(`Processing fighter: ${fighter.name}`);
            
            // Enhanced matching with multiple verification steps
            let matchCount = 0;
            let bestFighterDistance = Infinity;
            
            // Compare against all stored face encodings for this fighter
            for (const encoding of fighter.faceEncodings) {
                console.log('Processing encoding');
                const storedDescriptor = new Float32Array(encoding.encoding);
                
                // Calculate Euclidean distance between descriptors
                let distance = 0;
                for (let i = 0; i < detectedDescriptor.length; i++) {
                    const diff = detectedDescriptor[i] - storedDescriptor[i];
                    distance += diff * diff;
                }
                distance = Math.sqrt(distance);

                console.log(`Distance: ${distance}`);

                // Count matches within strict threshold
                if (distance < strictThreshold) {
                    matchCount++;
                }
                
                // Update best match distance for this fighter
                if (distance < bestFighterDistance) {
                    bestFighterDistance = distance;
                }
            }
            
            // Enhanced security checks (same as Python implementation)
            console.log(`Match count for ${fighter.name}: ${matchCount}/${fighter.faceEncodings.length}`);
            
            // Check if we have enough matches and the best match is within threshold
            const hasEnoughMatches = matchCount >= Math.ceil(fighter.faceEncodings.length * requiredMatchPercentage);
            const isBestMatchGood = bestFighterDistance < strictThreshold;
            
            // Additional verification to ensure strict matching
            const minimumAcceptableDistance = 0.4; // Even stricter for security (same as Python)
            
            // Update global best match if this fighter is a better match
            if (hasEnoughMatches && isBestMatchGood && bestFighterDistance < minimumAcceptableDistance && bestFighterDistance < lowestDistance) {
                lowestDistance = bestFighterDistance;
                bestMatch = fighter;
                console.log(`New best match: ${fighter.name} with distance ${bestFighterDistance}`);
            }
        }

        if (!bestMatch) {
            console.log('No matching fighter found - returning 404 error');
            // More specific error message for security
            if (req.user.role === 'fighter') {
                return res.status(400).json({ 
                    msg: 'SECURITY ALERT: Face verification failed. Your face does not match the registered face data. Attendance NOT marked.' 
                });
            } else {
                return res.status(404).json({ msg: 'No matching fighter found' });
            }
        }

        console.log(`Best match found: ${bestMatch.name} with distance ${lowestDistance}`);
        
        // If location is provided, verify it before marking attendance (same as Python implementation)
        if (location) {
            const locationResult = await verifyLocation(location);
            if (!locationResult.isValid) {
                return res.status(400).json({ 
                    msg: `SECURITY ALERT: Location verification failed. ${locationResult.message} Attendance NOT marked.` 
                });
            }
        }
        
        // Check if the last punch for this fighter was within 2 minutes (unified cooldown logic)
        const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
        const recentPunch = await Attendance.findOne({ 
            fighterId: bestMatch._id,
            $or: [
                { checkIn: { $gte: twoMinutesAgo } },
                { checkOut: { $gte: twoMinutesAgo } }
            ]
        });
        
        if (recentPunch) {
            return res.status(400).json({ 
                msg: 'Attendance can only be marked once every 2 minutes. Please wait before trying again.' 
            });
        }

        // Define the start and end of the current day to ensure punches are paired correctly
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

        // Find the last open attendance record for this fighter *for the current day*
        const todaysLastAttendance = await Attendance.findOne({ 
            fighterId: bestMatch._id,
            checkIn: { $gte: startOfDay, $lt: endOfDay },
            checkOut: null // Find a record that hasn't been punched out yet today
        }).sort({ checkIn: -1 });

        // Prepare attendance record with location if available
        const attendanceData = {
            fighterId: bestMatch._id,
            checkIn: new Date(),
            method: 'face'
        };
        
        // Add location data if provided
        if (location && location.latitude && location.longitude) {
            attendanceData.location = {
                latitude: location.latitude,
                longitude: location.longitude
            };
        }

        if (todaysLastAttendance) {
            // This is a PUNCH OUT
            todaysLastAttendance.checkOut = new Date();
            todaysLastAttendance.method = 'face'; // This now matches the enum
            
            // Add location for checkout if provided
            if (location && location.latitude && location.longitude) {
                todaysLastAttendance.location = {
                    latitude: location.latitude,
                    longitude: location.longitude
                };
            }
            
            await todaysLastAttendance.save();
            
            const checkInDate = new Date(todaysLastAttendance.checkIn).toDateString();
            const checkOutDate = new Date().toDateString();
            const message = checkInDate === checkOutDate 
                ? `Checked out ${bestMatch.name} successfully!`
                : `Recorded a late checkout for ${bestMatch.name} from a previous session.`;

            res.json({
                msg: message,
                type: 'checkout',
                fighter: { 
                    id: bestMatch._id,
                    name: bestMatch.name, 
                    fighterBatchNo: bestMatch.fighterBatchNo 
                },
                attendance: todaysLastAttendance
            });
        } else {
            // This is a PUNCH IN
            const newAttendance = new Attendance(attendanceData);
            await newAttendance.save();
            
            res.json({
                msg: `Checked in ${bestMatch.name} successfully!`,
                type: 'checkin',
                fighter: { 
                    id: bestMatch._id,
                    name: bestMatch.name, 
                    fighterBatchNo: bestMatch.fighterBatchNo 
                },
                attendance: newAttendance
            });
        }
    } catch (err) {
        console.error("Enhanced JavaScript face recognition attendance error:", err.message);
        console.error("Stack trace:", err.stack);
        res.status(500).send('Server Error');
    }
});

// @route   GET /api/attendance/fighter/:id
// @desc    Admin gets attendance records for a specific fighter by ID
// @access  Private (Admin only)
router.get('/fighter/:id', auth, async (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ msg: 'Access denied. Admins only.' });
    }

    try {
        const fighter = await Fighter.findById(req.params.id);
        if (!fighter) {
            return res.status(404).json({ msg: 'Fighter not found.' });
        }

        // Build query with optional date filtering
        const query = { fighterId: req.params.id };
        
        // Add date range filter if provided
        if (req.query.startDate && req.query.endDate) {
            const startDate = new Date(req.query.startDate);
            const endDate = new Date(req.query.endDate);
            endDate.setHours(23, 59, 59, 999); // Include the entire end date
            
            query.checkIn = {
                $gte: startDate,
                $lte: endDate
            };
        }

        const fighterRecords = await Attendance.find(query)
            .populate('fighterId', 'name rfid')
            .sort({ checkIn: -1 }); // Sort by checkIn date descending (newest first)

        const dailyRecordsMap = new Map();

        for (const record of fighterRecords) {
            const checkInDateStr = new Date(record.checkIn).toISOString().split('T')[0];
            const checkInKey = `${req.params.id}-${checkInDateStr}`;

            if (!dailyRecordsMap.has(checkInKey)) {
                dailyRecordsMap.set(checkInKey, {
                    id: checkInKey,
                    fighterName: record.fighterId.name,
                    rfid: record.fighterId.rfid,
                    date: checkInDateStr,
                    checkIns: [],
                    checkOuts: [],
                });
            }
            dailyRecordsMap.get(checkInKey).checkIns.push({ time: record.checkIn, late: false });

            if (record.checkOut) {
                const checkOutDateStr = new Date(record.checkOut).toISOString().split('T')[0];
                if (checkInDateStr === checkOutDateStr) {
                    dailyRecordsMap.get(checkInKey).checkOuts.push({ time: record.checkOut, late: false });
                } else {
                    // Handle late punch-out on a different day
                    const checkOutKey = `${req.params.id}-${checkOutDateStr}`;
                     if (!dailyRecordsMap.has(checkOutKey)) {
                        dailyRecordsMap.set(checkOutKey, {
                            id: checkOutKey,
                            fighterName: record.fighterId.name,
                            rfid: record.fighterId.rfid,
                            date: checkOutDateStr,
                            checkIns: [], // This will be empty for a late-punch-out day
                            checkOuts: [],
                        });
                    }
                    dailyRecordsMap.get(checkOutKey).checkOuts.push({ time: record.checkOut, late: true });
                }
            }
        }

        const processedRecords = Array.from(dailyRecordsMap.values()).map(dayData => {
            let totalDurationMs = 0;
            
            // For regular (non-late) punches, pair them as before
            const regularCheckIns = dayData.checkIns.filter(p => !p.late);
            const regularCheckOuts = dayData.checkOuts.filter(p => !p.late);
            const pairedPunches = Math.min(regularCheckIns.length, regularCheckOuts.length);

            for (let i = 0; i < pairedPunches; i++) {
                totalDurationMs += new Date(regularCheckOuts[i].time) - new Date(regularCheckIns[i].time);
            }
            
            // Handle late checkouts - but don't add duration for them
            const lateCheckOuts = dayData.checkOuts.filter(p => p.late);
            // We intentionally don't add duration for late checkouts to the current day
            // This ensures that days with forgotten punchouts show 00:00:00 duration

          // Ensure duration is not negative
            const safeTotalDurationMs = Math.max(0, totalDurationMs);

            const totalSeconds = Math.floor(safeTotalDurationMs / 1000);
            const hours = Math.floor(totalSeconds / 3600);
            const minutes = Math.floor((totalSeconds % 3600) / 60);
            const seconds = totalSeconds % 60;

            const formattedDuration = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

            return {
                ...dayData,
                duration: formattedDuration,
            };
        });
        
        // Sort by date descending to show the most recent first
        processedRecords.sort((a, b) => new Date(b.date) - new Date(a.date));

        res.json(processedRecords);

    } catch (err) {
        console.error("Fighter attendance fetch error:", err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;