import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const AdminLogin = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const response = await login({ ...formData, role: 'admin' });
      if (response && response.user && response.user.role === 'admin') {
        navigate('/admin/dashboard');
      } else {
        setError('Invalid admin credentials or not an admin account.');
      }
    } catch (err) {
      setError('Login failed. Please check your credentials.');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 py-8 px-2 xs:px-4 sm:px-6 lg:px-8">
      <div className="bg-white p-6 xs:p-8 rounded shadow-md w-full max-w-xs xs:max-w-sm sm:max-w-md">
        <h2 className="text-xl xs:text-2xl font-bold mb-4 xs:mb-6 text-center">Admin Login</h2>
        {error && <div className="mb-3 xs:mb-4 text-xs xs:text-sm text-red-600">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="mb-3 xs:mb-4">
            <label className="block mb-1 font-medium text-xs xs:text-sm">Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded text-xs xs:text-sm"
              required
            />
          </div>
          <div className="mb-4 xs:mb-6">
            <label className="block mb-1 font-medium text-xs xs:text-sm">Password</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="w-full px-3 py-2 border rounded text-xs xs:text-sm"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full bg-purple-600 text-white py-2 rounded hover:bg-purple-700 transition text-xs xs:text-sm"
          >
            Login
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdminLogin; 