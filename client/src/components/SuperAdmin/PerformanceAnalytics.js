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
  ArrowUp,
  ArrowDown,
  Eye,
  Star,
  Award,
  Activity
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
} from 'chart.js';
import { Bar, Radar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const PerformanceAnalytics = () => {
  const [analytics, setAnalytics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('total_users');
  const [sortOrder, setSortOrder] = useState('desc');
  const [schoolType, setSchoolType] = useState('all');
  const [stateCode, setStateCode] = useState('all');
  const [page, setPage] = useState(0);
  const [pageSize] = useState(20);
  const [selectedSchools, setSelectedSchools] = useState([]);
  const [showComparison, setShowComparison] = useState(false);
  const [pagination, setPagination] = useState(null);

  useEffect(() => {
    fetchAnalytics();
  }, [sortBy, sortOrder, schoolType, stateCode, page]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const params = new URLSearchParams({
        sortBy,
        order: sortOrder,
        limit: pageSize,
        offset: page * pageSize
      });

      if (schoolType !== 'all') {
        params.append('schoolType', schoolType);
      }
      if (stateCode !== 'all') {
        params.append('stateCode', stateCode);
      }

      const response = await fetch(`/api/super-admin/metrics/performance-analytics?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch performance analytics');
      }

      const data = await response.json();
      setAnalytics(data.analytics);
      setPagination(data.pagination);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
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

  const toggleSchoolSelection = (school) => {
    setSelectedSchools(prev => {
      const isSelected = prev.some(s => s.id === school.id);
      if (isSelected) {
        return prev.filter(s => s.id !== school.id);
      } else {
        if (prev.length >= 5) {
          alert('You can compare up to 5 schools at a time');
          return prev;
        }
        return [...prev, school];
      }
    });
  };

  const getPerformanceColor = (value, type) => {
    if (type === 'rate') {
      if (value >= 80) return 'text-green-600';
      if (value >= 60) return 'text-yellow-600';
      return 'text-red-600';
    }
    if (type === 'score') {
      if (value >= 85) return 'text-green-600';
      if (value >= 70) return 'text-yellow-600';
      return 'text-red-600';
    }
    return 'text-gray-600';
  };

  const getPerformanceBadge = (value, type) => {
    let color, label;
    if (type === 'rate') {
      if (value >= 80) {
        color = 'bg-green-100 text-green-800';
        label = 'Excellent';
      } else if (value >= 60) {
        color = 'bg-yellow-100 text-yellow-800';
        label = 'Good';
      } else {
        color = 'bg-red-100 text-red-800';
        label = 'Poor';
      }
    } else if (type === 'growth') {
      if (value === 'new') {
        color = 'bg-blue-100 text-blue-800';
        label = 'New';
      } else if (value === 'recent') {
        color = 'bg-purple-100 text-purple-800';
        label = 'Recent';
      } else {
        color = 'bg-gray-100 text-gray-800';
        label = 'Established';
      }
    }
    return <Badge className={color}>{label}</Badge>;
  };

  const getComparisonChartData = () => {
    if (selectedSchools.length === 0) return null;

    return {
      labels: ['Total Users', 'Active Rate (%)', 'Submission Rate (%)', 'Avg Score', 'Admins', 'Teachers', 'Students'],
      datasets: selectedSchools.map((school, index) => ({
        label: school.name,
        data: [
          school.total_users,
          school.user_activity_rate,
          school.submission_rate,
          school.avg_score || 0,
          school.admin_count,
          school.teacher_count,
          school.student_count
        ],
        backgroundColor: [
          `rgba(${59 + index * 40}, ${130 + index * 30}, ${246 - index * 20}, 0.8)`
        ],
        borderColor: [
          `rgb(${59 + index * 40}, ${130 + index * 30}, ${246 - index * 20})`
        ],
        borderWidth: 1
      }))
    };
  };

  const getRadarChartData = () => {
    if (selectedSchools.length === 0) return null;

    return {
      labels: ['User Activity', 'Exam Participation', 'Performance', 'Growth', 'Engagement'],
      datasets: selectedSchools.map((school, index) => ({
        label: school.name,
        data: [
          Math.min(school.user_activity_rate, 100),
          Math.min(school.submission_rate, 100),
          Math.min((school.avg_score || 0) * 2, 100), // Scale score to 0-100
          school.growth_stage === 'new' ? 100 : school.growth_stage === 'recent' ? 70 : 50,
          Math.min((school.total_users / 10), 100) // Simple engagement metric
        ],
        backgroundColor: `rgba(${59 + index * 40}, ${130 + index * 30}, ${246 - index * 20}, 0.2)`,
        borderColor: `rgb(${59 + index * 40}, ${130 + index * 30}, ${246 - index * 20})`,
        borderWidth: 2,
        pointBackgroundColor: `rgb(${59 + index * 40}, ${130 + index * 30}, ${246 - index * 20})`
      }))
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

  const radarOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      }
    },
    scales: {
      r: {
        beginAtZero: true,
        max: 100,
        ticks: {
          stepSize: 20
        }
      }
    }
  };

  const exportAnalytics = () => {
    const csvContent = [
      [
        'School Name', 'City', 'State', 'Type', 'Total Users', 'Active Users', 
        'Activity Rate', 'Total Exams', 'Submissions', 'Submission Rate', 
        'Avg Score', 'Admins', 'Teachers', 'Students', 'Growth Stage'
      ],
      ...analytics.map(school => [
        school.name,
        school.city,
        school.state_name,
        school.type,
        school.total_users,
        school.active_users,
        `${school.user_activity_rate}%`,
        school.total_exams,
        school.total_submissions,
        `${school.submission_rate}%`,
        school.avg_score || 'N/A',
        school.admin_count,
        school.teacher_count,
        school.student_count,
        school.growth_stage
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `performance-analytics-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const filteredAnalytics = analytics.filter(school =>
    school.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    school.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    school.state_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading && analytics.length === 0) {
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
          <h2 className="text-2xl font-bold text-gray-900">Performance Analytics</h2>
          <p className="text-gray-600 mt-1">
            Compare school performance and identify trends
          </p>
        </div>
        <div className="flex items-center space-x-3">
          {selectedSchools.length > 0 && (
            <Button 
              onClick={() => setShowComparison(!showComparison)}
              variant="outline"
            >
              <Eye className="h-4 w-4 mr-2" />
              Compare ({selectedSchools.length})
            </Button>
          )}
          <Button onClick={exportAnalytics} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* School Comparison Charts */}
      {showComparison && selectedSchools.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BarChart3 className="h-5 w-5" />
                <span>Performance Comparison</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                {getComparisonChartData() && (
                  <Bar data={getComparisonChartData()} options={chartOptions} />
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Activity className="h-5 w-5" />
                <span>Overall Performance Radar</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                {getRadarChartData() && (
                  <Radar data={getRadarChartData()} options={radarOptions} />
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters & Search</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search schools..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={schoolType} onValueChange={setSchoolType}>
              <SelectTrigger>
                <SelectValue placeholder="School Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="primary">Primary</SelectItem>
                <SelectItem value="secondary">Secondary</SelectItem>
                <SelectItem value="tertiary">Tertiary</SelectItem>
                <SelectItem value="vocational">Vocational</SelectItem>
              </SelectContent>
            </Select>

            <Select value={stateCode} onValueChange={setStateCode}>
              <SelectTrigger>
                <SelectValue placeholder="State" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All States</SelectItem>
                {/* States will be populated from API */}
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger>
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="total_users">Total Users</SelectItem>
                <SelectItem value="user_activity_rate">Activity Rate</SelectItem>
                <SelectItem value="submission_rate">Submission Rate</SelectItem>
                <SelectItem value="avg_score">Average Score</SelectItem>
                <SelectItem value="total_exams">Total Exams</SelectItem>
                <SelectItem value="name">School Name</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortOrder} onValueChange={setSortOrder}>
              <SelectTrigger>
                <SelectValue placeholder="Order" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="desc">Descending</SelectItem>
                <SelectItem value="asc">Ascending</SelectItem>
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

      {/* Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">School Performance Rankings</CardTitle>
          <p className="text-sm text-gray-600">
            Showing {filteredAnalytics.length} schools
          </p>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : filteredAnalytics.length === 0 ? (
            <div className="text-center py-8">
              <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No schools found</h3>
              <p className="text-gray-600">
                {searchTerm || schoolType !== 'all' || stateCode !== 'all' 
                  ? 'Try adjusting your filters' 
                  : 'No schools available for analysis'
                }
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Compare</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">
                      <button
                        onClick={() => handleSort('name')}
                        className="flex items-center space-x-1 hover:text-gray-900"
                      >
                        <span>School</span>
                        {sortBy === 'name' && (
                          sortOrder === 'asc' ? '↑' : '↓'
                        )}
                      </button>
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Location</th>
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
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Activity Rate</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Submission Rate</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Avg Score</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Performance</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAnalytics.map((school, index) => (
                    <tr key={school.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <input
                          type="checkbox"
                          checked={selectedSchools.some(s => s.id === school.id)}
                          onChange={() => toggleSchoolSelection(school)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                      </td>
                      <td className="py-3 px-4">
                        <div>
                          <div className="font-medium text-gray-900">{school.name}</div>
                          <div className="flex items-center space-x-2 mt-1">
                            <Badge variant="outline" className="capitalize text-xs">
                              {school.type}
                            </Badge>
                            {getPerformanceBadge(school.growth_stage, 'growth')}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-600">
                        {school.city}, {school.state_name}
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-center">
                          <div className="font-medium">{school.total_users}</div>
                          <div className="text-xs text-gray-500">
                            {school.active_users} active
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-center">
                          <div className={`font-medium ${getPerformanceColor(school.user_activity_rate, 'rate')}`}>
                            {school.user_activity_rate}%
                          </div>
                          {school.user_activity_rate >= 80 && <Award className="h-4 w-4 text-green-500 mx-auto" />}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-center">
                          <div className={`font-medium ${getPerformanceColor(school.submission_rate, 'rate')}`}>
                            {school.submission_rate}%
                          </div>
                          {school.submission_rate >= 80 && <Star className="h-4 w-4 text-green-500 mx-auto" />}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-center">
                          <div className={`font-medium ${getPerformanceColor(school.avg_score, 'score')}`}>
                            {school.avg_score || 'N/A'}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center">
                          {index < 3 && (
                            <div className="flex items-center space-x-1">
                              {index === 0 && <Award className="h-5 w-5 text-yellow-500" />}
                              {index === 1 && <Award className="h-5 w-5 text-gray-400" />}
                              {index === 2 && <Award className="h-5 w-5 text-orange-600" />}
                              <span className="text-sm font-medium">#{index + 1}</span>
                            </div>
                          )}
                          {index >= 3 && (
                            <span className="text-sm text-gray-500">#{index + 1}</span>
                          )}
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

      {/* Pagination */}
      {pagination && pagination.total > pageSize && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Showing {page * pageSize + 1} to {Math.min((page + 1) * pageSize, pagination.total)} of {pagination.total} schools
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
              Page {page + 1} of {Math.ceil(pagination.total / pageSize)}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page + 1)}
              disabled={!pagination.hasMore}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PerformanceAnalytics;
