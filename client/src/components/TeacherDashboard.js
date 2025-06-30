import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';

function TeacherDashboard() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState({
    totalQuestions: 0,
    activeExams: 0,
    totalStudents: 0,
    averageScore: 0
  });

  const [recentExams, setRecentExams] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [questionsResponse, examsResponse] = await Promise.all([
        api.get('/questions'),
        api.get('/exams')
      ]);

      const questions = questionsResponse.data;
      const exams = examsResponse.data;

      // Calculate stats
      const activeExams = exams.filter(exam => {
        const now = new Date();
        const startTime = new Date(exam.startTime);
        const endTime = new Date(exam.endTime);
        return now >= startTime && now <= endTime;
      });

      setStats({
        totalQuestions: questions.length,
        activeExams: activeExams.length,
        totalStudents: 0, // TODO: Implement student count
        averageScore: 0 // TODO: Implement average score
      });

      // Sort exams by creation date and take the 5 most recent
      const sortedExams = exams
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 5);

      setRecentExams(sortedExams.map(exam => ({
        id: exam._id,
        name: exam.title,
        subject: exam.subject,
        students: 0, // TODO: Implement student count
        status: new Date() < new Date(exam.startTime) ? 'Scheduled' :
                new Date() > new Date(exam.endTime) ? 'Completed' : 'Active'
      })));

    } catch (error) {
      setError('Failed to fetch dashboard data');
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-100">
        <div className="w-64 bg-white shadow-lg">
          <div className="p-4">
            <h3 className="text-lg font-semibold text-gray-700 mb-4 text-left">Navigation</h3>
            <ul className="space-y-2">
              <li className="bg-blue-50 text-blue-600 p-2 rounded">
                <button onClick={() => navigate('/teacher/dashboard')} className="block text-left w-full bg-transparent border-none p-0 m-0 text-inherit">Dashboard</button>
              </li>
              <li className="hover:bg-gray-50 p-2 rounded">
                <button onClick={() => navigate('/teacher/question-bank')} className="block text-left w-full bg-transparent border-none p-0 m-0 text-inherit">Question Bank</button>
              </li>
              <li className="hover:bg-gray-50 p-2 rounded">
                <button onClick={() => navigate('/teacher/create-exam')} className="block text-left w-full bg-transparent border-none p-0 m-0 text-inherit">Create Exam</button>
              </li>
              <li className="hover:bg-gray-50 p-2 rounded">
                <button onClick={() => navigate('/teacher/active-exams')} className="block text-left w-full bg-transparent border-none p-0 m-0 text-inherit">Active Exams</button>
              </li>
              <li className="hover:bg-gray-50 p-2 rounded">
                <button onClick={() => navigate('/teacher/results')} className="block text-left w-full bg-transparent border-none p-0 m-0 text-inherit">Results</button>
              </li>
              <li className="hover:bg-gray-50 p-2 rounded">
                <button onClick={() => navigate('/teacher/students')} className="block text-left w-full bg-transparent border-none p-0 m-0 text-inherit">Students</button>
              </li>
              <li className="hover:bg-gray-50 p-2 rounded">
                <button onClick={() => navigate('/teacher/settings')} className="block text-left w-full bg-transparent border-none p-0 m-0 text-inherit">Settings</button>
              </li>
            </ul>
          </div>
        </div>
        <div className="flex-1 overflow-auto">
          <div className="p-8">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="bg-white p-6 rounded-lg shadow">
                    <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-lg">
        <div className="p-4">
          <h3 className="text-lg font-semibold text-gray-700 mb-4 text-left">Navigation</h3>
          <ul className="space-y-2">
            <li className="bg-blue-50 text-blue-600 p-2 rounded">
              <button onClick={() => navigate('/teacher/dashboard')} className="block text-left w-full bg-transparent border-none p-0 m-0 text-inherit">Dashboard</button>
            </li>
            <li className="hover:bg-gray-50 p-2 rounded">
              <button onClick={() => navigate('/teacher/question-bank')} className="block text-left w-full bg-transparent border-none p-0 m-0 text-inherit">Question Bank</button>
            </li>
            <li className="hover:bg-gray-50 p-2 rounded">
              <button onClick={() => navigate('/teacher/create-exam')} className="block text-left w-full bg-transparent border-none p-0 m-0 text-inherit">Create Exam</button>
            </li>
            <li className="hover:bg-gray-50 p-2 rounded">
              <button onClick={() => navigate('/teacher/active-exams')} className="block text-left w-full bg-transparent border-none p-0 m-0 text-inherit">Active Exams</button>
            </li>
            <li className="hover:bg-gray-50 p-2 rounded">
              <button onClick={() => navigate('/teacher/results')} className="block text-left w-full bg-transparent border-none p-0 m-0 text-inherit">Results</button>
            </li>
            <li className="hover:bg-gray-50 p-2 rounded">
              <button onClick={() => navigate('/teacher/students')} className="block text-left w-full bg-transparent border-none p-0 m-0 text-inherit">Students</button>
            </li>
            <li className="hover:bg-gray-50 p-2 rounded">
              <button onClick={() => navigate('/teacher/settings')} className="block text-left w-full bg-transparent border-none p-0 m-0 text-inherit">Settings</button>
            </li>
          </ul>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-left">Dashboard Overview</h2>
            <button
              onClick={() => navigate('/create-exam')}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              Create New Exam
            </button>
          </div>

          {error && (
            <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded text-left">
              {error}
            </div>
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="text-3xl font-bold text-blue-600 text-left">{stats.totalQuestions}</div>
              <div className="text-gray-600 text-left">Total Questions</div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="text-3xl font-bold text-green-600 text-left">{stats.activeExams}</div>
              <div className="text-gray-600 text-left">Active Exams</div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="text-3xl font-bold text-purple-600 text-left">{stats.totalStudents}</div>
              <div className="text-gray-600 text-left">Students</div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="text-3xl font-bold text-orange-600 text-left">{stats.averageScore}%</div>
              <div className="text-gray-600 text-left">Avg. Score</div>
            </div>
          </div>

          {/* Recent Exams Table */}
          <div className="p-4 border-b">
            <h3 className="text-lg font-semibold text-left">Recent Exams</h3>
          </div>
          <div className="p-4">
            <table className="min-w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">Exam Name</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">Subject</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">Students</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">Status</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {recentExams.map((exam) => (
                  <tr key={exam.id}>
                    <td className="px-4 py-3 text-left">{exam.name}</td>
                    <td className="px-4 py-3 text-left">{exam.subject}</td>
                    <td className="px-4 py-3 text-left">{exam.students}</td>
                    <td className="px-4 py-3 text-left">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        exam.status === 'Active' ? 'bg-green-100 text-green-800' :
                        exam.status === 'Scheduled' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {exam.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-left">
                      <button 
                        onClick={() => navigate(`/teacher/exam/${exam.id}/questions`)}
                        className="bg-green-500 text-white px-3 py-1 rounded text-sm mr-2 hover:bg-green-600"
                      >
                        View Questions
                      </button>
                      {exam.status === 'Active' ? (
                        <>
                          <button className="bg-blue-500 text-white px-3 py-1 rounded text-sm mr-2 hover:bg-blue-600">
                            View
                          </button>
                          <button className="bg-gray-500 text-white px-3 py-1 rounded text-sm hover:bg-gray-600">
                            Edit
                          </button>
                        </>
                      ) : exam.status === 'Completed' ? (
                        <button className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600">
                          Results
                        </button>
                      ) : (
                        <button className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600">
                          Preview
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TeacherDashboard; 