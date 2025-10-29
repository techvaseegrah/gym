import React from 'react';

const AttendanceList = ({ records }) => {
    return (
        <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-bold text-gray-800 mb-4">My Attendance Records</h3>
            {records.length > 0 ? (
                <div className="overflow-x-auto">
                    <table className="min-w-full bg-white border border-gray-300">
                        <thead>
                            <tr className="bg-gray-200 text-gray-600 uppercase text-sm leading-normal">
                                <th className="py-3 px-6 text-left">Date</th>
                                <th className="py-3 px-6 text-left">Time</th>
                                <th className="py-3 px-6 text-left">Method</th>
                            </tr>
                        </thead>
                        <tbody className="text-gray-700 text-sm font-light">
                            {records.map(record => (
                                <tr key={record._id} className="border-b border-gray-200 hover:bg-gray-100">
                                    <td className="py-3 px-6 whitespace-nowrap">
                                        {new Date(record.date).toLocaleDateString()}
                                    </td>
                                    <td className="py-3 px-6 whitespace-nowrap">
                                        {new Date(record.date).toLocaleTimeString()}
                                    </td>
                                    <td className="py-3 px-6">{record.method}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <p className="text-gray-600">No attendance records found.</p>
            )}
        </div>
    );
};

export default AttendanceList;