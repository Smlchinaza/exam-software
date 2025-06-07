import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, Clock, Calendar, Search, Filter } from 'lucide-react';

function CreateExam() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [questions, setQuestions] = useState([]);
  const [selectedQuestions, setSelectedQuestions] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [examData, setExamData] = useState({
    title: '',
    description: '',
    duration: 60, // in minutes
    totalMarks: 0,
    startTime: '',
    endTime: '',
    subject: '',
    difficulty: 'medium',
    instructions: ''
  });

  useEffect(() => {
    fetchQuestions();
  }, []);

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('token');
      
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await axios.get('http://localhost:5000/api/questions', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      console.log('Fetched questions:', response.data);
      
      if (Array.isArray(response.data)) {
        setQuestions(response.data);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      console.error('Error fetching questions:', error);
      setError(error.response?.data?.message || 'Failed to fetch questions. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setExamData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleQuestionSelect = (questionId) => {
    setSelectedQuestions(prev => {
      if (prev.includes(questionId)) {
        return prev.filter(id => id !== questionId);
      } else {
        return [...prev, questionId];
      }
    });
  };

  const calculateTotalMarks = () => {
    return selectedQuestions.reduce((total, questionId) => {
      const question = questions.find(q => q._id === questionId);
      return total + (question?.marks || 0);
    }, 0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (selectedQuestions.length === 0) {
      setError('Please select at least one question');
      return;
    }

    // Validate required fields
    if (!examData.title.trim()) {
      setError('Please enter an exam title');
      return;
    }

    if (!examData.subject) {
      setError('Please select a subject');
      return;
    }

    if (!examData.startTime || !examData.endTime) {
      setError('Please set both start and end times');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('token');

      if (!token) {
        throw new Error('No authentication token found');
      }

      // Get the subject from the first selected question
      const firstQuestion = questions.find(q => q._id === selectedQuestions[0]);
      const subject = firstQuestion?.subject || examData.subject;

      const examDataToSubmit = {
        ...examData,
        subject, // Ensure subject is set
        questions: selectedQuestions,
        totalMarks: calculateTotalMarks()
      };

      console.log('Submitting exam data:', examDataToSubmit);

      const response = await axios.post('http://localhost:5000/api/exams', examDataToSubmit, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      console.log('Exam created:', response.data);
      navigate('/dashboard');
    } catch (error) {
      console.error('Error creating exam:', error);
      setError(error.response?.data?.message || 'Failed to create exam');
    } finally {
      setLoading(false);
    }
  };

  const getSubjectStats = () => {
    const stats = {};
    questions.forEach(q => {
      if (!stats[q.subject]) {
        stats[q.subject] = { total: 0, selected: 0 };
      }
      stats[q.subject].total++;
      if (selectedQuestions.includes(q._id)) {
        stats[q.subject].selected++;
      }
    });
    return stats;
  };

  const filteredQuestions = questions.filter(question => {
    const matchesSearch = question.question.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSubject = !examData.subject || question.subject === examData.subject;
    const matchesDifficulty = !examData.difficulty || question.difficulty === examData.difficulty;
    return matchesSearch && matchesSubject && matchesDifficulty;
  });

  const subjectStats = getSubjectStats();

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6 text-left">Create New Exam</h1>

      {error && (
        <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded text-left">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Exam Details Form */}
        <div className="lg:col-span-1 bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4 text-left">Exam Details</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 text-left">Title</label>
              <input
                type="text"
                required
                value={examData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-left"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 text-left">Description</label>
              <textarea
                value={examData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-left"
                rows="3"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 text-left">Subject</label>
                <select
                  required
                  value={examData.subject}
                  onChange={(e) => handleInputChange('subject', e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-left"
                >
                  <option value="">Select Subject</option>
                  {Object.keys(subjectStats).sort().map(subject => (
                    <option key={subject} value={subject}>
                      {subject} ({subjectStats[subject].total} questions)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 text-left">Difficulty</label>
                <select
                  value={examData.difficulty}
                  onChange={(e) => handleInputChange('difficulty', e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-left"
                >
                  <option value="">All Difficulties</option>
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 text-left">Duration (minutes)</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={examData.duration}
                  onChange={(e) => handleInputChange('duration', parseInt(e.target.value))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-left"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 text-left">Total Marks</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={calculateTotalMarks()}
                  readOnly
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm bg-gray-50 text-left"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 text-left">Start Time</label>
                <input
                  type="datetime-local"
                  required
                  value={examData.startTime}
                  onChange={(e) => handleInputChange('startTime', e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-left"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 text-left">End Time</label>
                <input
                  type="datetime-local"
                  required
                  value={examData.endTime}
                  onChange={(e) => handleInputChange('endTime', e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-left"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 text-left">Instructions</label>
              <textarea
                value={examData.instructions}
                onChange={(e) => handleInputChange('instructions', e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-left"
                rows="3"
                placeholder="Enter exam instructions..."
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
            >
              {loading ? 'Creating Exam...' : 'Create Exam'}
            </button>
          </form>
        </div>

        {/* Question Selection */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow">
          <div className="p-4 border-b">
            <h2 className="text-xl font-semibold text-left">Select Questions</h2>
            <p className="text-sm text-gray-600 mt-1 text-left">
              Selected {selectedQuestions.length} questions ({calculateTotalMarks()} marks)
            </p>
          </div>

          <div className="p-4 border-b">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search questions..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-left"
                  />
                  <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                </div>
              </div>
            </div>
          </div>

          <div className="p-4">
            <div className="space-y-4">
              {filteredQuestions.map((question) => (
                <div
                  key={question._id}
                  className={`p-4 border rounded-lg ${
                    selectedQuestions.includes(question._id)
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-start">
                    <input
                      type="checkbox"
                      checked={selectedQuestions.includes(question._id)}
                      onChange={() => handleQuestionSelect(question._id)}
                      className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <div className="ml-3 flex-1">
                      <p className="text-sm text-gray-900 text-left">{question.question}</p>
                      <div className="mt-2 flex items-center space-x-4">
                        <span className="text-xs text-gray-500 text-left">
                          {question.subject}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          question.difficulty === 'easy' ? 'bg-green-100 text-green-800' :
                          question.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {question.difficulty}
                        </span>
                        <span className="text-xs text-gray-500 text-left">
                          {question.marks} marks
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CreateExam; 