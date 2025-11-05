import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaEye, FaEyeSlash } from 'react-icons/fa'; // Added eye icons for password toggle
import api from '../api/api';
import LoginForm from '../components/LoginForm';

const LoginPage = ({ setUser }) => {
    const [loginType, setLoginType] = useState(null); // <-- State to control which view is shown: null, 'admin', or 'fighter'
    const [adminCredentials, setAdminCredentials] = useState({ email: '', password: '' }); //
    const [fighterCredentials, setFighterCredentials] = useState({ password: '' }); //
    const [fighters, setFighters] = useState([]); //
    const [selectedFighter, setSelectedFighter] = useState(null); //
    const [error, setError] = useState(null); //
    const [loading, setLoading] = useState(false); //
    const [searchTerm, setSearchTerm] = useState(''); // Add search term state
    const [showAdminPassword, setShowAdminPassword] = useState(false); // State for toggling admin password visibility
    const navigate = useNavigate(); //
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

    useEffect(() => {
        if (loginType === 'fighter') {
            const fetchFighters = async () => {
                setLoading(true); //
                try {
                    const res = await api.get('/fighters/list'); //
                    setFighters(res.data); //
                } catch (err) {
                    setError('Failed to fetch fighter list.'); //
                } finally {
                    setLoading(false); //
                }
            };
            fetchFighters(); //
        }
    }, [loginType]); //

    const handleAdminLogin = async (e) => {
        e.preventDefault(); //
        setError(null); //
        setLoading(true); //
        try {
            const res = await api.post('/auth/login', { ...adminCredentials, role: 'admin' }); //
            localStorage.setItem('token', res.data.token); //
            setUser(res.data.user); //
            navigate('/admin/dashboard'); //
        } catch (err) {
            setError('Invalid admin credentials.'); //
        } finally {
            setLoading(false); //
        }
    };

    const handleFighterLogin = async (password) => {
        if (!selectedFighter) return;
        setError(null);
        setLoading(true);
        try {
            const { data } = await api.post('/auth/login', {
                email: selectedFighter.email,
                password: password,
            });
            localStorage.setItem('token', data.token);
            setUser(data.user);
            setIsPasswordModalOpen(false); // Close modal on success
            navigate(data.user.profile_completed ? '/fighter' : '/fighter/complete-profile');
        } catch (err) {
            setError(err.response?.data?.msg || 'Invalid password.');
        } finally {
            setLoading(false);
        }
    };

    const handleFighterSelect = (fighter) => {
        setSelectedFighter(fighter);
        setFighterCredentials({ password: '' });
        setError(null);
        setIsPasswordModalOpen(true);
    };

    // This resets the view to the button selection
    const resetLoginType = () => {
        setLoginType(null);
        setError(null);
        setSelectedFighter(null);
    }

    // Filter fighters based on search term
    const filteredFighters = fighters.filter(fighter =>
        fighter.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        fighter.rfid.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="min-h-screen w-full flex flex-col items-center justify-center bg-white text-gray-900 p-4">
            <div className="w-full max-w-sm md:max-w-2xl lg:max-w-4xl">
                <div className="flex flex-col items-center text-center mb-6">
                    <img
                        src="/logo.png"
                        alt="Logo"
                        className="w-24 h-24 mb-4 rounded-full object-cover border-2 border-gray-700"
                    />
                    <h1 className="text-2xl font-bold tracking-wider">Welcome to Ashura's Tribe</h1>
                    <p className="text-gray-400 mt-2">Please select your role to sign in</p>
                    
                    {/* Search bar for fighters - only shown when fighter login is selected */}
                    {loginType === 'fighter' && !loading && (
                        <input
                            type="text"
                            placeholder="Search by name or RFID..."
                            className="mt-4 w-full max-w-md p-2 border border-gray-300 rounded-lg text-gray-900"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    )}
                </div>

                {error && (
                    <div className="bg-red-500/20 border border-red-500/30 text-red-300 p-3 mb-4 rounded-lg text-center text-sm" role="alert">
                        <p>{error}</p>
                    </div>
                )}

                {/* --- Start of New Conditional Rendering Logic --- */}

                {!loginType && (
                <div className="space-y-4 flex flex-col items-center">
                    <button 
                        onClick={() => setLoginType('admin')} 
                        className="w-64 bg-red-600 text-white font-bold py-3 px-8 rounded-lg hover:bg-red-700 transition duration-300"
                    >
                        Admin Login
                    </button>
                    <button 
                        onClick={() => setLoginType('fighter')} 
                        className="w-64 bg-gray-900 text-white font-bold py-3 px-8 rounded-lg hover:bg-gray-300 transition duration-300"
                    >
                        Fighter Login
                    </button>
                </div>
              )}

                {loginType === 'admin' && (
                    <div className="flex justify-center">
                        <form onSubmit={handleAdminLogin} className="space-y-4 w-80">
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2" htmlFor="admin-email">Email</label>
                                <input id="admin-email" type="email" value={adminCredentials.email} onChange={(e) => setAdminCredentials({ ...adminCredentials, email: e.target.value })} placeholder="email@example.com" className="w-full bg-gray-800 text-white px-4 py-3 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500" required />
                            </div>
                            <div className="relative">
                                <label className="block text-sm font-medium text-gray-400 mb-2" htmlFor="admin-password">Password</label>
                                <input 
                                    id="admin-password" 
                                    type={showAdminPassword ? "text" : "password"} 
                                    value={adminCredentials.password} 
                                    onChange={(e) => setAdminCredentials({ ...adminCredentials, password: e.target.value })} 
                                    placeholder="••••••••" 
                                    className="w-full bg-gray-800 text-white px-4 py-3 pr-12 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500" 
                                    required 
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowAdminPassword(!showAdminPassword)}
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center top-6"
                                >
                                    {showAdminPassword ? (
                                        <FaEyeSlash className="text-gray-400 hover:text-white" size={20} />
                                    ) : (
                                        <FaEye className="text-gray-400 hover:text-white" size={20} />
                                    )}
                                </button>
                            </div>
                            <button type="submit" className="w-full bg-red-600 font-semibold py-3 rounded-lg hover:bg-red-700 transition duration-300 disabled:bg-gray-600 text-white" disabled={loading}>
                                {loading ? 'Signing in...' : 'Sign in as Admin'}
                            </button>
                        </form>
                    </div>
                )}
                
                {loginType === 'fighter' && (
                    <div className="w-full">
                       
                        {loading ? (
                            <p className="text-center text-gray-400">Loading fighters...</p>
                        ) : (
                         <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {filteredFighters.map(fighter => (
                            <div 
                                key={fighter._id} 
                                onClick={() => handleFighterSelect(fighter)} 
                                className="bg-gray-800 rounded-lg p-3 text-center cursor-pointer border-2 border-transparent hover:border-blue-500 hover:bg-gray-700 transition-all duration-200 transform hover:scale-105"
                            >
                                <img
                                    src="/logo.png" // Using the logo as a placeholder profile image
                                    alt={fighter.name}
                                    className="w-16 h-16 mx-auto mb-2 rounded-full object-cover border-2 border-gray-600"
                                />
                                <h4 className="font-semibold text-white truncate">{fighter.name}</h4>
                                <p className="text-xs text-gray-400">{fighter.rfid}</p>
                            </div>
                        ))}
                    </div>
                        )}
                    </div>
                )}

                {/* This button will only show when a login form is active */}
                {loginType && (
                    <div className="text-center mt-6">
                        <button onClick={resetLoginType} className="text-gray-400 hover:text-white text-sm hover:underline">
                            Back to role selection
                        </button>
                    </div>
                )}
                {/* --- End of New Conditional Rendering Logic --- */}

            </div>
            {/* --- ADD THIS AT THE END OF THE MAIN DIV --- */}
            {isPasswordModalOpen && selectedFighter && (
                <LoginForm
                    fighter={selectedFighter}
                    onLogin={handleFighterLogin}
                    onClose={() => setIsPasswordModalOpen(false)}
                    loading={loading}
                    error={error}
                    setError={setError} // Pass setError to allow the modal to clear errors
                />
            )}
        </div>
    );
};

export default LoginPage;