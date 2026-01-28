import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { examApi } from '../services/api';
import { Clock, BookOpen, LogOut } from 'lucide-react';

function ExamSelection() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [availableExams, setAvailableExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        setError("");
        
        // Fetch available exams (auto school-scoped via JWT)
        const exams = await examApi.getAvailableExams();
        // Filter for published exams only
        const published = exams.filter(exam => exam.is_published);
        setAvailableExams(published);
      } catch (err) {
        setError("Failed to fetch available exams");
        console.error("Error fetching exams:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, navigate]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleExamSelect = (examId) => {
    navigate(`/student/take-exam/${examId}`);
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-bold text-gray-900">Available Exams</h1>
            <div className="flex items-center gap-4">
              <span className="text-blue-700 font-semibold">{user?.name || user?.email}</span>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 text-red-600 hover:text-red-800 text-sm"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          </div>
          <p className="text-gray-600">
            Select an exam from the list below to begin. Make sure you have enough time to complete the exam.
          </p>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {availableExams.length === 0 ? (
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No Available Exams</h2>
            <p className="text-gray-600">
              You have either completed all available exams or there are no active exams at this time. 
              Check back later for new exams or contact your teacher.
            </p>
          </div>
        ) : (
          <div className="grid gap-6">
            {availableExams.map((exam) => (
              <div key={exam.id} className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      {exam.title}
                    </h3>
                    <p className="text-gray-600 mb-3">
                      {exam.description || "No description"}
                    </p>
                    
                    <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        <span>{exam.duration_minutes} minutes</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <BookOpen className="w-4 h-4" />
                        <span>{exam.questions?.length || 0} questions</span>
                      </div>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => handleExamSelect(exam.id)}
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium whitespace-nowrap"
                  >
                    Start Exam
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default ExamSelection; 