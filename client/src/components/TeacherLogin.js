import React, { useState } from "react";
import { useNavigate, Link, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Mail, Lock, AlertCircle, Eye, EyeOff, Info } from "lucide-react";
import logo from '../assets/images/SpectraLogo.jpg';
import { authApi } from '../services/api';
import { FaChalkboardTeacher } from 'react-icons/fa';

const TeacherLogin = () => {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    rememberMe: false
  });
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const { login, user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  // Redirect authenticated users to their appropriate dashboard
  if (isAuthenticated && user) {
    switch (user.role) {
      case 'student':
        return <Navigate to="/student/dashboard" replace />;
      case 'teacher':
        return <Navigate to="/teacher/dashboard" replace />;
      case 'admin':
        return <Navigate to="/admin/dashboard" replace />;
      default:
        return <Navigate to="/teacher/dashboard" replace />;
    }
  }

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
      console.log('Attempting teacher login with:', { 
        email: formData.email, 
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

      // Check if the logged-in user's role is teacher
      if (response.user.role !== 'teacher') {
        setError('Please use the student login form');
        return;
      }

      // Redirect to teacher dashboard
      navigate('/teacher/dashboard');
    } catch (err) {
      console.error('Login error:', err);
      if (err.message === 'Your registration is pending admin approval.') {
        setError('Your registration is pending admin approval. Please wait for an admin to approve your account.');
      } else {
        setError(err.message || 'Failed to login. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-8 px-2 xs:px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-xs xs:max-w-sm sm:max-w-md space-y-8">
        <div>
          <div className="flex justify-center">
            <FaChalkboardTeacher className="h-10 w-10 xs:h-12 xs:w-12 text-green-600" />
          </div>
          <h2 className="mt-4 xs:mt-6 text-center text-2xl xs:text-3xl font-extrabold text-gray-900">
            Teacher Login
          </h2>
          <p className="mt-1 xs:mt-2 text-center text-xs xs:text-sm text-gray-600">
            Access your teacher dashboard and manage student records
          </p>
        </div>

        <form className="mt-6 xs:mt-8 space-y-4 xs:space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-md bg-red-50 p-3 xs:p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <AlertCircle className="h-5 w-5 text-red-400" />
                </div>
                <div className="ml-3">
                  <h3 className="text-xs xs:text-sm font-medium text-red-800">{error}</h3>
                </div>
              </div>
            </div>
          )}

          <div className="rounded-md shadow-sm">
            <div>
              <label htmlFor="email" className="sr-only">
                Email address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="appearance-none rounded-none relative block w-full px-3 py-2 pl-10 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-green-500 focus:border-green-500 focus:z-10 text-xs xs:text-sm"
                  placeholder="Email address"
                />
              </div>
            </div>
            <div className="mt-4">
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="appearance-none rounded-none relative block w-full px-3 py-2 pl-10 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-green-500 focus:border-green-500 focus:z-10 text-xs xs:text-sm"
                  placeholder="Password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={togglePasswordVisibility}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-col xs:flex-row items-center justify-between gap-2 xs:gap-0">
            <div className="flex items-center">
              <input
                id="remember-me"
                name="rememberMe"
                type="checkbox"
                checked={formData.rememberMe}
                onChange={handleChange}
                className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
              />
              <label htmlFor="remember-me" className="ml-2 block text-xs xs:text-sm text-gray-900">
                Remember me
              </label>
            </div>

            <div className="text-xs xs:text-sm">
              <Link to="/forgot-password" className="font-medium text-green-600 hover:text-green-500">
                Forgot your password?
              </Link>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-xs xs:text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </div>
        </form>

        <div className="text-center">
          <p className="text-xs xs:text-sm text-gray-600">
            Don't have an account?{" "}
            <Link to="/register" className="font-medium text-green-600 hover:text-green-500">
              Register here
            </Link>
          </p>
          <p className="mt-2 text-xs xs:text-sm text-gray-600">
            Are you a student?{" "}
            <Link to="/student/login" className="font-medium text-green-600 hover:text-green-500">
              Login as student
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default TeacherLogin; 