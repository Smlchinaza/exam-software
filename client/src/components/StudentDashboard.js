import React, { useState, useEffect } from 'react';
import { FaUser, FaBook, FaChartBar, FaCog, FaSignOutAlt } from 'react-icons/fa';
import { studentApi, subjectApi, examApi } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const StudentDashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [selectedClass, setSelectedClass] = useState('');
  const [showProfile, setShowProfile] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [studentData, setStudentData] = useState(null);
  const [availableSubjects, setAvailableSubjects] = useState([]);
  const [availableExams, setAvailableExams] = useState([]);

  const classes = ['JSS1', 'JSS2', 'JSS3', 'SS1', 'SS2', 'SS3'];
  // const availableSubjects = [
  //   'Mathematics', 'English', 'Physics', 'Chemistry', 'Biology',
  //   'Economics', 'Government', 'Literature', 'History', 'Geography',
  //   'Agricultural Science', 'Computer Science', 'French', 'Yoruba',
  //   'Christian Religious Studies', 'Islamic Religious Studies'
  // ];

  useEffect(() => {
    const fetchStudentData = async () => {
      try {
        setLoading(true);
        
        // Check if user is authenticated and is a student
        if (!user || user.role !== 'student') {
          navigate('/student/login');
          return;
        }

        let studentInfo;
        // Try to get student data using the user's email
        try {
          const response = await studentApi.getStudent(user.email);
          setStudentData(response);
          setSelectedClass(response.currentClass || 'JSS1');
          studentInfo = response;
        } catch (err) {
          // If student data doesn't exist, create a basic student profile
          console.log('Student data not found, creating basic profile...');
          setStudentData({
            _id: user._id || user.id,
            fullName: user.displayName || `${user.firstName} ${user.lastName}`,
            email: user.email,
            currentClass: 'JSS1'
          });
          setSelectedClass('JSS1');
          studentInfo = { currentClass: 'JSS1' };
        }
        // Fetch subjects for the student's class
        const classSubjects = await subjectApi.getSubjectsByClass(studentInfo.currentClass || 'JSS1');
        setAvailableSubjects(classSubjects.map(s => s.name));
        // Fetch all active exams for the student's class
        const allExams = await examApi.getActiveExams();
        const filteredExams = allExams.filter(exam =>
          exam.subject &&
          exam.class === (studentInfo.currentClass || 'JSS1')
        );
        setAvailableExams(filteredExams);
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
                  <p className="text-gray-900 text-xs xs:text-sm">{studentData?.currentClass || selectedClass}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Available Subjects */}
          <div className="lg:col-span-2 mt-6 lg:mt-0">
            <div className="bg-white rounded-lg shadow-md p-4 xs:p-6">
              <h2 className="text-lg xs:text-xl font-semibold mb-3 xs:mb-4">Available Subjects</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 xs:gap-4">
                {availableSubjects.length === 0 ? (
                  <p className="text-gray-500 text-xs xs:text-sm col-span-2">No subjects available for your class at this time.</p>
                ) : (
                  availableSubjects.map((subject) => (
                    <div key={subject} className="flex items-center p-2 xs:p-3 border rounded-lg bg-gray-50">
                      <span className="text-gray-900 text-xs xs:text-sm">{subject}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Add this section below subject registration */}
        <div className="mt-8">
          <div className="bg-white rounded-lg shadow-md p-4 xs:p-6">
            <h2 className="text-lg xs:text-xl font-semibold mb-3 xs:mb-4">Available Exams</h2>
            {availableExams.length === 0 ? (
              <p className="text-gray-500 text-xs xs:text-sm">No exams available for your class at this time.</p>
            ) : (
              <ul className="divide-y divide-gray-200">
                {availableExams.map(exam => (
                  <li key={exam._id} className="py-3 flex items-center justify-between">
                    <div>
                      <span className="font-medium text-gray-900 text-xs xs:text-sm">{exam.title}</span>
                      <span className="ml-2 text-gray-500 text-xs xs:text-sm">({exam.subject})</span>
                    </div>
                    <button
                      onClick={() => navigate(`/exams/${exam._id}`)}
                      className="bg-blue-600 text-white px-3 py-1 rounded text-xs xs:text-sm hover:bg-blue-700"
                    >
                      Start Exam
                    </button>
                  </li>
                ))}
              </ul>
            )}
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