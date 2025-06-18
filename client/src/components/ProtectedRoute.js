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

  if (role && user.role !== role) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoute; 