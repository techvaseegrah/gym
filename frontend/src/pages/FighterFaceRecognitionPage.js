import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import * as tf from '@tensorflow/tfjs';
import * as faceapi from 'face-api.js';
import api from '../api/api';
import { FaCamera, FaCheckCircle, FaExclamationTriangle, FaSpinner, FaInfoCircle } from 'react-icons/fa';
import Webcam from 'react-webcam';

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

// Enhanced JavaScript face recognition interface
class FaceRecognition {
    constructor() {
        this.modelsLoaded = false;
        this.detectionCount = 0;
        this.maxDetections = 5; // Increased for higher accuracy
        this.minConfidence = 0.95; // Higher confidence requirement
        this.matchThreshold = 0.4; // Stricter threshold for high accuracy (same as Python)
    }

    async loadModels() {
        try {
            // Load enhanced models for better accuracy and speed
            await Promise.all([
                // Use SSD MobileNet v1 for face detection (reverting from MTCNN)
                faceapi.nets.ssdMobilenetv1.loadFromUri('/models'),
                // Use Face Landmark 68 Net for detailed face landmarks
                faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
                // Use Face Recognition Net for generating face embeddings
                faceapi.nets.faceRecognitionNet.loadFromUri('/models')
            ]);
            this.modelsLoaded = true;
            return true;
        } catch (error) {
            console.error("Error loading enhanced models:", error);
            return false;
        }
    }

    async detectFace(imageSrc) {
        if (!this.modelsLoaded) return null;
        
        try {
            const img = await faceapi.fetchImage(imageSrc);
            
            // Use SSD MobileNet v1 for face detection
            const detections = await faceapi.detectSingleFace(img, new faceapi.SsdMobilenetv1Options({ 
                minConfidence: 0.95 // Higher confidence requirement
            }))
            .withFaceLandmarks()
            .withFaceDescriptor();
            
            return detections;
        } catch (error) {
            console.error("High accuracy face detection error:", error);
            return null;
        }
    }

    async recognizeFace(faceDescriptor) {
        try {
            // Get user's current location
            let location = null;
            try {
                if (navigator.geolocation) {
                    location = await new Promise((resolve, reject) => {
                        navigator.geolocation.getCurrentPosition(
                            (position) => {
                                resolve({
                                    latitude: position.coords.latitude,
                                    longitude: position.coords.longitude
                                });
                            },
                            (error) => {
                                console.warn('Location access denied or unavailable:', error.message);
                                resolve(null); // Continue without location
                            },
                            {
                                enableHighAccuracy: true,
                                timeout: 10000,
                                maximumAge: 60000 // 1 minute cache
                            }
                        );
                    });
                }
            } catch (locationError) {
                console.warn('Location error:', locationError);
            }

            const descriptorArray = Array.from(faceDescriptor);
            console.log('Sending face descriptor to server, length:', descriptorArray.length);
            console.log('First 5 elements:', descriptorArray.slice(0, 5));
            
            // Use the same endpoint as the Admin panel for consistency
            const response = await api.post('/attendance/admin/face-recognition', { 
                faceDescriptor: descriptorArray,
                location: location // Send location data to backend
            });
            return {
                success: true,
                message: response.data.msg || 'Attendance marked successfully!',
                data: response.data
            };
        } catch (error) {
            // Enhanced error handling with more specific security messages
            const errorMessage = error.response?.data?.msg || 'Face verification failed. Please try again.';
            
            // Check if this is a security-related error
            const isSecurityError = errorMessage.includes('SECURITY ALERT') || 
                                  errorMessage.includes('Face verification failed') ||
                                  errorMessage.includes('Attendance NOT marked');
            
            return {
                success: false,
                message: isSecurityError 
                    ? errorMessage 
                    : 'Face verification failed. Please ensure good lighting and try again.',
                status: error.response?.status
            };
        }
    }

    resetDetectionCount() {
        this.detectionCount = 0;
    }

