import React, { useState, useEffect } from 'react';
import api from '../api/api';

const AdminSettingsPage = () => {
    const [location, setLocation] = useState({ 
        latitude: '', 
        longitude: '', 
        radius: 100, 
        enabled: true 
    });
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const res = await api.get('/settings');
                setLocation({
                    latitude: res.data.location?.latitude !== undefined ? res.data.location.latitude : '',
                    longitude: res.data.location?.longitude !== undefined ? res.data.location.longitude : '',
                    radius: res.data.location?.radius || 100,
                    enabled: res.data.location?.enabled !== undefined ? res.data.location.enabled : true
                });
            } catch (err) {
                console.error('Error fetching settings:', err);
                // Initialize with default values if fetch fails
                setLocation({ 
                    latitude: '', 
                    longitude: '', 
                    radius: 100, 
                    enabled: true 
                });
            } finally {
                setLoading(false);
            }
        };
        fetchSettings();
    }, []);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        
        // Special handling for numeric inputs to prevent invalid values
        if (type === 'number') {
            // For latitude and longitude, we want to allow negative numbers and decimals
            if (name === 'latitude' || name === 'longitude') {
                // Allow empty string, negative sign, decimal point, and numbers
                if (value === '' || /^-?\d*\.?\d*$/.test(value)) {
                    setLocation({ 
                        ...location, 
                        [name]: value 
                    });
                }
                // Otherwise, don't update the state (prevents invalid characters)
            } else if (name === 'radius') {
                // For radius, only allow positive integers
                if (value === '' || /^\d*$/.test(value)) {
                    setLocation({ 
                        ...location, 
                        [name]: value 
                    });
                }
                // Otherwise, don't update the state
            } else {
                // For other number inputs, allow only digits
                if (value === '' || /^\d*$/.test(value)) {
                    setLocation({ 
                        ...location, 
                        [name]: value 
                    });
                }
            }
        } else if (type === 'checkbox') {
            setLocation({ 
                ...location, 
                [name]: checked 
            });
        } else {
            setLocation({ 
                ...location, 
                [name]: value 
            });
        }
    };

    const handleUseCurrentLocation = async () => {
        setMessage('');
        if (!navigator.geolocation) {
            setMessage('Geolocation is not supported by your browser.');
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                setLocation({
                    ...location,
                    latitude: parseFloat(position.coords.latitude.toFixed(6)),
                    longitude: parseFloat(position.coords.longitude.toFixed(6))
                });
                setMessage('Location updated successfully!');
            },
            (error) => {
                console.error('Error getting location:', error);
                setMessage('Unable to retrieve your location. Please try again.');
            }
        );
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('');
        setIsSaving(true);
        try {
            // Validate required fields when enabled
            if (location.enabled) {
                if (!location.latitude && location.latitude !== 0 || !location.longitude && location.longitude !== 0) {
                    setMessage('Error: Latitude and longitude are required when location verification is enabled');
                    setIsSaving(false);
                    return;
                }
                
                // Convert to numbers for validation
                const lat = parseFloat(location.latitude);
                const lng = parseFloat(location.longitude);
                
                if (isNaN(lat) || isNaN(lng)) {
                    setMessage('Error: Latitude and longitude must be valid numbers');
                    setIsSaving(false);
                    return;
                }
                
                // Validate coordinate ranges
                if (lat < -90 || lat > 90) {
                    setMessage('Error: Latitude must be between -90 and 90 degrees');
                    setIsSaving(false);
                    return;
                }
                
                if (lng < -180 || lng > 180) {
                    setMessage('Error: Longitude must be between -180 and 180 degrees');
                    setIsSaving(false);
                    return;
                }
            }
            
            // Convert radius to integer
            const radius = parseInt(location.radius);
            if (isNaN(radius) || radius < 50 || radius > 500) {
                setMessage('Error: Radius must be a number between 50 and 500 meters');
                setIsSaving(false);
                return;
            }
            
            // Prepare data for sending
            let dataToSend;
            if (location.enabled) {
                dataToSend = {
                    latitude: parseFloat(location.latitude),
                    longitude: parseFloat(location.longitude),
                    radius: radius,
                    enabled: location.enabled
                };
            } else {
                // When location verification is disabled, send default values
                dataToSend = {
                    latitude: 0,
                    longitude: 0,
                    radius: radius,
                    enabled: location.enabled
                };
            }
            
            console.log('Sending location data:', { location: dataToSend });
            const response = await api.post('/settings', { location: dataToSend });
            setMessage(response.data.msg);
        } catch (err) {
            console.error('Error updating settings:', err);
            const errorMsg = err.response?.data?.msg || err.message || 'Error updating location. Please try again.';
            setMessage(`Error: ${errorMsg}`);
        } finally {
            setIsSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-full">
                <div className="text-center text-gray-500">
                    <div className="loader ease-linear rounded-full border-8 border-t-8 border-gray-200 h-32 w-32 mb-4"></div>
                    <h2 className="text-xl font-semibold">Loading Settings...</h2>
                    <p>Please wait a moment.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto p-4 md:p-6">
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                <div className="bg-red-600 py-4 px-6">
                    <h2 className="text-2xl font-bold text-white text-center">Gym Settings</h2>
                </div>
                
                <div className="p-6">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {message && (
                            <div className={`p-3 rounded-md text-sm ${message.includes('Error') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                {message}
                            </div>
                        )}
                        
                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                            <div>
                                <h3 className="font-semibold text-gray-800">Location Verification</h3>
                                <p className="text-sm text-gray-600">Enable or disable location verification for attendance</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    name="enabled"
                                    checked={location.enabled}
                                    onChange={handleChange}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                            </label>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-gray-700 font-medium mb-2">Gym Latitude</label>
                                <input 
                                    type="number" 
                                    name="latitude" 
                                    value={location.latitude} 
                                    onChange={handleChange} 
                                    step="any"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500" 
                                    required={location.enabled}
                                    disabled={!location.enabled}
                                />
                            </div>
                            <div>
                                <label className="block text-gray-700 font-medium mb-2">Gym Longitude</label>
                                <input 
                                    type="number" 
                                    name="longitude" 
                                    value={location.longitude} 
                                    onChange={handleChange} 
                                    step="any"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500" 
                                    required={location.enabled}
                                    disabled={!location.enabled}
                                />
                            </div>
                        </div>
                        
                        <div>
                            <label className="block text-gray-700 font-medium mb-2">Allowed Radius (meters)</label>
                            <input 
                                type="number" 
                                name="radius" 
                                value={location.radius} 
                                onChange={handleChange} 
                                min="50"
                                max="500"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500" 
                                required 
                                disabled={!location.enabled}
                            />
                            <p className="text-sm text-gray-500 mt-1">Maximum distance fighters can be from the gym to mark attendance</p>
                        </div>
                        
                        <div className="flex flex-col sm:flex-row gap-3 pt-2">
                            <button 
                                type="button" 
                                onClick={handleUseCurrentLocation}
                                className="flex-1 bg-gray-800 text-white font-medium py-2.5 px-4 rounded-lg hover:bg-gray-700 transition duration-300 disabled:bg-gray-400"
                                disabled={!location.enabled || isSaving}
                            >
                                Use Current Location
                            </button>
                            <button 
                                type="submit" 
                                className="flex-1 bg-red-600 text-white font-bold py-2.5 px-4 rounded-lg hover:bg-red-700 transition duration-300 disabled:bg-gray-400"
                                disabled={isSaving}
                            >
                                {isSaving ? 'Saving...' : 'Save Settings'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default AdminSettingsPage;