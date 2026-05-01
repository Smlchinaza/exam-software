// School Admin API Service
// Centralized API service for school admin endpoints with error handling and token management

import { toast } from 'react-hot-toast';

class SchoolAdminApiService {
    constructor() {
        this.baseURL = '/api/school-admin';
    }

    // Get authentication headers
    getAuthHeaders() {
        const token = localStorage.getItem('schoolAdminToken');
        return {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` })
        };
    }

    // Handle API errors
    handleError(error, customMessage = null) {
        console.error('API Error:', error);
        
        if (error.response) {
            // Server responded with error status
            const { status, data } = error.response;
            
            switch (status) {
                case 401:
                    toast.error(data.error || 'Authentication required');
                    // Token might be expired, clear it
                    localStorage.removeItem('schoolAdminToken');
                    window.location.href = '/login';
                    break;
                case 403:
                    toast.error(data.error || 'Access denied');
                    break;
                case 404:
                    toast.error(data.error || 'Resource not found');
                    break;
                case 422:
                    toast.error(data.error || 'Invalid data provided');
                    break;
                case 500:
                    toast.error(data.error || 'Server error occurred');
                    break;
                default:
                    toast.error(data.error || customMessage || 'Request failed');
            }
            
            return { success: false, error: data.error || 'Request failed', code: data.code };
        } else if (error.request) {
            // Network error
            toast.error('Network error. Please check your connection.');
            return { success: false, error: 'Network error', code: 'NETWORK_ERROR' };
        } else {
            // Other error
            toast.error(customMessage || 'An unexpected error occurred');
            return { success: false, error: 'Unexpected error', code: 'UNEXPECTED_ERROR' };
        }
    }

    // Generic request method
    async request(endpoint, options = {}) {
        try {
            const config = {
                headers: this.getAuthHeaders(),
                ...options
            };

            const response = await fetch(`${this.baseURL}${endpoint}`, config);
            const data = await response.json();

            if (!response.ok) {
                throw { response: { status: response.status, data } };
            }

            return { success: true, data };
        } catch (error) {
            return this.handleError(error);
        }
    }

    // Dashboard APIs
    async getDashboardStats() {
        return this.request('/dashboard/stats');
    }

    async getDashboardActivity(limit = 10) {
        return this.request(`/dashboard/activity?limit=${limit}`);
    }

    async getDashboardPerformance(period = '30') {
        return this.request(`/dashboard/performance?period=${period}`);
    }

    async getTeachersOverview(page = 1, limit = 20, search = '', status = 'active') {
        const params = new URLSearchParams({
            page: page.toString(),
            limit: limit.toString(),
            ...(search && { search }),
            ...(status && { status })
        });
        return this.request(`/dashboard/teachers?${params}`);
    }

    async getStudentsOverview(page = 1, limit = 20, search = '', status = 'active') {
        const params = new URLSearchParams({
            page: page.toString(),
            limit: limit.toString(),
            ...(search && { search }),
            ...(status && { status })
        });
        return this.request(`/dashboard/students?${params}`);
    }

    async getExamsOverview(page = 1, limit = 20, search = '', status = '') {
        const params = new URLSearchParams({
            page: page.toString(),
            limit: limit.toString(),
            ...(search && { search }),
            ...(status && { status })
        });
        return this.request(`/dashboard/exams?${params}`);
    }

    // Teacher Registration APIs
    async getPendingRegistrations() {
        return this.request('/teacher-registrations/pending');
    }

    async getAllRegistrations(page = 1, limit = 20, status = 'all', search = '') {
        const params = new URLSearchParams({
            page: page.toString(),
            limit: limit.toString(),
            ...(status !== 'all' && { status }),
            ...(search && { search })
        });
        return this.request(`/teacher-registrations?${params}`);
    }

    async getRegistrationDetails(registrationId) {
        return this.request(`/teacher-registrations/${registrationId}`);
    }

    async approveRegistration(registrationId) {
        return this.request(`/teacher-registrations/${registrationId}/approve`, {
            method: 'POST'
        });
    }

    async rejectRegistration(registrationId, rejectionReason) {
        return this.request(`/teacher-registrations/${registrationId}/reject`, {
            method: 'POST',
            body: JSON.stringify({ rejectionReason })
        });
    }

    async getRegistrationStats() {
        return this.request('/teacher-registrations/stats/summary');
    }

    async exportRegistrations(status = 'all', format = 'csv') {
        const params = new URLSearchParams({
            ...(status !== 'all' && { status }),
            format
        });
        
        try {
            const response = await fetch(`${this.baseURL}/teacher-registrations/export?${params}`, {
                headers: this.getAuthHeaders()
            });

            if (!response.ok) {
                const data = await response.json();
                throw { response: { status: response.status, data } };
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `teacher-registrations-${new Date().toISOString().split('T')[0]}.${format}`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            return { success: true };
        } catch (error) {
            return this.handleError(error, 'Failed to export registrations');
        }
    }

    // Authentication APIs
    async login(credentials) {
        return this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify(credentials)
        });
    }

    async refreshToken(token) {
        return this.request('/auth/refresh', {
            method: 'POST',
            body: JSON.stringify({ token })
        });
    }

    async verifyToken() {
        return this.request('/auth/verify');
    }

    async changePassword(currentPassword, newPassword) {
        return this.request('/auth/change-password', {
            method: 'POST',
            body: JSON.stringify({ currentPassword, newPassword })
        });
    }

    // Utility methods
    async healthCheck() {
        try {
            const response = await fetch(`${this.baseURL}/health`);
            const data = await response.json();
            return { success: response.ok, data };
        } catch (error) {
            return { success: false, error: 'Health check failed' };
        }
    }

    // Batch operations
    async batchApproveRegistrations(registrationIds) {
        const promises = registrationIds.map(id => 
            this.approveRegistration(id)
        );
        
        try {
            const results = await Promise.allSettled(promises);
            const successful = results.filter(r => r.value?.success).length;
            const failed = results.filter(r => !r.value?.success).length;
            
            if (failed > 0) {
                toast.warning(`${successful} approved, ${failed} failed`);
            } else {
                toast.success(`${successful} registrations approved successfully`);
            }
            
            return { success: true, approved: successful, failed };
        } catch (error) {
            return this.handleError(error, 'Batch approval failed');
        }
    }

    async batchRejectRegistrations(registrationIds, rejectionReason) {
        const promises = registrationIds.map(id => 
            this.rejectRegistration(id, rejectionReason)
        );
        
        try {
            const results = await Promise.allSettled(promises);
            const successful = results.filter(r => r.value?.success).length;
            const failed = results.filter(r => !r.value?.success).length;
            
            if (failed > 0) {
                toast.warning(`${successful} rejected, ${failed} failed`);
            } else {
                toast.success(`${successful} registrations rejected successfully`);
            }
            
            return { success: true, approved: successful, failed };
        } catch (error) {
            return this.handleError(error, 'Batch rejection failed');
        }
    }

    // Search and filtering utilities
    async searchRegistrations(query, filters = {}) {
        const params = new URLSearchParams({
            search: query,
            ...filters
        });
        
        return this.request(`/teacher-registrations?${params}`);
    }

    async getRegistrationTrends(period = '30') {
        return this.request(`/teacher-registrations/stats/trends?period=${period}`);
    }

    // File upload utilities
    async uploadRegistrationDocument(registrationId, file, documentType) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('documentType', documentType);
        
        try {
            const token = localStorage.getItem('schoolAdminToken');
            const response = await fetch(`${this.baseURL}/teacher-registrations/${registrationId}/documents`, {
                method: 'POST',
                headers: {
                    ...(token && { 'Authorization': `Bearer ${token}` })
                },
                body: formData
            });

            const data = await response.json();

            if (!response.ok) {
                throw { response: { status: response.status, data } };
            }

            return { success: true, data };
        } catch (error) {
            return this.handleError(error, 'Failed to upload document');
        }
    }
}

// Create singleton instance
const schoolAdminApi = new SchoolAdminApiService();

export default schoolAdminApi;

// Export individual methods for easier imports
export const {
    getDashboardStats,
    getDashboardActivity,
    getDashboardPerformance,
    getTeachersOverview,
    getStudentsOverview,
    getExamsOverview,
    getPendingRegistrations,
    getAllRegistrations,
    getRegistrationDetails,
    approveRegistration,
    rejectRegistration,
    getRegistrationStats,
    exportRegistrations,
    login,
    refreshToken,
    verifyToken,
    changePassword,
    healthCheck,
    batchApproveRegistrations,
    batchRejectRegistrations,
    searchRegistrations,
    getRegistrationTrends,
    uploadRegistrationDocument
} = schoolAdminApi;
