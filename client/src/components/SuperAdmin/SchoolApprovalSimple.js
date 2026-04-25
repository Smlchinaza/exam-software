import React, { useState, useEffect } from 'react';
import { superAdminApi } from '../../services/superAdminApi';
import { 
  CheckCircle, 
  XCircle, 
  Eye, 
  Calendar,
  Mail,
  Building,
  User
} from 'lucide-react';

const SchoolApprovalSimple = () => {
  const [loading, setLoading] = useState(true);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    fetchPendingRequests();
  }, [refreshTrigger]);

  const fetchPendingRequests = async () => {
    try {
      setLoading(true);
      const data = await superAdminApi.getPendingRegistrations();
      setPendingRequests(data.pendingRequests || []);
    } catch (err) {
      console.error('Failed to fetch pending requests:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = async (request) => {
    try {
      setLoading(true);
      const details = await superAdminApi.getRegistrationDetails(request.id);
      setSelectedRequest(details);
      setShowDetailsModal(true);
    } catch (err) {
      console.error('Failed to fetch request details:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (requestId) => {
    try {
      setActionLoading(true);
      const approvalData = {
        approvalNotes: 'School registration approved after review',
        adminPassword: 'TempAdmin123!' // In production, this should be generated securely
      };
      
      await superAdminApi.approveSchool(requestId, approvalData);
      setShowDetailsModal(false);
      setRefreshTrigger(prev => prev + 1);
    } catch (err) {
      console.error('Failed to approve request:', err);
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
      setActionLoading(true);
      const rejectionData = { rejectionReason: reason };
      
      await superAdminApi.rejectSchool(requestId, rejectionData);
      setShowDetailsModal(false);
      setRefreshTrigger(prev => prev + 1);
    } catch (err) {
      console.error('Failed to reject request:', err);
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

  if (loading && pendingRequests.length === 0) {
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
        <div className="flex items-center space-x-4">
          <div className={`px-3 py-1 rounded-full text-lg font-medium ${
            pendingRequests.length > 0 
              ? 'bg-orange-100 text-orange-800' 
              : 'bg-gray-100 text-gray-800'
          }`}>
            {pendingRequests.length} Pending
          </div>
          <button
            onClick={() => setRefreshTrigger(prev => prev + 1)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            Refresh
          </button>
        </div>
      </div>

      {pendingRequests.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <div className="text-gray-400 mb-4">
            <CheckCircle className="h-16 w-16 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No pending requests</h3>
          <p className="text-gray-600">
            All school registration requests have been processed
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    School Information
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
                {pendingRequests.map((request) => (
                  <tr key={request.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Building className="h-5 w-5 text-gray-400 mr-3" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {request.school_name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {request.school_city}, {request.state_name}
                          </div>
                          <div className="text-xs text-gray-400 mt-1">
                            {request.school_type}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <User className="h-5 w-5 text-gray-400 mr-3" />
                        <div>
                          <div className="text-sm text-gray-900">{request.requester_name}</div>
                          <div className="text-sm text-gray-500">{request.requester_email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Mail className="h-5 w-5 text-gray-400 mr-3" />
                        <div className="text-sm text-gray-900">{request.proposed_admin_email}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-500">
                        <Calendar className="h-4 w-4 mr-2" />
                        {formatDate(request.submitted_at)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
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
      )}

      {/* Details Modal */}
      {showDetailsModal && selectedRequest && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Registration Request Details
                </h3>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-6">
                {/* School Information */}
                <div>
                  <h4 className="text-md font-semibold text-gray-900 mb-3">School Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">School Name</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedRequest.school_name}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">School Type</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedRequest.school_type}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Address</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedRequest.school_address}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">City, State</label>
                      <p className="mt-1 text-sm text-gray-900">
                        {selectedRequest.school_city}, {selectedRequest.state_name}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Requester Information */}
                <div>
                  <h4 className="text-md font-semibold text-gray-900 mb-3">Requester Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Name</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedRequest.requester_name}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Email</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedRequest.requester_email}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Phone</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedRequest.requester_phone || 'Not provided'}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Submitted</label>
                      <p className="mt-1 text-sm text-gray-900">{formatDate(selectedRequest.submitted_at)}</p>
                    </div>
                  </div>
                </div>

                {/* Proposed Admin */}
                <div>
                  <h4 className="text-md font-semibold text-gray-900 mb-3">Proposed School Admin</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Name</label>
                      <p className="mt-1 text-sm text-gray-900">
                        {selectedRequest.proposed_admin_first_name} {selectedRequest.proposed_admin_last_name}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Email</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedRequest.proposed_admin_email}</p>
                    </div>
                  </div>
                </div>

                {/* Additional Message */}
                {selectedRequest.additional_message && (
                  <div>
                    <h4 className="text-md font-semibold text-gray-900 mb-3">Additional Message</h4>
                    <p className="mt-1 text-sm text-gray-900 bg-gray-50 p-3 rounded">
                      {selectedRequest.additional_message}
                    </p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex justify-end space-x-3 pt-4 border-t">
                  <button
                    onClick={() => handleReject(selectedRequest.id)}
                    disabled={actionLoading}
                    className="px-4 py-2 border border-red-300 rounded-md text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 disabled:opacity-50"
                  >
                    {actionLoading ? 'Processing...' : 'Reject Request'}
                  </button>
                  <button
                    onClick={() => handleApprove(selectedRequest.id)}
                    disabled={actionLoading}
                    className="px-4 py-2 border border-green-300 rounded-md text-sm font-medium text-green-700 bg-green-50 hover:bg-green-100 disabled:opacity-50"
                  >
                    {actionLoading ? 'Processing...' : 'Approve Request'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SchoolApprovalSimple;
