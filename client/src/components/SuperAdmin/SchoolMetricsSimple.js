import React, { useState, useEffect, useCallback } from 'react';
import { superAdminApi } from '../../services/superAdminApi';
import { 
  Building2, 
  Users, 
  CheckCircle, 
  Clock, 
  TrendingUp, 
  Download,
  Filter,
  RefreshCw,
  MapPin,
  Calendar
} from 'lucide-react';

const SchoolMetricsSimple = () => {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState(null);
  const [schools, setSchools] = useState([]);
  const [filters, setFilters] = useState({
    status: '',
    stateId: '',
    dateRange: '7d'
  });
  const [showFilters, setShowFilters] = useState(false);

  const fetchMetrics = useCallback(async () => {
    try {
      setLoading(true);
      const data = await superAdminApi.getSystemMetrics(filters);
      setMetrics(data);
    } catch (err) {
      console.error('Failed to fetch metrics:', err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const fetchSchools = useCallback(async () => {
    try {
      const data = await superAdminApi.getAllSchools({
        status: filters.status,
        stateId: filters.stateId,
        limit: 50
      });
      setSchools(data.schools || []);
    } catch (err) {
      console.error('Failed to fetch schools:', err);
    }
  }, [filters.status, filters.stateId]);

  useEffect(() => {
    fetchMetrics();
    fetchSchools();
  }, [filters, fetchMetrics, fetchSchools]);

  const handleExportCSV = () => {
    if (!schools.length) return;

    const csvContent = [
      ['School Name', 'City', 'State', 'Type', 'Status', 'Total Users', 'Admins', 'Teachers', 'Students'],
      ...schools.map(school => [
        school.name,
        school.city,
        school.state_name,
        school.type,
        school.status,
        school.total_users,
        school.admin_count,
        school.teacher_count,
        school.student_count
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `schools-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-100';
      case 'pending': return 'text-orange-600 bg-orange-100';
      case 'rejected': return 'text-red-600 bg-red-100';
      case 'suspended': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (loading && !metrics) {
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
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Metrics & Analytics</h2>
          <p className="text-xs sm:text-sm text-gray-600 mt-1">
            Performance overview and insights
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="px-2 sm:px-3 py-1 sm:py-2 border border-gray-300 rounded-md text-xs sm:text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 flex items-center gap-1"
          >
            <Filter className="h-4 w-4" />
            <span className="hidden sm:inline">Filters</span>
          </button>
          <button
            onClick={handleExportCSV}
            disabled={!schools.length}
            className="px-2 sm:px-3 py-1 sm:py-2 border border-gray-300 rounded-md text-xs sm:text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 flex items-center gap-1 disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Export</span>
          </button>
          <button
            onClick={() => {
              fetchMetrics();
              fetchSchools();
            }}
            className="px-2 sm:px-3 py-1 sm:py-2 border border-gray-300 rounded-md text-xs sm:text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 flex items-center gap-1"
          >
            <RefreshCw className="h-4 w-4" />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Filters</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">Status</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({...filters, status: e.target.value})}
                className="w-full px-2 sm:px-3 py-1 sm:py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="rejected">Rejected</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">Date Range</label>
              <select
                value={filters.dateRange}
                onChange={(e) => setFilters({...filters, dateRange: e.target.value})}
                className="w-full px-2 sm:px-3 py-1 sm:py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
                <option value="90d">Last 90 Days</option>
                <option value="1y">Last Year</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Key Metrics Cards - Mobile Optimized */}
      {metrics && (
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
        </div>
      )}

      {/* Recent Activity - Mobile Optimized */}
      {metrics && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs sm:text-sm text-gray-600">New Schools</span>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs sm:text-sm font-medium">
                    {metrics.recent.new_schools}
                  </span>
                  {metrics.recent.new_schools > 0 && <TrendingUp className="h-4 w-4 text-green-500" />}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs sm:text-sm text-gray-600">New Users</span>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs sm:text-sm font-medium">
                    {metrics.recent.new_users}
                  </span>
                  {metrics.recent.new_users > 0 && <TrendingUp className="h-4 w-4 text-green-500" />}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs sm:text-sm text-gray-600">New Registrations</span>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs sm:text-sm font-medium">
                    {metrics.recent.new_registrations}
                  </span>
                  {metrics.recent.new_registrations > 0 && <TrendingUp className="h-4 w-4 text-green-500" />}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">User Distribution</h3>
            <div className="space-y-3 sm:space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs sm:text-sm text-gray-600">Administrators</span>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="w-16 sm:w-24 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full" 
                      style={{width: `${(metrics.users.admin_users / metrics.users.total_users) * 100}%`}}
                    ></div>
                  </div>
                  <span className="text-xs sm:text-sm font-medium text-gray-900 w-8 text-right">{metrics.users.admin_users}</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs sm:text-sm text-gray-600">Teachers</span>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="w-16 sm:w-24 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-600 h-2 rounded-full" 
                      style={{width: `${(metrics.users.teacher_users / metrics.users.total_users) * 100}%`}}
                    ></div>
                  </div>
                  <span className="text-sm font-medium text-gray-900">{metrics.users.teacher_users}</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Students</span>
                <div className="flex items-center space-x-2">
                  <div className="w-24 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-purple-600 h-2 rounded-full" 
                      style={{width: `${(metrics.users.student_users / metrics.users.total_users) * 100}%`}}
                    ></div>
                  </div>
                  <span className="text-sm font-medium text-gray-900">{metrics.users.student_users}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Schools Table - Mobile Optimized */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900">Schools Directory</h3>
        </div>
        
        {schools.length === 0 ? (
          <div className="p-6 sm:p-8 text-center">
            <Building2 className="h-12 sm:h-16 w-12 sm:w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">No schools found</h3>
            <p className="text-xs sm:text-sm text-gray-600">
              {filters.status || filters.stateId ? 'Try adjusting your filters' : 'No schools have been registered yet'}
            </p>
          </div>
        ) : (
          <>
            {/* Mobile Card View */}
            <div className="md:hidden space-y-3">
              {schools.map((school) => (
                <div key={school.id} className="border-b p-4 last:border-b-0">
                  <div className="flex items-start justify-between mb-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-gray-900 truncate">{school.name}</p>
                      <p className="text-xs text-gray-600">{school.type}</p>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full whitespace-nowrap ml-2 flex-shrink-0 ${getStatusColor(school.status)}`}>
                      {school.status}
                    </span>
                  </div>
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center text-gray-600">
                      <MapPin className="h-3 w-3 mr-1 flex-shrink-0" />
                      <span className="truncate">{school.city}, {school.state_name}</span>
                    </div>
                    <div className="flex items-center text-gray-600">
                      <Calendar className="h-3 w-3 mr-1 flex-shrink-0" />
                      <span>{formatDate(school.created_at)}</span>
                    </div>
                    <div className="text-gray-600">
                      👥 {school.total_users} total | 🔑 {school.admin_count} | 👨‍🏫 {school.teacher_count} | 👨‍🎓 {school.student_count}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      School
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Location
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Users
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {schools.map((school) => (
                    <tr key={school.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{school.name}</div>
                          <div className="text-sm text-gray-500">{school.type}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center text-sm text-gray-900">
                          <MapPin className="h-4 w-4 mr-2 text-gray-400" />
                          <span className="truncate">{school.city}, {school.state_name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(school.status)}`}>
                            {school.status}
                          </span>
                          {school.is_verified && (
                            <CheckCircle className="h-4 w-4 text-green-500" title="Verified" />
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {school.total_users} total
                        </div>
                        <div className="text-xs text-gray-500">
                          {school.admin_count}A, {school.teacher_count}T, {school.student_count}S
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                          {formatDate(school.created_at)}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default SchoolMetricsSimple;
