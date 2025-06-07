import React, { useState, useEffect } from 'react';
import { FaUser, FaBook, FaChartBar, FaCog, FaSignOutAlt } from 'react-icons/fa';
import { studentApi } from '../services/api';
import { useNavigate } from 'react-router-dom';

const StudentDashboard = () => {
  const navigate = useNavigate();
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
        // In a real app, you would get the student ID from your auth context or state
        const studentId = localStorage.getItem('studentId');
        if (!studentId) {
          navigate('/login');
          return;
        }

        const response = await studentApi.getStudent(studentId);
        setStudentData(response.data);
        setSelectedClass(response.data.currentClass);
        setSubjects(response.data.registeredSubjects || []);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to fetch student data');
      } finally {
        setLoading(false);
      }
    };

    fetchStudentData();
  }, [navigate]);

  const handleClassSelect = async (className) => {
    try {
      setSelectedClass(className);
      if (studentData) {
        await studentApi.updateStudent(studentData._id, { currentClass: className });
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update class');
    }
  };

  const handleSubjectRegistration = async (subject) => {
    try {
      if (!subjects.includes(subject)) {
        const updatedSubjects = [...subjects, subject];
        setSubjects(updatedSubjects);
        if (studentData) {
          await studentApi.registerSubjects(studentData._id, updatedSubjects);
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to register subject');
    }
  };

  const handleRemoveSubject = async (subject) => {
    try {
      const updatedSubjects = subjects.filter(sub => sub !== subject);
      setSubjects(updatedSubjects);
      if (studentData) {
        await studentApi.registerSubjects(studentData._id, updatedSubjects);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to remove subject');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('studentId');
    navigate('/login');
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
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold">Student Portal</h1>
          <div className="flex space-x-4">
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
      <div className="container mx-auto p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left Sidebar */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
            <div className="space-y-4">
              <button className="w-full flex items-center space-x-2 p-3 bg-blue-50 rounded-lg hover:bg-blue-100">
                <FaBook />
                <span>View Timetable</span>
              </button>
              <button 
                onClick={() => navigate('/results')}
                className="w-full flex items-center space-x-2 p-3 bg-blue-50 rounded-lg hover:bg-blue-100"
              >
                <FaChartBar />
                <span>View Results</span>
              </button>
              <button className="w-full flex items-center space-x-2 p-3 bg-blue-50 rounded-lg hover:bg-blue-100">
                <FaCog />
                <span>Settings</span>
              </button>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="md:col-span-2 space-y-6">
            {/* Class Selection */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">Select Your Class</h2>
              <div className="grid grid-cols-3 gap-4">
                {classes.map((className) => (
                  <button
                    key={className}
                    onClick={() => handleClassSelect(className)}
                    className={`p-3 rounded-lg ${
                      selectedClass === className
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 hover:bg-gray-200'
                    }`}
                  >
                    {className}
                  </button>
                ))}
              </div>
            </div>

            {/* Subject Registration */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">Register Subjects</h2>
              <div className="grid grid-cols-2 gap-4">
                {availableSubjects.map((subject) => (
                  <div
                    key={subject}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <span>{subject}</span>
                    <button
                      onClick={() => handleSubjectRegistration(subject)}
                      disabled={subjects.includes(subject)}
                      className={`px-3 py-1 rounded ${
                        subjects.includes(subject)
                          ? 'bg-gray-400 cursor-not-allowed'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                    >
                      {subjects.includes(subject) ? 'Added' : 'Add'}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Registered Subjects */}
            {subjects.length > 0 && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold mb-4">Your Registered Subjects</h2>
                <div className="grid grid-cols-2 gap-4">
                  {subjects.map((subject) => (
                    <div
                      key={subject}
                      className="flex items-center justify-between p-3 bg-blue-50 rounded-lg"
                    >
                      <span>{subject}</span>
                      <button
                        onClick={() => handleRemoveSubject(subject)}
                        className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard; 