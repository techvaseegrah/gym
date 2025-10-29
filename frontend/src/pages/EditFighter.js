import React, { useState, useEffect, useRef } from 'react';
import api from '../api/api';
import { useParams, useNavigate } from 'react-router-dom';
import { FaUpload, FaUser, FaCamera, FaTrash, FaUserCircle } from 'react-icons/fa';
import Webcam from 'react-webcam';
import * as faceapi from 'face-api.js';

const EditFighter = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        name: '',
        fighterBatchNo: '',
        email: '',
    });
    const [profilePhoto, setProfilePhoto] = useState(null);
    const [existingProfilePhoto, setExistingProfilePhoto] = useState(null);
    const [message, setMessage] = useState('');
    const [isError, setIsError] = useState(false);
    const [loading, setLoading] = useState(true);
    // Face enrollment state
    const [faceEncodings, setFaceEncodings] = useState([]);
    const [existingFaceEncodings, setExistingFaceEncodings] = useState([]);
    const webcamRef = useRef(null);
    const [modelsLoaded, setModelsLoaded] = useState(false);
    const [captureMessage, setCaptureMessage] = useState('');

    useEffect(() => {
        const fetchFighter = async () => {
            try {
                const res = await api.get(`/fighters/${id}`);
                setFormData({
                    name: res.data.name,
                    fighterBatchNo: res.data.fighterBatchNo,
                    email: res.data.email,
                });
                setExistingProfilePhoto(res.data.profilePhoto);
                // Set existing face encodings if they exist
                if (res.data.faceEncodings && Array.isArray(res.data.faceEncodings)) {
                    setExistingFaceEncodings(res.data.faceEncodings);
                    setFaceEncodings(res.data.faceEncodings);
                }
            } catch (err) {
                setMessage('Error fetching fighter data.');
                setIsError(true);
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchFighter();
    }, [id]);

    // Load face recognition models
    useEffect(() => {
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
        loadModels();
    }, []);

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

    // Capture face encoding for enrollment
    const captureFaceEncoding = async () => {
        if (faceEncodings.length >= 5) {
            setCaptureMessage('Maximum of 5 photos reached for high accuracy.');
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
                    if (faceEncodings.length + 1 >= 5) {
                        setCaptureMessage('Maximum captures reached. Face registration complete for high accuracy.');
                    }
                } else {
                    setCaptureMessage('No face detected. Ensure good lighting and try again.');
                }
            }
        }
        setLoading(false);
    };

    // Remove a face encoding
    const removeFaceEncoding = (index) => {
        setFaceEncodings(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        try {
            // Prepare payload
            const payload = { ...formData };
            
            // Only include profilePhoto in payload if a new photo was uploaded
            if (profilePhoto !== null) {
                payload.profilePhoto = profilePhoto;
            }
            
            // Include face encodings if any were captured
            if (faceEncodings.length > 0) {
                payload.faceEncodings = JSON.stringify(faceEncodings);
            }
            
            await api.put(`/fighters/${id}`, payload);
            
            setMessage('Fighter updated successfully!');
            setIsError(false);
            setTimeout(() => navigate('/admin'), 2000);
        } catch (err) {
            setMessage('Error updating fighter. Please try again.');
            setIsError(true);
            console.error(err);
        }
    };

    if (loading) {
        return <div className="p-8 text-center text-gray-500">Loading fighter data for editing...</div>;
    }

    return (
        <div className="p-4 md:p-8 max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold mb-6 text-center text-red-600">Edit Fighter</h2>
            <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md space-y-6">
                {message && (
                    <div className={`p-3 rounded-md text-sm ${isError ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                        {message}
                    </div>
                )}
                <div>
                    <label className="block text-gray-700">Fighter Name</label>
                    <input type="text" name="name" value={formData.name} onChange={handleChange} className="w-full px-3 py-2 border rounded-md" required />
                </div>
                <div>
                    <label className="block text-gray-700">Batch Number</label>
                    <input type="text" name="fighterBatchNo" value={formData.fighterBatchNo} onChange={handleChange} className="w-full px-3 py-2 border rounded-md" required />
                </div>
                <div>
                    <label className="block text-gray-700">Email (for login)</label>
                    <input type="email" name="email" value={formData.email} onChange={handleChange} className="w-full px-3 py-2 border rounded-md" required />
                </div>
                
                {/* Profile Photo Upload */}
                <div>
                    <label className="block text-gray-700 mb-2">Profile Photo</label>
                    {(existingProfilePhoto || profilePhoto) && (
                        <div className="mb-2">
                            <img 
                                src={profilePhoto || existingProfilePhoto} 
                                alt="Profile Preview" 
                                className="w-16 h-16 rounded-full object-cover"
                            />
                        </div>
                    )}
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
                            className="w-full pl-10 pr-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-red-50 file:text-red-700 hover:file:bg-red-100"
                        />
                    </div>
                    <p className="text-sm text-gray-500 mt-1">JPG, JPEG, or PNG format</p>
                </div>
                
                {/* Face Recognition Section */}
                <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                    <div className="flex items-center mb-4">
                        <div className="bg-blue-100 p-2 rounded-lg mr-3">
                            <FaUserCircle className="text-blue-600" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-800">Face Recognition Setup</h3>
                        <span className="ml-3 inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                            {existingFaceEncodings.length > 0 ? 'Enrolled' : 'Optional'}
                        </span>
                    </div>
                    
                    <p className="text-gray-600 mb-4">
                        {existingFaceEncodings.length > 0 
                            ? `This fighter currently has ${existingFaceEncodings.length} face photos enrolled. You can update these by capturing new photos below.`
                            : "Capture clear images of the fighter's face for attendance recognition. This will enable face recognition for attendance tracking."}
                    </p>
                    
                    <div className="flex flex-col lg:flex-row items-center gap-6 mb-4">
                        <div className="w-full lg:w-64">
                            <div className="rounded-xl overflow-hidden border-2 border-gray-300 shadow-md">
                                <Webcam
                                    audio={false}
                                    ref={webcamRef}
                                    screenshotFormat="image/jpeg"
                                    width={256}
                                    height={192}
                                    className="w-full"
                                />
                            </div>
                            <div className="mt-2 text-center">
                                <p className="text-sm text-gray-500">
                                    Position face in the center of the frame
                                </p>
                            </div>
                        </div>
                        
                        <div className="flex-grow w-full">
                            <button
                                type="button"
                                onClick={captureFaceEncoding}
                                className="w-full flex items-center justify-center bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:from-blue-600 hover:to-blue-700 transition duration-300 disabled:opacity-50 shadow-md"
                                disabled={loading || !modelsLoaded || faceEncodings.length >= 5}
                            >
                                <FaCamera className="mr-2" />
                                {loading ? 'Processing...' : `Capture Face (${faceEncodings.length}/5)`}
                            </button>
                            
                            <div className="mt-3">
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div 
                                        className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                                        style={{ width: `${(faceEncodings.length / 5) * 100}%` }}
                                    ></div>
                                </div>
                                <div className="flex justify-between text-sm text-gray-600 mt-1">
                                    <span>Progress</span>
                                    <span>{faceEncodings.length}/5 captures</span>
                                </div>
                            </div>
                            
                            <div className="mt-2 text-center">
                                <p className={`text-sm ${captureMessage.includes('successful') ? 'text-green-600' : captureMessage.includes('No face') ? 'text-red-600' : 'text-gray-600'}`}>
                                    {captureMessage || "Position face in the center and capture."}
                                </p>
                            </div>
                        </div>
                    </div>
                    
                    {/* Display captured face encodings */}
                    {faceEncodings.length > 0 && (
                        <div className="mt-4">
                            <h4 className="font-medium text-gray-700 mb-2">Captured Photos:</h4>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                                {faceEncodings.map((encoding, index) => (
                                    <div key={index} className="relative group">
                                        <div className="bg-gradient-to-br from-blue-100 to-blue-200 border-2 border-dashed border-blue-300 rounded-lg w-14 h-14 flex items-center justify-center shadow-sm">
                                            <span className="text-md font-bold text-blue-700">{index + 1}</span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => removeFaceEncoding(index)}
                                            className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-md hover:bg-red-600"
                                            title="Remove photo"
                                        >
                                            <FaTrash size={8} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
                
                <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition duration-300">Save Changes</button>
            </form>
        </div>
    );
};

export default EditFighter;