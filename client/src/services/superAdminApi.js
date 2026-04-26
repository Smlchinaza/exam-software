// services/superAdminApi.js
// API service for Super Admin functionality

import api from './api';

export const superAdminApi = {
  // School Registration Management
  getPendingRegistrations: async () => {
    const response = await api.get('/super-admin/registrations/pending');
    return response.data;
  },
  
  getRegistrationDetails: async (requestId) => {
    const response = await api.get(`/super-admin/registrations/${requestId}`);
    return response.data;
  },
  
  approveSchool: async (requestId, approvalData) => {
    const response = await api.post(`/super-admin/registrations/${requestId}/approve`, approvalData);
    return response.data;
  },
  
  rejectSchool: async (requestId, rejectionData) => {
    const response = await api.post(`/super-admin/registrations/${requestId}/reject`, rejectionData);
    return response.data;
  },
  
  getRegistrationHistory: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.status) params.append('status', filters.status);
    if (filters.limit) params.append('limit', filters.limit);
    if (filters.offset) params.append('offset', filters.offset);
    
    const response = await api.get(`/super-admin/registrations/history?${params}`);
    return response.data;
  },

  // School Management
  getAllSchools: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.status) params.append('status', filters.status);
    if (filters.stateId) params.append('stateId', filters.stateId);
    if (filters.limit) params.append('limit', filters.limit);
    if (filters.offset) params.append('offset', filters.offset);
    if (filters.sortBy) params.append('sortBy', filters.sortBy);
    if (filters.order) params.append('order', filters.order);
    
    const response = await api.get(`/super-admin/schools/all?${params}`);
    return response.data;
  },
  
  getSchoolMetrics: async (schoolId, timeRange) => {
    const params = new URLSearchParams();
    if (timeRange) params.append('timeRange', timeRange);
    
    const response = await api.get(`/super-admin/schools/school-metrics/${schoolId}?${params}`);
    return response.data;
  },
  
  updateSchoolStatus: async (schoolId, statusData) => {
    const response = await api.put(`/super-admin/schools/${schoolId}/status`, statusData);
    return response.data;
  },
  
  getSchoolAuditLog: async (schoolId) => {
    const response = await api.get(`/super-admin/schools/${schoolId}/audit-log`);
    return response.data;
  },

  // Metrics & Analytics
  getSystemMetrics: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.dateRange) params.append('dateRange', filters.dateRange);
    if (filters.stateId) params.append('stateId', filters.stateId);
    
    const response = await api.get(`/super-admin/metrics/overview?${params}`);
    return response.data;
  },
  
  getSchoolComparison: async (schoolIds) => {
    const response = await api.post('/super-admin/metrics/school-comparison', { schoolIds });
    return response.data;
  },
  
  getPerformanceTrends: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.timeRange) params.append('timeRange', filters.timeRange);
    if (filters.metricType) params.append('metricType', filters.metricType);
    
    const response = await api.get(`/super-admin/metrics/performance-trends?${params}`);
    return response.data;
  },

  // Admin Management
  getSchoolAdmins: async (schoolId) => {
    const response = await api.get(`/super-admin/admins/school/${schoolId}`);
    return response.data;
  },
  
  getAllAdmins: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.status) params.append('status', filters.status);
    if (filters.schoolId) params.append('schoolId', filters.schoolId);
    if (filters.role) params.append('role', filters.role);
    if (filters.search) params.append('search', filters.search);
    if (filters.limit) params.append('limit', filters.limit);
    if (filters.offset) params.append('offset', filters.offset);
    
    const response = await api.get(`/super-admin/admins?${params}`);
    return response.data;
  },
  
  assignAdmin: async (adminData) => {
    const response = await api.post('/super-admin/admins/assign', adminData);
    return response.data;
  },
  
  updateAdmin: async (adminId, updateData) => {
    const response = await api.put(`/super-admin/admins/${adminId}`, updateData);
    return response.data;
  },
  
  removeAdmin: async (adminId, removalData) => {
    const response = await api.delete(`/super-admin/admins/${adminId}`, { data: removalData });
    return response.data;
  },
  
  transferAdmin: async (transferData) => {
    const response = await api.post('/super-admin/admins/transfer-admin', transferData);
    return response.data;
  },

  // Audit & Logging
  getAuditLog: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.action) params.append('action', filters.action);
    if (filters.schoolId) params.append('schoolId', filters.schoolId);
    if (filters.limit) params.append('limit', filters.limit);
    if (filters.offset) params.append('offset', filters.offset);
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    
    const response = await api.get(`/super-admin/audit-log?${params}`);
    return response.data;
  },
  
  getAdminActivity: async (adminId, filters = {}) => {
    const params = new URLSearchParams();
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (filters.limit) params.append('limit', filters.limit);
    if (filters.offset) params.append('offset', filters.offset);
    
    const response = await api.get(`/super-admin/admins/${adminId}/activity?${params}`);
    return response.data;
  },

  // Notifications
  getNotifications: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.type) params.append('type', filters.type);
    if (filters.read) params.append('read', filters.read);
    if (filters.limit) params.append('limit', filters.limit);
    
    const response = await api.get(`/super-admin/notifications?${params}`);
    return response.data;
  },
  
  markNotificationRead: async (notificationId) => {
    const response = await api.put(`/super-admin/notifications/${notificationId}/read`);
    return response.data;
  },
  
  sendNotification: async (notificationData) => {
    const response = await api.post('/super-admin/notifications/send', notificationData);
    return response.data;
  },

  // Reports
  generateReport: async (reportType, filters = {}) => {
    const response = await api.post(`/super-admin/reports/generate`, { reportType, filters });
    return response.data;
  },
  
  downloadReport: async (reportId) => {
    const response = await api.get(`/super-admin/reports/${reportId}/download`, {
      responseType: 'blob'
    });
    return response.data;
  },

  // System Health
  getSystemHealth: async () => {
    const response = await api.get('/super-admin/system/health');
    return response.data;
  },
  
  getDatabaseStats: async () => {
    const response = await api.get('/super-admin/system/database-stats');
    return response.data;
  }
};
