import React, { createContext, useContext, useState, useEffect } from "react";
import { authApi } from '../services/api';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for stored auth data on mount
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        const storedUser = localStorage.getItem('user') || sessionStorage.getItem('user');
        const rememberMe = localStorage.getItem('rememberMe') === 'true';

        if (token && storedUser) {
          setUser(JSON.parse(storedUser));
        }
      } catch (error) {
        console.error('Error checking auth:', error);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (emailOrObj, password, rememberMe) => {
    let email, role;
    if (typeof emailOrObj === 'object') {
      email = emailOrObj.email;
      password = emailOrObj.password;
      role = emailOrObj.role;
      rememberMe = emailOrObj.rememberMe;
    } else {
      email = emailOrObj;
    }
    try {
      console.log('AuthContext: Attempting login with:', { email, role, rememberMe });
      const response = await authApi.login(email, password, rememberMe, role);
      console.log('AuthContext: Login response:', response);
      if (!response || !response.token || !response.user) {
        throw new Error('Invalid response from server');
      }
      // Store auth data based on rememberMe preference
      const storage = rememberMe ? localStorage : sessionStorage;
      storage.setItem('token', response.token);
      storage.setItem('user', JSON.stringify(response.user));
      storage.setItem('rememberMe', rememberMe);
      setUser(response.user);
      return response;
    } catch (error) {
      console.error('AuthContext: Login error:', error);
      throw new Error(error.message || 'Failed to login. Please check your credentials and try again.');
    }
  };

  const register = async (userData) => {
    try {
      console.log('AuthContext: Attempting registration with:', { email: userData.email, role: userData.role });
      
      const response = await authApi.register(userData);
      console.log('AuthContext: Registration response:', response);

      if (!response || !response.token || !response.user) {
        throw new Error('Invalid response from server');
      }

      // Store auth data based on rememberMe preference
      const storage = userData.rememberMe ? localStorage : sessionStorage;
      storage.setItem('token', response.token);
      storage.setItem('user', JSON.stringify(response.user));
      storage.setItem('rememberMe', userData.rememberMe);

      setUser(response.user);
      return response;
    } catch (error) {
      console.error('AuthContext: Registration error:', error);
      throw new Error(error.message || 'Failed to register. Please try again.');
    }
  };

  const logout = () => {
    // Clear all storage
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    localStorage.removeItem('rememberMe');
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('refreshToken');
    sessionStorage.removeItem('user');
    setUser(null);
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    isAuthenticated: !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
