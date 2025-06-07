import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { Clock, AlertCircle } from 'lucide-react';

function TakeExam() {
  const { examId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exam, setExam] = useState(null);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    fetchExam();
  }, [examId]);

  useEffect(() => {
    if (exam?.duration) {
      const endTime = new Date(exam.startTime).getTime() + (exam.duration * 60 * 1000);
      const timer = setInterval(() => {
        const now = new Date().getTime();
        const remaining = endTime - now;
        
        if (remaining <= 0) {
          clearInterval(timer);
          handleSubmit();
          return;
        }

        const minutes = Math.floor(remaining / (1000 * 60));
        const seconds = Math.floor((remaining % (1000 * 60)) / 1000);
        setTimeLeft(`${minutes}:${seconds.toString().padStart(2, '0')}`);
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [exam]);

  const fetchExam = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await axios.get(`http://localhost:5000/api/exams/${examId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      setExam(response.data);
      // Initialize answers object with empty values
      const initialAnswers = {};
      response.data.questions.forEach(q => {
        initialAnswers[q._id] = '';
      });
      setAnswers(initialAnswers);
    } catch (error) {
      console.error('Error fetching exam:', error);
      setError(error.response?.data?.message || 'Failed to fetch exam');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerChange = (questionId, value) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: value
    }));
  };

  const handleSubmit = async () => {
    if (submitted) return;

    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      await axios.post(`http://localhost:5000/api/exams/${examId}/submit`, {
        answers
      }, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      setSubmitted(true);
      navigate('/dashboard');
    } catch (error) {
      console.error('Error submitting exam:', error);
      setError(error.response?.data?.message || 'Failed to submit exam');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Loading exam...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      </div>
    );
  }

  if (!exam) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Exam not found</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-4 sm:py-8">
      <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6">
        {/* Exam Header */}
        <div className="border-b pb-4 mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
            <div className="w-full sm:w-auto">
              <h1 className="text-xl sm:text-2xl font-bold mb-2">{exam.title}</h1>
              <p className="text-gray-600 text-sm sm:text-base">{exam.description}</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-red-600">
                <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="font-medium text-sm sm:text-base">{timeLeft}</span>
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
            <h2 className="font-semibold text-sm sm:text-base mb-2">Instructions</h2>
            <p className="text-gray-700 text-sm sm:text-base whitespace-pre-line">{exam.instructions}</p>
          </div>
        )}

        {/* Questions */}
        <div className="space-y-6 sm:space-y-8">
          {exam.questions.map((question, index) => (
            <div key={question._id} className="border-b pb-4 sm:pb-6">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-3 sm:mb-4">
                <h3 className="text-base sm:text-lg font-medium">
                  Question {index + 1}
                </h3>
                <span className="text-xs sm:text-sm text-gray-500">
                  {question.marks} marks
                </span>
              </div>
              <p className="text-sm sm:text-base mb-3 sm:mb-4">{question.question}</p>
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
                      onChange={(e) => handleAnswerChange(question._id, e.target.value)}
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
              disabled={loading}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-blue-300 text-sm sm:text-base"
            >
              {loading ? 'Submitting...' : 'Submit Exam'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default TakeExam; 