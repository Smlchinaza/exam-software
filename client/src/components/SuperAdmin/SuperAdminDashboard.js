import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Building2, 
  FileText, 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  // eslint-disable-next-line
  Eye,
  LogOut,
  Menu,
  X,
  BarChart3,
  ClipboardList
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
  };

  // Navigation items with icons
  const navItems = [
    { id: 'overview', label: 'Overview', icon: TrendingUp },
    { id: 'approvals', label: 'Approvals', icon: FileText },
    { id: 'metrics', label: 'Metrics', icon: BarChart3 },
    { id: 'admins', label: 'Admin Mgmt', icon: Users },
    { id: 'audit', label: 'Audit Log', icon: ClipboardList }
  ];

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
      <div className="space-y-4 sm:space-y-6">
        {/* Key Metrics Cards - Mobile Optimized */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-shrink-0">
                <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Total Schools</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900">{metrics.schools.total_schools}</p>
                <p className="text-xs text-gray-500">
                  {metrics.schools.active_schools} active
                </p>
              </div>
              <Building2 className="h-6 w-6 sm:h-8 sm:w-8 text-blue-500 flex-shrink-0" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-shrink-0">
                <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Total Users</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900">{metrics.users.total_users}</p>
                <p className="text-xs text-gray-500">
                  {metrics.users.active_users} active
                </p>
              </div>
              <Users className="h-6 w-6 sm:h-8 sm:w-8 text-green-500 flex-shrink-0" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-shrink-0">
                <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Pending</p>
                <p className="text-xl sm:text-2xl font-bold text-orange-600">
                  {metrics.pending.pending_registrations}
                </p>
                <p className="text-xs text-gray-500">
                  Awaiting review
                </p>
              </div>
              <Clock className="h-6 w-6 sm:h-8 sm:w-8 text-orange-500 flex-shrink-0" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-shrink-0">
                <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Verified</p>
                <p className="text-xl sm:text-2xl font-bold text-green-600">
                  {metrics.schools.verified_schools}
                </p>
                <p className="text-xs text-gray-500">
                  Quality approved
                </p>
              </div>
              <CheckCircle className="h-6 w-6 sm:h-8 sm:w-8 text-green-500 flex-shrink-0" />
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">Recent Activity (7 days)</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">New Schools</span>
                <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-sm font-medium">{metrics.recent.new_schools}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">New Users</span>
                <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-sm font-medium">{metrics.recent.new_users}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">New Registrations</span>
                <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-sm font-medium">{metrics.recent.new_registrations}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">Top States</h3>
            <div className="space-y-2 sm:space-y-3">
              {metrics.byState.slice(0, 5).map((state, index) => (
                <div key={state.code} className="flex items-center justify-between min-w-0">
                  <div className="flex items-center space-x-2 min-w-0">
                    <span className="text-sm font-medium text-gray-900 flex-shrink-0">{index + 1}.</span>
                    <span className="text-sm text-gray-600 truncate">{state.state_name}</span>
                  </div>
                  <div className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0">
                    <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs sm:text-sm font-medium">{state.school_count}</span>
                    <span className="text-xs text-green-600">
                      ({state.active_count})
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* User Distribution - Mobile Optimized */}
        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">User Distribution</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <div className="text-center">
              <div className="text-lg sm:text-2xl font-bold text-blue-600">{metrics.users.admin_users}</div>
              <p className="text-xs sm:text-sm text-gray-600 mt-1">Admins</p>
            </div>
            <div className="text-center">
              <div className="text-lg sm:text-2xl font-bold text-green-600">{metrics.users.teacher_users}</div>
              <p className="text-xs sm:text-sm text-gray-600 mt-1">Teachers</p>
            </div>
            <div className="text-center">
              <div className="text-lg sm:text-2xl font-bold text-purple-600">{metrics.users.student_users}</div>
              <p className="text-xs sm:text-sm text-gray-600 mt-1">Students</p>
            </div>
            <div className="text-center">
              <div className="text-lg sm:text-2xl font-bold text-gray-600">{metrics.users.total_users}</div>
              <p className="text-xs sm:text-sm text-gray-600 mt-1">Total</p>
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
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Mobile-Optimized Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-40">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14 sm:h-16">
            {/* Logo/Title */}
            <div className="flex items-center space-x-2 min-w-0 flex-1">
              <h1 className="text-base sm:text-lg font-semibold text-gray-900 truncate">
                Super Admin
              </h1>
              <span className="hidden sm:inline px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">Dashboard</span>
            </div>

            {/* Right Actions - Mobile and Desktop */}
            <div className="flex items-center space-x-2 sm:space-x-4 flex-shrink-0">
              <div className="hidden sm:block">
                <span className="text-xs sm:text-sm text-gray-600">
                  {user?.firstName} {user?.lastName}
                </span>
              </div>
              <button 
                onClick={handleLogout}
                className="hidden sm:flex px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 items-center"
              >
                <LogOut className="h-4 w-4 mr-1" />
                <span className="hidden md:inline">Logout</span>
              </button>
              
              {/* Mobile Menu Toggle */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="sm:hidden inline-flex items-center justify-center p-2 rounded-md text-gray-700 hover:bg-gray-100"
              >
                {mobileMenuOpen ? (
                  <X className="h-6 w-6" />
                ) : (
                  <Menu className="h-6 w-6" />
                )}
              </button>
            </div>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="sm:hidden pb-4 border-t">
              <div className="py-3 border-b mb-3">
                <p className="text-sm text-gray-600 truncate">
                  {user?.firstName} {user?.lastName}
                </p>
              </div>
              <button 
                onClick={handleLogout}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 flex items-center justify-center"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </button>
            </div>
          )}
        </div>
      </header>

      <div className="flex-1 flex flex-col">
        <div className="flex-1 px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
          {/* Main Content */}
          <main>
            {renderContent()}
          </main>
        </div>

        {/* Mobile-Optimized Tab Navigation - Bottom Bar */}
        <nav className="sticky bottom-0 bg-white border-t border-gray-200 md:hidden">
          <div className="flex overflow-x-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => handleTabChange(item.id)}
                  className={`flex-1 flex flex-col items-center justify-center min-w-fit px-3 py-2 text-xs font-medium transition-colors ${
                    activeTab === item.id
                      ? 'text-blue-600 border-t-2 border-blue-600'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Icon className="h-5 w-5 mb-1" />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </div>
        </nav>

        {/* Desktop Horizontal Tab Navigation */}
        <div className="hidden md:block bg-white border-t border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <nav className="flex space-x-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleTabChange(item.id)}
                    className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center space-x-2 ${
                      activeTab === item.id
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminDashboard;
