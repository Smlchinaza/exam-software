// Teacher Registration Management Component
// Comprehensive interface for managing teacher registrations and approvals

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { 
    Search, 
    Filter, 
    Download, 
    Eye, 
    CheckCircle, 
    XCircle, 
    Clock,
    User,
    Mail,
    Phone,
    Calendar,
    FileText
} from 'lucide-react';
import { toast } from 'react-hot-toast';

const TeacherRegistrationManagement = () => {
    const [registrations, setRegistrations] = useState([]);
    const [filteredRegistrations, setFilteredRegistrations] = useState([]);
    const [stats, setStats] = useState({});
    const [loading, setLoading] = useState(true);
    const [selectedRegistration, setSelectedRegistration] = useState(null);
    const [showDetailsModal, setShowDetailsModal] = useState(false);

    // Filter states
    const [statusFilter, setStatusFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);

    useEffect(() => {
        fetchRegistrations();
        fetchStats();
    }, [currentPage, statusFilter, searchTerm]);

    useEffect(() => {
        filterRegistrations();
    }, [registrations, statusFilter, searchTerm]);

    const fetchRegistrations = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('schoolAdminToken');
            
            if (!token) {
                toast.error('Authentication required');
                return;
            }

            const params = new URLSearchParams({
                page: currentPage,
                limit: 10,
                ...(statusFilter !== 'all' && { status: statusFilter }),
                ...(searchTerm && { search: searchTerm })
            });

            const response = await fetch(`/api/school-admin/teacher-registrations?${params}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch registrations');
            }

            const data = await response.json();
            setRegistrations(data.data);
            setTotalPages(data.pagination.totalPages);
            setTotalCount(data.pagination.total);
        } catch (error) {
            console.error('Error fetching registrations:', error);
            toast.error('Failed to load registrations');
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            const token = localStorage.getItem('schoolAdminToken');
            const response = await fetch('/api/school-admin/teacher-registrations/stats/summary', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                setStats(data.data);
            }
        } catch (error) {
            console.error('Error fetching stats:', error);
        }
    };

    const filterRegistrations = () => {
        let filtered = registrations;

        if (statusFilter !== 'all') {
            filtered = filtered.filter(reg => reg.status === statusFilter);
        }

        if (searchTerm) {
            filtered = filtered.filter(reg =>
                reg.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                reg.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                reg.email?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        setFilteredRegistrations(filtered);
    };

    const handleApprove = async (registrationId) => {
        try {
            const token = localStorage.getItem('schoolAdminToken');
            const response = await fetch(`/api/school-admin/teacher-registrations/${registrationId}/approve`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to approve registration');
            }

            toast.success('Teacher registration approved successfully');
            fetchRegistrations();
            fetchStats();
        } catch (error) {
            console.error('Error approving registration:', error);
            toast.error('Failed to approve registration');
        }
    };

    const handleReject = async (registrationId, reason) => {
        try {
            const token = localStorage.getItem('schoolAdminToken');
            const response = await fetch(`/api/school-admin/teacher-registrations/${registrationId}/reject`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ rejectionReason: reason })
            });

            if (!response.ok) {
                throw new Error('Failed to reject registration');
            }

            toast.success('Teacher registration rejected');
            fetchRegistrations();
            fetchStats();
        } catch (error) {
            console.error('Error rejecting registration:', error);
            toast.error('Failed to reject registration');
        }
    };

    const handleExport = async () => {
        try {
            const token = localStorage.getItem('schoolAdminToken');
            const params = new URLSearchParams({
                ...(statusFilter !== 'all' && { status: statusFilter }),
                format: 'csv'
            });

            const response = await fetch(`/api/school-admin/teacher-registrations/export?${params}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                throw new Error('Failed to export data');
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `teacher-registrations-${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            toast.success('Data exported successfully');
        } catch (error) {
            console.error('Error exporting data:', error);
            toast.error('Failed to export data');
        }
    };

    const viewDetails = (registration) => {
        setSelectedRegistration(registration);
        setShowDetailsModal(true);
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

    const getStatusColor = (status) => {
        switch (status) {
            case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'approved': return 'bg-green-100 text-green-800 border-green-200';
            case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
            default: return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'pending': return <Clock className="h-4 w-4" />;
            case 'approved': return <CheckCircle className="h-4 w-4" />;
            case 'rejected': return <XCircle className="h-4 w-4" />;
            default: return <Clock className="h-4 w-4" />;
        }
    };

    if (loading && registrations.length === 0) {
        return (
            <div className="p-6">
                <div className="animate-pulse">
                    <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
                    <div className="h-64 bg-gray-200 rounded"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Teacher Registration Management</h1>
                    <p className="text-gray-600 mt-1">Review and manage teacher registration requests</p>
                </div>
                <Button onClick={handleExport} variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Export
                </Button>
            </div>

            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Pending</p>
                                <p className="text-2xl font-bold text-yellow-600">{stats.pending_count || 0}</p>
                            </div>
                            <Clock className="h-8 w-8 text-yellow-500" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Approved</p>
                                <p className="text-2xl font-bold text-green-600">{stats.approved_count || 0}</p>
                            </div>
                            <CheckCircle className="h-8 w-8 text-green-500" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Rejected</p>
                                <p className="text-2xl font-bold text-red-600">{stats.rejected_count || 0}</p>
                            </div>
                            <XCircle className="h-8 w-8 text-red-500" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">This Week</p>
                                <p className="text-2xl font-bold text-blue-600">{stats.pending_this_week || 0}</p>
                            </div>
                            <Calendar className="h-8 w-8 text-blue-500" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Filters</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                                <Input
                                    placeholder="Search by name or email..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                        </div>
                        <div className="w-full md:w-48">
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Filter by status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Status</SelectItem>
                                    <SelectItem value="pending">Pending</SelectItem>
                                    <SelectItem value="approved">Approved</SelectItem>
                                    <SelectItem value="rejected">Rejected</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Registrations List */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Teacher Registrations ({totalCount})</CardTitle>
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <Filter className="h-4 w-4" />
                        <span>{filteredRegistrations.length} of {totalCount}</span>
                    </div>
                </CardHeader>
                <CardContent>
                    {filteredRegistrations.length > 0 ? (
                        <div className="space-y-4">
                            {filteredRegistrations.map((registration) => (
                                <RegistrationCard
                                    key={registration.id}
                                    registration={registration}
                                    onApprove={handleApprove}
                                    onReject={handleReject}
                                    onViewDetails={viewDetails}
                                    getStatusColor={getStatusColor}
                                    getStatusIcon={getStatusIcon}
                                    formatDate={formatDate}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12">
                            <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 mb-2">No registrations found</h3>
                            <p className="text-gray-600">
                                {searchTerm || statusFilter !== 'all' 
                                    ? 'Try adjusting your filters' 
                                    : 'No teacher registrations have been submitted yet'
                                }
                            </p>
                        </div>
                    )}

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex justify-center items-center space-x-2 mt-6">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                disabled={currentPage === 1}
                            >
                                Previous
                            </Button>
                            <span className="text-sm text-gray-600">
                                Page {currentPage} of {totalPages}
                            </span>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                disabled={currentPage === totalPages}
                            >
                                Next
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Registration Details Modal */}
            {showDetailsModal && selectedRegistration && (
                <RegistrationDetailsModal
                    registration={selectedRegistration}
                    onClose={() => setShowDetailsModal(false)}
                    onApprove={handleApprove}
                    onReject={handleReject}
                    formatDate={formatDate}
                />
            )}
        </div>
    );
};

// Registration Card Component
const RegistrationCard = ({ 
    registration, 
    onApprove, 
    onReject, 
    onViewDetails, 
    getStatusColor, 
    getStatusIcon, 
    formatDate 
}) => {
    const [loading, setLoading] = useState(false);

    const handleApprove = async () => {
        setLoading(true);
        await onApprove(registration.id);
        setLoading(false);
    };

    const handleReject = async () => {
        const reason = prompt('Please provide rejection reason:');
        if (reason) {
            setLoading(true);
            await onReject(registration.id, reason);
            setLoading(false);
        }
    };

    return (
        <div className="border rounded-lg p-4 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
                <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-gray-900">
                                {registration.first_name} {registration.last_name}
                            </h3>
                            <Badge className={getStatusColor(registration.status)}>
                                <div className="flex items-center gap-1">
                                    {getStatusIcon(registration.status)}
                                    <span className="capitalize">{registration.status}</span>
                                </div>
                            </Badge>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div className="flex items-center gap-2 text-gray-600">
                            <Mail className="h-4 w-4" />
                            <span>{registration.email}</span>
                        </div>
                        {registration.phone && (
                            <div className="flex items-center gap-2 text-gray-600">
                                <Phone className="h-4 w-4" />
                                <span>{registration.phone}</span>
                            </div>
                        )}
                        <div className="flex items-center gap-2 text-gray-600">
                            <Calendar className="h-4 w-4" />
                            <span>Registered: {formatDate(registration.created_at)}</span>
                        </div>
                        {registration.reviewed_at && (
                            <div className="flex items-center gap-2 text-gray-600">
                                <CheckCircle className="h-4 w-4" />
                                <span>Reviewed: {formatDate(registration.reviewed_at)}</span>
                            </div>
                        )}
                    </div>

                    {registration.rejection_reason && (
                        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded">
                            <p className="text-sm text-red-800">
                                <strong>Rejection reason:</strong> {registration.rejection_reason}
                            </p>
                        </div>
                    )}

                    {registration.reviewed_by && (
                        <div className="mt-2 text-xs text-gray-500">
                            Reviewed by: {registration.reviewer_email || 'Admin'}
                        </div>
                    )}
                </div>

                <div className="flex flex-col gap-2 ml-4">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onViewDetails(registration)}
                    >
                        <Eye className="h-4 w-4 mr-2" />
                        Details
                    </Button>
                    
                    {registration.status === 'pending' && (
                        <>
                            <Button
                                onClick={handleApprove}
                                disabled={loading}
                                size="sm"
                                className="bg-green-600 hover:bg-green-700"
                            >
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Approve
                            </Button>
                            <Button
                                onClick={handleReject}
                                disabled={loading}
                                size="sm"
                                variant="destructive"
                            >
                                <XCircle className="h-4 w-4 mr-2" />
                                Reject
                            </Button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

// Registration Details Modal Component
const RegistrationDetailsModal = ({ registration, onClose, onApprove, onReject, formatDate }) => {
    const [loading, setLoading] = useState(false);

    const handleApprove = async () => {
        setLoading(true);
        await onApprove(registration.id);
        setLoading(false);
        onClose();
    };

    const handleReject = async () => {
        const reason = prompt('Please provide rejection reason:');
        if (reason) {
            setLoading(true);
            await onReject(registration.id, reason);
            setLoading(false);
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900">
                                Registration Details
                            </h2>
                            <p className="text-gray-600 mt-1">
                                {registration.first_name} {registration.last_name}
                            </p>
                        </div>
                        <Button variant="outline" onClick={onClose}>
                            ×
                        </Button>
                    </div>

                    <div className="space-y-6">
                        {/* Personal Information */}
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-3">Personal Information</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium text-gray-600">Full Name</label>
                                    <p className="text-gray-900">
                                        {registration.first_name} {registration.last_name}
                                    </p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-gray-600">Email</label>
                                    <p className="text-gray-900">{registration.email}</p>
                                </div>
                                {registration.phone && (
                                    <div>
                                        <label className="text-sm font-medium text-gray-600">Phone</label>
                                        <p className="text-gray-900">{registration.phone}</p>
                                    </div>
                                )}
                                <div>
                                    <label className="text-sm font-medium text-gray-600">Registration Date</label>
                                    <p className="text-gray-900">{formatDate(registration.created_at)}</p>
                                </div>
                            </div>
                        </div>

                        {/* Registration Data */}
                        {registration.registration_data && (
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-3">Additional Information</h3>
                                <div className="bg-gray-50 p-4 rounded">
                                    <pre className="text-sm text-gray-700 whitespace-pre-wrap">
                                        {JSON.stringify(registration.registration_data, null, 2)}
                                    </pre>
                                </div>
                            </div>
                        )}

                        {/* Status Information */}
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-3">Status Information</h3>
                            <div className="space-y-2">
                                <div className="flex justify-between">
                                    <span className="text-sm font-medium text-gray-600">Current Status:</span>
                                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                                        registration.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                        registration.status === 'approved' ? 'bg-green-100 text-green-800' :
                                        'bg-red-100 text-red-800'
                                    }`}>
                                        {registration.status}
                                    </span>
                                </div>
                                {registration.reviewed_at && (
                                    <div className="flex justify-between">
                                        <span className="text-sm font-medium text-gray-600">Reviewed Date:</span>
                                        <span className="text-sm text-gray-900">{formatDate(registration.reviewed_at)}</span>
                                    </div>
                                )}
                                {registration.reviewer_email && (
                                    <div className="flex justify-between">
                                        <span className="text-sm font-medium text-gray-600">Reviewed By:</span>
                                        <span className="text-sm text-gray-900">{registration.reviewer_email}</span>
                                    </div>
                                )}
                                {registration.rejection_reason && (
                                    <div>
                                        <span className="text-sm font-medium text-gray-600">Rejection Reason:</span>
                                        <p className="text-sm text-red-800 mt-1 bg-red-50 p-2 rounded">
                                            {registration.rejection_reason}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex justify-end space-x-3 mt-6 pt-6 border-t">
                        <Button variant="outline" onClick={onClose}>
                            Close
                        </Button>
                        {registration.status === 'pending' && (
                            <>
                                <Button
                                    onClick={handleApprove}
                                    disabled={loading}
                                    className="bg-green-600 hover:bg-green-700"
                                >
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    Approve Registration
                                </Button>
                                <Button
                                    onClick={handleReject}
                                    disabled={loading}
                                    variant="destructive"
                                >
                                    <XCircle className="h-4 w-4 mr-2" />
                                    Reject Registration
                                </Button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TeacherRegistrationManagement;
