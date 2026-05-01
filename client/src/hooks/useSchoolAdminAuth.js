// School Admin Authentication Hook
// Handles authentication state and token management for school administrators

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';

const useSchoolAdminAuth = () => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [admin, setAdmin] = useState(null);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    // Check authentication status on mount
    useEffect(() => {
        checkAuthStatus();
    }, []);

    const checkAuthStatus = useCallback(async () => {
        try {
            setIsLoading(true);
            const token = localStorage.getItem('schoolAdminToken');

            if (!token) {
                setIsAuthenticated(false);
                setAdmin(null);
                return;
            }

            // Verify token with backend
            const response = await fetch('/api/school-admin/auth/verify', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                setAdmin(data.data.admin);
                setIsAuthenticated(true);
                setError(null);
            } else {
                // Token invalid, remove it
                localStorage.removeItem('schoolAdminToken');
                setIsAuthenticated(false);
                setAdmin(null);
                setError('Session expired');
            }
        } catch (error) {
            console.error('Auth check error:', error);
            localStorage.removeItem('schoolAdminToken');
            setIsAuthenticated(false);
            setAdmin(null);
            setError('Authentication failed');
        } finally {
            setIsLoading(false);
        }
    }, []);

    const login = useCallback(async (credentials) => {
        try {
            setIsLoading(true);
            setError(null);

            const response = await fetch('/api/school-admin/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(credentials)
            });

            const data = await response.json();

            if (response.ok && data.success) {
                // Store token
                localStorage.setItem('schoolAdminToken', data.data.token);
                
                // Update state
                setAdmin(data.data.admin);
                setIsAuthenticated(true);
                
                toast.success('Login successful');
                return { success: true, admin: data.data.admin };
            } else {
                const errorMessage = data.error || 'Login failed';
                setError(errorMessage);
                toast.error(errorMessage);
                return { success: false, error: errorMessage };
            }
        } catch (error) {
            const errorMessage = 'Network error during login';
            setError(errorMessage);
            toast.error(errorMessage);
            console.error('Login error:', error);
            return { success: false, error: errorMessage };
        } finally {
            setIsLoading(false);
        }
    }, []);

    const logout = useCallback(async () => {
        try {
            const token = localStorage.getItem('schoolAdminToken');
            
            if (token) {
                // Call logout endpoint (optional, for server-side session cleanup)
                await fetch('/api/school-admin/auth/logout', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
            }
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            // Always clear local state
            localStorage.removeItem('schoolAdminToken');
            setAdmin(null);
            setIsAuthenticated(false);
            setError(null);
            toast.success('Logged out successfully');
            navigate('/login');
        }
    }, [navigate]);

    const refreshAuth = useCallback(async () => {
        try {
            const token = localStorage.getItem('schoolAdminToken');
            
            if (!token) {
                return false;
            }

            const response = await fetch('/api/school-admin/auth/refresh', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ token })
            });

            if (response.ok) {
                const data = await response.json();
                localStorage.setItem('schoolAdminToken', data.data.token);
                setAdmin(data.data.admin);
                return true;
            } else {
                logout();
                return false;
            }
        } catch (error) {
            console.error('Token refresh error:', error);
            logout();
            return false;
        }
    }, [logout]);

    const changePassword = useCallback(async (currentPassword, newPassword) => {
        try {
            setIsLoading(true);
            const token = localStorage.getItem('schoolAdminToken');

            const response = await fetch('/api/school-admin/auth/change-password', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    currentPassword,
                    newPassword
                })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                toast.success('Password changed successfully');
                return { success: true };
            } else {
                const errorMessage = data.error || 'Password change failed';
                toast.error(errorMessage);
                return { success: false, error: errorMessage };
            }
        } catch (error) {
            const errorMessage = 'Network error during password change';
            toast.error(errorMessage);
            console.error('Password change error:', error);
            return { success: false, error: errorMessage };
        } finally {
            setIsLoading(false);
        }
    }, []);

    const hasPermission = useCallback((permissionType, requiredLevel = 'read') => {
        if (!admin || !admin.permissions) {
            return false;
        }

        const userPermissionLevel = admin.permissions[permissionType];
        if (!userPermissionLevel) {
            return false;
        }

        const permissionLevels = {
            'none': 0,
            'read': 1,
            'write': 2,
            'full': 3
        };

        return permissionLevels[userPermissionLevel] >= permissionLevels[requiredLevel];
    }, [admin]);

    const requireAuth = useCallback(() => {
        if (!isLoading && !isAuthenticated) {
            navigate('/login');
            return false;
        }
        return true;
    }, [isLoading, isAuthenticated, navigate]);

    const getAuthHeader = useCallback(() => {
        const token = localStorage.getItem('schoolAdminToken');
        return token ? { 'Authorization': `Bearer ${token}` } : {};
    }, []);

    // Auto-logout on token expiration
    useEffect(() => {
        if (isAuthenticated) {
            // Set up token refresh check
            const checkInterval = setInterval(() => {
                const token = localStorage.getItem('schoolAdminToken');
                if (token) {
                    try {
                        const decoded = JSON.parse(atob(token.split('.')[1]));
                        const expirationTime = decoded.exp * 1000;
                        const currentTime = Date.now();
                        const timeUntilExpiry = expirationTime - currentTime;
                        
                        // Refresh token if it expires in less than 5 minutes
                        if (timeUntilExpiry < 5 * 60 * 1000 && timeUntilExpiry > 0) {
                            refreshAuth();
                        } else if (timeUntilExpiry <= 0) {
                            logout();
                        }
                    } catch (error) {
                        console.error('Token parsing error:', error);
                        logout();
                    }
                }
            }, 60000); // Check every minute

            return () => clearInterval(checkInterval);
        }
    }, [isAuthenticated, refreshAuth, logout]);

    return {
        // State
        isAuthenticated,
        isLoading,
        admin,
        error,
        
        // Actions
        login,
        logout,
        refreshAuth,
        changePassword,
        checkAuthStatus,
        
        // Utilities
        hasPermission,
        requireAuth,
        getAuthHeader,
        
        // Derived state
        schoolInfo: admin?.school,
        permissions: admin?.permissions || {},
        isAdmin: isAuthenticated && admin?.role === 'school_admin'
    };
};

export default useSchoolAdminAuth;
