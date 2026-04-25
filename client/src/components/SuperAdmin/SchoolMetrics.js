import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Alert, AlertDescription } from '../ui/alert';
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Building2, 
  FileText,
  Download,
  Search,
  Filter,
  Loader2,
  BarChart3,
  PieChart,
  Activity,
  Calendar,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  RadialLinearScale
} from 'chart.js';
import { Line, Bar, Pie, Doughnut } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  RadialLinearScale
);

const SchoolMetrics = () => {
  const [schools, setSchools] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [trendData, setTrendData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [stateFilter, setStateFilter] = useState('all');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');
  const [page, setPage] = useState(0);
  const [pageSize] = useState(20);
  const [timeRange, setTimeRange] = useState('30');
  const [chartView, setChartView] = useState('overview');

  useEffect(() => {
    fetchMetrics();
    fetchSchools();
    fetchTrendData();
  }, [statusFilter, stateFilter, sortBy, sortOrder, page, timeRange]);

  const fetchMetrics = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/super-admin/metrics/overview', {
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
    }
  };

  const fetchSchools = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const params = new URLSearchParams({
        limit: pageSize,
        offset: page * pageSize,
        sortBy,
        order: sortOrder
      });

      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }
      if (stateFilter !== 'all') {
        params.append('stateId', stateFilter);
      }

      const response = await fetch(`/api/super-admin/schools/all?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch schools');
      }

      const data = await response.json();
      setSchools(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchTrendData = async () => {
    try {
      const token = localStorage.getItem('token');
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - parseInt(timeRange) * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      const response = await fetch(`/api/super-admin/metrics/trends?startDate=${startDate}&endDate=${endDate}&granularity=day`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch trend data');
      }

      const data = await response.json();
      setTrendData(data);
    } catch (err) {
      console.error('Error fetching trend data:', err);
      // Don't set error for trend data to avoid breaking the main component
    }
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const filteredSchools = schools.schools?.filter(school =>
    school.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    school.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    school.state_name?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'suspended': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getVerificationBadge = (isVerified) => {
    return isVerified ? (
      <Badge className="bg-green-100 text-green-800">Verified</Badge>
    ) : (
      <Badge variant="outline">Not Verified</Badge>
    );
  };

  const exportData = () => {
    const csvContent = [
      ['School Name', 'City', 'State', 'Type', 'Status', 'Verified', 'Total Users', 'Admins', 'Teachers', 'Students', 'Created Date'],
      ...filteredSchools.map(school => [
        school.name,
        school.city || 'N/A',
        school.state_name || 'N/A',
        school.type || 'N/A',
        school.status,
        school.is_verified ? 'Yes' : 'No',
        school.total_users || 0,
        school.admin_count || 0,
        school.teacher_count || 0,
        school.student_count || 0,
        formatDate(school.created_at)
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `schools-metrics-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Chart data preparation functions
  const getSchoolStatusChartData = () => {
    if (!metrics) return null;
    
    return {
      labels: ['Active', 'Pending', 'Rejected'],
      datasets: [{
        data: [
          metrics.schools.active_schools,
          metrics.schools.pending_schools,
          metrics.schools.rejected_schools
        ],
        backgroundColor: [
          'rgba(34, 197, 94, 0.8)',
          'rgba(251, 191, 36, 0.8)',
          'rgba(239, 68, 68, 0.8)'
        ],
        borderColor: [
          'rgb(34, 197, 94)',
          'rgb(251, 191, 36)',
          'rgb(239, 68, 68)'
        ],
        borderWidth: 1
      }]
    };
  };

  const getUserDistributionChartData = () => {
    if (!metrics) return null;
    
    return {
      labels: ['Admins', 'Teachers', 'Students'],
      datasets: [{
        data: [
          metrics.users.admin_users,
          metrics.users.teacher_users,
          metrics.users.student_users
        ],
        backgroundColor: [
          'rgba(59, 130, 246, 0.8)',
          'rgba(34, 197, 94, 0.8)',
          'rgba(168, 85, 247, 0.8)'
        ],
        borderColor: [
          'rgb(59, 130, 246)',
          'rgb(34, 197, 94)',
          'rgb(168, 85, 247)'
        ],
        borderWidth: 1
      }]
    };
  };

  const getTrendChartData = () => {
    if (!trendData || !trendData.schools) return null;
    
    return {
      labels: trendData.schools.map(item => {
        const date = new Date(item.period);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }),
      datasets: [
        {
          label: 'New Schools',
          data: trendData.schools.map(item => item.new_schools),
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          tension: 0.4
        },
        {
          label: 'New Users',
          data: trendData.users?.map(item => item.new_users) || [],
          borderColor: 'rgb(34, 197, 94)',
          backgroundColor: 'rgba(34, 197, 94, 0.1)',
          tension: 0.4
        }
      ]
    };
  };

  const getStateDistributionChartData = () => {
    if (!metrics || !metrics.byState) return null;
    
    const topStates = metrics.byState.slice(0, 10);
    
    return {
      labels: topStates.map(state => state.name),
      datasets: [{
        label: 'Schools by State',
        data: topStates.map(state => state.school_count),
        backgroundColor: 'rgba(168, 85, 247, 0.8)',
        borderColor: 'rgb(168, 85, 247)',
        borderWidth: 1
      }]
    };
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      tooltip: {
        mode: 'index',
        intersect: false,
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)'
        }
      },
      x: {
        grid: {
          display: false
        }
      }
    }
  };

  const pieChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right',
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const label = context.label || '';
            const value = context.parsed || 0;
            const total = context.dataset.data.reduce((a, b) => a + b, 0);
            const percentage = ((value / total) * 100).toFixed(1);
            return `${label}: ${value} (${percentage}%)`;
          }
        }
      }
    }
  };

  if (loading && !metrics) {
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
          <h2 className="text-2xl font-bold text-gray-900">School Metrics & Analytics</h2>
          <p className="text-gray-600 mt-1">
            Comprehensive overview of all schools and their performance
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={exportData} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Metrics Overview */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Schools</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.schools.total_schools}</div>
              <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                {metrics.recent?.new_schools > 0 ? (
                  <ArrowUpRight className="h-3 w-3 text-green-500" />
                ) : (
                  <ArrowDownRight className="h-3 w-3 text-red-500" />
                )}
                <span>{metrics.schools.active_schools} active</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.users.total_users}</div>
              <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                <Activity className="h-3 w-3 text-blue-500" />
                <span>{metrics.users.active_users} active</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Verified Schools</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{metrics.schools.verified_schools}</div>
              <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                <PieChart className="h-3 w-3 text-purple-500" />
                <span>{metrics.schools.public_schools} public</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{metrics.pending.pending_registrations}</div>
              <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                <TrendingDown className="h-3 w-3 text-red-500" />
                <span>Need review</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* School Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <PieChart className="h-5 w-5" />
              <span>School Status Distribution</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {getSchoolStatusChartData() && (
                <Doughnut data={getSchoolStatusChartData()} options={pieChartOptions} />
              )}
            </div>
          </CardContent>
        </Card>

        {/* User Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <span>User Distribution</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {getUserDistributionChartData() && (
                <Pie data={getUserDistributionChartData()} options={pieChartOptions} />
              )}
            </div>
          </CardContent>
        </Card>

        {/* Registration Trends */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5" />
              <span>Registration Trends (Last {timeRange} days)</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              {getTrendChartData() ? (
                <Line data={getTrendChartData()} options={chartOptions} />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  No trend data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* State Distribution */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5" />
              <span>Schools by State (Top 10)</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {getStateDistributionChartData() ? (
                <Bar data={getStateDistributionChartData()} options={chartOptions} />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  No state data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters & Search</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search schools..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>

            <Select value={stateFilter} onValueChange={setStateFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by state" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All States</SelectItem>
                {metrics?.byState?.map(state => (
                  <SelectItem key={state.code} value={state.code}>
                    {state.name} ({state.school_count})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger>
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="created_at">Created Date</SelectItem>
                <SelectItem value="name">School Name</SelectItem>
                <SelectItem value="total_users">Total Users</SelectItem>
                <SelectItem value="status">Status</SelectItem>
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

      {/* Schools Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Schools Directory</CardTitle>
          <p className="text-sm text-gray-600">
            Showing {filteredSchools.length} of {schools.pagination?.total || 0} schools
          </p>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : filteredSchools.length === 0 ? (
            <div className="text-center py-8">
              <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No schools found</h3>
              <p className="text-gray-600">
                {searchTerm || statusFilter !== 'all' || stateFilter !== 'all' 
                  ? 'Try adjusting your filters' 
                  : 'No schools have been registered yet'
                }
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium text-gray-700">
                      <button
                        onClick={() => handleSort('name')}
                        className="flex items-center space-x-1 hover:text-gray-900"
                      >
                        <span>School Name</span>
                        {sortBy === 'name' && (
                          sortOrder === 'asc' ? '↑' : '↓'
                        )}
                      </button>
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Location</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Type</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Status</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">
                      <button
                        onClick={() => handleSort('total_users')}
                        className="flex items-center space-x-1 hover:text-gray-900"
                      >
                        <span>Users</span>
                        {sortBy === 'total_users' && (
                          sortOrder === 'asc' ? '↑' : '↓'
                        )}
                      </button>
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Distribution</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSchools.map((school) => (
                    <tr key={school.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-gray-900">{school.name}</span>
                          {getVerificationBadge(school.is_verified)}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-600">
                        {school.city}, {school.state_name}
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="outline" className="capitalize">
                          {school.type}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <Badge className={getStatusColor(school.status)}>
                          {school.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-center">
                          <span className="font-medium">{school.total_users || 0}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2 text-xs">
                          <span className="text-blue-600">{school.admin_count || 0}A</span>
                          <span className="text-green-600">{school.teacher_count || 0}T</span>
                          <span className="text-purple-600">{school.student_count || 0}S</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-600">
                        {formatDate(school.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {schools.pagination && schools.pagination.total > pageSize && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Showing {page * pageSize + 1} to {Math.min((page + 1) * pageSize, schools.pagination.total)} of {schools.pagination.total} schools
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(Math.max(0, page - 1))}
              disabled={page === 0}
            >
              Previous
            </Button>
            <span className="text-sm text-gray-600">
              Page {page + 1} of {Math.ceil(schools.pagination.total / pageSize)}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page + 1)}
              disabled={!schools.pagination.hasMore}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SchoolMetrics;
