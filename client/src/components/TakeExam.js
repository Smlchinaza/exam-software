import React, { useState, useEffect } from 'react';
import { Clock, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { userApi } from '../services/api';

function TakeExam() {
  const navigate = useNavigate();
  const [studentName, setStudentName] = useState('');

  // Check for student email on mount and fetch display name
  useEffect(() => {
    const email = localStorage.getItem('studentEmail');
    if (!email) {
      navigate('/auth-email');
      return;
    }
    // Fetch all student users and find the display name
    userApi.getAllStudentUsers().then(users => {
      const user = users.find(u => u.email === email);
      setStudentName(user?.displayName || email);
    }).catch(() => {
      setStudentName(email);
    });
  }, [navigate]);

  // Demo exam data
  const demoExam = {
    title: 'Demo Exam',
    description: 'This is a demo exam for practice purposes.',
    instructions: 'Answer all questions. Each question has only one correct answer. You have 10 minutes to complete the exam.',
    duration: 10, // in minutes
    questions: [
      {
        _id: 'q1',
        question: 'What is the capital of France?',
        options: ['Berlin', 'London', 'Paris', 'Madrid'],
        marks: 1,
      },
      {
        _id: 'q2',
        question: 'Which planet is known as the Red Planet?',
        options: ['Earth', 'Mars', 'Jupiter', 'Saturn'],
        marks: 1,
      },
      {
        _id: 'q3',
        question: 'Who wrote "Hamlet"?',
        options: ['Charles Dickens', 'William Shakespeare', 'Mark Twain', 'Jane Austen'],
        marks: 1,
      },
    ],
  };

  const [exam] = useState(demoExam);
  const [answers, setAnswers] = useState(() => {
    const initial = {};
    demoExam.questions.forEach(q => {
      initial[q._id] = '';
    });
    return initial;
  });
  const [timeLeft, setTimeLeft] = useState(demoExam.duration * 60); // seconds
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (submitted) return;
    if (timeLeft <= 0) {
      handleSubmit();
      return;
    }
    const timer = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft, submitted]);

  const handleAnswerChange = (questionId, value) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: value
    }));
  };

  const handleSubmit = () => {
    if (submitted) return;
    setSubmitted(true);
    alert('Exam submitted! Thank you for participating.');
    setTimeout(() => {
      navigate('/auth-email');
    }, 1000);
  };

  // Format timeLeft as mm:ss
  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="container mx-auto px-4 py-4 sm:py-8">
      <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6">
        {/* Student Name */}
        <div className="mb-2 text-right">
          <span className="text-base sm:text-lg font-semibold text-blue-700">{studentName}</span>
        </div>
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
                <span className="font-medium text-sm sm:text-base">{formatTime(timeLeft)}</span>
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
              disabled={submitted || timeLeft <= 0}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-blue-300 text-sm sm:text-base"
            >
              Submit Exam
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default TakeExam; 