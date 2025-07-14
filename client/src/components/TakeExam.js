import React, { useState, useEffect } from "react";
import { Clock, AlertCircle, LogOut, ArrowLeft } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { userApi, examApi } from "../services/api";

function TakeExam() {
  const navigate = useNavigate();
  const { examId } = useParams();
  const [studentName, setStudentName] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [exam, setExam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [assignedQuestions, setAssignedQuestions] = useState([]);
  const [examStarted, setExamStarted] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Check for student email on mount and fetch display name
  useEffect(() => {
    const email = localStorage.getItem("studentEmail");
    if (!email) {
      navigate("/auth-email");
      return;
    }
    // Fetch all student users and verify the email exists
    userApi
      .getAllStudentUsers()
      .then((users) => {
        const user = users.find((u) => u.email === email);
        if (!user) {
          // Email not found in student users, redirect to auth
          localStorage.removeItem("studentEmail");
          navigate("/auth-email");
          return;
        }
        setStudentName(user?.displayName || email);
        setIsAuthenticated(true);
      })
      .catch(() => {
        // Error fetching users, redirect to auth
        localStorage.removeItem("studentEmail");
        navigate("/auth-email");
      });
  }, [navigate]);

  // Check for existing exam in progress
  useEffect(() => {
    const examInProgress = localStorage.getItem('examInProgress');
    if (examInProgress) {
      const examState = JSON.parse(examInProgress);
      if (examState.examId === examId) {
        // Restore exam state
        setAnswers(examState.answers || {});
        setTimeLeft(examState.timeLeft || 0);
        setExamStarted(true);
      } else {
        // Different exam, clear the old state
        localStorage.removeItem('examInProgress');
      }
    }
  }, [examId]);

  // Fetch exam data and assigned questions
  useEffect(() => {
    if (!examId) {
      navigate("/exam-selection");
      return;
    }

    const fetchExamAndQuestions = async () => {
      try {
        setLoading(true);
        setError("");
        // Fetch exam meta
        const examData = await examApi.getExam(examId);
        setExam(examData);
        // Call /exams/:id/start to get assigned questions
        const { assignedQuestions } = await examApi.startExam(examId);
        setAssignedQuestions(assignedQuestions);
        
        // Check if we have saved answers
        const examInProgress = localStorage.getItem('examInProgress');
        let initialAnswers = {};
        
        if (examInProgress) {
          const examState = JSON.parse(examInProgress);
          if (examState.examId === examId && examState.answers) {
            initialAnswers = examState.answers;
          }
        }
        
        // Initialize answers object if no saved answers
        if (Object.keys(initialAnswers).length === 0) {
          assignedQuestions.forEach((q) => {
            initialAnswers[q._id] = "";
          });
        }
        
        setAnswers(initialAnswers);
        
        // Set timer based on exam duration or saved time
        const examInProgressData = localStorage.getItem('examInProgress');
        if (examInProgressData) {
          const examState = JSON.parse(examInProgressData);
          if (examState.examId === examId && examState.timeLeft) {
            setTimeLeft(examState.timeLeft);
          } else {
            setTimeLeft(examData.duration * 60);
          }
        } else {
          setTimeLeft(examData.duration * 60);
        }
        
        // Mark exam as started
        setExamStarted(true);
        
        // Store exam state in localStorage
        localStorage.setItem('examInProgress', JSON.stringify({
          examId,
          answers: initialAnswers,
          timeLeft: examData.duration * 60,
          startedAt: Date.now()
        }));
      } catch (err) {
        setError("Failed to fetch exam data");
        console.error("Error fetching exam:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchExamAndQuestions();
  }, [examId, navigate]);

  // Add beforeunload event listener to warn when leaving the page
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (examStarted && !submitted && !loading) {
        e.preventDefault();
        e.returnValue = "Are you sure you want to leave? Your exam will be automatically submitted.";
        return "Are you sure you want to leave? Your exam will be automatically submitted.";
      }
    };

    // Prevent browser back button navigation
    const handlePopState = (e) => {
      if (examStarted && !submitted && !loading) {
        e.preventDefault();
        window.history.pushState(null, '', window.location.pathname);
        alert("You cannot leave the exam once started. Your exam will be automatically submitted if you try to leave.");
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('popstate', handlePopState);
    
    // Push current state to prevent back navigation
    if (examStarted && !submitted) {
      window.history.pushState(null, '', window.location.pathname);
    }
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [examStarted, submitted, loading]);

  const handleLogout = () => {
    if (examStarted && !submitted) {
      setShowLogoutConfirm(true);
    } else {
      localStorage.removeItem("studentEmail");
      navigate("/auth-email");
    }
  };

  const handleConfirmLogout = async () => {
    try {
      // Auto-submit the exam before logout
      if (examStarted && !submitted) {
        await examApi.submitExam(examId, answers);
      }
      localStorage.removeItem("studentEmail");
      navigate("/auth-email");
    } catch (error) {
      console.error("Error auto-submitting exam:", error);
      // Still logout even if auto-submit fails
      localStorage.removeItem("studentEmail");
      navigate("/auth-email");
    }
  };

  const handleCancelLogout = () => {
    setShowLogoutConfirm(false);
  };

  const handleBackToExams = () => {
    if (examStarted && !submitted) {
      alert("You cannot leave the exam once started. Your exam will be automatically submitted if you try to leave.");
      return;
    }
    navigate("/exam-selection");
  };

  useEffect(() => {
    if (submitted || !exam || timeLeft <= 0) return;
    
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          handleSubmit();
          return 0;
        }
        const newTime = prev - 1;
        
        // Update localStorage with new time
        if (examStarted) {
          const examState = JSON.parse(localStorage.getItem('examInProgress') || '{}');
          examState.timeLeft = newTime;
          localStorage.setItem('examInProgress', JSON.stringify(examState));
        }
        
        return newTime;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [timeLeft, submitted, exam, examStarted]);

  const handleAnswerChange = (questionId, value) => {
    const newAnswers = {
      ...answers,
      [questionId]: value,
    };
    setAnswers(newAnswers);
    
    // Update localStorage with new answers
    if (examStarted) {
      const examState = JSON.parse(localStorage.getItem('examInProgress') || '{}');
      examState.answers = newAnswers;
      localStorage.setItem('examInProgress', JSON.stringify(examState));
    }
  };

  const handleSubmit = async () => {
    if (submitted || submitting) return;
    
    setSubmitting(true);
    
    try {
      await examApi.submitExam(examId, answers);
      setSubmitted(true);
      // Clear exam state from localStorage
      localStorage.removeItem('examInProgress');
      alert("Exam submitted successfully! Thank you for participating.");
      setTimeout(() => {
        navigate("/exam-selection");
      }, 2000);
    } catch (error) {
      alert("Failed to submit exam. Please try again.");
      console.error("Error submitting exam:", error);
    } finally {
      setSubmitting(false);
    }
  };

  // Format timeLeft as mm:ss
  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  // Don't render if not authenticated
  if (!isAuthenticated) {
    return null;
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
          <button
            onClick={handleBackToExams}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Back to Available Exams
          </button>
        </div>
      </div>
    );
  }

  if (!exam) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <p className="text-gray-600">No exam data found</p>
          <button
            onClick={handleBackToExams}
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Back to Available Exams
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-4 sm:py-8">
      <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6">
        {/* Student Name and Logout */}
        <div className="mb-2 flex justify-between items-center">
          <span className="text-base sm:text-lg font-semibold text-blue-700">
            {studentName}
          </span>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-red-600 hover:text-red-800 text-sm"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
        
        {/* Exam Header */}
        <div className="border-b pb-4 mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
            <div className="w-full sm:w-auto">
              {!examStarted && (
                <button
                  onClick={handleBackToExams}
                  className="flex items-center text-blue-600 hover:text-blue-800 mb-2"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Exams
                </button>
              )}
              <h1 className="text-xl sm:text-2xl font-bold mb-2">
                {exam.title}
              </h1>
              <p className="text-gray-600 text-sm sm:text-base">
                {exam.description}
              </p>
              {examStarted && !submitted && (
                <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-yellow-800 text-sm">
                  ⚠️ You cannot leave this page once the exam has started. Your exam will be automatically submitted if you try to leave.
                </div>
              )}
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-red-600">
                <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="font-medium text-sm sm:text-base">
                  {formatTime(timeLeft)}
                </span>
              </div>
              {submitted && (
                <div className="flex items-center gap-2 text-green-600">
                  <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="text-sm sm:text-base">Submitted</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Instructions */}
        {exam.instructions && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6">
            <h2 className="font-semibold text-sm sm:text-base mb-2">
              Instructions
            </h2>
            <p className="text-gray-700 text-sm sm:text-base whitespace-pre-line">
              {exam.instructions}
            </p>
          </div>
        )}

        {/* Questions */}
        <div className="space-y-6 sm:space-y-8">
          {assignedQuestions.map((question, idx) => (
            <div key={question._id} className="border-b pb-4 sm:pb-6">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-3 sm:mb-4">
                <h3 className="text-base sm:text-lg font-medium">
                  Question {idx + 1}
                </h3>
              </div>
              <p className="text-sm sm:text-base mb-3 sm:mb-4">
                {question.question}
              </p>
              <div className="space-y-2">
                {question.options.map((option, optionIndex) => (
                  <label
                    key={optionIndex}
                    className="flex items-center gap-2 p-2 rounded hover:bg-gray-50 cursor-pointer text-sm sm:text-base"
                  >
                    <input
                      type="radio"
                      name={`question-${question._id}`}
                      value={optionIndex}
                      checked={answers[question._id] === optionIndex.toString()}
                      onChange={(e) =>
                        handleAnswerChange(question._id, e.target.value)
                      }
                      disabled={submitted}
                      className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600"
                    />
                    <span>{option}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Submit Button */}
        {!submitted && (
          <div className="mt-6 sm:mt-8">
            <button
              onClick={handleSubmit}
              disabled={submitted || submitting || timeLeft <= 0}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-blue-300 text-sm sm:text-base"
            >
              {submitting ? "Submitting..." : "Submit Exam"}
            </button>
          </div>
        )}
      </div>

      {/* Logout Confirmation Dialog */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">Confirm Logout</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to logout? Your exam will be automatically submitted with your current answers.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleConfirmLogout}
                className="flex-1 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
              >
                Logout & Submit
              </button>
              <button
                onClick={handleCancelLogout}
                className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TakeExam;
