import React, { useState, useEffect } from 'react';
import { userApi } from '../services/api';
import { useNavigate } from 'react-router-dom';

function AuthEmail() {
  const [studentUsers, setStudentUsers] = useState([]);
  const [selectedEmail, setSelectedEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchStudentUsers = async () => {
      try {
        setLoading(true);
        setError('');
        const users = await userApi.getAllStudentUsers();
        setStudentUsers(users);
      } catch (err) {
        setError('Failed to fetch student emails');
      } finally {
        setLoading(false);
      }
    };
    fetchStudentUsers();
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedEmail) {
      setError('Please select your email');
      return;
    }
    const found = studentUsers.find(u => u.email === selectedEmail);
    if (!found) {
      setError('Selected email is not a valid student email');
      return;
    }
    localStorage.setItem('studentEmail', selectedEmail);
    navigate('/exam-selection');
  };

  return (
    <div className="container mx-auto px-4 py-8 flex flex-col items-center justify-center min-h-screen">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
        <h1 className="text-2xl font-bold mb-4 text-center">Student Authentication</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Select your email</label>
            <input
              list="student-emails"
              type="email"
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={selectedEmail}
              onChange={e => setSelectedEmail(e.target.value)}
              required
              autoComplete="off"
              placeholder="student@example.com"
            />
            <datalist id="student-emails">
              {studentUsers.map(user => (
                <option key={user.email} value={user.email}>{user.displayName ? `${user.displayName} (${user.email})` : user.email}</option>
              ))}
            </datalist>
          </div>
          {error && <div className="text-red-600 text-sm">{error}</div>}
          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:bg-blue-300"
            disabled={loading}
          >
            {loading ? 'Loading...' : 'Continue'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default AuthEmail; 