import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Building2, 
  FileText, 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  Eye,
  LogOut
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import SchoolApprovalSimple from './SchoolApprovalSimple';
import SchoolMetricsSimple from './SchoolMetricsSimple';
import AdminAssignment from './AdminAssignment';
import AuditLogSimple from './AuditLogSimple';
import { API_URL } from '../../services/api';

const SuperAdminDashboard = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (activeTab === 'overview') {
      fetchMetrics();
    }
  }, [activeTab]);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/super-admin/metrics/overview`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch metrics');
      }

      const data = await response.json();
      setMetrics(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
  };

  const renderOverview = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="text-red-800">Error loading metrics: {error}</div>
        </div>
      );
    }

    if (!metrics) return null;

    return (
      <div className="space-y-6">
        {/* Key Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Schools</p>
                <p className="text-2xl font-bold text-gray-900">{metrics.schools.total_schools}</p>
                <p className="text-xs text-gray-500">
                  {metrics.schools.active_schools} active
                </p>
              </div>
              <Building2 className="h-8 w-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Users</p>
                <p className="text-2xl font-bold text-gray-900">{metrics.users.total_users}</p>
                <p className="text-xs text-gray-500">
                  {metrics.users.active_users} active
                </p>
              </div>
              <Users className="h-8 w-8 text-green-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Requests</p>
                <p className="text-2xl font-bold text-orange-600">
                  {metrics.pending.pending_registrations}
                </p>
                <p className="text-xs text-gray-500">
                  Awaiting review
                </p>
              </div>
              <Clock className="h-8 w-8 text-orange-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Verified Schools</p>
                <p className="text-2xl font-bold text-green-600">
                  {metrics.schools.verified_schools}
                </p>
                <p className="text-xs text-gray-500">
                  Quality approved
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity (7 days)</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">New Schools</span>
                <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-sm">{metrics.recent.new_schools}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">New Users</span>
                <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-sm">{metrics.recent.new_users}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">New Registrations</span>
                <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-sm">{metrics.recent.new_registrations}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Top States</h3>
            <div className="space-y-3">
              {metrics.byState.slice(0, 5).map((state, index) => (
                <div key={state.code} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-900">{index + 1}.</span>
                    <span className="text-sm text-gray-600">{state.state_name}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-sm">{state.school_count}</span>
                    <span className="text-xs text-green-600">
                      ({state.active_count} active)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* User Distribution */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">User Distribution</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{metrics.users.admin_users}</div>
              <p className="text-sm text-gray-600">Administrators</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{metrics.users.teacher_users}</div>
              <p className="text-sm text-gray-600">Teachers</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{metrics.users.student_users}</div>
              <p className="text-sm text-gray-600">Students</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-600">{metrics.users.total_users}</div>
              <p className="text-sm text-gray-600">Total Users</p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return renderOverview();
      case 'approvals':
        return <SchoolApprovalSimple />;
      case 'metrics':
        return <SchoolMetricsSimple />;
      case 'admins':
        return <AdminAssignment />;
      case 'audit':
        return <AuditLogSimple />;
      default:
        return renderOverview();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-semibold text-gray-900">
                Super Admin Dashboard
              </h1>
              <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-sm">Super Admin</span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                {user?.firstName} {user?.lastName}
              </span>
              <button 
                onClick={handleLogout}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <LogOut className="h-4 w-4 inline mr-2" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation Tabs */}
        <div className="mb-8">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-3 py-2 text-sm font-medium rounded-md ${
                activeTab === 'overview'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <TrendingUp className="h-4 w-4 inline mr-2" />
              Overview
            </button>
            <button
              onClick={() => setActiveTab('approvals')}
              className={`px-3 py-2 text-sm font-medium rounded-md ${
                activeTab === 'approvals'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <FileText className="h-4 w-4 inline mr-2" />
              School Approvals
            </button>
            <button
              onClick={() => setActiveTab('metrics')}
              className={`px-3 py-2 text-sm font-medium rounded-md ${
                activeTab === 'metrics'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <TrendingUp className="h-4 w-4 inline mr-2" />
              Metrics & Analytics
            </button>
            <button
              onClick={() => setActiveTab('admins')}
              className={`px-3 py-2 text-sm font-medium rounded-md ${
                activeTab === 'admins'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Users className="h-4 w-4 inline mr-2" />
              Admin Management
            </button>
            <button
              onClick={() => setActiveTab('audit')}
              className={`px-3 py-2 text-sm font-medium rounded-md ${
                activeTab === 'audit'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Eye className="h-4 w-4 inline mr-2" />
              Audit Log
            </button>
          </nav>
        </div>

        {/* Main Content */}
        <main>
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default SuperAdminDashboard;
