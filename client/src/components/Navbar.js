import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [navCollapsed, setNavCollapsed] = useState(true);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="bg-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex">
            <Link to="/" className="flex items-center">
              <span className="text-xl font-bold text-blue-600">School Portal</span>
            </Link>
          </div>

          {/* Manual Collapse Button for Mobile */}
          <div className="flex md:hidden">
            <button
              onClick={() => setNavCollapsed((prev) => !prev)}
              className="text-gray-700 focus:outline-none ml-2"
              aria-label={navCollapsed ? 'Expand navigation' : 'Collapse navigation'}
            >
              {navCollapsed ? (
                // Hamburger icon
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              ) : (
                // X icon
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
            </button>
          </div>

          {/* Navigation Links */}
          <div
            className={`items-center md:flex ${navCollapsed ? 'hidden' : 'flex'} absolute md:static top-16 right-0 left-0 bg-white md:bg-transparent z-50 md:z-auto md:w-auto w-full px-4 md:px-0 py-4 md:py-0 shadow md:shadow-none`}
          >
            {user ? (
              <>
                {user.role === 'student' && (
                  <>
                    <Link
                      to="/student/dashboard"
                      className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium"
                      onClick={() => setNavCollapsed(true)}
                    >
                      Dashboard
                    </Link>
                    <Link
                      to="/student/profile"
                      className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium"
                      onClick={() => setNavCollapsed(true)}
                    >
                      Profile
                    </Link>
                    <Link
                      to="/student/results"
                      className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium"
                      onClick={() => setNavCollapsed(true)}
                    >
                      Results
                    </Link>
                  </>
                )}

                {user.role === 'teacher' && (
                  <Link
                    to="/teacher/dashboard"
                    className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium"
                    onClick={() => setNavCollapsed(true)}
                  >
                    Teacher Dashboard
                  </Link>
                )}



                <button
                  onClick={() => { handleLogout(); setNavCollapsed(true); }}
                  className="ml-4 text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/student/login"
                  className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium"
                  onClick={() => setNavCollapsed(true)}
                >
                  Student Login
                </Link>
                <Link
                  to="/teacher/login"
                  className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium"
                  onClick={() => setNavCollapsed(true)}
                >
                  Teacher Login
                </Link>
                <Link
                  to="/register"
                  className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium"
                  onClick={() => setNavCollapsed(true)}
                >
                  Register
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
