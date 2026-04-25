import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Alert, AlertDescription } from '../ui/alert';
import { 
  Users, 
  Settings, 
  Shield, 
  Clock, 
  Activity,
  Eye,
  Edit,
  Trash2,
  Calendar,
  Mail,
  Phone,
  MapPin,
  Award,
  AlertCircle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Download,
  Search,
  Filter
} from 'lucide-react';

const AdminProfileManagement = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [admins, setAdmins] = useState([]);
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showAccessModal, setShowAccessModal] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    status: '',
    schoolId: '',
    role: ''
  });
  const [auditLogs, setAuditLogs] = useState([]);
  const [pagination, setPagination] = useState(null);

  // Form states
  const [profileForm, setProfileForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    isActive: true
  });

  const [roleForm, setRoleForm] = useState({
    role: 'admin',
    permissions: {}
  });

  const [accessForm, setAccessForm] = useState({
    allowedIPs: [],
    timeRestrictions: {},
    sessionTimeout: 30
  });

  useEffect(() => {
    fetchAdmins();
  }, [filters, searchTerm]);

  const fetchAdmins = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const params = new URLSearchParams({
        limit: 50,
        offset: 0
      });

      if (filters.status) {
        params.append('status', filters.status);
      }
      if (filters.schoolId) {
        params.append('schoolId', filters.schoolId);
      }
      if (filters.role) {
        params.append('role', filters.role);
      }
      if (searchTerm) {
        params.append('search', searchTerm);
      }

      const response = await fetch(`/api/super-admin/admins?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch admins');
      }

      const data = await response.json();
      setAdmins(data.admins || []);
      setPagination(data.pagination);
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to fetch admins');
    } finally {
      setLoading(false);
    }
  };

  const fetchAuditLogs = async (adminId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/super-admin/admins/${adminId}/activity?limit=20`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch audit logs');
      }

      const data = await response.json();
      setAuditLogs(data.activities || []);
    } catch (err) {
      console.error('Error fetching audit logs:', err);
    }
  };

  const openProfileModal = (admin) => {
    setSelectedAdmin(admin);
    setProfileForm({
      firstName: admin.first_name,
      lastName: admin.last_name,
      email: admin.email,
      phone: admin.phone || '',
      isActive: admin.is_active
    });
    setShowProfileModal(true);
  };

  const openRoleModal = (admin) => {
    setSelectedAdmin(admin);
    setRoleForm({
      role: admin.role,
      permissions: admin.permissions || {}
    });
    setShowRoleModal(true);
  };

  const openAccessModal = (admin) => {
    setSelectedAdmin(admin);
    setAccessForm({
      allowedIPs: admin.allowedIPs || [],
      timeRestrictions: admin.timeRestrictions || {},
      sessionTimeout: admin.sessionTimeout || 30
    });
    setShowAccessModal(true);
  };

  const openAuditModal = (admin) => {
    setSelectedAdmin(admin);
    setShowAuditModal(true);
    fetchAuditLogs(admin.id);
  };

  const handleUpdateProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/super-admin/admins/${selectedAdmin.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(profileForm)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update profile');
      }

      setShowProfileModal(false);
      setSelectedAdmin(null);
      fetchAdmins();
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to update profile');
    }
  };

  const handleUpdateRole = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/super-admin/admins/${selectedAdmin.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          role: roleForm.role,
          permissions: roleForm.permissions
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update role');
      }

      setShowRoleModal(false);
      setSelectedAdmin(null);
      fetchAdmins();
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to update role');
    }
  };

  const handleUpdateAccess = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/super-admin/admins/${selectedAdmin.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(accessForm)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update access settings');
      }

      setShowAccessModal(false);
      setSelectedAdmin(null);
      fetchAdmins();
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to update access settings');
    }
  };

  const getRoleBadge = (role) => {
    const colors = {
      admin: 'bg-blue-100 text-blue-800',
      teacher: 'bg-green-100 text-green-800',
      student: 'bg-purple-100 text-purple-800'
    };
    return (
      <Badge className={colors[role] || 'bg-gray-100 text-gray-800'}>
        {role?.charAt(0).toUpperCase() + role?.slice(1)}
      </Badge>
    );
  };

  const getStatusColor = (isActive) => {
    return isActive ? 'text-green-600' : 'text-red-600';
  };

  const getStatusBadge = (isActive) => {
    return isActive ? (
      <Badge className="bg-green-100 text-green-800 flex items-center">
        <CheckCircle className="h-3 w-3 mr-1" />
        Active
      </Badge>
    ) : (
      <Badge className="bg-red-100 text-red-800 flex items-center">
        <XCircle className="h-3 w-3 mr-1" />
        Inactive
      </Badge>
    );
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

  const exportAdminData = () => {
    const csvContent = [
      ['Name', 'Email', 'Phone', 'School', 'Role', 'Status', 'Last Login', 'Created Date'],
      ...admins.map(admin => [
        `${admin.first_name} ${admin.last_name}`,
        admin.email,
        admin.phone || 'N/A',
        admin.school_name || 'N/A',
        admin.role,
        admin.is_active ? 'Active' : 'Inactive',
        admin.last_login ? formatDate(admin.last_login) : 'Never',
        formatDate(admin.created_at)
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `admin-profiles-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const filteredAdmins = admins.filter(admin => {
    const matchesSearch = admin.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         admin.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         admin.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSchool = !filters.schoolId || admin.school_id === filters.schoolId;
    const matchesStatus = !filters.status || 
                         (filters.status === 'active' && admin.is_active) ||
                         (filters.status === 'inactive' && !admin.is_active);
    const matchesRole = !filters.role || admin.role === filters.role;
    
    return matchesSearch && matchesSchool && matchesStatus && matchesRole;
  });

  if (loading && admins.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Admin Profile Management</h2>
          <p className="text-gray-600 mt-1">
            Manage administrator profiles, roles, and access control
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button onClick={exportAdminData} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters & Search</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search admins..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={filters.status} onValueChange={(value) => setFilters({...filters, status: value})}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.role} onValueChange={(value) => setFilters({...filters, role: value})}>
              <SelectTrigger>
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Roles</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="teacher">Teacher</SelectItem>
                <SelectItem value="student">Student</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.schoolId} onValueChange={(value) => setFilters({...filters, schoolId: value})}>
              <SelectTrigger>
                <SelectValue placeholder="School" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Schools</SelectItem>
                {/* Schools will be populated from API */}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Admins List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Administrator Profiles</CardTitle>
          <p className="text-sm text-gray-600">
            Showing {filteredAdmins.length} of {pagination?.total || 0} administrators
          </p>
        </CardHeader>
        <CardContent>
          {filteredAdmins.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No administrators found</h3>
              <p className="text-gray-600">
                {searchTerm || filters.status || filters.role || filters.schoolId 
                  ? 'Try adjusting your search or filters' 
                  : 'No administrators available'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Admin</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Contact</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">School</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Role</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Status</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Last Login</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAdmins.map((admin) => (
                    <tr key={admin.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="flex items-center">
                          <div className="h-10 w-10 flex-shrink-0">
                            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                              <span className="text-blue-600 font-medium">
                                {admin.first_name.charAt(0)}{admin.last_name.charAt(0)}
                              </span>
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {admin.first_name} {admin.last_name}
                            </div>
                            <div className="text-sm text-gray-500">{admin.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-sm text-gray-900">
                          {admin.phone && (
                            <div className="flex items-center">
                              <Phone className="h-4 w-4 mr-1 text-gray-400" />
                              {admin.phone}
                            </div>
                          )}
                          <div className="flex items-center">
                            <Mail className="h-4 w-4 mr-1 text-gray-400" />
                            {admin.email}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-sm text-gray-900">
                          <div className="flex items-center">
                            <MapPin className="h-4 w-4 mr-1 text-gray-400" />
                            {admin.school_name || 'N/A'}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {getRoleBadge(admin.role)}
                      </td>
                      <td className="py-3 px-4">
                        {getStatusBadge(admin.is_active)}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-500">
                        {admin.last_login ? (
                          <div className="flex items-center">
                            <Clock className="h-4 w-4 mr-1" />
                            {formatDate(admin.last_login)}
                          </div>
                        ) : (
                          <span className="text-gray-400">Never</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openProfileModal(admin)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Profile
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openRoleModal(admin)}
                            className="text-green-600 hover:text-green-900"
                          >
                            <Shield className="h-4 w-4 mr-1" />
                            Role
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openAccessModal(admin)}
                            className="text-purple-600 hover:text-purple-900"
                          >
                            <Settings className="h-4 w-4 mr-1" />
                            Access
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openAuditModal(admin)}
                            className="text-orange-600 hover:text-orange-900"
                          >
                            <Activity className="h-4 w-4 mr-1" />
                            Audit
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Profile Modal */}
      {showProfileModal && selectedAdmin && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Edit Profile</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowProfileModal(false)}
                >
                  <XCircle className="h-6 w-6" />
                </Button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">First Name</label>
                    <Input
                      value={profileForm.firstName}
                      onChange={(e) => setProfileForm({...profileForm, firstName: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
                    <Input
                      value={profileForm.lastName}
                      onChange={(e) => setProfileForm({...profileForm, lastName: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                    <Input
                      type="email"
                      value={profileForm.email}
                      onChange={(e) => setProfileForm({...profileForm, email: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                    <Input
                      type="tel"
                      value={profileForm.phone}
                      onChange={(e) => setProfileForm({...profileForm, phone: e.target.value})}
                    />
                  </div>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={profileForm.isActive}
                    onChange={(e) => setProfileForm({...profileForm, isActive: e.target.checked})}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900">
                    Active Status
                  </label>
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => setShowProfileModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleUpdateProfile}>
                    Update Profile
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Role Modal */}
      {showRoleModal && selectedAdmin && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Role & Permissions</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowRoleModal(false)}
                >
                  <XCircle className="h-6 w-6" />
                </Button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                  <Select value={roleForm.role} onValueChange={(value) => setRoleForm({...roleForm, role: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="teacher">Teacher</SelectItem>
                      <SelectItem value="student">Student</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="border-t pt-4">
                  <h4 className="text-md font-medium text-gray-900 mb-4">Permissions</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Manage Schools</label>
                      <Select value={roleForm.permissions?.manageSchools || 'none'} onValueChange={(value) => setRoleForm({...roleForm, permissions: {...roleForm.permissions, manageSchools: value}})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No Access</SelectItem>
                          <SelectItem value="read">Read Only</SelectItem>
                          <SelectItem value="write">Read & Write</SelectItem>
                          <SelectItem value="full">Full Access</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Manage Users</label>
                      <Select value={roleForm.permissions?.manageUsers || 'none'} onValueChange={(value) => setRoleForm({...roleForm, permissions: {...roleForm.permissions, manageUsers: value}})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No Access</SelectItem>
                          <SelectItem value="read">Read Only</SelectItem>
                          <SelectItem value="write">Read & Write</SelectItem>
                          <SelectItem value="full">Full Access</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Manage Exams</label>
                      <Select value={roleForm.permissions?.manageExams || 'none'} onValueChange={(value) => setRoleForm({...roleForm, permissions: {...roleForm.permissions, manageExams: value}})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No Access</SelectItem>
                          <SelectItem value="read">Read Only</SelectItem>
                          <SelectItem value="write">Read & Write</SelectItem>
                          <SelectItem value="full">Full Access</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">View Analytics</label>
                      <Select value={roleForm.permissions?.viewAnalytics || 'none'} onValueChange={(value) => setRoleForm({...roleForm, permissions: {...roleForm.permissions, viewAnalytics: value}})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No Access</SelectItem>
                          <SelectItem value="basic">Basic Reports</SelectItem>
                          <SelectItem value="advanced">Advanced Analytics</SelectItem>
                          <SelectItem value="full">Full Analytics</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => setShowRoleModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleUpdateRole}>
                    Update Role
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Access Control Modal */}
      {showAccessModal && selectedAdmin && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Access Control Settings</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAccessModal(false)}
                >
                  <XCircle className="h-6 w-6" />
                </Button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Session Timeout (minutes)</label>
                  <Input
                    type="number"
                    value={accessForm.sessionTimeout}
                    onChange={(e) => setAccessForm({...accessForm, sessionTimeout: parseInt(e.target.value)})}
                    min="5"
                    max="480"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Allowed IP Addresses</label>
                  <Input
                    placeholder="Enter IP addresses (comma separated)"
                    value={accessForm.allowedIPs.join(', ')}
                    onChange={(e) => setAccessForm({...accessForm, allowedIPs: e.target.value.split(',').map(ip => ip.trim())})}
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Leave empty to allow access from any IP address
                  </p>
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => setShowAccessModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleUpdateAccess}>
                    Update Access
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Audit Trail Modal */}
      {showAuditModal && selectedAdmin && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-2/3 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Audit Trail - {selectedAdmin.first_name} {selectedAdmin.last_name}</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAuditModal(false)}
                >
                  <XCircle className="h-6 w-6" />
                </Button>
              </div>

              <div className="space-y-4">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 font-medium text-gray-700">Date</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">Action</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">Reason</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">School</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditLogs.length === 0 ? (
                        <tr>
                          <td colSpan="4" className="text-center py-8 text-gray-500">
                            No audit logs found
                          </td>
                        </tr>
                      ) : (
                        auditLogs.map((log) => (
                          <tr key={log.id} className="border-b hover:bg-gray-50">
                            <td className="py-3 px-4 text-sm">
                              {formatDate(log.performed_at)}
                            </td>
                            <td className="py-3 px-4">
                              <Badge className={
                                log.action === 'admin_assigned' ? 'bg-green-100 text-green-800' :
                                log.action === 'admin_updated' ? 'bg-blue-100 text-blue-800' :
                                log.action === 'admin_removed' ? 'bg-red-100 text-red-800' :
                                'bg-gray-100 text-gray-800'
                              }>
                                {log.action.replace('_', ' ')}
                              </Badge>
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-900">
                              {log.reason || '-'}
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-900">
                              {log.school_name || '-'}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminProfileManagement;
