import React, { useState } from 'react';
import { 
  BarChart3, 
  Users, 
  Shield, 
  Settings, 
  Key, 
  TrendingUp,
  School,
  Database,
  Mail,
  Lock
} from 'lucide-react';
import SuperAdminPasswordDashboard from './SuperAdminPasswordDashboard';

const SuperAdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('passwords');

  const menuItems = [
    {
      id: 'passwords',
      label: 'Password Management',
      icon: Key,
      description: 'Reset and manage admin passwords'
    },
    {
      id: 'admins',
      label: 'Admin Management',
      icon: Users,
      description: 'Manage school administrators'
    },
    {
      id: 'schools',
      label: 'School Management',
      icon: School,
      description: 'Manage registered schools'
    },
    {
      id: 'analytics',
      label: 'Analytics',
      icon: BarChart3,
      description: 'View system analytics and metrics'
    },
    {
      id: 'security',
      label: 'Security',
      icon: Shield,
      description: 'Security settings and monitoring'
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: Settings,
      description: 'System configuration'
    }
  ];

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'passwords':
        return <SuperAdminPasswordDashboard />;
      case 'admins':
        return <div className="p-6"><h2 className="text-2xl font-bold">Admin Management</h2><p className="text-gray-600 mt-2">Manage school administrators</p></div>;
      case 'schools':
        return <div className="p-6"><h2 className="text-2xl font-bold">School Management</h2><p className="text-gray-600 mt-2">Manage registered schools</p></div>;
      case 'analytics':
        return <div className="p-6"><h2 className="text-2xl font-bold">Analytics</h2><p className="text-gray-600 mt-2">View system analytics and metrics</p></div>;
      case 'security':
        return <div className="p-6"><h2 className="text-2xl font-bold">Security</h2><p className="text-gray-600 mt-2">Security settings and monitoring</p></div>;
      case 'settings':
        return <div className="p-6"><h2 className="text-2xl font-bold">Settings</h2><p className="text-gray-600 mt-2">System configuration</p></div>;
      default:
        return <SuperAdminPasswordDashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <Shield className="h-8 w-8 text-blue-600 mr-3" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Super Admin Dashboard</h1>
                <p className="text-sm text-gray-500">Manage and monitor the entire system</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-500">
                Welcome back, Super Admin
              </div>
              <div className="h-8 w-8 bg-blue-600 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium">SA</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8" aria-label="Tabs">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`${
                    activeTab === item.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm`}
                >
                  <Icon
                    className={`${
                      activeTab === item.id ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'
                    } -ml-0.5 mr-2 h-5 w-5`}
                    aria-hidden="true"
                  />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Quick Stats Bar */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <School className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-500">Total Schools</p>
                <p className="text-lg font-semibold text-gray-900">156</p>
              </div>
            </div>
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <Users className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-500">Total Admins</p>
                <p className="text-lg font-semibold text-gray-900">1,247</p>
              </div>
            </div>
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Lock className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-500">Password Resets</p>
                <p className="text-lg font-semibold text-gray-900">23</p>
              </div>
            </div>
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-500">Active Today</p>
                <p className="text-lg font-semibold text-gray-900">89%</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Content */}
        {renderActiveTab()}
      </div>
    </div>
  );
};

export default SuperAdminDashboard;
