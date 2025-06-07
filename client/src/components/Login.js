import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Mail, Lock, AlertCircle, Eye, EyeOff, Info } from "lucide-react";
import logo from '../assets/images/SpectraLogo.jpg';
import { authApi } from '../services/api';
import { FaUser, FaLock, FaEye, FaEyeSlash, FaGraduationCap, FaChalkboardTeacher } from 'react-icons/fa';

const Login = () => {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    role: "student",
    rememberMe: false
  });
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showDemoAccounts, setShowDemoAccounts] = useState(false);
  const [demoAccounts, setDemoAccounts] = useState(null);
  const { login } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      console.log('Attempting login with:', { 
        email: formData.email, 
        role: formData.role, 
        rememberMe: formData.rememberMe 
      });

      // First check if the user exists
      const checkResponse = await authApi.checkUser(formData.email);
      if (!checkResponse.exists) {
        setError('No account found with this email. Please register first.');
        return;
      }

      const response = await login(formData.email, formData.password, formData.rememberMe);
      console.log('Login response:', response);

      // Check if the logged-in user's role matches the selected role
      if (response.user.role !== formData.role) {
        setError(`Please use the ${response.user.role} login form`);
        return;
      }

      // Redirect based on role
      switch (response.user.role) {
        case 'student':
          navigate('/student/dashboard');
          break;
        case 'teacher':
          navigate('/teacher/dashboard');
          break;
        default:
          navigate('/');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError(err.message || 'Failed to login. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchDemoAccounts = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/auth/demo-accounts');
      const data = await response.json();
      setDemoAccounts(data);
    } catch (error) {
      console.error('Error fetching demo accounts:', error);
    }
  };

  const toggleDemoAccounts = () => {
    if (!demoAccounts) {
      fetchDemoAccounts();
    }
    setShowDemoAccounts(!showDemoAccounts);
  };

  const toggleRole = () => {
    setFormData(prev => ({
      ...prev,
      role: prev.role === 'student' ? 'teacher' : 'student'
    }));
    setError(''); // Clear any previous errors
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="flex justify-center">
            {formData.role === 'student' ? (
              <FaGraduationCap className="h-12 w-12 text-blue-600" />
            ) : (
              <FaChalkboardTeacher className="h-12 w-12 text-green-600" />
            )}
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {formData.role === 'student' ? 'Student Login' : 'Teacher Login'}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {formData.role === 'student' 
              ? 'Access your student dashboard and view your results'
              : 'Access your teacher dashboard and manage student records'}
          </p>
        </div>

        <button
          onClick={toggleRole}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Switch to {formData.role === 'student' ? 'Teacher' : 'Student'} Login
        </button>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="flex">
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">{error}</h3>
                </div>
              </div>
            </div>
          )}

          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email" className="sr-only">Email address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FaUser className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  className="appearance-none rounded-none relative block w-full px-3 py-2 pl-10 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  placeholder="Email address"
                  value={formData.email}
                  onChange={handleChange}
                />
              </div>
            </div>
            <div>
              <label htmlFor="password" className="sr-only">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FaLock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  className="appearance-none rounded-none relative block w-full px-3 py-2 pl-10 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  placeholder="Password"
                  value={formData.password}
                  onChange={handleChange}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={togglePasswordVisibility}
                >
                  {showPassword ? (
                    <FaEyeSlash className="h-5 w-5 text-gray-400" />
                  ) : (
                    <FaEye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="remember-me"
                name="rememberMe"
                type="checkbox"
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                checked={formData.rememberMe}
                onChange={handleChange}
              />
              <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
                Remember me
              </label>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>
        </form>

        <div className="mt-6">
          <div className="relative">
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">
                Don't have an account?{' '}
                <button
                  onClick={() => navigate('/register')}
                  className="font-medium text-blue-600 hover:text-blue-500"
                >
                  Register here
                </button>
              </span>
            </div>
          </div>
        </div>

        <div className="mt-4">
          <button
            onClick={toggleDemoAccounts}
            className="w-full flex items-center justify-center gap-2 text-sm text-gray-600 hover:text-gray-900"
          >
            <Info className="h-4 w-4" />
            {showDemoAccounts ? 'Hide Demo Accounts' : 'Show Demo Accounts'}
          </button>
          
          {showDemoAccounts && demoAccounts && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 mb-3">Demo Accounts</h3>
              
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-700">Teacher Account</h4>
                  <p className="text-sm text-gray-600">Unique Code: {demoAccounts.teacher.uniqueCode}</p>
                  <p className="text-sm text-gray-600">Password: {demoAccounts.teacher.password}</p>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-700">Student Account</h4>
                  <p className="text-sm text-gray-600">Unique Code: {demoAccounts.student.uniqueCode}</p>
                  <p className="text-sm text-gray-600">Password: {demoAccounts.student.password}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
