// School Dashboard Component
// Provides school-branded dashboard with tenant awareness

import React, { useState, useEffect, useContext } from 'react';
import { useSubdomainContext } from './SubdomainRouter';
import { AuthContext } from '../context/AuthContext';
import apiClient from '../services/subdomainApi';
import { 
  Users, 
  BookOpen, 
  FileText, 
  TrendingUp, 
  Calendar,
  Bell,
  Settings,
  LogOut,
  Home,
  ChevronRight
} from 'lucide-react';

const SchoolDashboard = ({ userRole = 'student' }) => {
  const { schoolContext, isOnSubdomain, currentSubdomain } = useSubdomainContext();
  const { user, isAuthenticated } = useContext(AuthContext);
  
  const [dashboardData, setDashboardData] = useState({
    stats: null,
    recentActivity: null,
    upcomingExams: null,
    notifications: []
  });
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isAuthenticated && schoolContext) {
      fetchDashboardData();
    }
  }, [isAuthenticated, schoolContext, userRole]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch dashboard data based on user role
      const [stats, activity, exams, notifications] = await Promise.all([
        fetchStats(),
        fetchRecentActivity(),
        fetchUpcomingExams(),
        fetchNotifications()
      ]);
      
      setDashboardData({
        stats,
        recentActivity: activity,
        upcomingExams: exams,
        notifications
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await apiClient.get('/dashboard/stats');
      return response.data;
    } catch (error) {
      console.warn('Could not fetch stats:', error);
      return getDefaultStats();
    }
  };

  const fetchRecentActivity = async () => {
    try {
      const response = await apiClient.get('/dashboard/activity');
      return response.data;
    } catch (error) {
      console.warn('Could not fetch activity:', error);
      return [];
    }
  };

  const fetchUpcomingExams = async () => {
    try {
      const response = await apiClient.get('/dashboard/exams/upcoming');
      return response.data;
    } catch (error) {
      console.warn('Could not fetch upcoming exams:', error);
      return [];
    }
  };

  const fetchNotifications = async () => {
    try {
      const response = await apiClient.get('/notifications', { limit: 5 });
      return response.data;
    } catch (error) {
      console.warn('Could not fetch notifications:', error);
      return [];
    }
  };

  const getDefaultStats = () => {
    switch (userRole) {
      case 'student':
        return {
          totalExams: 0,
          completedExams: 0,
          averageScore: 0,
          pendingSubmissions: 0
        };
      case 'teacher':
        return {
          totalExams: 0,
          activeExams: 0,
          totalStudents: 0,
          pendingGrading: 0
        };
      case 'admin':
        return {
          totalUsers: 0,
          totalExams: 0,
          activeExams: 0,
          totalSubmissions: 0
        };
      default:
        return {};
    }
  };

  const handleLogout = async () => {
    try {
      await apiClient.logout();
      window.location.href = '/login';
    } catch (error) {
      console.error('Logout error:', error);
      window.location.href = '/login';
    }
  };

  const handleNotificationClick = async (notificationId) => {
    try {
      await apiClient.markNotificationAsRead(notificationId);
      // Refresh notifications
      fetchDashboardData();
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const renderStatCards = () => {
    if (!dashboardData.stats) return null;

    const stats = dashboardData.stats;
    
    switch (userRole) {
      case 'student':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard
              title="Total Exams"
              value={stats.totalExams}
              icon={<BookOpen className="h-6 w-6" />}
              color="blue"
            />
            <StatCard
              title="Completed"
              value={stats.completedExams}
              icon={<FileText className="h-6 w-6" />}
              color="green"
            />
            <StatCard
              title="Average Score"
              value={`${stats.averageScore}%`}
              icon={<TrendingUp className="h-6 w-6" />}
              color="purple"
            />
            <StatCard
              title="Pending"
              value={stats.pendingSubmissions}
              icon={<Calendar className="h-6 w-6" />}
              color="orange"
            />
          </div>
        );
      
      case 'teacher':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard
              title="Total Exams"
              value={stats.totalExams}
              icon={<BookOpen className="h-6 w-6" />}
              color="blue"
            />
            <StatCard
              title="Active"
              value={stats.activeExams}
              icon={<Calendar className="h-6 w-6" />}
              color="green"
            />
            <StatCard
              title="Students"
              value={stats.totalStudents}
              icon={<Users className="h-6 w-6" />}
              color="purple"
            />
            <StatCard
              title="To Grade"
              value={stats.pendingGrading}
              icon={<FileText className="h-6 w-6" />}
              color="orange"
            />
          </div>
        );
      
      case 'admin':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard
              title="Total Users"
              value={stats.totalUsers}
              icon={<Users className="h-6 w-6" />}
              color="blue"
            />
            <StatCard
              title="Total Exams"
              value={stats.totalExams}
              icon={<BookOpen className="h-6 w-6" />}
              color="green"
            />
            <StatCard
              title="Active"
              value={stats.activeExams}
              icon={<Calendar className="h-6 w-6" />}
              color="purple"
            />
            <StatCard
              title="Submissions"
              value={stats.totalSubmissions}
              icon={<FileText className="h-6 w-6" />}
              color="orange"
            />
          </div>
        );
      
      default:
        return null;
    }
  };

  const renderRecentActivity = () => {
    if (!dashboardData.recentActivity || dashboardData.recentActivity.length === 0) {
      return (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
          <p className="text-gray-500">No recent activity</p>
        </div>
      );
    }

    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
        <div className="space-y-3">
          {dashboardData.recentActivity.slice(0, 5).map((activity, index) => (
            <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded">
              <div className="flex-shrink-0">
                {getActivityIcon(activity.type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {activity.title}
                </p>
                <p className="text-sm text-gray-500">
                  {activity.description}
                </p>
              </div>
              <div className="flex-shrink-0 text-xs text-gray-500">
                {formatDate(activity.createdAt)}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderUpcomingExams = () => {
    if (!dashboardData.upcomingExams || dashboardData.upcomingExams.length === 0) {
      return (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Upcoming Exams</h3>
          <p className="text-gray-500">No upcoming exams</p>
        </div>
      );
    }

    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Upcoming Exams</h3>
        <div className="space-y-3">
          {dashboardData.upcomingExams.map((exam) => (
            <div key={exam.id} className="flex items-center justify-between p-3 bg-gray-50 rounded hover:bg-gray-100 transition-colors">
              <div className="flex-1">
                <h4 className="text-sm font-medium text-gray-900">{exam.title}</h4>
                <p className="text-sm text-gray-500">
                  {exam.duration_minutes} minutes • {exam.questions_count} questions
                </p>
              </div>
              <div className="flex-shrink-0">
                <span className="text-sm text-gray-500">
                  {formatDate(exam.scheduled_date)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderNotifications = () => {
    if (!dashboardData.notifications || dashboardData.notifications.length === 0) {
      return null;
    }

    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
          <Bell className="h-5 w-5 text-gray-400" />
        </div>
        <div className="space-y-2">
          {dashboardData.notifications.map((notification) => (
            <div
              key={notification.id}
              className={`flex items-start space-x-3 p-3 rounded cursor-pointer transition-colors ${
                notification.is_read ? 'bg-gray-50' : 'bg-blue-50 hover:bg-blue-100'
              }`}
              onClick={() => handleNotificationClick(notification.id)}
            >
              <div className="flex-shrink-0">
                <div className={`w-2 h-2 rounded-full mt-2 ${
                  notification.is_read ? 'bg-gray-300' : 'bg-blue-600'
                }`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">
                  {notification.title}
                </p>
                <p className="text-sm text-gray-500">
                  {notification.message}
                </p>
              </div>
              <div className="flex-shrink-0 text-xs text-gray-500">
                {formatDate(notification.created_at)}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 mb-4">Error</div>
          <p className="text-gray-600">{error}</p>
          <button
            onClick={fetchDashboardData}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="school-dashboard">
      {/* School Header */}
      {schoolContext && (
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
          <div className="container mx-auto px-4 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center">
                  <span className="text-blue-600 font-bold text-xl">
                    {schoolContext.name.charAt(0)}
                  </span>
                </div>
                <div>
                  <h1 className="text-2xl font-bold">{schoolContext.name}</h1>
                  <p className="text-blue-100">
                    {userRole.charAt(0).toUpperCase() + userRole.slice(1)} Dashboard
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-blue-100">
                  {user?.first_name} {user?.last_name}
                </span>
                <button
                  onClick={handleLogout}
                  className="bg-white bg-opacity-20 hover:bg-opacity-30 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Dashboard Content */}
      <div className="container mx-auto px-4 py-8">
        {/* Welcome Message */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900">
            Welcome back, {user?.first_name}!
          </h2>
          <p className="text-gray-600">
            Here's what's happening at {schoolContext?.name || 'your school'}
          </p>
        </div>

        {/* Stats Cards */}
        {renderStatCards()}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {renderRecentActivity()}
            {renderUpcomingExams()}
          </div>
          <div className="space-y-6">
            {renderNotifications()}
            
            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="space-y-2">
                {getQuickActions().map((action, index) => (
                  <button
                    key={index}
                    onClick={action.onClick}
                    className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      {action.icon}
                      <span className="text-sm font-medium text-gray-900">{action.label}</span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-gray-400" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper Components
const StatCard = ({ title, value, icon, color }) => {
  const colorClasses = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    purple: 'bg-purple-500',
    orange: 'bg-orange-500'
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center">
        <div className={`${colorClasses[color]} p-3 rounded-lg text-white`}>
          {icon}
        </div>
        <div className="ml-4">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  );
};

// Helper Functions
const getActivityIcon = (type) => {
  const icons = {
    exam_created: <BookOpen className="h-4 w-4 text-blue-600" />,
    exam_submitted: <FileText className="h-4 w-4 text-green-600" />,
    user_registered: <Users className="h-4 w-4 text-purple-600" />,
    exam_graded: <TrendingUp className="h-4 w-4 text-orange-600" />
  };
  return icons[type] || <div className="h-4 w-4 bg-gray-400 rounded" />;
};

const formatDate = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now - date);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) {
    return 'Today';
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  } else {
    return date.toLocaleDateString();
  }
};

const getQuickActions = () => {
  // This would be implemented based on user role
  return [
    {
      label: 'View Profile',
      icon: <Users className="h-4 w-4 text-gray-600" />,
      onClick: () => console.log('Navigate to profile')
    },
    {
      label: 'Settings',
      icon: <Settings className="h-4 w-4 text-gray-600" />,
      onClick: () => console.log('Navigate to settings')
    }
  ];
};

export default SchoolDashboard;
