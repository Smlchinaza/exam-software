import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Alert, AlertDescription } from '../ui/alert';
import { 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  Download,
  Loader2,
  BarChart3,
  LineChart,
  Activity,
  Users,
  Building2,
  FileText,
  RefreshCw
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
import { Line, Bar } from 'react-chartjs-2';

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

const TrendAnalysis = () => {
  const [trendData, setTrendData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [startDate, setStartDate] = useState(
    new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [granularity, setGranularity] = useState('day');
  const [selectedMetrics, setSelectedMetrics] = useState(['all']);
  const [chartType, setChartType] = useState('line');

  useEffect(() => {
    fetchTrendData();
  }, [startDate, endDate, granularity, selectedMetrics]);

  const fetchTrendData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const params = new URLSearchParams({
        startDate,
        endDate,
        granularity
      });

      if (selectedMetrics.length > 0 && !selectedMetrics.includes('all')) {
        params.append('metric', selectedMetrics.join(','));
      }

      const response = await fetch(`${API_URL}/super-admin/metrics/trends?${params}`, {
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
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getSchoolTrendChartData = () => {
    if (!trendData || !trendData.schools) return null;

    return {
      labels: trendData.schools.map(item => {
        const date = new Date(item.period);
        if (granularity === 'week') {
          return `Week ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
        }
        if (granularity === 'month') {
          return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        }
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
          label: 'Active Schools',
          data: trendData.schools.map(item => item.active_schools),
          borderColor: 'rgb(34, 197, 94)',
          backgroundColor: 'rgba(34, 197, 94, 0.1)',
          tension: 0.4
        }
      ]
    };
  };

  const getUserTrendChartData = () => {
    if (!trendData || !trendData.users) return null;

    return {
      labels: trendData.users.map(item => {
        const date = new Date(item.period);
        if (granularity === 'week') {
          return `Week ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
        }
        if (granularity === 'month') {
          return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        }
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }),
      datasets: [
        {
          label: 'Total Users',
          data: trendData.users.map(item => item.new_users),
          borderColor: 'rgb(168, 85, 247)',
          backgroundColor: 'rgba(168, 85, 247, 0.1)',
          tension: 0.4
        },
        {
          label: 'Admins',
          data: trendData.users.map(item => item.new_admins),
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          tension: 0.4
        },
        {
          label: 'Teachers',
          data: trendData.users.map(item => item.new_teachers),
          borderColor: 'rgb(34, 197, 94)',
          backgroundColor: 'rgba(34, 197, 94, 0.1)',
          tension: 0.4
        },
        {
          label: 'Students',
          data: trendData.users.map(item => item.new_students),
          borderColor: 'rgb(251, 191, 36)',
          backgroundColor: 'rgba(251, 191, 36, 0.1)',
          tension: 0.4
        }
      ]
    };
  };

  const getExamTrendChartData = () => {
    if (!trendData || !trendData.exams) return null;

    return {
      labels: trendData.exams.map(item => {
        const date = new Date(item.period);
        if (granularity === 'week') {
          return `Week ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
        }
        if (granularity === 'month') {
          return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        }
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }),
      datasets: [
        {
          label: 'New Exams',
          data: trendData.exams.map(item => item.new_exams),
          borderColor: 'rgb(239, 68, 68)',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          tension: 0.4,
          yAxisID: 'y'
        },
        {
          label: 'Exam Submissions',
          data: trendData.exams.map(item => item.exam_submissions),
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          tension: 0.4,
          yAxisID: 'y'
        },
        {
          label: 'Average Score',
          data: trendData.exams.map(item => item.avg_score || 0),
          borderColor: 'rgb(34, 197, 94)',
          backgroundColor: 'rgba(34, 197, 94, 0.1)',
          tension: 0.4,
          yAxisID: 'y1'
        }
      ]
    };
  };

  const getRegistrationTrendChartData = () => {
    if (!trendData || !trendData.registrations) return null;

    return {
      labels: trendData.registrations.map(item => {
        const date = new Date(item.period);
        if (granularity === 'week') {
          return `Week ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
        }
        if (granularity === 'month') {
          return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        }
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }),
      datasets: [
        {
          label: 'Total Requests',
          data: trendData.registrations.map(item => item.total_requests),
          backgroundColor: 'rgba(168, 85, 247, 0.8)',
          borderColor: 'rgb(168, 85, 247)',
          borderWidth: 1
        },
        {
          label: 'Approved',
          data: trendData.registrations.map(item => item.approved_requests),
          backgroundColor: 'rgba(34, 197, 94, 0.8)',
          borderColor: 'rgb(34, 197, 94)',
          borderWidth: 1
        },
        {
          label: 'Rejected',
          data: trendData.registrations.map(item => item.rejected_requests),
          backgroundColor: 'rgba(239, 68, 68, 0.8)',
          borderColor: 'rgb(239, 68, 68)',
          borderWidth: 1
        },
        {
          label: 'Pending',
          data: trendData.registrations.map(item => item.pending_requests),
          backgroundColor: 'rgba(251, 191, 36, 0.8)',
          borderColor: 'rgb(251, 191, 36)',
          borderWidth: 1
        }
      ]
    };
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
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

  const dualAxisOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
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
        type: 'linear',
        display: true,
        position: 'left',
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)'
        }
      },
      y1: {
        type: 'linear',
        display: true,
        position: 'right',
        beginAtZero: true,
        grid: {
          drawOnChartArea: false,
        }
      },
      x: {
        grid: {
          display: false
        }
      }
    }
  };

  const exportTrendData = () => {
    if (!trendData) return;

    let csvContent = ['Date,Category,Metric,Value'];
    
    // Add school trends
    if (trendData.schools) {
      trendData.schools.forEach(item => {
        csvContent.push(`${item.period},Schools,New Schools,${item.new_schools}`);
        csvContent.push(`${item.period},Schools,Active Schools,${item.active_schools}`);
      });
    }

    // Add user trends
    if (trendData.users) {
      trendData.users.forEach(item => {
        csvContent.push(`${item.period},Users,Total Users,${item.new_users}`);
        csvContent.push(`${item.period},Users,Admins,${item.new_admins}`);
        csvContent.push(`${item.period},Users,Teachers,${item.new_teachers}`);
        csvContent.push(`${item.period},Users,Students,${item.new_students}`);
      });
    }

    // Add exam trends
    if (trendData.exams) {
      trendData.exams.forEach(item => {
        csvContent.push(`${item.period},Exams,New Exams,${item.new_exams}`);
        csvContent.push(`${item.period},Exams,Submissions,${item.exam_submissions}`);
        csvContent.push(`${item.period},Exams,Average Score,${item.avg_score || 0}`);
      });
    }

    // Add registration trends
    if (trendData.registrations) {
      trendData.registrations.forEach(item => {
        csvContent.push(`${item.period},Registrations,Total Requests,${item.total_requests}`);
        csvContent.push(`${item.period},Registrations,Approved,${item.approved_requests}`);
        csvContent.push(`${item.period},Registrations,Rejected,${item.rejected_requests}`);
        csvContent.push(`${item.period},Registrations,Pending,${item.pending_requests}`);
      });
    }

    const blob = new Blob([csvContent.join('\n')], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trend-analysis-${startDate}-to-${endDate}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getQuickDateRange = (days) => {
    const end = new Date();
    const start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000);
    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
  };

  const calculateGrowthRate = (data) => {
    if (!data || data.length < 2) return 0;
    const first = data[0];
    const last = data[data.length - 1];
    const firstValue = first.new_schools || first.new_users || first.total_requests || 0;
    const lastValue = last.new_schools || last.new_users || last.total_requests || 0;
    return firstValue > 0 ? ((lastValue - firstValue) / firstValue * 100).toFixed(1) : 0;
  };

  if (loading && !trendData) {
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
          <h2 className="text-2xl font-bold text-gray-900">Trend Analysis</h2>
          <p className="text-gray-600 mt-1">
            Analyze system growth and performance trends over time
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button 
            onClick={fetchTrendData} 
            variant="outline" 
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={exportTrendData} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Date Range and Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Date Range & Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Quick Date Ranges */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quick Range
              </label>
              <div className="flex flex-wrap gap-2">
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => getQuickDateRange(7)}
                >
                  7 days
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => getQuickDateRange(30)}
                >
                  30 days
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => getQuickDateRange(90)}
                >
                  90 days
                </Button>
              </div>
            </div>

            {/* Custom Date Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Granularity
              </label>
              <Select value={granularity} onValueChange={setGranularity}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Daily</SelectItem>
                  <SelectItem value="week">Weekly</SelectItem>
                  <SelectItem value="month">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Metrics Selection */}
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Metrics to Display
            </label>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant={selectedMetrics.includes('all') ? "default" : "outline"}
                onClick={() => setSelectedMetrics(['all'])}
              >
                All Metrics
              </Button>
              <Button
                size="sm"
                variant={selectedMetrics.includes('schools') ? "default" : "outline"}
                onClick={() => setSelectedMetrics(['schools'])}
              >
                <Building2 className="h-4 w-4 mr-1" />
                Schools
              </Button>
              <Button
                size="sm"
                variant={selectedMetrics.includes('users') ? "default" : "outline"}
                onClick={() => setSelectedMetrics(['users'])}
              >
                <Users className="h-4 w-4 mr-1" />
                Users
              </Button>
              <Button
                size="sm"
                variant={selectedMetrics.includes('exams') ? "default" : "outline"}
                onClick={() => setSelectedMetrics(['exams'])}
              >
                <FileText className="h-4 w-4 mr-1" />
                Exams
              </Button>
              <Button
                size="sm"
                variant={selectedMetrics.includes('registrations') ? "default" : "outline"}
                onClick={() => setSelectedMetrics(['registrations'])}
              >
                <Activity className="h-4 w-4 mr-1" />
                Registrations
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Growth Summary */}
      {trendData && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">School Growth</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {calculateGrowthRate(trendData.schools)}%
              </div>
              <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                {calculateGrowthRate(trendData.schools) > 0 ? (
                  <TrendingUp className="h-3 w-3 text-green-500" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-red-500" />
                )}
                <span>vs previous period</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">User Growth</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {calculateGrowthRate(trendData.users)}%
              </div>
              <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                {calculateGrowthRate(trendData.users) > 0 ? (
                  <TrendingUp className="h-3 w-3 text-green-500" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-red-500" />
                )}
                <span>vs previous period</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Exam Activity</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {trendData.exams?.reduce((sum, item) => sum + item.exam_submissions, 0) || 0}
              </div>
              <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                <Activity className="h-3 w-3 text-blue-500" />
                <span>Total submissions</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Registration Rate</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {trendData.registrations?.reduce((sum, item) => sum + item.approved_requests, 0) || 0}
              </div>
              <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                <TrendingUp className="h-3 w-3 text-green-500" />
                <span>Approved requests</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Charts */}
      <div className="space-y-6">
        {/* School Trends */}
        {(!selectedMetrics.includes('all') && !selectedMetrics.includes('schools')) || (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Building2 className="h-5 w-5" />
                <span>School Registration Trends</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                {getSchoolTrendChartData() ? (
                  chartType === 'line' ? (
                    <Line data={getSchoolTrendChartData()} options={chartOptions} />
                  ) : (
                    <Bar data={getSchoolTrendChartData()} options={chartOptions} />
                  )
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    No school data available
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* User Trends */}
        {(!selectedMetrics.includes('all') && !selectedMetrics.includes('users')) || (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="h-5 w-5" />
                <span>User Registration Trends</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                {getUserTrendChartData() ? (
                  chartType === 'line' ? (
                    <Line data={getUserTrendChartData()} options={chartOptions} />
                  ) : (
                    <Bar data={getUserTrendChartData()} options={chartOptions} />
                  )
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    No user data available
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Exam Trends */}
        {(!selectedMetrics.includes('all') && !selectedMetrics.includes('exams')) || (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="h-5 w-5" />
                <span>Exam Activity Trends</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                {getExamTrendChartData() ? (
                  chartType === 'line' ? (
                    <Line data={getExamTrendChartData()} options={dualAxisOptions} />
                  ) : (
                    <Bar data={getExamTrendChartData()} options={dualAxisOptions} />
                  )
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    No exam data available
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Registration Trends */}
        {(!selectedMetrics.includes('all') && !selectedMetrics.includes('registrations')) || (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Activity className="h-5 w-5" />
                <span>Registration Request Trends</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                {getRegistrationTrendChartData() ? (
                  <Bar data={getRegistrationTrendChartData()} options={chartOptions} />
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    No registration data available
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default TrendAnalysis;
