import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { examApi } from '../services/api';
import { CheckCircle, Eye, Clock, Download, Calendar } from 'lucide-react';

const AdminResults = () => {
  const { user: currentUser } = useAuth();
  const [approvedSubmissions, setApprovedSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [releasing, setReleasing] = useState(false);
  const [selectedTerm, setSelectedTerm] = useState('');
  const [selectedSession, setSelectedSession] = useState('');
  const [showReleaseForm, setShowReleaseForm] = useState(false);

  const terms = ['1st', '2nd', '3rd'];
  const currentYear = new Date().getFullYear();
  const sessions = [`${currentYear-1}/${currentYear}`, `${currentYear}/${currentYear+1}`, `${currentYear+1}/${currentYear+2}`];

  useEffect(() => {
    if (currentUser && currentUser.role === 'admin') {
      fetchApprovedSubmissions();
    }
  }, [currentUser, selectedTerm, selectedSession]);

  const fetchApprovedSubmissions = async () => {
    try {
      setLoading(true);
      setError('');
      console.log('AdminResults - Current user:', currentUser);
      console.log('AdminResults - User role:', currentUser?.role);
      
      if (!currentUser || !currentUser.id) {
        setError('User not authenticated');
        return;
      }
      
      console.log('AdminResults - Fetching with term:', selectedTerm, 'session:', selectedSession);
      
      const submissions = await examApi.getApprovedSubmissions(selectedTerm, selectedSession);
      console.log('AdminResults - Submissions:', submissions);
      setApprovedSubmissions(submissions);
    } catch (err) {
      setError('Failed to fetch approved submissions');
      console.error('Error fetching submissions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleReleaseResults = async () => {
    if (!selectedTerm || !selectedSession) {
      alert('Please select both term and session');
      return;
    }

    try {
      setReleasing(true);
      const result = await examApi.releaseResults(selectedTerm, selectedSession);
      alert(`Results released successfully! ${result.releasedCount} submissions released.`);
      setShowReleaseForm(false);
      fetchApprovedSubmissions(); // Refresh the list
    } catch (err) {
      alert('Failed to release results');
      console.error('Error releasing results:', err);
    } finally {
      setReleasing(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const calculatePercentage = (score, totalMarks) => {
    return ((score / totalMarks) * 100).toFixed(1);
  };

  const exportToCSV = () => {
    const headers = ['Student Name', 'Email', 'Class', 'Exam Title', 'Subject', 'Score', 'Total Marks', 'Percentage', 'Term', 'Session', 'Approved By', 'Approved At'];
    const rows = approvedSubmissions.map(sub => [
      sub.student.displayName,
      sub.student.email,
      sub.student.currentClass,
      sub.exam.title,
      sub.exam.subject,
      sub.score,
      sub.exam.totalMarks,
      `${calculatePercentage(sub.score, sub.exam.totalMarks)}%`,
      sub.term,
      sub.session,
      sub.teacherApprovedBy?.displayName || 'N/A',
      formatDate(sub.teacherApprovedAt)
    ]);

    let csvContent = '';
    csvContent += headers.join(',') + '\n';
    rows.forEach(row => {
      csvContent += row.map(field => '"' + String(field).replace(/"/g, '""') + '"').join(',') + '\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `results_${selectedTerm}_${selectedSession}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (loading && approvedSubmissions.length === 0) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Navigation Bar */}
      <nav className="bg-red-600 text-white p-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold">Admin Results Portal</h1>
          <span className="text-sm">Welcome, {currentUser?.displayName}</span>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {/* Filters and Actions */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Term</label>
                <select
                  value={selectedTerm}
                  onChange={(e) => setSelectedTerm(e.target.value)}
                  className="border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="">All Terms</option>
                  {terms.map(term => (
                    <option key={term} value={term}>{term} Term</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Session</label>
                <select
                  value={selectedSession}
                  onChange={(e) => setSelectedSession(e.target.value)}
                  className="border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="">All Sessions</option>
                  {sessions.map(session => (
                    <option key={session} value={session}>{session}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowReleaseForm(true)}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                <CheckCircle className="w-4 h-4" />
                Release Results
              </button>
              <button
                onClick={exportToCSV}
                disabled={approvedSubmissions.length === 0}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
            </div>
          </div>
        </div>

        {/* Results Summary */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Results Summary</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-blue-600">Total Submissions</p>
              <p className="text-2xl font-bold text-blue-800">{approvedSubmissions.length}</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-sm text-green-600">Average Score</p>
              <p className="text-2xl font-bold text-green-800">
                {approvedSubmissions.length > 0 
                  ? (approvedSubmissions.reduce((sum, sub) => sum + sub.score, 0) / approvedSubmissions.length).toFixed(1)
                  : '0'
                }
              </p>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg">
              <p className="text-sm text-yellow-600">Average Percentage</p>
              <p className="text-2xl font-bold text-yellow-800">
                {approvedSubmissions.length > 0 
                  ? (approvedSubmissions.reduce((sum, sub) => sum + calculatePercentage(sub.score, sub.exam.totalMarks), 0) / approvedSubmissions.length).toFixed(1) + '%'
                  : '0%'
                }
              </p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <p className="text-sm text-purple-600">Unique Students</p>
              <p className="text-2xl font-bold text-purple-800">
                {new Set(approvedSubmissions.map(sub => sub.student._id)).size}
              </p>
            </div>
          </div>
        </div>

        {/* Approved Submissions List */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold mb-4">
            Approved Submissions ({approvedSubmissions.length})
          </h2>
          
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading submissions...</p>
            </div>
          ) : approvedSubmissions.length === 0 ? (
            <div className="text-center py-8">
              <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No approved submissions found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Student
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Exam
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Score
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Term/Session
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Approved By
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {approvedSubmissions.map((submission) => (
                    <tr key={submission._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {submission.student.displayName}
                          </div>
                          <div className="text-sm text-gray-500">
                            {submission.student.email}
                          </div>
                          <div className="text-xs text-gray-400">
                            {submission.student.currentClass}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {submission.exam.title}
                          </div>
                          <div className="text-sm text-gray-500">
                            {submission.exam.subject}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {submission.score}/{submission.exam.totalMarks}
                          </div>
                          <div className="text-sm text-gray-500">
                            {calculatePercentage(submission.score, submission.exam.totalMarks)}%
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {submission.term} Term
                        </div>
                        <div className="text-sm text-gray-500">
                          {submission.session}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {submission.teacherApprovedBy?.displayName || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(submission.teacherApprovedAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Release Results Modal */}
      {showReleaseForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">Release Results</h3>
            <p className="text-gray-600 mb-6">
              This will release all approved results for the selected term and session to students.
            </p>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Term *</label>
                <select
                  value={selectedTerm}
                  onChange={(e) => setSelectedTerm(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                  required
                >
                  <option value="">Select Term</option>
                  {terms.map(term => (
                    <option key={term} value={term}>{term} Term</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Session *</label>
                <select
                  value={selectedSession}
                  onChange={(e) => setSelectedSession(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                  required
                >
                  <option value="">Select Session</option>
                  {sessions.map(session => (
                    <option key={session} value={session}>{session}</option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={handleReleaseResults}
                disabled={!selectedTerm || !selectedSession || releasing}
                className="flex-1 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:bg-gray-400"
              >
                {releasing ? 'Releasing...' : 'Release Results'}
              </button>
              <button
                onClick={() => setShowReleaseForm(false)}
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
};

export default AdminResults; 