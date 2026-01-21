import React, { useState } from 'react';
import { FaCamera, FaTimes, FaSpinner, FaPencilAlt } from 'react-icons/fa';
import api from '../api/api';

const ProfilePictureUpload = ({ user, onUpdateSuccess, className = "" }) => {
    const [isUploading, setIsUploading] = useState(false);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [selectedFile, setSelectedFile] = useState(null);
    const [error, setError] = useState('');
    const [showModal, setShowModal] = useState(false);

    // Handle file selection
    const handleFileSelect = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            setError('Please select an image file (JPEG, PNG, GIF, etc.)');
            return;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            setError('Image size should be less than 5MB');
            return;
        }

        setSelectedFile(file);
        setError('');

        // Create preview
        const reader = new FileReader();
        reader.onload = (e) => {
            setPreviewUrl(e.target.result);
        };
        reader.readAsDataURL(file);
    };

    // Handle drag and drop
    const handleDrop = (event) => {
        event.preventDefault();
        const file = event.dataTransfer.files[0];
        if (file) {
            document.getElementById('fileInput').files = event.dataTransfer.files;
            handleFileSelect({ target: { files: [file] } });
        }
    };

    const handleDragOver = (event) => {
        event.preventDefault();
    };

    // Upload the profile picture
    const handleUpload = async () => {
        if (!selectedFile) return;

        setIsUploading(true);
        setError('');

        try {
            // Convert image to base64
            const reader = new FileReader();
            reader.onload = async (e) => {
                const base64Image = e.target.result;

                try {
                    const response = await api.put('/fighters/me/profile-photo', {
                        profilePhoto: base64Image
                    });

                    if (response.data.fighter) {
                        onUpdateSuccess(response.data.fighter);
                        setShowModal(false);
                        setSelectedFile(null);
                        setPreviewUrl(null);
                    } else {
                        setError('Unexpected response from server');
                    }
                } catch (err) {
                    setError(err.response?.data?.msg || err.message || 'Failed to upload profile picture');
                    console.error('Upload profile picture error:', err);
                } finally {
                    setIsUploading(false);
                }
            };
            reader.readAsDataURL(selectedFile);
        } catch (err) {
            setError('Failed to process image');
            setIsUploading(false);
        }
    };

    // Remove profile picture
    const handleRemove = async () => {
        if (window.confirm('Are you sure you want to remove your profile picture?')) {
            try {
                const response = await api.put('/fighters/me/profile-photo', {
                    profilePhoto: null
                });
                
                if (response.data.fighter) {
                    onUpdateSuccess(response.data.fighter);
                    setShowModal(false);
                    setSelectedFile(null);
                    setPreviewUrl(null);
                }
            } catch (err) {
                setError(err.response?.data?.msg || 'Failed to remove profile picture');
                console.error('Remove profile picture error:', err);
            }
        }
    };

    return (
        <>
            {/* Profile Picture Display */}
            <div className={`${className} relative inline-block`}>
                <div 
                    className="relative cursor-pointer group transition-transform hover:scale-105"
                    onClick={() => setShowModal(true)}
                    title="Click to edit profile picture"
                >
                    {user?.profilePhoto ? (
                        <img 
                            src={user.profilePhoto} 
                            alt="Profile" 
                            className="w-full h-full rounded-full object-cover border-2 border-white shadow-md group-hover:opacity-75 transition-opacity"
                        />
                    ) : (
                        <div className="w-full h-full rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center border-2 border-white shadow-md group-hover:opacity-90 transition-opacity">
                            <span className="text-white text-2xl font-bold">
                                {user?.name?.charAt(0)?.toUpperCase() || 'F'}
                            </span>
                        </div>
                    )}
                    
                    {/* Overlay with edit pencil icon */}
                    <div className="absolute inset-0 rounded-full bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <FaPencilAlt className="text-white text-xl" title="Click to edit profile picture" />
                    </div>
                </div>
                
                {/* Remove button (only show if there's a profile picture) */}
                {user?.profilePhoto && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            handleRemove();
                        }}
                        className="absolute -bottom-1 -right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors shadow-md border-2 border-white"
                        title="Remove profile picture"
                    >
                        <FaTimes size={12} />
                    </button>
                )}
            </div>

            {/* Upload Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-4">
                                <div>
                                    <h3 className="text-xl font-bold text-gray-800">Update Profile Picture</h3>
                                    <p className="text-sm text-gray-600 mt-1">Click on your current profile picture to edit or upload a new one</p>
                                </div>
                                <button 
                                    onClick={() => {
                                        setShowModal(false);
                                        setSelectedFile(null);
                                        setPreviewUrl(null);
                                        setError('');
                                    }}
                                    className="text-gray-500 hover:text-gray-700"
                                >
                                    <FaTimes size={20} />
                                </button>
                            </div>

                            {error && (
                                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                                    {error}
                                </div>
                            )}

                            {/* Preview Area */}
                            {previewUrl ? (
                                <div className="mb-4 text-center">
                                    <img 
                                        src={previewUrl} 
                                        alt="Preview" 
                                        className="w-32 h-32 rounded-full mx-auto object-cover border-4 border-blue-200"
                                    />
                                    <p className="mt-2 text-sm text-gray-600">Preview</p>
                                </div>
                            ) : (
                                <div 
                                    className="border-2 border-dashed border-blue-400 rounded-lg p-8 text-center mb-4 cursor-pointer hover:border-blue-600 transition-colors bg-blue-50"
                                    onDrop={handleDrop}
                                    onDragOver={handleDragOver}
                                    onClick={() => document.getElementById('fileInput').click()}
                                >
                                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center mx-auto mb-3 relative">
                                        <span className="text-white text-lg font-bold">
                                            {user?.name?.charAt(0)?.toUpperCase() || 'F'}
                                        </span>
                                        <div className="absolute -top-1 -right-1 bg-blue-500 rounded-full p-1" title="Edit profile picture">
                                            <FaPencilAlt className="text-white text-xs" />
                                        </div>
                                    </div>
                                    <p className="text-gray-600 mb-1">Drag & drop your image here</p>
                                    <p className="text-gray-400 text-sm">or click to browse</p>
                                    <p className="text-gray-400 text-xs mt-2">Max file size: 5MB</p>
                                </div>
                            )}

                            {/* Hidden file input */}
                            <input
                                id="fileInput"
                                type="file"
                                accept="image/*"
                                onChange={handleFileSelect}
                                className="hidden"
                            />

                            {/* Action Buttons */}
                            <div className="flex space-x-3">
                                {previewUrl ? (
                                    <>
                                        <button
                                            onClick={handleUpload}
                                            disabled={isUploading}
                                            className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                                        >
                                            {isUploading ? (
                                                <>
                                                    <FaSpinner className="animate-spin mr-2" />
                                                    Uploading...
                                                </>
                                            ) : (
                                                'Upload Picture'
                                            )}
                                        </button>
                                        <button
                                            onClick={() => {
                                                setSelectedFile(null);
                                                setPreviewUrl(null);
                                            }}
                                            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                                        >
                                            Change Image
                                        </button>
                                    </>
                                ) : (
                                    <button
                                        onClick={() => document.getElementById('fileInput').click()}
                                        className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700"
                                    >
                                        Select Image
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default ProfilePictureUpload;