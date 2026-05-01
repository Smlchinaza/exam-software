// Subdomain-Aware API Client
// Handles API requests with automatic subdomain detection and school context

import axios from 'axios';
import { extractCurrentSubdomain, getApiBaseUrl, getStoredSubdomainLoginData } from '../utils/subdomain';

class SubdomainApiClient {
  constructor() {
    this.baseURL = getApiBaseUrl();
    this.subdomain = extractCurrentSubdomain();
    this.schoolContext = null;
    this.isSubdomain = this.subdomain !== null;
    
    // Initialize axios instance with interceptors
    this.axios = axios.create({
      baseURL: this.baseURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      }
    });

    // Setup request interceptor for authentication
    this.setupRequestInterceptor();
    
    // Setup response interceptor for error handling
    this.setupResponseInterceptor();
    
    // Initialize school context if on subdomain
    this.initializeSchoolContext();
  }

  /**
   * Setup request interceptor to add authentication headers
   */
  setupRequestInterceptor() {
    this.axios.interceptors.request.use(
      (config) => {
        // Add authentication token from localStorage or stored data
        const token = this.getAuthToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }

        // Add school context if available
        if (this.schoolContext) {
          config.headers['X-School-Context'] = JSON.stringify({
            schoolId: this.schoolContext.id,
            subdomain: this.schoolContext.subdomain,
            domain: this.schoolContext.domain
          });
        }

        // Add subdomain information
        if (this.subdomain) {
          config.headers['X-Subdomain'] = this.subdomain;
        }

        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );
  }

  /**
   * Setup response interceptor for error handling
   */
  setupResponseInterceptor() {
    this.axios.interceptors.response.use(
      (response) => {
        return response;
      },
      (error) => {
        // Handle cross-school access errors
        if (error.response?.status === 403) {
          const errorMessage = error.response.data?.message;
          
          if (errorMessage?.includes('cross-school') || errorMessage?.includes('different school')) {
            // Redirect to appropriate school subdomain if available
            this.handleCrossSchoolError(error.response.data);
          }
        }

        // Handle authentication errors
        if (error.response?.status === 401) {
          this.handleAuthenticationError(error.response.data);
        }

        return Promise.reject(error);
      }
    );
  }

  /**
   * Get authentication token from various sources
   */
  getAuthToken() {
    // Try localStorage first
    let token = localStorage.getItem('token');
    
    // Try sessionStorage for subdomain transfers
    if (!token) {
      const storedData = getStoredSubdomainLoginData();
      token = storedData?.token;
    }
    
    return token;
  }

  /**
   * Initialize school context from stored data or API
   */
  async initializeSchoolContext() {
    if (!this.isSubdomain) {
      return;
    }

    // Try to get school context from stored login data
    const storedData = getStoredSubdomainLoginData();
    if (storedData?.school) {
      this.schoolContext = storedData.school;
      return;
    }

    // Fetch school context from API
    try {
      const response = await this.get('/school/context');
      this.schoolContext = response.data.school;
    } catch (error) {
      console.warn('Failed to fetch school context:', error);
    }
  }

  /**
   * Handle cross-school access errors
   */
  handleCrossSchoolError(errorData) {
    const schoolInfo = errorData.school;
    
    if (schoolInfo?.domain) {
      // Show user-friendly message
      const message = `This resource belongs to ${schoolInfo.name}. Redirecting to the correct school...`;
      
      // Create notification
      this.showNotification(message, 'info');
      
      // Redirect to correct school after delay
      setTimeout(() => {
        window.location.href = `https://${schoolInfo.domain}`;
      }, 3000);
    }
  }

  /**
   * Handle authentication errors
   */
  handleAuthenticationError(errorData) {
    // Clear stored authentication data
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.removeItem('subdomainLoginData');
    
    // Redirect to login page
    const loginUrl = this.isSubdomain 
      ? `https://${this.subdomain}.schoolshubs.com/login`
      : '/login';
    
    window.location.href = loginUrl;
  }

  /**
   * Show notification to user
   */
  showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 p-4 rounded-md shadow-lg z-50 max-w-sm ${
      type === 'error' ? 'bg-red-50 border-red-200 text-red-800' :
      type === 'success' ? 'bg-green-50 border-green-200 text-green-800' :
      type === 'warning' ? 'bg-yellow-50 border-yellow-200 text-yellow-800' :
      'bg-blue-50 border-blue-200 text-blue-800'
    }`;
    
    notification.innerHTML = `
      <div class="flex">
        <div class="ml-3">
          <p class="text-sm font-medium">${message}</p>
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
  }

  /**
   * Generic HTTP methods
   */
  async get(url, config = {}) {
    return this.axios.get(url, config);
  }

  async post(url, data = {}, config = {}) {
    return this.axios.post(url, data, config);
  }

  async put(url, data = {}, config = {}) {
    return this.axios.put(url, data, config);
  }

  async patch(url, data = {}, config = {}) {
    return this.axios.patch(url, data, config);
  }

  async delete(url, config = {}) {
    return this.axios.delete(url, config);
  }

  /**
   * File upload method
   */
  async upload(url, file, additionalData = {}, onProgress = null) {
    const formData = new FormData();
    formData.append('file', file);
    
    // Add additional data
    Object.entries(additionalData).forEach(([key, value]) => {
      formData.append(key, value);
    });

    const config = {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: onProgress ? (progressEvent) => {
        const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        onProgress(progress);
      } : undefined,
    };

    return this.axios.post(url, formData, config);
  }

  /**
   * Batch upload method
   */
  async batchUpload(url, files, additionalData = {}, onProgress = null) {
    const formData = new FormData();
    
    // Add multiple files
    files.forEach((file, index) => {
      formData.append(`files`, file);
    });
    
    // Add additional data
    Object.entries(additionalData).forEach(([key, value]) => {
      formData.append(key, value);
    });

    const config = {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: onProgress ? (progressEvent) => {
        const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        onProgress(progress);
      } : undefined,
    };

    return this.axios.post(url, formData, config);
  }

  /**
   * Download file method
   */
  async download(url, filename = null) {
    const response = await this.axios.get(url, {
      responseType: 'blob'
    });

    // Create download link
    const blob = new Blob([response.data]);
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    
    // Use filename from response or provided filename
    const finalFilename = filename || this.getFilenameFromResponse(response);
    link.download = finalFilename;
    
    // Trigger download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up
    window.URL.revokeObjectURL(downloadUrl);
  }

  /**
   * Extract filename from response headers
   */
  getFilenameFromResponse(response) {
    const contentDisposition = response.headers['content-disposition'];
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
      if (filenameMatch && filenameMatch[1]) {
        return filenameMatch[1].replace(/['"]/g, '');
      }
    }
    return 'download';
  }

  /**
   * Get school context
   */
  getSchoolContext() {
    return this.schoolContext;
  }

  /**
   * Check if on school subdomain
   */
  isOnSubdomain() {
    return this.isSubdomain;
  }

  /**
   * Get current subdomain
   */
  getSubdomain() {
    return this.subdomain;
  }

  /**
   * Update school context
   */
  updateSchoolContext(schoolContext) {
    this.schoolContext = schoolContext;
  }

  /**
   * Refresh school context from API
   */
  async refreshSchoolContext() {
    await this.initializeSchoolContext();
  }

  /**
   * API methods for common operations
   */

  // Authentication
  async login(email, password, rememberMe = false) {
    const response = await this.post('/auth/login', {
      email,
      password,
      rememberMe
    });
    
    // Store authentication data
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      
      if (response.data.school) {
        this.schoolContext = response.data.school;
      }
    }
    
    return response.data;
  }

  async logout() {
    try {
      await this.post('/auth/logout');
    } catch (error) {
      // Continue with logout even if API call fails
    }
    
    // Clear stored data
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.removeItem('subdomainLoginData');
    this.schoolContext = null;
  }

  // School operations
  async getSchoolInfo() {
    const response = await this.get('/school/info');
    return response.data;
  }

  async getSchoolStats() {
    const response = await this.get('/school/stats');
    return response.data;
  }

  // User operations
  async getCurrentUser() {
    const response = await this.get('/auth/user');
    return response.data;
  }

  async updateProfile(profileData) {
    const response = await this.put('/auth/profile', profileData);
    return response.data;
  }

  // File operations
  async uploadFile(file, fileType = 'general', description = '') {
    return this.upload('/files/upload', file, {
      fileType,
      description
    });
  }

  async getFiles(options = {}) {
    const params = new URLSearchParams(options);
    const response = await this.get(`/files?${params}`);
    return response.data;
  }

  async downloadFile(fileId, filename = null) {
    return this.download(`/files/${fileId}/download`, filename);
  }

  // Exam operations
  async getExams(options = {}) {
    const params = new URLSearchParams(options);
    const response = await this.get(`/exams?${params}`);
    return response.data;
  }

  async getExam(examId) {
    const response = await this.get(`/exams/${examId}`);
    return response.data;
  }

  // Submission operations
  async getSubmissions(options = {}) {
    const params = new URLSearchParams(options);
    const response = await this.get(`/submissions?${params}`);
    return response.data;
  }

  async getSubmission(submissionId) {
    const response = await this.get(`/submissions/${submissionId}`);
    return response.data;
  }

  async startExam(examId) {
    const response = await this.post(`/submissions/${examId}/start`);
    return response.data;
  }

  async submitExam(submissionId, answers) {
    const response = await this.post(`/submissions/${submissionId}/submit`, {
      answers
    });
    return response.data;
  }

  // Notification operations
  async getNotifications(options = {}) {
    const params = new URLSearchParams(options);
    const response = await this.get(`/notifications?${params}`);
    return response.data;
  }

  async markNotificationAsRead(notificationId) {
    const response = await this.put(`/notifications/${notificationId}/read`);
    return response.data;
  }
}

// Create singleton instance
const apiClient = new SubdomainApiClient();

export default apiClient;

// Export class for testing or custom instances
export { SubdomainApiClient };
