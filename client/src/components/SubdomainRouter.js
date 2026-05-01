// Subdomain Router Component
// Handles routing logic for school subdomains and cross-domain navigation

import React, { useEffect, useState, useContext } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { extractCurrentSubdomain, getStoredSubdomainLoginData, clearStoredSubdomainLoginData } from '../utils/subdomain';
import apiClient from '../services/subdomainApi';
import { AuthContext } from '../context/AuthContext';

const SubdomainRouter = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, login } = useContext(AuthContext);
  
  const [schoolContext, setSchoolContext] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [redirectInfo, setRedirectInfo] = useState(null);
  
  const currentSubdomain = extractCurrentSubdomain();
  const isOnSubdomain = currentSubdomain !== null;

  useEffect(() => {
    initializeSubdomainContext();
  }, [currentSubdomain]);

  const initializeSubdomainContext = async () => {
    setIsLoading(true);
    
    try {
      if (isOnSubdomain) {
        // Check for stored login data from cross-domain transfer
        const storedData = getStoredSubdomainLoginData();
        
        if (storedData && storedData.school && storedData.school.subdomain === currentSubdomain) {
          // We have valid stored login data
          setSchoolContext(storedData.school);
          
          // Set user context if not already set
          if (!isAuthenticated && storedData.user) {
            await loginWithStoredData(storedData);
          }
          
          // Clear stored data after using it
          clearStoredSubdomainLoginData();
        } else {
          // Fetch school context from API
          await fetchSchoolContext();
        }
      } else {
        // On main domain, no school context needed
        setSchoolContext(null);
      }
    } catch (error) {
      console.error('Error initializing subdomain context:', error);
      handleSubdomainError(error);
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithStoredData = async (storedData) => {
    try {
      // Set authentication context with stored data
      if (storedData.token && storedData.user) {
        localStorage.setItem('token', storedData.token);
        localStorage.setItem('user', JSON.stringify(storedData.user));
        
        // Update API client context
        apiClient.updateSchoolContext(storedData.school);
        
        // Show welcome message
        showWelcomeMessage(storedData.school);
      }
    } catch (error) {
      console.error('Error setting stored login data:', error);
      clearStoredSubdomainLoginData();
    }
  };

  const fetchSchoolContext = async () => {
    if (!isOnSubdomain) return;
    
    try {
      const response = await apiClient.getSchoolInfo();
      setSchoolContext(response.school);
      apiClient.updateSchoolContext(response.school);
    } catch (error) {
      console.error('Error fetching school context:', error);
      
      // If school not found, redirect to main domain
      if (error.response?.status === 404) {
        redirectToMainDomain('School not found');
      }
    }
  };

  const showWelcomeMessage = (school) => {
    // Create welcome notification
    const notification = document.createElement('div');
    notification.className = 'fixed top-4 right-4 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-md shadow-lg z-50 max-w-sm';
    notification.innerHTML = `
      <div class="flex">
        <div class="ml-3">
          <h3 class="text-sm font-medium text-green-800">Welcome to ${school.name}!</h3>
          <p class="text-sm text-green-700 mt-1">You are now logged in to your school dashboard.</p>
        </div>
      </div>
    `;
    
    document.body.appendChild(notification);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 5000);
  };

  const handleSubdomainError = (error) => {
    // Handle various subdomain-related errors
    if (error.response?.status === 403) {
      const message = error.response.data?.message;
      
      if (message?.includes('cross-school')) {
        // Handle cross-school access error
        const schoolInfo = error.response.data?.school;
        if (schoolInfo?.domain) {
          setRedirectInfo({
            message: `This resource belongs to ${schoolInfo.name}. Redirecting...`,
            targetUrl: `https://${schoolInfo.domain}`,
            delay: 3000
          });
        }
      }
    }
  };

  const redirectToMainDomain = (reason) => {
    setRedirectInfo({
      message: reason || 'Redirecting to main domain...',
      targetUrl: 'https://schoolshubs.com',
      delay: 2000
    });
  };

  const redirectToCorrectSchool = (targetUrl) => {
    window.location.href = targetUrl;
  };

  useEffect(() => {
    if (redirectInfo) {
      const timer = setTimeout(() => {
        redirectToCorrectSchool(redirectInfo.targetUrl);
      }, redirectInfo.delay);
      
      return () => clearTimeout(timer);
    }
  }, [redirectInfo]);

  // Handle cross-domain redirects for unauthenticated users
  useEffect(() => {
    if (!isLoading && isOnSubdomain && !isAuthenticated) {
      const currentPath = location.pathname;
      const publicPaths = ['/login', '/register', '/forgot-password'];
      
      // If not on a public path, redirect to login
      if (!publicPaths.includes(currentPath)) {
        navigate('/login', { replace: true });
      }
    }
  }, [isLoading, isOnSubdomain, isAuthenticated, location.pathname, navigate]);

  // Handle main domain users trying to access school-specific routes
  useEffect(() => {
    if (!isLoading && !isOnSubdomain) {
      const currentPath = location.pathname;
      const schoolOnlyPaths = ['/teacher/dashboard', '/student/dashboard', '/admin/dashboard'];
      
      // If on main domain but trying to access school-specific paths
      if (schoolOnlyPaths.some(path => currentPath.startsWith(path))) {
        setRedirectInfo({
          message: 'School-specific pages require school subdomain access',
          targetUrl: 'https://schoolshubs.com/login',
          delay: 3000
        });
      }
    }
  }, [isLoading, isOnSubdomain, location.pathname]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading school context...</p>
        </div>
      </div>
    );
  }

  // Show redirect message
  if (redirectInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">{redirectInfo.message}</p>
          <p className="text-sm text-gray-500 mt-2">You will be redirected automatically...</p>
        </div>
      </div>
    );
  }

  // Render children with school context
  return (
    <div className="subdomain-app" data-subdomain={currentSubdomain}>
      {React.cloneElement(children, {
        schoolContext,
        isOnSubdomain,
        currentSubdomain
      })}
    </div>
  );
};

