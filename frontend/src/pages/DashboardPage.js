import React, { useState, useEffect } from 'react';
import api from '../api/api';

const DashboardPage = () => {
    const [dashboardStats, setDashboardStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDashboardStats = async () => {
            try {
                const statsRes = await api.get('/fighters/dashboard-stats');
                setDashboardStats(statsRes.data);
            } catch (err) {
                console.error('Error fetching dashboard stats:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchDashboardStats();
    }, []);

    if (loading) {
        return <div className="p-8 text-center text-gray-500">Loading dashboard...</div>;
    }

    const StatCard = ({ title, value, subtitle, icon, color = 'blue' }) => (
        <div className={`bg-white rounded-lg shadow-md p-6 border-l-4 border-${color}-500`}>
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-gray-600 text-sm font-medium">{title}</p>
                    <p className={`text-2xl font-bold text-${color}-600`}>{value}</p>
                    {subtitle && <p className="text-gray-500 text-xs mt-1">{subtitle}</p>}
                </div>
                <div className={`text-${color}-500 text-3xl`}>{icon}</div>
            </div>
        </div>
    );

    return (
        <div className="p-4 md:p-8">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-800 mb-2">Dashboard Overview</h1>
                <p className="text-gray-600">Complete analytics and insights for your gym</p>
            </div>

            {dashboardStats && (
                <div className="space-y-8">
                    {/* Quick Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <StatCard
                            title="Total Fighters"
                            value={dashboardStats.totalFighters}
                            icon="👥"
                            color="blue"
                        />
                        <StatCard
                            title="Profile Completed"
                            value={dashboardStats.profileCompleted}
                            subtitle={`${dashboardStats.profilePending} pending`}
                            icon="✅"
                            color="green"
                        />
                        <StatCard
                            title="Recent Joinings"
                            value={dashboardStats.recentJoinings}
                            subtitle="Last 30 days"
                            icon="📈"
                            color="purple"
                        />
                        <StatCard
                            title="Assessed Fighters"
                            value={dashboardStats.topFighters.length}
                            subtitle="With grade scores"
                            icon="🏆"
                            color="yellow"
                        />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Top Fighters */}
                        <div className="bg-white rounded-lg shadow-md p-6">
                            <h3 className="text-lg font-semibold text-gray-800 mb-4">🏆 Top Performing Fighters</h3>
                            {dashboardStats.topFighters.length > 0 ? (
                                <div className="space-y-3">
                                    {dashboardStats.topFighters.map((fighter, index) => (
                                        <div key={fighter._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                                            <div className="flex items-center space-x-3">
                                                <span className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                                                    index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-yellow-600' : 'bg-blue-500'
                                                }`}>
                                                    {index + 1}
                                                </span>
                                                <div>
                                                    <p className="font-medium text-gray-800">{fighter.name}</p>
                                                    <p className="text-sm text-gray-500">Batch: {fighter.fighterBatchNo}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-bold text-lg text-green-600">{fighter.assessment?.specialGradeScore}</p>
                                                <p className="text-xs text-gray-500">Grade Score</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-gray-500 text-center py-4">No fighters assessed yet</p>
                            )}
                        </div>

                        {/* Demographics */}
                        <div className="bg-white rounded-lg shadow-md p-6">
                            <h3 className="text-lg font-semibold text-gray-800 mb-4">📊 Demographics</h3>
                            
                            {/* Gender Distribution */}
                            <div className="mb-6">
                                <h4 className="font-medium text-gray-700 mb-2">Gender Distribution</h4>
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-gray-600">Male</span>
                                        <div className="flex items-center space-x-2">
                                            <div className="w-24 bg-gray-200 rounded-full h-2">
                                                <div 
                                                    className="bg-blue-500 h-2 rounded-full" 
                                                    style={{ width: `${dashboardStats.totalFighters > 0 ? (dashboardStats.genderDistribution.male / dashboardStats.totalFighters) * 100 : 0}%` }}
                                                ></div>
                                            </div>
                                            <span className="text-sm font-medium">{dashboardStats.genderDistribution.male}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-gray-600">Female</span>
                                        <div className="flex items-center space-x-2">
                                            <div className="w-24 bg-gray-200 rounded-full h-2">
                                                <div 
                                                    className="bg-pink-500 h-2 rounded-full" 
                                                    style={{ width: `${dashboardStats.totalFighters > 0 ? (dashboardStats.genderDistribution.female / dashboardStats.totalFighters) * 100 : 0}%` }}
                                                ></div>
                                            </div>
                                            <span className="text-sm font-medium">{dashboardStats.genderDistribution.female}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Age Groups */}
                            <div>
                                <h4 className="font-medium text-gray-700 mb-2">Age Groups</h4>
                                <div className="space-y-2">
                                    {dashboardStats.ageGroups.map((group) => (
                                        <div key={group._id} className="flex items-center justify-between">
                                            <span className="text-sm text-gray-600">{group._id}</span>
                                            <span className="text-sm font-medium bg-gray-100 px-2 py-1 rounded">{group.count}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Performance Insights */}
                    <div className="bg-white rounded-lg shadow-md p-6">
                        <h3 className="text-lg font-semibold text-gray-800 mb-4">💡 Key Insights</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-blue-50 p-4 rounded-lg">
                                <h4 className="font-medium text-blue-800 mb-2">Growth Rate</h4>
                                <p className="text-sm text-blue-600">
                                    {dashboardStats.recentJoinings} new fighters joined in the last 30 days
                                </p>
                            </div>
                            <div className="bg-green-50 p-4 rounded-lg">
                                <h4 className="font-medium text-green-800 mb-2">Completion Rate</h4>
                                <p className="text-sm text-green-600">
                                    {dashboardStats.totalFighters > 0 ? 
                                        `${Math.round((dashboardStats.profileCompleted / dashboardStats.totalFighters) * 100)}%` : '0%'
                                    } of fighters have completed profiles
                                </p>
                            </div>
                            <div className="bg-purple-50 p-4 rounded-lg">
                                <h4 className="font-medium text-purple-800 mb-2">Assessment Rate</h4>
                                <p className="text-sm text-purple-600">
                                    {dashboardStats.totalFighters > 0 ? 
                                        `${Math.round((dashboardStats.topFighters.length / dashboardStats.totalFighters) * 100)}%` : '0%'
                                    } of fighters have been assessed
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DashboardPage;