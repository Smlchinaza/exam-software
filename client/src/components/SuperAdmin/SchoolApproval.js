import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Alert, AlertDescription } from '../ui/alert';
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  Eye, 
  Search,
  Building2,
  User,
  Mail,
  Phone,
  MapPin,
  FileText,
  Calendar,
  Loader2
} from 'lucide-react';

const SchoolApproval = () => {
  const [pendingRequests, setPendingRequests] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDetails, setShowDetails] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [approvalNotes, setApprovalNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    fetchPendingRequests();
  }, []);

  const fetchPendingRequests = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch('/api/super-admin/registrations/pending', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch pending requests');
      }

      const data = await response.json();
      setPendingRequests(data.pendingRequests);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchRequestDetails = async (requestId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/super-admin/registrations/${requestId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch request details');
      }

      const data = await response.json();
      setSelectedRequest(data);
      setShowDetails(true);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleApprove = async () => {
    if (!adminPassword || adminPassword.length < 8) {
      setError('Admin password must be at least 8 characters');
      return;
    }

    try {
      setActionLoading(true);
      setError(null);
      setSuccess(null);

      const token = localStorage.getItem('token');
      const response = await fetch(`/api/super-admin/registrations/${selectedRequest.id}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          adminPassword,
          approvalNotes
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to approve request');
      }

      const data = await response.json();
      setSuccess('School registration approved successfully!');
      
      // Remove from pending requests
      setPendingRequests(prev => prev.filter(req => req.id !== selectedRequest.id));
      
      // Reset form and close details
      setSelectedRequest(null);
      setShowDetails(false);
      setAdminPassword('');
      setApprovalNotes('');
      
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason || rejectionReason.trim().length < 10) {
      setError('Rejection reason must be at least 10 characters');
      return;
    }

    try {
      setActionLoading(true);
      setError(null);
      setSuccess(null);

      const token = localStorage.getItem('token');
      const response = await fetch(`/api/super-admin/registrations/${selectedRequest.id}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          rejectionReason
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to reject request');
      }

      const data = await response.json();
      setSuccess('School registration rejected');
      
      // Remove from pending requests
      setPendingRequests(prev => prev.filter(req => req.id !== selectedRequest.id));
      
      // Reset form and close details
      setSelectedRequest(null);
      setShowDetails(false);
      setRejectionReason('');
      
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const filteredRequests = pendingRequests.filter(request =>
    request.school_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    request.requester_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    request.requester_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    request.state_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">School Registration Approvals</h2>
          <p className="text-gray-600 mt-1">
            Review and approve pending school registration requests
          </p>
        </div>
        <Badge variant="outline" className="text-lg px-3 py-1">
          {pendingRequests.length} Pending
        </Badge>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          placeholder="Search by school name, requester, or state..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Alerts */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {success && (
        <Alert>
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {/* Pending Requests List */}
      <div className="space-y-4">
        {filteredRequests.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm ? 'No matching requests found' : 'No pending requests'}
              </h3>
              <p className="text-gray-600">
                {searchTerm 
                  ? 'Try adjusting your search criteria' 
                  : 'All school registration requests have been processed'
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredRequests.map((request) => (
            <Card key={request.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <Building2 className="h-5 w-5 text-blue-600" />
                      <h3 className="text-lg font-semibold text-gray-900">
                        {request.school_name}
                      </h3>
                      <Badge variant="outline">{request.school_type}</Badge>
                      <Badge variant="secondary">Pending</Badge>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <User className="h-4 w-4" />
                        <span>{request.requester_name}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <Mail className="h-4 w-4" />
                        <span>{request.requester_email}</span>
                      </div>
                      {request.requester_phone && (
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          <Phone className="h-4 w-4" />
                          <span>{request.requester_phone}</span>
                        </div>
                      )}
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <MapPin className="h-4 w-4" />
                        <span>{request.school_city}, {request.state_name}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 text-sm text-gray-500">
                        <Calendar className="h-4 w-4" />
                        <span>Submitted {formatDate(request.submitted_at)}</span>
                      </div>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fetchRequestDetails(request.id)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Review Details
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Request Details Modal */}
      {showDetails && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">
                    {selectedRequest.school_name}
                  </h3>
                  <p className="text-gray-600 mt-1">Registration Request Details</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowDetails(false);
                    setSelectedRequest(null);
                    setError(null);
                    setSuccess(null);
                  }}
                >
                  Close
                </Button>
              </div>

              {/* School Information */}
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">School Information</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-700">School Name</label>
                        <p className="text-gray-900">{selectedRequest.school_name}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">Type</label>
                        <p className="text-gray-900">{selectedRequest.school_type}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">Address</label>
                        <p className="text-gray-900">{selectedRequest.school_address || 'N/A'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">City</label>
                        <p className="text-gray-900">{selectedRequest.school_city}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">State</label>
                        <p className="text-gray-900">{selectedRequest.state_name}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">Phone</label>
                        <p className="text-gray-900">{selectedRequest.school_phone || 'N/A'}</p>
                      </div>
                    </div>
                    
                    {selectedRequest.school_description && (
                      <div className="mt-4">
                        <label className="text-sm font-medium text-gray-700">Description</label>
                        <p className="text-gray-900 mt-1">{selectedRequest.school_description}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Requester Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Requester Information</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-700">Name</label>
                        <p className="text-gray-900">{selectedRequest.requester_name}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">Email</label>
                        <p className="text-gray-900">{selectedRequest.requester_email}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">Phone</label>
                        <p className="text-gray-900">{selectedRequest.requester_phone || 'N/A'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">Submitted</label>
                        <p className="text-gray-900">{formatDate(selectedRequest.submitted_at)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Proposed Admin Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Proposed Admin Account</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-700">Email</label>
                        <p className="text-gray-900">{selectedRequest.proposed_admin_email}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">Name</label>
                        <p className="text-gray-900">
                          {selectedRequest.proposed_admin_first_name} {selectedRequest.proposed_admin_last_name}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Additional Message */}
                {selectedRequest.additional_message && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Additional Message</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-900">{selectedRequest.additional_message}</p>
                    </CardContent>
                  </Card>
                )}

                {/* Action Section */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Review Action</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Approval Section */}
                    <div className="border rounded-lg p-4">
                      <h4 className="font-medium text-green-700 mb-3">Approve Request</h4>
                      <div className="space-y-3">
                        <div>
                          <label className="text-sm font-medium text-gray-700">
                            Admin Password (for new admin account)
                          </label>
                          <Input
                            type="password"
                            value={adminPassword}
                            onChange={(e) => setAdminPassword(e.target.value)}
                            placeholder="Enter password for admin account"
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-700">
                            Approval Notes (optional)
                          </label>
                          <Textarea
                            value={approvalNotes}
                            onChange={(e) => setApprovalNotes(e.target.value)}
                            placeholder="Add any notes about this approval..."
                            className="mt-1"
                            rows={3}
                          />
                        </div>
                        <Button
                          onClick={handleApprove}
                          disabled={actionLoading || !adminPassword}
                          className="w-full"
                        >
                          {actionLoading ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <CheckCircle className="h-4 w-4 mr-2" />
                          )}
                          Approve Registration
                        </Button>
                      </div>
                    </div>

                    {/* Rejection Section */}
                    <div className="border rounded-lg p-4">
                      <h4 className="font-medium text-red-700 mb-3">Reject Request</h4>
                      <div className="space-y-3">
                        <div>
                          <label className="text-sm font-medium text-gray-700">
                            Rejection Reason (required)
                          </label>
                          <Textarea
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            placeholder="Provide a detailed reason for rejection..."
                            className="mt-1"
                            rows={3}
                          />
                        </div>
                        <Button
                          onClick={handleReject}
                          disabled={actionLoading || !rejectionReason || rejectionReason.length < 10}
                          variant="destructive"
                          className="w-full"
                        >
                          {actionLoading ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <XCircle className="h-4 w-4 mr-2" />
                          )}
                          Reject Registration
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SchoolApproval;
