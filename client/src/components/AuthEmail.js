import React, { useState } from 'react';
import { userApi } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { FaGraduationCap, FaEnvelope } from 'react-icons/fa';

function AuthEmail() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) {
      setError('Please enter your email address');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Fetch all student users to validate the email
      const users = await userApi.getAllStudentUsers();
      const found = users.find(u => u.email === email);
      
      if (!found) {
        setError('This email is not registered as a student. Please check your email or contact your administrator.');
        return;
      }

      // Store the email and navigate to exam selection
      localStorage.setItem('studentEmail', email);
      navigate('/exam-selection');
    } catch (err) {
      setError('Failed to verify email. Please try again.');
      console.error('Error verifying email:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-100 to-indigo-200 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <FaGraduationCap className="text-white text-2xl" />
          </div>
          <h1 className="text-2xl font-bold text-blue-800 mb-2">Student Exam Access</h1>
          <p className="text-gray-600">Enter your registered email to access your exams</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FaEnvelope className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="email"
                className="w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your student email"
                required
                autoComplete="email"
                disabled={loading}
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 px-4 rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            disabled={loading}
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Verifying...
              </div>
            ) : (
              'Continue to Exams'
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            Need help? Contact your school administrator
          </p>
        </div>
      </div>
    </div>
  );
}

export default AuthEmail; 