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
      <h1 className="text-2xl font-bold mb-6">Create New Exam</h1>

      {error && (
        <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Exam Details Form */}
        <div className="lg:col-span-1 bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Exam Details</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Title</label>
              <input
                type="text"
                required
                value={examData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <textarea
                value={examData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                rows="3"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Subject</label>
                <select
                  required
                  value={examData.subject}
                  onChange={(e) => handleInputChange('subject', e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
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
                <label className="block text-sm font-medium text-gray-700">Difficulty</label>
                <select
                  value={examData.difficulty}
                  onChange={(e) => handleInputChange('difficulty', e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
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
                <label className="block text-sm font-medium text-gray-700">Duration (minutes)</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={examData.duration}
                  onChange={(e) => handleInputChange('duration', parseInt(e.target.value))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Total Marks</label>
                <input
                  type="number"
                  value={calculateTotalMarks()}
                  disabled
                  className="mt-1 block w-full rounded-md border-gray-300 bg-gray-50 shadow-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Start Time</label>
                <input
                  type="datetime-local"
                  required
                  value={examData.startTime}
                  onChange={(e) => handleInputChange('startTime', e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">End Time</label>
                <input
                  type="datetime-local"
                  required
                  value={examData.endTime}
                  onChange={(e) => handleInputChange('endTime', e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Instructions</label>
              <textarea
                value={examData.instructions}
                onChange={(e) => handleInputChange('instructions', e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                rows="3"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-blue-300"
            >
              {loading ? 'Creating Exam...' : 'Create Exam'}
            </button>
          </form>
        </div>

        {/* Question Selection */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow">
          <div className="p-4 border-b">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Select Questions</h2>
              <div className="text-sm text-gray-600">
                Selected: {selectedQuestions.length} questions ({calculateTotalMarks()} marks)
              </div>
            </div>
            <div className="flex gap-4 mb-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search questions..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="p-4">
            {loading ? (
              <div className="text-center py-4">Loading questions...</div>
            ) : questions.length === 0 ? (
              <div className="text-center py-4 text-gray-500">
                No questions available. Please add some questions first.
              </div>
            ) : filteredQuestions.length === 0 ? (
              <div className="text-center py-4 text-gray-500">
                No questions found matching your filters. Try adjusting your search criteria.
              </div>
            ) : (
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
                    <div className="flex items-start gap-4">
                      <input
                        type="checkbox"
                        checked={selectedQuestions.includes(question._id)}
                        onChange={() => handleQuestionSelect(question._id)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div className="flex justify-between items-start mb-2">
                          <div className="font-medium">{question.question}</div>
                          <div className="text-sm text-gray-500">
                            {question.marks} marks
                          </div>
                        </div>
                        <div className="space-y-2">
                          {question.options.map((option, index) => (
                            <div
                              key={index}
                              className={`text-sm ${
                                index === question.correctAnswer
                                  ? 'text-green-600 font-medium'
                                  : 'text-gray-600'
                              }`}
                            >
                              {String.fromCharCode(65 + index)}. {option}
                            </div>
                          ))}
                        </div>
                        <div className="mt-2 flex gap-2">
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                            {question.subject}
                          </span>
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                            {question.difficulty}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default CreateExam; 