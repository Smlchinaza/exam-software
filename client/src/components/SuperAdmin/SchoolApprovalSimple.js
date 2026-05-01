import React, { useState, useEffect } from 'react';
import { superAdminApi } from '../../services/superAdminApi';
import { 
  CheckCircle, 
  XCircle, 
  Eye, 
  Calendar,
  Mail,
  Building,
  User,
  X
} from 'lucide-react';

const SchoolApprovalSimple = () => {
  const [loading, setLoading] = useState(true);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [requestError, setRequestError] = useState(null);
  const [overrideAdminEmail, setOverrideAdminEmail] = useState('');

  useEffect(() => {
    fetchPendingRequests();
  }, [refreshTrigger]);

  const fetchPendingRequests = async () => {
    try {
      setRequestError(null);
      setLoading(true);
      const data = await superAdminApi.getPendingRegistrations();
      setPendingRequests(data.pendingRequests || []);
    } catch (err) {
      console.error('Failed to fetch pending requests:', err);
      setRequestError('Unable to load pending registration requests.');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = async (request) => {
    try {
      setRequestError(null);
      setOverrideAdminEmail('');
      setLoading(true);
      const details = await superAdminApi.getRegistrationDetails(request.id);
      setSelectedRequest(details);
      setShowDetailsModal(true);
    } catch (err) {
      console.error('Failed to fetch request details:', err);
      setRequestError('Unable to load request details.');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (requestId) => {
    try {
      setRequestError(null);
      setActionLoading(true);
      const approvalData = {
        approvalNotes: 'School registration approved after review',
        adminPassword: 'TempAdmin123!', // In production, this should be generated securely
        adminEmail: overrideAdminEmail || undefined // Use override if provided
      };
      
      await superAdminApi.approveSchool(requestId, approvalData);
      setShowDetailsModal(false);
      setRefreshTrigger(prev => prev + 1);
    } catch (err) {
      console.error('Failed to approve request:', err);
      setRequestError(err?.response?.data?.error || err.message || 'Failed to approve request.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (requestId) => {
    const reason = prompt('Please provide a reason for rejection:');
    if (!reason || reason.trim().length < 10) {
      alert('Rejection reason must be at least 10 characters');
      return;
    }

    try {
      setRequestError(null);
      setActionLoading(true);
      const rejectionData = { rejectionReason: reason };
      
      await superAdminApi.rejectSchool(requestId, rejectionData);
      setShowDetailsModal(false);
      setRefreshTrigger(prev => prev + 1);
    } catch (err) {
      console.error('Failed to reject request:', err);
      setRequestError(err?.response?.data?.error || err.message || 'Failed to reject request.');
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getPendingRequestKey = (request, index) => {
    return request.id || `${request.school_id || request.proposed_admin_email}-${index}`;
  };

  if (loading && pendingRequests.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header - Mobile Optimized */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div className="min-w-0">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Approvals</h2>
          <p className="text-xs sm:text-sm text-gray-600 mt-1">
            Review pending registration requests
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className={`px-3 py-1 rounded-full text-sm sm:text-base font-medium whitespace-nowrap ${
            pendingRequests.length > 0 
              ? 'bg-orange-100 text-orange-800' 
              : 'bg-gray-100 text-gray-800'
          }`}>
            {pendingRequests.length} Pending
          </div>
          <button
            onClick={() => setRefreshTrigger(prev => prev + 1)}
            className="px-2 sm:px-3 py-1 sm:py-2 border border-gray-300 rounded-md text-xs sm:text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            Refresh
          </button>
        </div>
      </div>

      {requestError && (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4">
          <p className="text-sm font-medium">{requestError}</p>
        </div>
      )}

      {pendingRequests.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-6 sm:p-8 text-center">
          <div className="text-gray-400 mb-4">
            <CheckCircle className="h-12 sm:h-16 w-12 sm:w-16 mx-auto" />
          </div>
          <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">No pending requests</h3>
          <p className="text-sm sm:text-base text-gray-600">
            All school registration requests have been processed
          </p>
        </div>
      ) : (
        <>
          {/* Mobile Card View */}
          <div className="md:hidden space-y-3">
            {pendingRequests.map((request, index) => (
              <div key={getPendingRequestKey(request, index)} className="bg-white rounded-lg shadow p-4 border border-gray-100">
                {/* School Info */}
                <div className="mb-3 pb-3 border-b">
                  <div className="flex items-start gap-2 mb-2">
                    <Building className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-gray-900 truncate">{request.school_name}</p>
                      <p className="text-xs text-gray-600">{request.school_city}, {request.state_name}</p>
                      <p className="text-xs text-gray-500">{request.school_type}</p>
                    </div>
                  </div>
                </div>

                {/* Requester & Admin Info */}
                <div className="mb-3 pb-3 border-b space-y-2">
                  <div className="flex items-start gap-2">
                    <User className="h-4 w-4 text-gray-600 flex-shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-gray-600">Requester</p>
                      <p className="text-sm font-medium text-gray-900">{request.requester_name}</p>
                      <p className="text-xs text-gray-600 break-words">{request.requester_email}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Mail className="h-4 w-4 text-gray-600 flex-shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-gray-600">Proposed Admin</p>
                      <p className="text-xs text-gray-900 break-words">{request.proposed_admin_email}</p>
                    </div>
                  </div>
                </div>

                {/* Date and Actions */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center text-xs text-gray-500">
                    <Calendar className="h-4 w-4 mr-1" />
                    {formatDate(request.submitted_at).split(',')[0]}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleViewDetails(request)}
                      className="p-2 rounded-md bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                      title="View Details"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleApprove(request.id)}
                      disabled={actionLoading}
                      className="p-2 rounded-md bg-green-50 text-green-600 hover:bg-green-100 disabled:opacity-50 transition-colors"
                      title="Approve"
                    >
                      <CheckCircle className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleReject(request.id)}
                      disabled={actionLoading}
                      className="p-2 rounded-md bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-50 transition-colors"
                      title="Reject"
                    >
                      <XCircle className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      School
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Requester
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Proposed Admin
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Submitted
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {pendingRequests.map((request, index) => (
                    <tr key={getPendingRequestKey(request, index)} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Building className="h-5 w-5 text-gray-400 mr-3" />
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-gray-900 truncate">
                              {request.school_name}
                            </div>
                            <div className="text-sm text-gray-500 truncate">
                              {request.school_city}, {request.state_name}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <User className="h-5 w-5 text-gray-400 mr-3 flex-shrink-0" />
                          <div className="min-w-0">
                            <div className="text-sm text-gray-900">{request.requester_name}</div>
                            <div className="text-xs text-gray-500 truncate">{request.requester_email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 truncate">{request.proposed_admin_email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(request.submitted_at).split(',')[0]}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleViewDetails(request)}
                            className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50"
                            title="View Details"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleApprove(request.id)}
                            disabled={actionLoading}
                            className="text-green-600 hover:text-green-900 p-1 rounded hover:bg-green-50 disabled:opacity-50"
                            title="Approve"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleReject(request.id)}
                            disabled={actionLoading}
                            className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50 disabled:opacity-50"
                            title="Reject"
                          >
                            <XCircle className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Mobile-Optimized Details Modal */}
      {showDetailsModal && selectedRequest && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-end md:items-center md:justify-center">
          <div className="relative w-full md:w-3/4 lg:w-1/2 md:max-h-[90vh] bg-white rounded-t-lg md:rounded-lg shadow-lg md:m-auto">
            {/* Header */}
            <div className="sticky top-0 bg-white border-b px-4 sm:px-6 py-4 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">
                Request Details
              </h3>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Content */}
            <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 200px)' }}>
              <div className="p-4 sm:p-6 space-y-6">
                {/* School Information */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">School Information</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <div>
                      <label className="text-xs font-medium text-gray-600">School Name</label>
                      <p className="mt-1 text-gray-900">{selectedRequest.school_name}</p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600">School Type</label>
                      <p className="mt-1 text-gray-900">{selectedRequest.school_type}</p>
                    </div>
                    <div className="sm:col-span-2">
                      <label className="text-xs font-medium text-gray-600">Address</label>
                      <p className="mt-1 text-gray-900">{selectedRequest.school_address}</p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600">City</label>
                      <p className="mt-1 text-gray-900">{selectedRequest.school_city}</p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600">State</label>
                      <p className="mt-1 text-gray-900">{selectedRequest.state_name}</p>
                    </div>
                  </div>
                </div>

                {/* Requester Information */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">Requester Information</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <div>
                      <label className="text-xs font-medium text-gray-600">Name</label>
                      <p className="mt-1 text-gray-900">{selectedRequest.requester_name}</p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600">Phone</label>
                      <p className="mt-1 text-gray-900">{selectedRequest.requester_phone || 'Not provided'}</p>
                    </div>
                    <div className="sm:col-span-2">
                      <label className="text-xs font-medium text-gray-600">Email</label>
                      <p className="mt-1 text-gray-900 break-words">{selectedRequest.requester_email}</p>
                    </div>
                    <div className="sm:col-span-2">
                      <label className="text-xs font-medium text-gray-600">Submitted</label>
                      <p className="mt-1 text-gray-900">{formatDate(selectedRequest.submitted_at)}</p>
                    </div>
                  </div>
                </div>

                {/* Proposed Admin */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">Proposed School Admin</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <div>
                      <label className="text-xs font-medium text-gray-600">First Name</label>
                      <p className="mt-1 text-gray-900">{selectedRequest.proposed_admin_first_name}</p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600">Last Name</label>
                      <p className="mt-1 text-gray-900">{selectedRequest.proposed_admin_last_name}</p>
                    </div>
                    <div className="sm:col-span-2">
                      <label className="text-xs font-medium text-gray-600">Email {selectedRequest.proposed_admin_email !== overrideAdminEmail && overrideAdminEmail && <span className="text-blue-600">(Modified)</span>}</label>
                      <input
                        type="email"
                        value={overrideAdminEmail || selectedRequest.proposed_admin_email}
                        onChange={(e) => setOverrideAdminEmail(e.target.value)}
                        className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="admin@example.com"
                      />
                      {selectedRequest.proposed_admin_email !== overrideAdminEmail && overrideAdminEmail && (
                        <p className="mt-1 text-xs text-blue-600">Original: {selectedRequest.proposed_admin_email}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Additional Message */}
                {selectedRequest.additional_message && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 mb-3">Additional Message</h4>
                    <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded">
                      {selectedRequest.additional_message}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Actions - Sticky Footer */}
            <div className="sticky bottom-0 bg-white border-t p-4 sm:p-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
              <button
                onClick={() => {
                  setShowDetailsModal(false);
                  setOverrideAdminEmail('');
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 w-full sm:w-auto"
              >
                Close
              </button>
              <button
                onClick={() => handleReject(selectedRequest.id)}
                disabled={actionLoading}
                className="px-4 py-2 border border-red-300 rounded-md text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 disabled:opacity-50 w-full sm:w-auto"
              >
                {actionLoading ? 'Processing...' : 'Reject'}
              </button>
              <button
                onClick={() => handleApprove(selectedRequest.id)}
                disabled={actionLoading}
                className="px-4 py-2 border border-green-300 rounded-md text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 w-full sm:w-auto"
              >
                {actionLoading ? 'Processing...' : 'Approve'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SchoolApprovalSimple;