    incrementDetectionCount() {
        this.detectionCount++;
        return this.detectionCount;
    }
}

const FighterFaceRecognitionPage = () => {
    const webcamRef = useRef(null);
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('Loading enhanced face recognition models...');
    const [messageType, setMessageType] = useState('info'); // 'info', 'success', 'error'
    const [captureInterval, setCaptureInterval] = useState(null);
    const [countdown, setCountdown] = useState(0); // For 2-minute restriction
    const [isProcessing, setIsProcessing] = useState(false); // Prevent multiple concurrent requests
    const [showHelp, setShowHelp] = useState(false); // Help tool visibility
    const [verificationProgress, setVerificationProgress] = useState(0); // Face matching progress
    const [cameraActive, setCameraActive] = useState(false); // Control camera activation
    const [locationVerified, setLocationVerified] = useState(false); // Track if location is verified
    const faceRecognition = useRef(new FaceRecognition()).current;

    // Load face recognition models
    const loadModels = useCallback(async () => {
        try {
            setMessage('Loading enhanced JavaScript face recognition models...');
            setMessageType('info');
            
            // Enable TensorFlow.js optimizations for better performance
            if (tf.env().flagRegistry.GPGPU) {
                tf.env().set('WEBGL_FORCE_F16_TEXTURES', true);
            }
            
            const loaded = await faceRecognition.loadModels();
            if (loaded) {
                setMessage('Models loaded successfully. Click "Start Camera" to begin.');
                setMessageType('info');
                setLoading(false);
            } else {
                setMessage("Error loading models. Please refresh the page.");
                setMessageType('error');
                setLoading(false);
            }
        } catch (error) {
            console.error("Error loading models:", error);
            setMessage("Error loading models. Please refresh the page.");
            setMessageType('error');
            setLoading(false);
        }
    }, [faceRecognition]);

    // Check location verification before starting camera
    const checkLocationVerification = useCallback(async () => {
        try {
            setMessage('Fetching gym settings...');
            setMessageType('info');
            
            // Get settings to check if location verification is enabled
            let settingsResponse;
            try {
                settingsResponse = await api.get('/settings');
            } catch (apiError) {
                console.error('API Error Details:', apiError);
                if (apiError.response) {
                    // The request was made and the server responded with a status code
                    // that falls out of the range of 2xx
                    console.error('API Error Response:', apiError.response);
                    throw new Error(`Failed to fetch settings. Server responded with status ${apiError.response.status}. Please check server logs.`);
                } else if (apiError.request) {
                    // The request was made but no response was received
                    console.error('API Error Request:', apiError.request);
                    throw new Error('Failed to fetch settings. No response received from server. Please check if server is running.');
                } else {
                    // Something happened in setting up the request that triggered an Error
                    console.error('API Error Message:', apiError.message);
                    throw new Error(`Failed to fetch settings. Error: ${apiError.message}`);
                }
            }
            
            const settings = settingsResponse.data;
            
            // Validate settings data
            if (!settings || !settings.location) {
                throw new Error('Invalid settings data received from server. Please check server configuration.');
            }
            
            // If location verification is disabled, proceed without checking location
            if (!settings.location.enabled) {
                setLocationVerified(true);
                setMessage('Location verification is disabled. Camera will activate.');
                setMessageType('info');
                return true;
            }
            
            setMessage('Verifying your location against gym coordinates...');
            setMessageType('info');
            
            // If location verification is enabled, check user's location
            if (navigator.geolocation) {
                setMessage('Requesting your location...');
                setMessageType('info');
                
                const userLocation = await new Promise((resolve, reject) => {
                    navigator.geolocation.getCurrentPosition(
                        (position) => {
                            console.log('Geolocation success:', position);
                            resolve({
                                latitude: position.coords.latitude,
                                longitude: position.coords.longitude
                            });
                        },
                        (error) => {
                            console.error('Geolocation error:', error);
                            let errorMessage = '';
                            switch(error.code) {
                                case error.PERMISSION_DENIED:
                                    errorMessage = 'Location access denied by user. Please enable location permissions for this site.';
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
                            reject(new Error(errorMessage));
                        },
                        {
                            enableHighAccuracy: true,
                            timeout: 15000,
                            maximumAge: 60000 // 1 minute cache
                        }
                    );
                });
                
                setMessage(`Your location: ${userLocation.latitude.toFixed(6)}, ${userLocation.longitude.toFixed(6)}`);
                setMessageType('info');
                
                // Validate gym location coordinates
                if (typeof settings.location.latitude !== 'number' || typeof settings.location.longitude !== 'number') {
                    throw new Error('Invalid gym location coordinates in settings. Please check admin settings.');
                }
                
                // Calculate distance between user and gym
                const gymLocation = {
                    latitude: settings.location.latitude,
                    longitude: settings.location.longitude
                };
                
                const distance = haversineDistance(userLocation, gymLocation);
                const allowedRadius = settings.location.radius || 100;
                
                setMessage(`Gym location: ${gymLocation.latitude.toFixed(6)}, ${gymLocation.longitude.toFixed(6)}. Distance: ${Math.round(distance)}m. Required: <=${allowedRadius}m`);
                setMessageType('info');
                
                // Check if user is within allowed radius
                if (distance <= allowedRadius) {
                    setLocationVerified(true);
                    setMessage(`Location verified successfully. You are ${Math.round(distance)}m from the gym.`);
                    setMessageType('info');
                    return true;
                } else {
                    throw new Error(`You are too far from the gym (${Math.round(distance)}m). Must be within ${allowedRadius}m to mark attendance.`);
                }
            } else {
                throw new Error('Geolocation is not supported by your browser.');
            }
        } catch (error) {
            console.error('Location verification error:', error);
            setMessage(`SECURITY ALERT: Location verification failed. ${error.message} Attendance NOT marked.`);
            setMessageType('error');
            return false;
        }
    }, []);

    // Enhanced face detection with multiple verification steps
    const detectAndVerifyFace = useCallback(async () => {
        if (isProcessing || !webcamRef.current || !faceRecognition.modelsLoaded || !cameraActive) return;
        
        try {
            const imageSrc = webcamRef.current.getScreenshot();
            if (!imageSrc) return;

            const detections = await faceRecognition.detectFace(imageSrc);
            
            // Debug face detection results
            if (detections) {
                console.log('Face detection successful:', detections);
                if (detections.descriptor) {
                    console.log('Face descriptor length:', detections.descriptor.length);
                } else {
                    console.log('No descriptor in detections');
                }
                // Require multiple successful detections before verification for high accuracy
                const detectionCount = faceRecognition.incrementDetectionCount();
                
                // Only proceed after 5 successful detections for higher accuracy
                if (detectionCount >= faceRecognition.maxDetections) {
                    setMessage('High accuracy verification in progress...');
                    console.log('Calling verifyFace with descriptor length:', detections.descriptor.length);
                    verifyFace(detections.descriptor);
                    faceRecognition.resetDetectionCount();
                } else {
                    setMessage(`Face detected (${detectionCount}/${faceRecognition.maxDetections}) for high accuracy. Keep still...`);
                    setMessageType('info');
                }
            } else {
                // Reset detection count if face is not detected
                faceRecognition.resetDetectionCount();
                // Only show this message if we're not already showing a more important one
                setMessage('No face detected. Ensure good lighting and position your face in the frame.');
            }
        } catch (error) {
            console.error("High accuracy face detection error:", error);
        }
    }, [isProcessing, faceRecognition, cameraActive]);

    // Enhanced face verification with improved accuracy
    const verifyFace = useCallback(async (faceDescriptor) => {
        if (isProcessing) return;
        
        console.log('verifyFace called with descriptor length:', faceDescriptor.length);
        
        setIsProcessing(true);
        setMessage('Verifying face with enhanced accuracy... Please wait.');
        setMessageType('info');
        setVerificationProgress(0);
        
        try {
            // Simulate verification progress for better UX
            const progressInterval = setInterval(() => {
                setVerificationProgress(prev => {
                    if (prev >= 90) {
                        clearInterval(progressInterval);
                        return 90;
                    }
                    return prev + 10;
                });
            }, 200);
            
            const result = await faceRecognition.recognizeFace(faceDescriptor);
            
            clearInterval(progressInterval);
            setVerificationProgress(100);
            
            if (result.success) {
                setMessage(result.message);
                setMessageType('success');
                
                // Navigate to attendance page after a delay
                setTimeout(() => {
                    navigate('/fighter/attendance');
                }, 3000);
            } else {
                // Handle different error types
                if (result.status === 400) {
                    // This is specifically for the "face verification failed" case
                    if (result.message.includes('Face verification failed')) {
                        setMessage('SECURITY ALERT: Face verification failed. Your face does not match the registered face. Attendance NOT marked.');
                        setMessageType('error');
                    } else {
                        // For 2-minute restriction
                        const errorMsg = result.message || 'Attendance can only be marked once every 2 minutes.';
                        setMessage(errorMsg);
                        setMessageType('error');
                        
                        // Start countdown timer
                        setCountdown(120); // 2 minutes in seconds
                    }
                } else if (result.status === 404) {
                    setMessage('Face verification failed. Please ensure your face is registered in your profile.');
                    setMessageType('error');
                } else {
                    setMessage(result.message);
                    setMessageType('error');
                }
                
                // Reset verification progress on error
                setTimeout(() => {
                    setVerificationProgress(0);
                }, 3000);
            }
        } finally {
            // Ensure we don't stay in processing state indefinitely
            setTimeout(() => {
                setIsProcessing(false);
            }, 3000);
        }
    }, [isProcessing, faceRecognition, navigate]);

    // Start face scanning with enhanced accuracy
    const startFaceScan = useCallback(() => {
        // Clear any existing interval using the ref
        if (captureInterval) {
            clearInterval(captureInterval);
        }

        // Start new interval for face detection
        const interval = setInterval(() => {
            detectAndVerifyFace();
        }, 800); // Check more frequently for better responsiveness
        
        // Store interval in state
        setCaptureInterval(interval);
    }, [detectAndVerifyFace]);

    // Stop face scanning
    const stopFaceScan = useCallback(() => {
        if (captureInterval) {
            clearInterval(captureInterval);
            setCaptureInterval(null);
        }
    }, [captureInterval]);

    // Start camera function with location verification
    const startCamera = useCallback(async () => {
        setMessage('Verifying location before activating camera...');
        setMessageType('info');
        
        const isLocationValid = await checkLocationVerification();
        if (!isLocationValid) {
            // Location verification failed, don't start camera
            return;
        }
        
        setCameraActive(true);
        setMessage('Camera activated. Position your face in the frame.');
        setMessageType('info');
    }, [checkLocationVerification]);

    // Stop camera function
    const stopCamera = useCallback(() => {
        setCameraActive(false);
        stopFaceScan();
        setMessage('Camera deactivated. Click "Start Camera" to begin face recognition.');
        setMessageType('info');
        faceRecognition.resetDetectionCount();
        setVerificationProgress(0);
        setLocationVerified(false); // Reset location verification status
    }, [stopFaceScan, faceRecognition]);

    // Initialize component
    useEffect(() => {
        loadModels();
        
        // Cleanup function to stop the video stream when the component unmounts
        return () => {
            stopFaceScan();
            if (webcamRef.current && webcamRef.current.stream) {
                webcamRef.current.stream.getTracks().forEach(track => track.stop());
            }
        };
    }, [loadModels, stopFaceScan]);

    // Start scanning when camera is activated and models are loaded
    useEffect(() => {
        if (faceRecognition.modelsLoaded && !loading && cameraActive) {
            startFaceScan();
        } else if (!cameraActive) {
            stopFaceScan();
        }
        
        // Return cleanup function
        return () => {
            stopFaceScan();
        };
    }, [faceRecognition.modelsLoaded, loading, cameraActive]);

    // Countdown effect
    useEffect(() => {
        let countdownInterval;
        if (countdown > 0) {
            countdownInterval = setInterval(() => {
                setCountdown(prev => {
                    if (prev <= 1) {
                        clearInterval(countdownInterval);
                        // Re-enable scanning after countdown
                        setMessage('Position your face in the frame.');
                        setMessageType('info');
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        
        return () => {
            if (countdownInterval) {
                clearInterval(countdownInterval);
            }
        };
    }, [countdown]);

    // Get message color based on type
    const getMessageColor = () => {
        switch (messageType) {
            case 'success': return 'text-green-600';
            case 'error': return 'text-red-600';
            case 'info': 
            default: return 'text-blue-600';
        }
    };

    // Get message icon based on type
    const getMessageIcon = () => {
        switch (messageType) {
            case 'success': return <FaCheckCircle className="mr-3 text-green-500" />;
            case 'error': return <FaExclamationTriangle className="mr-3 text-red-500" />;
            case 'info': 
            default: 
                return isProcessing ? 
                    <FaSpinner className="mr-3 text-blue-500 animate-spin" /> : 
                    <FaCamera className="mr-3 text-blue-500" />;
        }
    };

    // Help tool content
    const HelpTool = () => (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-white">Enhanced JavaScript Face Recognition Help</h2>
                    <button 
                        onClick={() => setShowHelp(false)}
                        className="text-white hover:text-gray-200 text-2xl"
                    >
                        &times;
                    </button>
                </div>
                <div className="p-6">
                    <div className="mb-6">
                        <h3 className="text-lg font-semibold text-gray-800 mb-2">How Enhanced JavaScript Face Recognition Works</h3>
                        <p className="text-gray-600">
                            Our system now uses advanced JavaScript facial recognition technology with enhanced security measures. 
                            It captures multiple images of your face and compares them against your registered face data with strict accuracy requirements.
                        </p>
                    </div>
                    
                    <div className="mb-6">
                        <h3 className="text-lg font-semibold text-gray-800 mb-2">Enhanced Security & Accuracy</h3>
                        <p className="text-gray-600 mb-2">
                            <strong>Critical Security:</strong> Attendance is only marked when your face matches your registered face data with extremely high accuracy.
                            If your face does not match, attendance will NOT be marked under any circumstances.
                        </p>
                        <ul className="list-disc list-inside text-gray-600 space-y-1">
                            <li>System requires 5 successful face detections before verification</li>
                            <li>Face matching uses a strict distance threshold of 0.4 for high accuracy</li>
                            <li>At least 60% of your registered face encodings must match</li>
                            <li>Attendance is only marked after successful high accuracy verification</li>
                            <li>If face does not match, no attendance record is created</li>
                            <li><strong>HIGH SECURITY:</strong> Only your registered face can mark attendance for your profile</li>
                            <li><strong>ZERO TOLERANCE:</strong> Any non-matching face is immediately rejected</li>
                            <li><strong>JAVASCRIPT POWERED:</strong> Uses enhanced face-api.js library for superior accuracy</li>
                            <li><strong>ISOLATED VERIFICATION:</strong> Your face data is never compared against other fighters</li>
                            <li><strong>LOCATION VERIFICATION:</strong> Your location is verified to ensure you are at the gym</li>
                        </ul>
                    </div>
                    
                    <div className="mb-6">
                        <h3 className="text-lg font-semibold text-gray-800 mb-2">Location Verification</h3>
                        <p className="text-gray-600 mb-2">
                            <strong>Geo-Location Security:</strong> To ensure attendance is only marked when you are physically at the gym, 
                            your location will be verified during the face recognition process.
                        </p>
                        <ul className="list-disc list-inside text-gray-600 space-y-1">
                            <li>Your location is checked against the gym's registered location</li>
                            <li>Attendance is only marked if you are within 100 meters of the gym</li>
                            <li>Location data is only used for verification and not stored permanently</li>
                            <li>If location access is denied, attendance cannot be marked for security</li>
                            <li>Location verification happens automatically during face recognition</li>
                        </ul>
                    </div>
                    
                    <div className="mb-6">
                        <h3 className="text-lg font-semibold text-gray-800 mb-2">For Best Results</h3>
                        <ul className="list-disc list-inside text-gray-600 space-y-1">
                            <li>Ensure excellent lighting on your face (natural light works best)</li>
                            <li>Remove sunglasses, hats, or face coverings</li>
                            <li>Position your face in the center of the frame</li>
                            <li>Keep completely still during scanning process</li>
                            <li>Make sure your entire face is clearly visible</li>
                            <li>Avoid glare or shadows on your face</li>
                            <li>Ensure location services are enabled in your browser</li>
                        </ul>
                    </div>
                    
                    <div className="mb-6">
                        <h3 className="text-lg font-semibold text-gray-800 mb-2">Security Assurance</h3>
                        <p className="text-gray-600 mb-2">
                            Our system implements multiple layers of security to ensure only your face can mark attendance:
                        </p>
                        <ul className="list-disc list-inside text-gray-600 space-y-1">
                            <li>Face data is stored only in your personal profile</li>
                            <li>Verification compares only against your registered face encodings</li>
                            <li>No cross-matching with other fighters' face data</li>
                            <li>Strict threshold prevents false positives</li>
                            <li>Multi-encoding verification ensures consistency</li>
                            <li><strong>JAVASCRIPT-BASED PROCESSING:</strong> Enhanced face-api.js library for superior accuracy</li>
                            <li><strong>ZERO TOLERANCE POLICY:</strong> Any non-matching face is immediately rejected without marking attendance</li>
                            <li><strong>SECURITY ALERTS:</strong> Explicit notifications when face verification fails</li>
                            <li><strong>LOCATION SECURITY:</strong> Attendance only marked when you're at the gym</li>
                        </ul>
                    </div>
                    
                    <div className="flex justify-end">
                        <button
                            onClick={() => setShowHelp(false)}
                            className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 transition duration-300"
                        >
                            Close Help
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-4 sm:px-6">
            <div className="max-w-2xl mx-auto">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Enhanced JavaScript Face Recognition</h1>
                    <p className="text-gray-600">
                        Position your face in the frame. Attendance is only marked when face and location verification are successful.
                    </p>
                </div>
                
                <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                    <div className="bg-gradient-to-r from-red-600 to-red-700 px-6 py-4 flex justify-between items-center">
                        <h2 className="text-xl font-semibold text-white">Face & Location Scan</h2>
                        <button 
                            onClick={() => setShowHelp(true)}
                            className="text-white hover:text-gray-200 flex items-center"
                            title="Help"
                        >
                            <FaInfoCircle className="mr-1" /> Help
                        </button>
                    </div>
                    
                    <div className="p-6">
                        <div className="flex flex-col items-center">
                            <div className="w-full max-w-md rounded-xl overflow-hidden border-2 border-gray-300 shadow-md mb-6 relative">
                                {/* Conditionally render the Webcam component only when camera is active */}
                                {cameraActive && (
                                    <Webcam
                                        ref={webcamRef}
                                        audio={false}
                                        screenshotFormat="image/jpeg"
                                        videoConstraints={{
                                            width: { ideal: 1280 },
                                            height: { ideal: 720 },
                                            facingMode: 'user'
                                        }}
                                        className="w-full"
                                    />
                                )}
                                {!cameraActive && (
                                    <div className="absolute inset-0 bg-black bg-opacity-70 flex items-center justify-center">
                                        <div className="text-center p-4">
                                            <FaCamera className="text-white text-3xl mx-auto mb-3" />
                                            <p className="text-white font-medium">Camera is not active</p>
                                            <button
                                                onClick={startCamera}
                                                className="mt-3 bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition duration-300"
                                            >
                                                Start Camera
                                            </button>
                                        </div>
                                    </div>
                                )}
                                {loading && (
                                    <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                                        <FaSpinner className="text-white text-3xl animate-spin" />
                                    </div>
                                )}
                            </div>
                            
                            <div className={`w-full max-w-md p-4 rounded-lg flex items-center ${messageType === 'success' ? 'bg-green-50 border border-green-200' : messageType === 'error' ? 'bg-red-50 border border-red-200' : 'bg-blue-50 border border-blue-200'}`}>
                                {getMessageIcon()}
                                <span className={`font-medium ${getMessageColor()}`}>
                                    {message}
                                </span>
                            </div>
                            
                            {/* Show countdown timer if active */}
                            {countdown > 0 && (
                                <div className="w-full max-w-md mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                                    <p className="text-red-600 text-lg font-semibold text-center">
                                        Next punch available in: {Math.floor(countdown / 60)}:{String(countdown % 60).padStart(2, '0')}
                                    </p>
                                </div>
                            )}
                            
                            {/* Detection counter for user feedback */}
                            {faceRecognition.detectionCount > 0 && faceRecognition.detectionCount < faceRecognition.maxDetections && (
                                <div className="w-full max-w-md mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                    <p className="text-blue-600 text-center">
                                        Detection accuracy: {faceRecognition.detectionCount}/{faceRecognition.maxDetections} confirmed
                                    </p>
                                    <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                                        <div 
                                            className="bg-blue-600 h-2 rounded-full" 
                                            style={{ width: `${(faceRecognition.detectionCount / faceRecognition.maxDetections) * 100}%` }}
                                        ></div>
                                    </div>
                                </div>
                            )}
                            
                            {/* Verification progress bar */}
                            {isProcessing && verificationProgress > 0 && (
                                <div className="w-full max-w-md mt-4">
                                    <div className="flex justify-between text-sm text-gray-600 mb-1">
                                        <span>Verifying face & location...</span>
                                        <span>{verificationProgress}%</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                                        <div 
                                            className="bg-green-600 h-2.5 rounded-full transition-all duration-300" 
                                            style={{ width: `${verificationProgress}%` }}
                                        ></div>
                                    </div>
                                </div>
                            )}
                            
                            {/* Camera control buttons */}
                            <div className="mt-6 flex gap-4">
                                {!cameraActive ? (
                                    <button
                                        onClick={startCamera}
                                        disabled={loading}
                                        className={`px-6 py-3 rounded-lg font-semibold transition duration-300 ${
                                            loading 
                                                ? 'bg-gray-400 cursor-not-allowed' 
                                                : 'bg-green-600 hover:bg-green-700 text-white'
                                        }`}
                                    >
                                        <FaCamera className="inline mr-2" />
                                        Start Camera
                                    </button>
                                ) : (
                                    <button
                                        onClick={stopCamera}
                                        className="px-6 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition duration-300"
                                    >
                                        Stop Camera
                                    </button>
                                )}
                            </div>
                            
                            <div className="mt-6 text-center">
                                <p className="text-sm text-gray-500 font-medium">
                                    Security Notice: Attendance is only marked when both face and location verification are successful.
                                </p>
                                <p className="text-xs text-gray-400 mt-1">
                                    Your location will be verified to ensure you are at the gym. Only your registered face can mark attendance.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            {/* Help Tool Modal */}
            {showHelp && <HelpTool />}
        </div>
    );
};

export default FighterFaceRecognitionPage;