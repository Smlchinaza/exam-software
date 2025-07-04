import React from 'react';
import { Link } from 'react-router-dom';
import { FaUserGraduate, FaChalkboardTeacher, FaUserShield } from 'react-icons/fa';

const Home = () => {
  return (
    <div className="min-h-screen bg-gray-100">
      {/* Hero Section */}
      <div className="bg-white">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:py-16 sm:px-6 lg:py-24 lg:px-8">
          <div className="text-center">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold text-gray-900 sm:tracking-tight">
              Welcome to School Portal
            </h1>
            <p className="mt-4 sm:mt-6 max-w-2xl mx-auto text-base sm:text-lg md:text-xl text-gray-500">
              A comprehensive platform for students, teachers, and administrators to manage academic activities.
            </p>
          </div>
        </div>
      </div>

      {/* Portal Cards */}
      <div className="max-w-7xl mx-auto py-8 px-2 sm:py-12 sm:px-4 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Exam Portal */}
          <div className="bg-white rounded-lg shadow-lg overflow-hidden flex flex-col h-full">
            <div className="p-5 flex-1 flex flex-col">
              <div className="flex items-center justify-center h-12 w-12 rounded-md bg-yellow-500 text-white mb-4 mx-auto">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5zm0 0v6m0 0H6m6 0h6"></path></svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 text-center">Exam Portal</h3>
              <p className="mt-2 text-base text-gray-500 text-center">
                Take your assigned exams online in a secure environment.
              </p>
              <div className="mt-6 flex justify-center">
                <Link
                  to="/exam-selection"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-yellow-500 hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-offset-2 transition"
                >
                  Go to Exam Portal
                </Link>
              </div>
            </div>
          </div>

          {/* Student Portal */}
          <div className="bg-white rounded-lg shadow-lg overflow-hidden flex flex-col h-full">
            <div className="p-5 flex-1 flex flex-col">
              <div className="flex items-center justify-center h-12 w-12 rounded-md bg-blue-500 text-white mb-4 mx-auto">
                <FaUserGraduate className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 text-center">Student Portal</h3>
              <p className="mt-2 text-base text-gray-500 text-center">
                Access your academic records, view results, and manage your profile.
              </p>
              <div className="mt-6 flex justify-center">
                <Link
                  to="/student/login"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition"
                >
                  Student Login
                </Link>
              </div>
            </div>
          </div>

          {/* Teacher Portal */}
          <div className="bg-white rounded-lg shadow-lg overflow-hidden flex flex-col h-full">
            <div className="p-5 flex-1 flex flex-col">
              <div className="flex items-center justify-center h-12 w-12 rounded-md bg-green-500 text-white mb-4 mx-auto">
                <FaChalkboardTeacher className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 text-center">Teacher Portal</h3>
              <p className="mt-2 text-base text-gray-500 text-center">
                Manage classes, upload results, and track student progress.
              </p>
              <div className="mt-6 flex justify-center">
                <Link
                  to="/teacher/login"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition"
                >
                  Teacher Login
                </Link>
              </div>
            </div>
          </div>

          {/* Admin Portal */}
          <div className="bg-white rounded-lg shadow-lg overflow-hidden flex flex-col h-full">
            <div className="p-5 flex-1 flex flex-col">
              <div className="flex items-center justify-center h-12 w-12 rounded-md bg-purple-500 text-white mb-4 mx-auto">
                <FaUserShield className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 text-center">Admin Portal</h3>
              <p className="mt-2 text-base text-gray-500 text-center">
                Manage users, view reports, and oversee school operations.
              </p>
              <div className="mt-6 flex justify-center">
                <Link
                  to="/admin/login"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition"
                >
                  Admin Login
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="mt-10 sm:mt-12">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-gray-900 text-center mb-6 sm:mb-8">
            Key Features
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-white p-5 rounded-lg shadow flex flex-col items-center text-center">
              <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">Academic Records</h3>
              <p className="text-gray-500 text-sm sm:text-base">Access your complete academic history and performance records.</p>
            </div>
            <div className="bg-white p-5 rounded-lg shadow flex flex-col items-center text-center">
              <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">Result Tracking</h3>
              <p className="text-gray-500 text-sm sm:text-base">View and download your academic results and progress reports.</p>
            </div>
            <div className="bg-white p-5 rounded-lg shadow flex flex-col items-center text-center">
              <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">Profile Management</h3>
              <p className="text-gray-500 text-sm sm:text-base">Update your personal information and academic preferences.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home; 