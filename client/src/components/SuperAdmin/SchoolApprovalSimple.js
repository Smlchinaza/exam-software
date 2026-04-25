import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';

const SchoolApprovalSimple = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Simulate loading
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
          <h2 className="text-2xl font-bold text-gray-900">School Registration Approvals</h2>
          <p className="text-gray-600 mt-1">
            Review and approve pending school registration requests
          </p>
        </div>
        <div className="px-3 py-1 bg-gray-100 text-gray-800 rounded text-lg">
          0 Pending
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-8 text-center">
        <div className="text-gray-400 mb-4">
          <svg className="h-16 w-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No pending requests</h3>
        <p className="text-gray-600">
          All school registration requests have been processed
        </p>
      </div>
    </div>
  );
};

export default SchoolApprovalSimple;
