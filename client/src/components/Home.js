import React from 'react';
import { Link } from 'react-router-dom';
import { FaUserGraduate, FaChalkboardTeacher, FaUserShield } from 'react-icons/fa';

const Home = () => {
  return (
    <div className="min-h-screen bg-gray-100">
      {/* Hero Section */}
      <div className="bg-blue-600 text-white">
        <div className="max-w-7xl mx-auto py-16 px-4 sm:py-24 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
              Welcome to School Portal
            </h1>
            <p className="mt-6 max-w-2xl mx-auto text-xl">
              Access your academic information, track your progress, and stay connected with your education journey.
            </p>
          </div>
        </div>
      </div>

      {/* Portal Sections */}
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {/* Student Portal */}
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="p-6">
              <div className="flex items-center justify-center h-12 w-12 rounded-md bg-blue-500 text-white mb-4">
                <FaUserGraduate className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-medium text-gray-900">Student Portal</h3>
              <p className="mt-2 text-base text-gray-500">
                Access your academic records, view results, and manage your profile.
              </p>
              <div className="mt-6">
                <Link
                  to="/login"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
                >
                  Student Login
                </Link>
              </div>
            </div>
          </div>

          {/* Teacher Portal */}
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="p-6">
              <div className="flex items-center justify-center h-12 w-12 rounded-md bg-green-500 text-white mb-4">
                <FaChalkboardTeacher className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-medium text-gray-900">Teacher Portal</h3>
              <p className="mt-2 text-base text-gray-500">
                Manage classes, upload results, and track student progress.
              </p>
              <div className="mt-6">
                <Link
                  to="/login"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700"
                >
                  Teacher Login
                </Link>
              </div>
            </div>
          </div>

          {/* Admin Portal */}
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="p-6">
              <div className="flex items-center justify-center h-12 w-12 rounded-md bg-purple-500 text-white mb-4">
                <FaUserShield className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-medium text-gray-900">Admin Portal</h3>
              <p className="mt-2 text-base text-gray-500">
                Manage users, view reports, and oversee school operations.
              </p>
              <div className="mt-6">
                <Link
                  to="/login"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700"
                >
                  Admin Login
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="mt-16">
          <h2 className="text-3xl font-extrabold text-gray-900 text-center mb-8">
            Key Features
          </h2>
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Academic Records</h3>
              <p className="text-gray-500">Access your complete academic history and performance records.</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Result Tracking</h3>
              <p className="text-gray-500">View and download your academic results and progress reports.</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Profile Management</h3>
              <p className="text-gray-500">Update your personal information and academic preferences.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home; 