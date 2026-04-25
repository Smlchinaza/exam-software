import React, { useState, useEffect } from 'react';

const SchoolMetricsSimple = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setTimeout(() => {
      setLoading(false);
    }, 1000);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">School Metrics & Analytics</h2>
          <p className="text-gray-600 mt-1">
            Comprehensive overview of all schools and their performance
          </p>
        </div>
        <button className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
          Export CSV
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Schools</p>
              <p className="text-2xl font-bold text-gray-900">0</p>
              <p className="text-xs text-gray-500">0 active</p>
            </div>
            <div className="h-8 w-8 bg-blue-500 rounded"></div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Users</p>
              <p className="text-2xl font-bold text-gray-900">0</p>
              <p className="text-xs text-gray-500">0 active</p>
            </div>
            <div className="h-8 w-8 bg-green-500 rounded"></div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Verified Schools</p>
              <p className="text-2xl font-bold text-green-600">0</p>
              <p className="text-xs text-gray-500">Quality approved</p>
            </div>
            <div className="h-8 w-8 bg-green-500 rounded"></div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pending Requests</p>
              <p className="text-2xl font-bold text-orange-600">0</p>
              <p className="text-xs text-gray-500">Awaiting review</p>
            </div>
            <div className="h-8 w-8 bg-orange-500 rounded"></div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-8 text-center">
        <div className="text-gray-400 mb-4">
          <svg className="h-16 w-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No schools found</h3>
        <p className="text-gray-600">
          No schools have been registered yet
        </p>
      </div>
    </div>
  );
};

export default SchoolMetricsSimple;
