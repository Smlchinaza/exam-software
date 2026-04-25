import React, { useState, useEffect } from 'react';
import { superAdminApi } from '../../services/superAdminApi';
import { 
  Settings, 
  Plus, 
  Edit, 
  Trash2, 
  Mail, 
  Phone, 
  Calendar,
  Search,
  Filter,
  RefreshCw,
  Shield,
  AlertCircle,
  CheckCircle,
  XCircle
} from 'lucide-react';

const AdminAssignment = () => {
  const [loading, setLoading] = useState(true);
  const [schools, setSchools] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [selectedSchool, setSelectedSchool] = useState(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    status: '',
    schoolId: ''
  });

  // Form states
  const [newAdminForm, setNewAdminForm] = useState({
    schoolId: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });

  const [editAdminForm, setEditAdminForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    isActive: true,
    permissions: {}
  });

  useEffect(() => {
    fetchSchools();
    fetchAdmins();
  }, [filters, searchTerm]);

  const fetchSchools = async () => {
    try {
      const data = await superAdminApi.getAllSchools({
        status: 'active',
        limit: 100
      });
      setSchools(data.schools || []);
    } catch (err) {
      console.error('Failed to fetch schools:', err);
    }
  };

  const fetchAdmins = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const params = new URLSearchParams({
        limit: 100,
        offset: 0
      });

      if (filters.status) {
        params.append('status', filters.status);
      }
      if (filters.schoolId) {
        params.append('schoolId', filters.schoolId);
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
    } catch (err) {
      console.error('Failed to fetch admins:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignAdmin = async () => {
    try {
      // Validate form
      if (!newAdminForm.firstName || !newAdminForm.lastName || !newAdminForm.email || !newAdminForm.password) {
        alert('All required fields must be filled');
        return;
      }

      if (newAdminForm.password !== newAdminForm.confirmPassword) {
        alert('Passwords do not match');
        return;
      }

      const adminData = {
        schoolId: newAdminForm.schoolId,
        firstName: newAdminForm.firstName,
        lastName: newAdminForm.lastName,
        email: newAdminForm.email,
        phone: newAdminForm.phone,
        password: newAdminForm.password,
        permissions: newAdminForm.permissions || {}
      };

      const token = localStorage.getItem('token');
      const response = await fetch('/api/super-admin/admins/assign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(adminData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to assign admin');
      }

      const result = await response.json();
      setShowAssignModal(false);
      setNewAdminForm({
        schoolId: '',
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        password: '',
        confirmPassword: '',
        permissions: {}
      });
      fetchAdmins();
      
      // Show success message
      console.log('Admin assigned successfully');
    } catch (err) {
      console.error('Failed to assign admin:', err);
    }
  };

  const handleUpdateAdmin = async () => {
    try {
      if (!selectedAdmin) return;

      const updateData = {
        firstName: editAdminForm.firstName,
        lastName: editAdminForm.lastName,
        email: editAdminForm.email,
        phone: editAdminForm.phone,
        isActive: editAdminForm.isActive,
        permissions: editAdminForm.permissions
      };

      const token = localStorage.getItem('token');
      const response = await fetch(`/api/super-admin/admins/${selectedAdmin.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updateData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update admin');
      }

      setShowEditModal(false);
      setSelectedAdmin(null);
      fetchAdmins();
      console.log('Admin updated successfully');
    } catch (err) {
      console.error('Failed to update admin:', err);
    }
  };

  const handleRemoveAdmin = async (adminId) => {
    if (!confirm('Are you sure you want to remove this admin? This action cannot be undone.')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/super-admin/admins/${adminId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ reason: 'Removed by super admin' })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to remove admin');
      }

      fetchAdmins();
      console.log('Admin removed successfully');
    } catch (err) {
      console.error('Failed to remove admin:', err);
    }
  };

  const openEditModal = (admin) => {
    setSelectedAdmin(admin);
    setEditAdminForm({
      firstName: admin.first_name,
      lastName: admin.last_name,
      email: admin.email,
      phone: admin.phone || '',
      isActive: admin.is_active,
      permissions: admin.permissions || {}
    });
    setShowEditModal(true);
  };

  const filteredAdmins = admins.filter(admin => {
    const matchesSearch = admin.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         admin.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         admin.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSchool = !filters.schoolId || admin.school_id === filters.schoolId;
    const matchesStatus = !filters.status || 
                         (filters.status === 'active' && admin.is_active) ||
                         (filters.status === 'inactive' && !admin.is_active);
    
    return matchesSearch && matchesSchool && matchesStatus;
  });

  if (loading && admins.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Admin Management</h2>
          <p className="text-gray-600 mt-1">
            Manage school administrators and their permissions
          </p>
        </div>
        <button
          onClick={() => setShowAssignModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
        >
          <Plus className="h-4 w-4 mr-2" />
          Assign New Admin
        </button>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
            <div className="relative">
              <Search className="h-5 w-5 text-gray-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name or email..."
                className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">School</label>
            <select
              value={filters.schoolId}
              onChange={(e) => setFilters({...filters, schoolId: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Schools</option>
              {schools.map(school => (
                <option key={school.id} value={school.id}>{school.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({...filters, status: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      {/* Admins List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900">School Administrators</h3>
          <div className="text-sm text-gray-500">
            {filteredAdmins.length} admin{filteredAdmins.length !== 1 ? 's' : ''}
          </div>
        </div>

        {filteredAdmins.length === 0 ? (
          <div className="p-8 text-center">
            <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No administrators found</h3>
            <p className="text-gray-600">
              {searchTerm || filters.schoolId || filters.status 
                ? 'Try adjusting your search or filters' 
                : 'No administrators have been assigned yet'}
            </p>
            {!searchTerm && !filters.schoolId && !filters.status && (
              <button
                onClick={() => setShowAssignModal(true)}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Assign First Admin
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Admin
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    School
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Activity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredAdmins.map((admin) => (
                  <tr key={admin.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
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
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{admin.school_name || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {admin.phone && (
                          <div className="flex items-center">
                            <Phone className="h-4 w-4 mr-1 text-gray-400" />
                            {admin.phone}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        admin.is_active 
                          ? 'text-green-600 bg-green-100' 
                          : 'text-gray-600 bg-gray-100'
                      }`}>
                        {admin.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        <div className="flex items-center space-x-2">
                          <span className="text-blue-600">{admin.recent_exams || 0} exams</span>
                          <span className="text-green-600">{admin.recent_submissions || 0} submissions</span>
                        </div>
                        {admin.last_login && (
                          <div className="text-xs text-gray-500">
                            Last login: {new Date(admin.last_login).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                        {new Date(admin.created_at).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => openEditModal(admin)}
                          className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50"
                          title="Edit Admin"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleRemoveAdmin(admin.id)}
                          className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50"
                          title="Remove Admin"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Assign Admin Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Assign New Admin</h3>
                <button
                  onClick={() => setShowAssignModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">School *</label>
                    <select
                      value={newAdminForm.schoolId}
                      onChange={(e) => setNewAdminForm({...newAdminForm, schoolId: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      required
                    >
                      <option value="">Select School</option>
                      {schools.map(school => (
                        <option key={school.id} value={school.id}>{school.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">First Name *</label>
                    <input
                      type="text"
                      value={newAdminForm.firstName}
                      onChange={(e) => setNewAdminForm({...newAdminForm, firstName: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Last Name *</label>
                    <input
                      type="text"
                      value={newAdminForm.lastName}
                      onChange={(e) => setNewAdminForm({...newAdminForm, lastName: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                    <input
                      type="email"
                      value={newAdminForm.email}
                      onChange={(e) => setNewAdminForm({...newAdminForm, email: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                    <input
                      type="tel"
                      value={newAdminForm.phone}
                      onChange={(e) => setNewAdminForm({...newAdminForm, phone: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Password *</label>
                    <input
                      type="password"
                      value={newAdminForm.password}
                      onChange={(e) => setNewAdminForm({...newAdminForm, password: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Confirm Password *</label>
                    <input
                      type="password"
                      value={newAdminForm.confirmPassword}
                      onChange={(e) => setNewAdminForm({...newAdminForm, confirmPassword: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                </div>

                {/* Permissions Section */}
                <div className="border-t pt-4">
                  <h4 className="text-md font-medium text-gray-900 mb-4">Permissions</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Manage Schools</label>
                      <select
                        value={newAdminForm.permissions?.manageSchools || 'none'}
                        onChange={(e) => setNewAdminForm({
                          ...newAdminForm, 
                          permissions: {...newAdminForm.permissions, manageSchools: e.target.value}
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="none">No Access</option>
                        <option value="read">Read Only</option>
                        <option value="write">Read & Write</option>
                        <option value="full">Full Access</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Manage Users</label>
                      <select
                        value={newAdminForm.permissions?.manageUsers || 'none'}
                        onChange={(e) => setNewAdminForm({
                          ...newAdminForm, 
                          permissions: {...newAdminForm.permissions, manageUsers: e.target.value}
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="none">No Access</option>
                        <option value="read">Read Only</option>
                        <option value="write">Read & Write</option>
                        <option value="full">Full Access</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Manage Exams</label>
                      <select
                        value={newAdminForm.permissions?.manageExams || 'none'}
                        onChange={(e) => setNewAdminForm({
                          ...newAdminForm, 
                          permissions: {...newAdminForm.permissions, manageExams: e.target.value}
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="none">No Access</option>
                        <option value="read">Read Only</option>
                        <option value="write">Read & Write</option>
                        <option value="full">Full Access</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">View Analytics</label>
                      <select
                        value={newAdminForm.permissions?.viewAnalytics || 'none'}
                        onChange={(e) => setNewAdminForm({
                          ...newAdminForm, 
                          permissions: {...newAdminForm.permissions, viewAnalytics: e.target.value}
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="none">No Access</option>
                        <option value="basic">Basic Reports</option>
                        <option value="advanced">Advanced Analytics</option>
                        <option value="full">Full Analytics</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t">
                  <button
                    onClick={() => setShowAssignModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAssignAdmin}
                    className="px-4 py-2 border border-blue-300 rounded-md text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100"
                  >
                    Assign Admin
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Admin Modal */}
      {showEditModal && selectedAdmin && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Edit Admin</h3>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">First Name</label>
                    <input
                      type="text"
                      value={editAdminForm.firstName}
                      onChange={(e) => setEditAdminForm({...editAdminForm, firstName: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
                    <input
                      type="text"
                      value={editAdminForm.lastName}
                      onChange={(e) => setEditAdminForm({...editAdminForm, lastName: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                    <input
                      type="email"
                      value={editAdminForm.email}
                      onChange={(e) => setEditAdminForm({...editAdminForm, email: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                    <input
                      type="tel"
                      value={editAdminForm.phone}
                      onChange={(e) => setEditAdminForm({...editAdminForm, phone: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={editAdminForm.isActive}
                    onChange={(e) => setEditAdminForm({...editAdminForm, isActive: e.target.checked})}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900">
                    Active Status
                  </label>
                </div>

                {/* Permissions Section */}
                <div className="border-t pt-4">
                  <h4 className="text-md font-medium text-gray-900 mb-4">Permissions</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Manage Schools</label>
                      <select
                        value={editAdminForm.permissions?.manageSchools || 'none'}
                        onChange={(e) => setEditAdminForm({
                          ...editAdminForm, 
                          permissions: {...editAdminForm.permissions, manageSchools: e.target.value}
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="none">No Access</option>
                        <option value="read">Read Only</option>
                        <option value="write">Read & Write</option>
                        <option value="full">Full Access</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Manage Users</label>
                      <select
                        value={editAdminForm.permissions?.manageUsers || 'none'}
                        onChange={(e) => setEditAdminForm({
                          ...editAdminForm, 
                          permissions: {...editAdminForm.permissions, manageUsers: e.target.value}
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="none">No Access</option>
                        <option value="read">Read Only</option>
                        <option value="write">Read & Write</option>
                        <option value="full">Full Access</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Manage Exams</label>
                      <select
                        value={editAdminForm.permissions?.manageExams || 'none'}
                        onChange={(e) => setEditAdminForm({
                          ...editAdminForm, 
                          permissions: {...editAdminForm.permissions, manageExams: e.target.value}
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="none">No Access</option>
                        <option value="read">Read Only</option>
                        <option value="write">Read & Write</option>
                        <option value="full">Full Access</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">View Analytics</label>
                      <select
                        value={editAdminForm.permissions?.viewAnalytics || 'none'}
                        onChange={(e) => setEditAdminForm({
                          ...editAdminForm, 
                          permissions: {...editAdminForm.permissions, viewAnalytics: e.target.value}
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="none">No Access</option>
                        <option value="basic">Basic Reports</option>
                        <option value="advanced">Advanced Analytics</option>
                        <option value="full">Full Analytics</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t">
                  <button
                    onClick={() => setShowEditModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUpdateAdmin}
                    className="px-4 py-2 border border-blue-300 rounded-md text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100"
                  >
                    Update Admin
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

export default AdminAssignment;
