import React, { useState, useRef, useEffect } from 'react';
import api from '../api/api';
import Webcam from 'react-webcam';
import * as faceapi from 'face-api.js';
import { FaCamera, FaCheckCircle, FaExclamationTriangle, FaSyncAlt, FaTrash, FaUser, FaEnvelope, FaLock, FaIdCard, FaUserCircle, FaUpload } from 'react-icons/fa';

const AddFighter = ({ onAddSuccess, onCancel }) => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        rfid: ''
    });
    const [faceEncodings, setFaceEncodings] = useState([]);
    const [message, setMessage] = useState('');
    const [isError, setIsError] = useState(false);
    const [loading, setLoading] = useState(false);
    const [profilePhoto, setProfilePhoto] = useState(null);
    const webcamRef = useRef(null);
    const [modelsLoaded, setModelsLoaded] = useState(false);
    const [captureMessage, setCaptureMessage] = useState('');

    const generateRfid = () => {
        const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const prefix = letters.charAt(Math.floor(Math.random() * letters.length)) + letters.charAt(Math.floor(Math.random() * letters.length));
        const suffix = Math.floor(1000 + Math.random() * 9000).toString();
        return prefix + suffix;
    };

    useEffect(() => {
        loadModels();
        setFormData(prev => ({ ...prev, rfid: generateRfid() }));
    }, []);

    const loadModels = async () => {
        const MODEL_URL = '/models';
        try {
            await faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL);
            await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
            await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
            setModelsLoaded(true);
        } catch (error) {
            console.error("Error loading models:", error);
            setMessage("Failed to load face recognition models.");
            setIsError(true);
        }
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleProfilePhotoChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Check if file is an image
            if (!file.type.match('image/jpeg') && !file.type.match('image/png')) {
                setMessage('Please upload a JPG, JPEG, or PNG image.');
                setIsError(true);
                return;
            }
            
            // Convert image to Base64
            const reader = new FileReader();
            reader.onload = (e) => {
                setProfilePhoto(e.target.result);
                setMessage('');
                setIsError(false);
            };
            reader.readAsDataURL(file);
        }
    };

    const captureFaceEncoding = async () => {
        if (faceEncodings.length >= 4) { // Increased to 4 captures for better accuracy
            setCaptureMessage('Maximum of 4 photos reached for high accuracy.');
            return;
        }
        
        setCaptureMessage('Detecting face with high accuracy...');
        setLoading(true);
        if (webcamRef.current && modelsLoaded) {
            const imageSrc = webcamRef.current.getScreenshot();
            if (imageSrc) {
                const img = await faceapi.fetchImage(imageSrc);
                
                // Use higher accuracy detection settings
                const detections = await faceapi.detectSingleFace(img, new faceapi.SsdMobilenetv1Options({
                    minConfidence: 0.9 // Higher confidence requirement
                }))
                .withFaceLandmarks()
                .withFaceDescriptor();

                if (detections) {
                    const faceEncoding = {
                        encoding: Array.from(detections.descriptor),
                        angle: `capture_${faceEncodings.length + 1}`,
                        timestamp: new Date().toISOString()
                    };
                    setFaceEncodings(prev => [...prev, faceEncoding]);
                    setCaptureMessage(`Capture ${faceEncodings.length + 1} successful!`);
                    
                    // Show progress
                    if (faceEncodings.length + 1 >= 4) {
                        setCaptureMessage('Maximum captures reached. Face registration complete for high accuracy.');
                    }
                } else {
                    setCaptureMessage('No face detected. Ensure good lighting and try again.');
                }
            }
        }
        setLoading(false);
    };

    const removeFaceEncoding = (index) => {
        setFaceEncodings(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        // Enhanced validation for face encodings
        if (faceEncodings.length > 0 && faceEncodings.length < 3) {
            setMessage('For high accuracy, please capture at least 3 face photos or remove all to skip face registration.');
            setIsError(true);
            setLoading(false);
            return;
        }

        try {
            // Create payload
            const payload = {
                name: formData.name,
                email: formData.email,
                password: formData.password,
                rfid: formData.rfid,
                faceEncodings: JSON.stringify(faceEncodings),
                profilePhoto: profilePhoto // Send Base64 encoded image
            };

            await api.post('/fighters/register', payload);
            
            setMessage('Fighter added successfully with high accuracy face recognition!');
            setIsError(false);
            setFormData({ name: '', email: '', password: '', rfid: generateRfid() });
            setFaceEncodings([]);
            setProfilePhoto(null);
            
            if (onAddSuccess) onAddSuccess();
        } catch (err) {
            console.error('Registration error:', err.response?.data || err.message);
            setMessage(err.response?.data?.msg || 'Error adding fighter. Please try again.');
            setIsError(true);
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-8">
            {message && (
                <div className={`p-4 rounded-xl flex items-center ${isError ? 'bg-red-50 border border-red-200 text-red-800' : 'bg-green-50 border border-green-200 text-green-800'}`}>
                    {isError ? <FaExclamationTriangle className="mr-3 text-red-500" /> : <FaCheckCircle className="mr-3 text-green-500" />}
                    <span className="font-medium">{message}</span>
                </div>
            )}
            
            {/* Personal Information Section */}
            <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                <div className="flex items-center mb-6">
                    <div className="bg-red-100 p-2 rounded-lg mr-3">
                        <FaUser className="text-red-600" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-800">Personal Information</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="name">
                            Full Name <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <FaUser className="text-gray-400" />
                            </div>
                            <input 
                                type="text" 
                                id="name" 
                                name="name" 
                                value={formData.name} 
                                onChange={handleChange} 
                                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition" 
                                required 
                                placeholder="Enter full name"
                            />
                        </div>
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="email">
                            Email Address <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <FaEnvelope className="text-gray-400" />
                            </div>
                            <input 
                                type="email" 
                                id="email" 
                                name="email" 
                                value={formData.email} 
                                onChange={handleChange} 
                                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition" 
                                required 
                                placeholder="Enter email address"
                            />
                        </div>
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="password">
                            Password <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <FaLock className="text-gray-400" />
                            </div>
                            <input 
                                type="password" 
                                id="password" 
                                name="password" 
                                value={formData.password} 
                                onChange={handleChange} 
                                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition" 
                                required 
                                placeholder="Create a strong password"
                            />
                        </div>
                    </div>

                    {/* Profile Photo Upload */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="profilePhoto">
                            Profile Photo
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <FaUpload className="text-gray-400" />
                            </div>
                            <input 
                                type="file" 
                                id="profilePhoto"
                                name="profilePhoto" 
                                accept=".jpg,.jpeg,.png"
                                onChange={handleProfilePhotoChange}
                                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-red-50 file:text-red-700 hover:file:bg-red-100"
                            />
                        </div>
                        {profilePhoto && (
                            <div className="mt-2">
                                <img src={profilePhoto} alt="Profile Preview" className="w-16 h-16 rounded-full object-cover" />
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="rfid">
                            RFID <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <FaIdCard className="text-gray-400" />
                            </div>
                            <input 
                                type="text" 
                                id="rfid"
                                name="rfid" 
                                value={formData.rfid} 
                                readOnly 
                                className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
                                placeholder="RFID will be generated"
                            />
                            <button 
                                type="button" 
                                onClick={() => setFormData(prev => ({ ...prev, rfid: generateRfid() }))}
                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700"
                                title="Regenerate RFID"
                            >
                                <FaSyncAlt />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Face Recognition Section */}
            <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                <div className="flex items-center mb-6">
                    <div className="bg-blue-100 p-2 rounded-lg mr-3">
                        <FaUserCircle className="text-blue-600" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-800">Face Recognition Setup</h3>
                    <span className="ml-3 inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                        Optional
                    </span>
                </div>
                
                <p className="text-gray-600 mb-6">
                    Capture 5 clear images of the fighter's face from different angles for better attendance recognition. 
                    This will enable face recognition for attendance tracking.
                </p>
                
                <div className="flex flex-col lg:flex-row items-center gap-8 mb-6">
                    <div className="w-full lg:w-72">
                        <div className="rounded-xl overflow-hidden border-2 border-gray-300 shadow-md">
                            <Webcam
                                audio={false}
                                ref={webcamRef}
                                screenshotFormat="image/jpeg"
                                width={288}
                                height={216}
                                className="w-full"
                            />
                        </div>
                        <div className="mt-3 text-center">
                            <p className="text-sm text-gray-500">
                                Position face in the center of the frame
                            </p>
                        </div>
                    </div>
                    
                    <div className="flex-grow w-full">
                        <button
                            type="button"
                            onClick={captureFaceEncoding}
                            className="w-full flex items-center justify-center bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold py-3 px-4 rounded-lg hover:from-blue-600 hover:to-blue-700 transition duration-300 disabled:opacity-50 shadow-md"
                            disabled={loading || !modelsLoaded || faceEncodings.length >= 5}
                        >
                            <FaCamera className="mr-2" />
                            {loading ? 'Processing...' : `Capture Face (${faceEncodings.length}/5)`}
                        </button>
                        
                        <div className="mt-4">
                            <div className="w-full bg-gray-200 rounded-full h-2.5">
                                <div 
                                    className="bg-blue-600 h-2.5 rounded-full transition-all duration-300" 
                                    style={{ width: `${(faceEncodings.length / 5) * 100}%` }}
                                ></div>
                            </div>
                            <div className="flex justify-between text-sm text-gray-600 mt-1">
                                <span>Progress</span>
                                <span>{faceEncodings.length}/5 captures</span>
                            </div>
                        </div>
                        
                        <div className="mt-3 text-center">
                            <p className={`text-sm ${captureMessage.includes('successful') ? 'text-green-600' : captureMessage.includes('No face') ? 'text-red-600' : 'text-gray-600'}`}>
                                {captureMessage || "Position face in the center and capture."}
                            </p>
                            {faceEncodings.length === 0 && (
                                <p className="text-orange-600 mt-2 font-medium">
                                    Face recognition is recommended for attendance.
                                </p>
                            )}
                            {faceEncodings.length >= 5 && (
                                <p className="text-green-600 mt-2 font-medium">
                                    Maximum of 5 photos captured.
                                </p>
                            )}
                        </div>
                    </div>
                </div>
                
                {/* Display captured face encodings */}
                {faceEncodings.length > 0 && (
                    <div className="mt-6">
                        <h4 className="font-medium text-gray-700 mb-3">Captured Photos:</h4>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                            {faceEncodings.map((encoding, index) => (
                                <div key={index} className="relative group">
                                    <div className="bg-gradient-to-br from-blue-100 to-blue-200 border-2 border-dashed border-blue-300 rounded-xl w-16 h-16 flex items-center justify-center shadow-sm">
                                        <span className="text-lg font-bold text-blue-700">{index + 1}</span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => removeFaceEncoding(index)}
                                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-md hover:bg-red-600"
                                        title="Remove photo"
                                    >
                                        <FaTrash size={10} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row justify-end gap-4 pt-4">
                <button 
                    type="button" 
                    onClick={onCancel} 
                    className="w-full sm:w-auto bg-gray-200 text-gray-800 font-bold py-3 px-6 rounded-lg hover:bg-gray-300 transition duration-300"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    className="w-full sm:w-auto bg-gradient-to-r from-red-600 to-red-700 text-white font-bold py-3 px-6 rounded-lg hover:from-red-700 hover:to-red-800 transition duration-300 disabled:opacity-50 shadow-md"
                    disabled={loading}
                >
                    {loading ? (
                        <span className="flex items-center justify-center">
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Saving Fighter...
                        </span>
                    ) : 'Add Fighter'}
                </button>
            </div>
        </form>
    );
};

export default AddFighter;