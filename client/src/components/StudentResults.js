import React, { useState, useEffect } from 'react';
import { FaDownload, FaPrint, FaChartLine } from 'react-icons/fa';
import { studentApi } from '../services/api';
import { useNavigate } from 'react-router-dom';

const StudentResults = () => {
  const navigate = useNavigate();
  const [selectedTerm, setSelectedTerm] = useState('First Term');
  const [selectedSession, setSelectedSession] = useState('2023/2024');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [results, setResults] = useState(null);

  const terms = ['First Term', 'Second Term', 'Third Term'];
  const sessions = ['2023/2024', '2022/2023', '2021/2022'];

  useEffect(() => {
    const fetchResults = async () => {
      try {
        setLoading(true);
        const studentId = localStorage.getItem('studentId');
        if (!studentId) {
          navigate('/login');
          return;
        }

        const response = await studentApi.getResults(studentId, selectedTerm, selectedSession);
        setResults(response.data);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to fetch results');
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [navigate, selectedTerm, selectedSession]);

  const handleTermChange = (term) => {
    setSelectedTerm(term);
  };

  const handleSessionChange = (session) => {
    setSelectedSession(session);
  };

  const handleDownload = async () => {
    try {
      const studentId = localStorage.getItem('studentId');
      if (!studentId) {
        navigate('/login');
        return;
      }

      const response = await studentApi.getResults(studentId, selectedTerm, selectedSession);
      // Create a blob from the response data
      const blob = new Blob([JSON.stringify(response.data, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `results-${selectedTerm}-${selectedSession}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to download results');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const getGradeColor = (grade) => {
    switch (grade) {
      case 'A': return 'text-green-600';
      case 'B': return 'text-blue-600';
      case 'C': return 'text-yellow-600';
      case 'D': return 'text-orange-600';
      case 'E': return 'text-red-600';
      case 'F': return 'text-red-800';
      default: return 'text-gray-600';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Error!</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      </div>
    );
  }

  if (!results) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">No results found for the selected term and session.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold">Academic Results</h2>
        <div className="flex space-x-4">
          <button 
            onClick={handleDownload}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <FaDownload />
            <span>Download</span>
          </button>
          <button 
            onClick={handlePrint}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            <FaPrint />
            <span>Print</span>
          </button>
        </div>
      </div>

      {/* Term and Session Selection */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-2">Select Term</label>
          <select
            value={selectedTerm}
            onChange={(e) => handleTermChange(e.target.value)}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            {terms.map(term => (
              <option key={term} value={term}>{term}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-2">Select Session</label>
          <select
            value={selectedSession}
            onChange={(e) => handleSessionChange(e.target.value)}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            {sessions.map(session => (
              <option key={session} value={session}>{session}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Results Summary */}
      <div className="bg-blue-50 rounded-lg p-6 mb-6">
        <h3 className="text-lg font-semibold mb-4">Term Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg shadow">
            <p className="text-sm text-gray-600">Total Score</p>
            <p className="text-2xl font-bold">{results.summary.totalScore}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <p className="text-sm text-gray-600">Average</p>
            <p className="text-2xl font-bold">{results.summary.average}%</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <p className="text-sm text-gray-600">Position</p>
            <p className="text-2xl font-bold">{results.summary.position}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <p className="text-sm text-gray-600">Class Size</p>
            <p className="text-2xl font-bold">{results.summary.totalStudents}</p>
          </div>
        </div>
        <div className="mt-4">
          <p className="text-sm text-gray-600">Remarks</p>
          <p className="text-lg font-medium">{results.summary.remarks}</p>
        </div>
      </div>

      {/* Detailed Results Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subject</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Score</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Grade</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Position</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {results.subjects.map((subject, index) => (
              <tr key={index}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{subject.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{subject.score}</td>
                <td className={`px-6 py-4 whitespace-nowrap text-sm font-bold ${getGradeColor(subject.grade)}`}>
                  {subject.grade}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{subject.position}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{subject.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Performance Chart */}
      <div className="mt-8">
        <h3 className="text-lg font-semibold mb-4">Performance Trend</h3>
        <div className="bg-gray-50 rounded-lg p-4 h-64 flex items-center justify-center">
          <div className="text-center text-gray-500">
            <FaChartLine className="mx-auto text-4xl mb-2" />
            <p>Performance chart will be displayed here</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentResults; 