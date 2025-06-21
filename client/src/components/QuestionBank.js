import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Plus,
  Edit2,
  Trash2,
  Search,
  Filter,
  ChevronDown,
  Loader2,
  Upload,
  FileText,
  CheckSquare,
} from 'lucide-react';
import axios from 'axios';

const QuestionBank = () => {
  const { currentUser } = useAuth();
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState('all');
  const [showBulkUploadModal, setShowBulkUploadModal] = useState(false);
  const [bulkQuestions, setBulkQuestions] = useState('');
  const [processingFile, setProcessingFile] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedQuestions, setSelectedQuestions] = useState([]);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [success, setSuccess] = useState('');
  const [processingStatus, setProcessingStatus] = useState('');

  const [newQuestion, setNewQuestion] = useState({
    question: '',
    subject: '',
    difficulty: 'medium',
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
      const response = await fetch('http://localhost:5000/api/questions', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      const data = await response.json();
      if (response.ok) {
        setQuestions(data);
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Failed to fetch questions');
    } finally {
      setLoading(false);
    }
  };

  const handleAddQuestion = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('http://localhost:5000/api/questions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(newQuestion),
      });
      const data = await response.json();
      if (response.ok) {
        setQuestions([...questions, data]);
        setShowAddModal(false);
        setNewQuestion({
          question: '',
          subject: '',
          difficulty: 'medium',
          options: ['', '', '', ''],
          correctAnswer: 0,
          explanation: '',
          marks: 1,
        });
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Failed to add question');
    }
  };

  const handleEditQuestion = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`http://localhost:5000/api/questions/${selectedQuestion._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(selectedQuestion),
      });
      const data = await response.json();
      if (response.ok) {
        setQuestions(questions.map(q => q._id === data._id ? data : q));
        setShowEditModal(false);
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Failed to update question');
    }
  };

  const handleDeleteQuestion = async (id) => {
    if (!window.confirm('Are you sure you want to delete this question?')) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:5000/api/questions/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      
      if (response.ok) {
        setQuestions(questions.filter(q => q._id !== id));
      } else {
        const data = await response.json();
        setError(data.message || 'Failed to delete question');
      }
    } catch (error) {
      setError('Failed to delete question');
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
            difficulty: selectedDifficulty,
            options,
            correctAnswer: parseInt(correctAnswer),
            explanation,
            marks: 1,
          };
        });

      setUploadProgress(0);
      const totalQuestions = questions.length;
      
      for (let i = 0; i < questions.length; i++) {
        await fetch('http://localhost:5000/api/questions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
          body: JSON.stringify(questions[i]),
        });
        setUploadProgress(((i + 1) / totalQuestions) * 100);
      }

      setShowBulkUploadModal(false);
      setBulkQuestions('');
      fetchQuestions(); // Refresh the questions list
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
            difficulty: selectedDifficulty,
            options,
            correctAnswer,
            explanation: '',
            marks: 1,
          };
        });

      setUploadProgress(0);
      const totalQuestions = questions.length;

      for (let i = 0; i < questions.length; i++) {
        await fetch('http://localhost:5000/api/questions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
          body: JSON.stringify(questions[i]),
        });
        setUploadProgress(((i + 1) / totalQuestions) * 100);
      }

      setShowBulkUploadModal(false);
      setBulkQuestions('');
      fetchQuestions(); // Refresh the questions list
    } catch (err) {
      setError('Failed to upload questions');
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setProcessingFile(true);
    setError('');
    setUploadProgress(0);
    setProcessingStatus('Starting upload...');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const xhr = new XMLHttpRequest();
      
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded * 100) / event.total);
          setUploadProgress(progress);
          setProcessingStatus('Uploading file...');
        }
      };

      xhr.onload = async () => {
        if (xhr.status === 200) {
          setProcessingStatus('Processing document...');
          setUploadProgress(50);
          
          const data = JSON.parse(xhr.responseText);
          
          if (data.questions && data.questions.length > 0) {
            setProcessingStatus('Extracting questions...');
            setUploadProgress(75);
            
            setBulkQuestions(data.questions.map(q => 
              `${q.question}\n${q.options.join('\n')}\nCorrect: ${q.options[q.correctAnswer]}`
            ).join('\n\n'));
            
            setUploadProgress(100);
            setProcessingStatus('Complete!');
            setShowBulkUploadModal(true);
            setSuccess(data.message || 'File processed successfully');
          } else {
            setError('No questions could be extracted from the document');
          }
        } else {
          const errorData = JSON.parse(xhr.responseText);
          throw new Error(errorData.message || 'Failed to process file');
        }
      };

      xhr.onerror = () => {
        throw new Error('Failed to upload file');
      };

      xhr.open('POST', 'http://localhost:5000/api/questions/upload');
      xhr.setRequestHeader('Authorization', `Bearer ${localStorage.getItem('token')}`);
      xhr.send(formData);

    } catch (err) {
      setError(err.message || 'Failed to process file. Please check the file format.');
      setProcessingStatus('Error occurred');
    } finally {
      setTimeout(() => {
        setProcessingFile(false);
        setUploadProgress(0);
        setProcessingStatus('');
      }, 1000);
    }
  };

  const handleSelectQuestion = (id) => {
    setSelectedQuestions(prev => {
      if (prev.includes(id)) {
        return prev.filter(qId => qId !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  const handleSelectAll = () => {
    if (selectedQuestions.length === questions.length) {
      setSelectedQuestions([]);
    } else {
      setSelectedQuestions(questions.map(q => q._id));
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedQuestions.length === 0) return;
    
    if (!window.confirm(`Are you sure you want to delete ${selectedQuestions.length} questions?`)) {
      return;
    }

    try {
      const response = await fetch('http://localhost:5000/api/questions/bulk', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ questionIds: selectedQuestions }),
      });
      
      if (response.ok) {
        setQuestions(questions.filter(q => !selectedQuestions.includes(q._id)));
        setSelectedQuestions([]);
        setIsSelectMode(false);
      } else {
        const data = await response.json();
        setError(data.message || 'Failed to delete questions');
      }
    } catch (error) {
      setError('Failed to delete questions');
    }
  };

  const filteredQuestions = questions.filter(question => {
    const matchesSearch = question.question.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSubject = selectedSubject === 'all' || question.subject === selectedSubject;
    const matchesDifficulty = selectedDifficulty === 'all' || question.difficulty === selectedDifficulty;
    return matchesSearch && matchesSubject && matchesDifficulty;
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Question Bank</h1>
        <div className="flex gap-4">
          <button
            onClick={() => setIsSelectMode(!isSelectMode)}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 flex items-center gap-2"
          >
            <CheckSquare size={20} />
            {isSelectMode ? 'Cancel Selection' : 'Select Questions'}
          </button>
          {isSelectMode && selectedQuestions.length > 0 && (
            <button
              onClick={handleDeleteSelected}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 flex items-center gap-2"
            >
              <Trash2 size={20} />
              Delete Selected ({selectedQuestions.length})
            </button>
          )}
          <button
            onClick={() => setShowBulkUploadModal(true)}
            className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 flex items-center gap-2"
          >
            <Upload className="w-5 h-5" />
            Bulk Upload
          </button>
          <label className="bg-purple-500 text-white px-4 py-2 rounded-lg hover:bg-purple-600 flex items-center gap-2 cursor-pointer">
            <FileText className="w-5 h-5" />
            Upload Document
            <input
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={handleFileUpload}
              className="hidden"
              disabled={processingFile}
            />
          </label>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Add Question
          </button>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
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
          <div className="flex gap-4">
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Subjects</option>
              <option value="Mathematics">Mathematics</option>
              <option value="Science">Science</option>
              <option value="English">English</option>
              <option value="History">History</option>
            </select>
            <select
              value={selectedDifficulty}
              onChange={(e) => setSelectedDifficulty(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Difficulties</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>
        </div>
      </div>

      {/* Questions List */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {isSelectMode && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <input
                    type="checkbox"
                    checked={selectedQuestions.length === questions.length}
                    onChange={handleSelectAll}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                </th>
              )}
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Question
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Subject
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Difficulty
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Marks
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredQuestions.map((question) => (
              <tr key={question._id} className="hover:bg-gray-50">
                {isSelectMode && (
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={selectedQuestions.includes(question._id)}
                      onChange={() => handleSelectQuestion(question._id)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                  </td>
                )}
                <td className="px-6 py-4 whitespace-normal">
                  <div className="text-sm text-gray-900">{question.question}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                    {question.subject}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    question.difficulty === 'easy' ? 'bg-green-100 text-green-800' :
                    question.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {question.difficulty}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {question.marks}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button
                    onClick={() => {
                      setSelectedQuestion(question);
                      setShowEditModal(true);
                    }}
                    className="text-blue-600 hover:text-blue-900 mr-4"
                  >
                    <Edit2 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleDeleteQuestion(question._id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
                <div className="grid grid-cols-2 gap-4">
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
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Difficulty
                    </label>
                    <select
                      value={selectedDifficulty}
                      onChange={(e) => setSelectedDifficulty(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    >
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
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
                <div className="grid grid-cols-2 gap-4">
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
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Difficulty
                    </label>
                    <select
                      value={newQuestion.difficulty}
                      onChange={(e) => setNewQuestion({...newQuestion, difficulty: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    >
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
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
                <div className="grid grid-cols-2 gap-4">
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
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Difficulty
                    </label>
                    <select
                      value={selectedQuestion.difficulty}
                      onChange={(e) => setSelectedQuestion({...selectedQuestion, difficulty: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    >
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
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

      {/* Processing Modal */}
      {processingFile && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl w-96">
            <h3 className="text-lg font-semibold mb-4">Processing Document</h3>
            <div className="mb-2 text-sm text-gray-600">{processingStatus}</div>
            <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
              <div 
                className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
            <div className="text-sm text-gray-500 text-right">{uploadProgress}%</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuestionBank; 