// Hook for accessing subdomain context
export const useSubdomainContext = () => {
  const location = useLocation();
  const currentSubdomain = extractCurrentSubdomain();
  const isOnSubdomain = currentSubdomain !== null;
  
  return {
    currentSubdomain,
    isOnSubdomain,
    location,
    canAccessSchoolResource: (resourceSchoolId) => {
      // This would be implemented based on user's school context
      // For now, return true - actual implementation would check user's school_id
      return true;
    }
  };
};

// Component for school branding
export const SchoolBranding = ({ school, children }) => {
  if (!school) return children;
  
  return (
    <div className="school-branded" data-school-id={school.id}>
      <div className="school-header bg-blue-600 text-white p-4">
        <div className="container mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
                <span className="text-blue-600 font-bold text-lg">
                  {school.name.charAt(0)}
                </span>
              </div>
              <div>
                <h1 className="text-xl font-bold">{school.name}</h1>
                {school.city && <p className="text-sm text-blue-100">{school.city}</p>}
              </div>
            </div>
            <div className="text-sm text-blue-100">
              {school.domain}
            </div>
          </div>
        </div>
      </div>
      
      <div className="school-content">
        {children}
      </div>
      
      <div className="school-footer bg-gray-100 p-4 mt-auto">
        <div className="container mx-auto text-center text-sm text-gray-600">
          <p>&copy; 2026 {school.name}. All rights reserved.</p>
          <p className="text-xs mt-1">Powered by SchoolHubs Platform</p>
        </div>
      </div>
    </div>
  );
};

// Component for subdomain navigation
export const SubdomainNavigation = ({ school, user }) => {
  const navigate = useNavigate();
  const currentSubdomain = extractCurrentSubdomain();
  
  const handleLogout = async () => {
    try {
      await apiClient.logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
      navigate('/login');
    }
  };

  const handleMainDomain = () => {
    window.location.href = 'https://schoolshubs.com';
  };

  const getNavigationItems = () => {
    const items = [];
    
    if (user?.role === 'student') {
      items.push(
        { label: 'Dashboard', path: '/student/dashboard' },
        { label: 'My Exams', path: '/student/exams' },
        { label: 'Results', path: '/student/results' },
        { label: 'Profile', path: '/student/profile' }
      );
    } else if (user?.role === 'teacher') {
      items.push(
        { label: 'Dashboard', path: '/teacher/dashboard' },
        { label: 'Exams', path: '/teacher/exams' },
        { label: 'Students', path: '/teacher/students' },
        { label: 'Results', path: '/teacher/results' },
        { label: 'Profile', path: '/teacher/profile' }
      );
    } else if (user?.role === 'admin') {
      items.push(
        { label: 'Dashboard', path: '/admin/dashboard' },
        { label: 'Teachers', path: '/admin/teachers' },
        { label: 'Students', path: '/admin/students' },
        { label: 'Exams', path: '/admin/exams' },
        { label: 'Settings', path: '/admin/settings' }
      );
    }
    
    return items;
  };

  if (!school) return null;

  return (
    <nav className="school-navigation bg-white shadow-sm border-b">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-8">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">
                  {school.name.charAt(0)}
                </span>
              </div>
              <span className="font-semibold text-gray-900">{school.name}</span>
            </div>
            
            <div className="hidden md:flex space-x-6">
              {getNavigationItems().map((item) => (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">
              {user?.first_name} {user?.last_name}
            </span>
            <button
              onClick={handleMainDomain}
              className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              title="Go to main domain"
            >
              Main Site
            </button>
            <button
              onClick={handleLogout}
              className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-md text-sm font-medium"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default SubdomainRouter;
