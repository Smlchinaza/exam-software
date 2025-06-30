import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { examApi } from '../services/api';
import { Clock, BookOpen, Calendar, LogOut } from 'lucide-react';

function ExamSelection() {
  const navigate = useNavigate();
  const [studentName, setStudentName] = useState("");
  const [availableExams, setAvailableExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const email = localStorage.getItem("studentEmail");
    if (!email) {
      navigate("/auth-email");
      return;
    }

    // Fetch student name and available exams
    const fetchData = async () => {
      try {
        setLoading(true);
        setError("");

        // Fetch student name
        const users = await import("../services/api").then(module => 
          module.userApi.getAllStudentUsers()
        );
        const user = users.find((u) => u.email === email);
        if (!user) {
          localStorage.removeItem("studentEmail");
          navigate("/auth-email");
          return;
        }
        setStudentName(user?.displayName || email);

        // Fetch available exams
        const exams = await examApi.getUpcomingExams();
        const now = new Date();
        
        // Filter exams that are currently active (between start and end time)
        const activeExams = exams.filter(exam => {
          const startTime = new Date(exam.startTime);
          const endTime = new Date(exam.endTime);
          return now >= startTime && now <= endTime;
        });

        setAvailableExams(activeExams);
      } catch (err) {
        setError("Failed to fetch available exams");
        console.error("Error fetching data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("studentEmail");
    navigate("/auth-email");
  };

  const handleExamSelect = (examId) => {
    navigate(`/take-exam/${examId}`);
  };

  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const formatDuration = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins} minutes`;
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
              <span className="text-blue-700 font-semibold">{studentName}</span>
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
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No Active Exams</h2>
            <p className="text-gray-600">
              There are currently no active exams available. Please check back later or contact your teacher.
            </p>
          </div>
        ) : (
          <div className="grid gap-6">
            {availableExams.map((exam) => (
              <div key={exam._id} className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      {exam.title}
                    </h3>
                    <p className="text-gray-600 mb-3">{exam.description}</p>
                    
                    <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <BookOpen className="w-4 h-4" />
                        <span>{exam.subject}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        <span>{formatDuration(exam.duration)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        <span>Ends: {formatDateTime(exam.endTime)}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => handleExamSelect(exam._id)}
                      className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                    >
                      Start Exam
                    </button>
                    <span className="text-xs text-gray-500 text-center">
                      {exam.questions?.length || 0} questions
                    </span>
                  </div>
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