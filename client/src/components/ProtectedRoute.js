import React from 'react';
import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children, role }) => {
  const user =
    JSON.parse(localStorage.getItem('user')) ||
    JSON.parse(sessionStorage.getItem('user'));
  const token =
    localStorage.getItem('token') ||
    sessionStorage.getItem('token');

  console.log('ProtectedRoute user:', user);
  console.log('ProtectedRoute user.role:', user && user.role);
  console.log('ProtectedRoute required role:', role);

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  // Check role access
  let hasAccess = false;
  if (role === 'super_admin') {
    // For super admin, check either role or isSuperAdmin flag
    hasAccess = user.role === 'super_admin' || user.isSuperAdmin === true;
  } else {
    // For other roles, check exact match
    hasAccess = user.role === role;
  }

  if (!hasAccess) {
    // Redirect based on required role
    if (role === 'super_admin') {
      return <Navigate to="/super-admin/login" replace />;
    } else if (role === 'admin') {
      return <Navigate to="/admin/login" replace />;
    } else if (role === 'teacher') {
      return <Navigate to="/teacher/login" replace />;
    } else if (role === 'student') {
      return <Navigate to="/student/login" replace />;
    }
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoute;