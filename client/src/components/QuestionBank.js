import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Edit2,
  Trash2,
  Search,
  Loader2,
  Upload,
  CheckSquare,
} from 'lucide-react';
import api from '../services/api';

const QuestionBank = () => {
  const navigate = useNavigate();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [showBulkUploadModal, setShowBulkUploadModal] = useState(false);
  const [bulkQuestions, setBulkQuestions] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedQuestions, setSelectedQuestions] = useState([]);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [success, setSuccess] = useState('');

  const [newQuestion, setNewQuestion] = useState({
    question: '',
    subject: '',
    options: ['', '', '', ''],
    correctAnswer: 0,
    explanation: '',
    marks: 1,
  });

  useEffect(() => {
    fetchQuestions();
  }, []);

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      const response = await api.get('/questions');
      setQuestions(response.data);
    } catch (err) {
      setError('Failed to fetch questions');
    } finally {
      setLoading(false);
    }
  };

  const handleAddQuestion = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post('/questions', newQuestion);
      setQuestions([...questions, response.data]);
      setShowAddModal(false);
      setNewQuestion({
        question: '',
        subject: '',
        options: ['', '', '', ''],
        correctAnswer: 0,
        explanation: '',
        marks: 1,
      });
      setSuccess('Question added successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add question');
    }
  };

  const handleEditQuestion = async (e) => {
    e.preventDefault();
    try {
      const response = await api.put(`/questions/${selectedQuestion._id}`, selectedQuestion);
      setQuestions(questions.map(q => q._id === response.data._id ? response.data : q));
      setShowEditModal(false);
      setSuccess('Question updated successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update question');
    }
  };

  const handleDeleteQuestion = async (id) => {
    if (!window.confirm('Are you sure you want to delete this question?')) {
      return;
    }

    try {
      await api.delete(`/questions/${id}`);
      setQuestions(questions.filter(q => q._id !== id));
      setSuccess('Question deleted successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to delete question');
    }
  };

  const handleBulkUpload = async (e) => {
    e.preventDefault();
    try {
      const questions = bulkQuestions
        .split('\n\n')
        .filter(q => q.trim())
        .map(q => {
          const lines = q.split('\n');
          const question = lines[0];
          const options = lines.slice(1, 5);
          const correctAnswer = lines[5]?.match(/\d+/)?.[0] || 0;
          const explanation = lines[6] || '';
          
          return {
            question,
            subject: selectedSubject,
            options,
            correctAnswer: parseInt(correctAnswer),
            explanation,
            marks: 1,
          };
        });

      setUploadProgress(0);
      const totalQuestions = questions.length;
      
      for (let i = 0; i < questions.length; i++) {
        await api.post('/questions', questions[i]);
        setUploadProgress(((i + 1) / totalQuestions) * 100);
      }

      setShowBulkUploadModal(false);
      setBulkQuestions('');
      fetchQuestions(); // Refresh the questions list
      setSuccess('Questions uploaded successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to upload questions');
    }
  };

  const handleSaveAllExtractedQuestions = async () => {
    try {
      const questions = bulkQuestions
        .split('\n\n')
        .filter(q => q.trim())
        .map(q => {
          const lines = q.split('\n');
          const question = lines[0];
          const options = lines.slice(1, 5);
          // Try to find the correct answer from the last line (e.g., "Correct: Paris" or "Answer: B")
          let correctAnswer = 0;
          const lastLine = lines[lines.length - 1];
          if (lastLine && lastLine.toLowerCase().startsWith('correct:')) {
            const correctText = lastLine.split(':')[1].trim();
            correctAnswer = options.findIndex(opt => opt.trim().toLowerCase() === correctText.toLowerCase());
            if (correctAnswer === -1) correctAnswer = 0;
          }
          return {
            question,
            subject: selectedSubject,
            options,
            correctAnswer,
            explanation: '',
            marks: 1,
          };
        });

      setUploadProgress(0);
      const totalQuestions = questions.length;

      for (let i = 0; i < questions.length; i++) {
        await api.post('/questions', questions[i]);
        setUploadProgress(((i + 1) / totalQuestions) * 100);
      }

      setShowBulkUploadModal(false);
      setBulkQuestions('');
      fetchQuestions(); // Refresh the questions list
      setSuccess('Questions uploaded successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to upload questions');
    }
  };

  const handleBulkDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete ${selectedQuestions.length} questions?`)) {
      return;
    }

    try {
      await api.delete('/questions/bulk', {
        data: { questionIds: selectedQuestions },
      });
      
      setQuestions(questions.filter(q => !selectedQuestions.includes(q._id)));
      setSelectedQuestions([]);
      setIsSelectMode(false);
      setSuccess(`${selectedQuestions.length} questions deleted successfully!`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to delete questions');
    }
  };

  const filteredQuestions = questions.filter(question => {
    const matchesSearch = question.question.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSubject = selectedSubject === 'all' || question.subject === selectedSubject;
    return matchesSearch && matchesSubject;
  });

  const subjects = [...new Set(questions.map(q => q.subject))];

  return (
    <div className="flex h-screen bg-gray-100 flex-col md:flex-row">
      {/* Mobile Nav Button */}
      <div className="md:hidden flex items-center justify-between bg-white shadow p-4">
        <button
          className="text-gray-700 focus:outline-none mr-3"
          onClick={() => setMobileNavOpen(!mobileNavOpen)}
          aria-label="Open navigation menu"
        >
          {/* Hamburger icon */}
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <h3 className="text-base xs:text-lg sm:text-xl font-semibold text-gray-700">Question Bank</h3>
      </div>
      {/* Mobile Sidebar */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          {/* Overlay */}
          <div className="fixed inset-0 bg-black bg-opacity-30" onClick={() => setMobileNavOpen(false)}></div>
          {/* Sidebar */}
          <div className="relative z-50 h-full w-64 bg-white shadow-lg p-4 animate-slide-in-left">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base xs:text-lg font-semibold text-gray-700 text-left">Navigation</h3>
              <button
                className="text-gray-700 focus:outline-none"
                onClick={() => setMobileNavOpen(false)}
                aria-label="Close navigation menu"
              >
                {/* Collapse (X) icon */}
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <ul className="space-y-2">
              <li className="hover:bg-gray-50 p-2 rounded">
                <button onClick={() => {navigate('/teacher/dashboard'); setMobileNavOpen(false);}} className="block text-left w-full bg-transparent border-none p-0 m-0 text-inherit">Dashboard</button>
              </li>
              <li className="bg-blue-50 text-blue-600 p-2 rounded">
                <button onClick={() => {navigate('/teacher/question-bank'); setMobileNavOpen(false);}} className="block text-left w-full bg-transparent border-none p-0 m-0 text-inherit">Question Bank</button>
              </li>
              <li className="hover:bg-gray-50 p-2 rounded">
                <button onClick={() => {navigate('/teacher/create-exam'); setMobileNavOpen(false);}} className="block text-left w-full bg-transparent border-none p-0 m-0 text-inherit">Create Exam</button>
              </li>
              <li className="hover:bg-gray-50 p-2 rounded">
                <button onClick={() => {navigate('/teacher/active-exams'); setMobileNavOpen(false);}} className="block text-left w-full bg-transparent border-none p-0 m-0 text-inherit">Active Exams</button>
              </li>
              <li className="hover:bg-gray-50 p-2 rounded">
                <button onClick={() => {navigate('/teacher/results'); setMobileNavOpen(false);}} className="block text-left w-full bg-transparent border-none p-0 m-0 text-inherit">Results</button>
              </li>
              <li className="hover:bg-gray-50 p-2 rounded">
                <button onClick={() => {navigate('/teacher/students'); setMobileNavOpen(false);}} className="block text-left w-full bg-transparent border-none p-0 m-0 text-inherit">Students</button>
              </li>
              <li className="hover:bg-gray-50 p-2 rounded">
                <button onClick={() => {navigate('/teacher/settings'); setMobileNavOpen(false);}} className="block text-left w-full bg-transparent border-none p-0 m-0 text-inherit">Settings</button>
              </li>
            </ul>
          </div>
        </div>
      )}
      {/* Desktop Sidebar */}
      <div className="w-64 bg-white shadow-lg hidden md:block">
        <div className="p-4">
          <h3 className="text-lg font-semibold text-gray-700 mb-4 text-left">Navigation</h3>
          <ul className="space-y-2">
            <li className="hover:bg-gray-50 p-2 rounded">
              <button onClick={() => navigate('/teacher/dashboard')} className="block text-left w-full bg-transparent border-none p-0 m-0 text-inherit">Dashboard</button>
            </li>
            <li className="bg-blue-50 text-blue-600 p-2 rounded">
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
            <h2 className="text-2xl font-bold text-left">Question Bank</h2>
            <div className="flex gap-2">
              <button
                onClick={() => setShowBulkUploadModal(true)}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2"
              >
                <Upload className="w-4 h-4" />
                Bulk Upload
              </button>
              <button
                onClick={() => setShowAddModal(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Question
              </button>
            </div>
          </div>

          {error && (
            <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded text-left">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded text-left">
              {success}
            </div>
          )}

          {/* Filters */}
          <div className="bg-white p-4 rounded-lg shadow mb-6">
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
              <div className="flex gap-2">
                <select
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-left"
                >
                  <option value="all">All Subjects</option>
                  {subjects.map(subject => (
                    <option key={subject} value={subject}>{subject}</option>
                  ))}
                </select>
                <button
                  onClick={() => setIsSelectMode(!isSelectMode)}
                  className={`px-4 py-2 rounded-md flex items-center gap-2 ${
                    isSelectMode ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-gray-600 text-white hover:bg-gray-700'
                  }`}
                >
                  <CheckSquare className="w-4 h-4" />
                  {isSelectMode ? 'Cancel' : 'Select'}
                </button>
              </div>
            </div>
          </div>

          {/* Bulk Actions */}
          {isSelectMode && selectedQuestions.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
              <div className="flex justify-between items-center">
                <span className="text-yellow-800">
                  {selectedQuestions.length} question(s) selected
                </span>
                <button
                  onClick={handleBulkDelete}
                  className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Selected
                </button>
              </div>
            </div>
          )}

          {/* Questions List */}
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : (
            <div className="space-y-4">
              {filteredQuestions.map((question) => (
                <div
                  key={question._id}
                  className={`bg-white p-4 rounded-lg shadow ${
                    isSelectMode && selectedQuestions.includes(question._id)
                      ? 'border-2 border-blue-500'
                      : 'border border-gray-200'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-4 mb-2">
                        {isSelectMode && (
                          <input
                            type="checkbox"
                            checked={selectedQuestions.includes(question._id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedQuestions([...selectedQuestions, question._id]);
                              } else {
                                setSelectedQuestions(selectedQuestions.filter(id => id !== question._id));
                              }
                            }}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                        )}
                        <span className="text-sm text-gray-500">{question.subject}</span>
                        <span className="text-sm text-gray-500">{question.marks} marks</span>
                      </div>
                      <p className="text-gray-900 mb-2">{question.question}</p>
                      <div className="space-y-1">
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
                      {question.explanation && (
                        <p className="text-sm text-gray-500 mt-2">
                          <strong>Explanation:</strong> {question.explanation}
                        </p>
                      )}
                    </div>
                    {!isSelectMode && (
                      <div className="flex gap-2 ml-4">
                        <button
                          onClick={() => {
                            setSelectedQuestion(question);
                            setShowEditModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteQuestion(question._id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {filteredQuestions.length === 0 && !loading && (
            <div className="text-center py-8 text-gray-500">
              No questions found. Add your first question to get started.
            </div>
          )}
        </div>
      </div>

      {/* Bulk Upload Modal */}
      {showBulkUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4">Bulk Upload Questions</h2>
              <form onSubmit={handleBulkUpload} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Questions (One per block, format:)
                  </label>
                  <div className="bg-gray-50 p-4 rounded-lg mb-4 text-sm text-gray-600">
                    <p>Question text</p>
                    <p>Option 1</p>
                    <p>Option 2</p>
                    <p>Option 3</p>
                    <p>Option 4</p>
                    <p>Correct Answer (1-4)</p>
                    <p>Explanation (optional)</p>
                    <p className="mt-2">[Blank line between questions]</p>
                  </div>
                  <textarea
                    value={bulkQuestions}
                    onChange={(e) => setBulkQuestions(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows="10"
                    placeholder="Enter questions in the format shown above..."
                  />
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Subject
                    </label>
                    <select
                      value={selectedSubject}
                      onChange={(e) => setSelectedSubject(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    >
                      <option value="">Select Subject</option>
                      <option value="Mathematics">Mathematics</option>
                      <option value="Science">Science</option>
                      <option value="English">English</option>
                      <option value="History">History</option>
                    </select>
                  </div>
                </div>
                
                {uploadProgress > 0 && (
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div
                      className="bg-blue-600 h-2.5 rounded-full"
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                )}
                <div className="flex justify-end gap-4 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowBulkUploadModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600"
                    disabled={!bulkQuestions.trim() || !selectedSubject}
                    onClick={handleSaveAllExtractedQuestions}
                  >
                    Save All Extracted Questions
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                    disabled={!bulkQuestions.trim() || !selectedSubject}
                  >
                    Upload Questions
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Add Question Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4">Add New Question</h2>
              <form onSubmit={handleAddQuestion} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Question
                  </label>
                  <textarea
                    value={newQuestion.question}
                    onChange={(e) => setNewQuestion({...newQuestion, question: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows="3"
                    required
                  />
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Subject
                    </label>
                    <select
                      value={newQuestion.subject}
                      onChange={(e) => setNewQuestion({...newQuestion, subject: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    >
                      <option value="">Select Subject</option>
                      <option value="Mathematics">Mathematics</option>
                      <option value="Science">Science</option>
                      <option value="English">English</option>
                      <option value="History">History</option>
                    </select>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Options
                  </label>
                  {newQuestion.options.map((option, index) => (
                    <div key={index} className="mb-2">
                      <input
                        type="text"
                        value={option}
                        onChange={(e) => {
                          const newOptions = [...newQuestion.options];
                          newOptions[index] = e.target.value;
                          setNewQuestion({...newQuestion, options: newOptions});
                        }}
                        placeholder={`Option ${index + 1}`}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>
                  ))}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Correct Answer
                  </label>
                  <select
                    value={newQuestion.correctAnswer}
                    onChange={(e) => setNewQuestion({...newQuestion, correctAnswer: parseInt(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    {newQuestion.options.map((option, index) => (
                      <option key={index} value={index}>
                        Option {index + 1}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Explanation
                  </label>
                  <textarea
                    value={newQuestion.explanation}
                    onChange={(e) => setNewQuestion({...newQuestion, explanation: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows="2"
                  />
                </div>
                <div className="flex justify-end gap-4 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                  >
                    Add Question
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Question Modal */}
      {showEditModal && selectedQuestion && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4">Edit Question</h2>
              <form onSubmit={handleEditQuestion} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Question
                  </label>
                  <textarea
                    value={selectedQuestion.question}
                    onChange={(e) => setSelectedQuestion({...selectedQuestion, question: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows="3"
                    required
                  />
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Subject
                    </label>
                    <select
                      value={selectedQuestion.subject}
                      onChange={(e) => setSelectedQuestion({...selectedQuestion, subject: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    >
                      <option value="">Select Subject</option>
                      <option value="Mathematics">Mathematics</option>
                      <option value="Science">Science</option>
                      <option value="English">English</option>
                      <option value="History">History</option>
                    </select>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Options
                  </label>
                  {selectedQuestion.options.map((option, index) => (
                    <div key={index} className="mb-2">
                      <input
                        type="text"
                        value={option}
                        onChange={(e) => {
                          const newOptions = [...selectedQuestion.options];
                          newOptions[index] = e.target.value;
                          setSelectedQuestion({...selectedQuestion, options: newOptions});
                        }}
                        placeholder={`Option ${index + 1}`}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>
                  ))}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Correct Answer
                  </label>
                  <select
                    value={selectedQuestion.correctAnswer}
                    onChange={(e) => setSelectedQuestion({...selectedQuestion, correctAnswer: parseInt(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    {selectedQuestion.options.map((option, index) => (
                      <option key={index} value={index}>
                        Option {index + 1}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Explanation
                  </label>
                  <textarea
                    value={selectedQuestion.explanation}
                    onChange={(e) => setSelectedQuestion({...selectedQuestion, explanation: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows="2"
                  />
                </div>
                <div className="flex justify-end gap-4 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuestionBank; 