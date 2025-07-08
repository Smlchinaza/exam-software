import React, { useState, useEffect } from 'react';
import { FaUser, FaBook, FaChartBar, FaCog, FaSignOutAlt } from 'react-icons/fa';
import { studentApi } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const StudentDashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [selectedClass, setSelectedClass] = useState('');
  const [subjects, setSubjects] = useState([]);
  const [showProfile, setShowProfile] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [studentData, setStudentData] = useState(null);

  const classes = ['JSS1', 'JSS2', 'JSS3', 'SS1', 'SS2', 'SS3'];
  const availableSubjects = [
    'Mathematics', 'English', 'Physics', 'Chemistry', 'Biology',
    'Economics', 'Government', 'Literature', 'History', 'Geography',
    'Agricultural Science', 'Computer Science', 'French', 'Yoruba',
    'Christian Religious Studies', 'Islamic Religious Studies'
  ];

  useEffect(() => {
    const fetchStudentData = async () => {
      try {
        setLoading(true);
        
        // Check if user is authenticated and is a student
        if (!user || user.role !== 'student') {
          navigate('/student/login');
          return;
        }

        // Try to get student data using the user's email
        try {
          const response = await studentApi.getStudent(user._id || user.id);
          setStudentData(response);
          setSelectedClass(response.currentClass || 'JSS1');
          setSubjects(response.registeredSubjects || []);
        } catch (err) {
          // If student data doesn't exist, create a basic student profile
          console.log('Student data not found, creating basic profile...');
          setStudentData({
            _id: user._id || user.id,
            fullName: user.displayName || `${user.firstName} ${user.lastName}`,
            email: user.email,
            currentClass: 'JSS1',
            registeredSubjects: []
          });
          setSelectedClass('JSS1');
          setSubjects([]);
        }
      } catch (err) {
        console.error('Error fetching student data:', err);
        setError(err.message || 'Failed to fetch student data');
      } finally {
        setLoading(false);
      }
    };

    fetchStudentData();
  }, [user, navigate]);

  const handleClassSelect = async (className) => {
    try {
      setSelectedClass(className);
      if (studentData) {
        await studentApi.updateStudent(studentData._id, { currentClass: className });
        setStudentData(prev => ({ ...prev, currentClass: className }));
      }
    } catch (err) {
      setError(err.message || 'Failed to update class');
    }
  };

  const handleSubjectRegistration = async (subject) => {
    try {
      if (!subjects.includes(subject)) {
        const updatedSubjects = [...subjects, subject];
        setSubjects(updatedSubjects);
        if (studentData) {
          await studentApi.registerSubjects(studentData._id, updatedSubjects);
          setStudentData(prev => ({ ...prev, registeredSubjects: updatedSubjects }));
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to register subject');
    }
  };

  const handleRemoveSubject = async (subject) => {
    try {
      const updatedSubjects = subjects.filter(sub => sub !== subject);
      setSubjects(updatedSubjects);
      if (studentData) {
        await studentApi.registerSubjects(studentData._id, updatedSubjects);
        setStudentData(prev => ({ ...prev, registeredSubjects: updatedSubjects }));
      }
    } catch (err) {
      setError(err.message || 'Failed to remove subject');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Error!</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Navigation Bar */}
      <nav className="bg-blue-600 text-white p-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-2 sm:gap-0">
          <h1 className="text-xl sm:text-2xl font-bold">Student Portal</h1>
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4 w-full sm:w-auto items-center">
            <span className="flex items-center space-x-2">
              <FaUser />
              <span className="truncate max-w-[120px] sm:max-w-none">{studentData?.fullName || user?.displayName || 'Student'}</span>
            </span>
            <button 
              onClick={() => setShowProfile(true)}
              className="flex items-center space-x-2 hover:text-blue-200"
            >
              <FaUser />
              <span>Profile</span>
            </button>
            <button 
              onClick={handleLogout}
              className="flex items-center space-x-2 hover:text-blue-200"
            >
              <FaSignOutAlt />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-2 xs:px-4 sm:px-6 lg:px-8 py-6 xs:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 xs:gap-8">
          {/* Student Info Card */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-4 xs:p-6">
              <h2 className="text-lg xs:text-xl font-semibold mb-3 xs:mb-4">Student Information</h2>
              <div className="space-y-2 xs:space-y-3">
                <div>
                  <label className="block text-xs xs:text-sm font-medium text-gray-700">Name:</label>
                  <p className="text-gray-900 text-xs xs:text-sm">{studentData?.fullName || user?.displayName || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-xs xs:text-sm font-medium text-gray-700">Email:</label>
                  <p className="text-gray-900 text-xs xs:text-sm">{user?.email || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-xs xs:text-sm font-medium text-gray-700">Current Class:</label>
                  <select
                    value={selectedClass}
                    onChange={(e) => handleClassSelect(e.target.value)}
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-xs xs:text-sm border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md"
                  >
                    {classes.map((className) => (
                      <option key={className} value={className}>
                        {className}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Subject Registration */}
          <div className="lg:col-span-2 mt-6 lg:mt-0">
            <div className="bg-white rounded-lg shadow-md p-4 xs:p-6">
              <h2 className="text-lg xs:text-xl font-semibold mb-3 xs:mb-4">Subject Registration</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 xs:gap-4">
                {availableSubjects.map((subject) => (
                  <div key={subject} className="flex items-center justify-between p-2 xs:p-3 border rounded-lg">
                    <span className="text-gray-900 text-xs xs:text-sm">{subject}</span>
                    {subjects.includes(subject) ? (
                      <button
                        onClick={() => handleRemoveSubject(subject)}
                        className="text-red-600 hover:text-red-800 text-xs xs:text-sm font-medium"
                      >
                        Remove
                      </button>
                    ) : (
                      <button
                        onClick={() => handleSubjectRegistration(subject)}
                        className="text-blue-600 hover:text-blue-800 text-xs xs:text-sm font-medium"
                      >
                        Add
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-6 xs:mt-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 xs:gap-6">
          <div className="bg-white rounded-lg shadow-md p-4 xs:p-6">
            <div className="flex items-center">
              <FaBook className="h-7 w-7 xs:h-8 xs:w-8 text-blue-600" />
              <div className="ml-3 xs:ml-4">
                <h3 className="text-base xs:text-lg font-medium text-gray-900">View Results</h3>
                <p className="text-gray-500 text-xs xs:text-sm">Check your academic performance</p>
              </div>
            </div>
            <button
              onClick={() => navigate('/student/results')}
              className="mt-3 xs:mt-4 w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 text-xs xs:text-sm"
            >
              View Results
            </button>
          </div>

          <div className="bg-white rounded-lg shadow-md p-4 xs:p-6">
            <div className="flex items-center">
              <FaUser className="h-7 w-7 xs:h-8 xs:w-8 text-green-600" />
              <div className="ml-3 xs:ml-4">
                <h3 className="text-base xs:text-lg font-medium text-gray-900">Profile</h3>
                <p className="text-gray-500 text-xs xs:text-sm">Update your personal information</p>
              </div>
            </div>
            <button
              onClick={() => navigate('/student/profile')}
              className="mt-3 xs:mt-4 w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 text-xs xs:text-sm"
            >
              View Profile
            </button>
          </div>

          <div className="bg-white rounded-lg shadow-md p-4 xs:p-6">
            <div className="flex items-center">
              <FaChartBar className="h-7 w-7 xs:h-8 xs:w-8 text-purple-600" />
              <div className="ml-3 xs:ml-4">
                <h3 className="text-base xs:text-lg font-medium text-gray-900">Analytics</h3>
                <p className="text-gray-500 text-xs xs:text-sm">View your progress analytics</p>
              </div>
            </div>
            <button
              onClick={() => navigate('/student/analytics')}
              className="mt-3 xs:mt-4 w-full bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700 text-xs xs:text-sm"
            >
              View Analytics
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard; 