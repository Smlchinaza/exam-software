import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Create axios instance with better error handling
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 10000, // 10 second timeout
  withCredentials: true // Enable credentials
});

// Add request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (token && token !== 'null' && token !== 'undefined') {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    console.error('Request error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor with better error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear auth data on unauthorized
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('rememberMe');
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('user');
    }
    
    // Handle network errors
    if (error.code === 'ERR_NETWORK') {
      console.error('Network error:', error);
      return Promise.reject(new Error('Unable to connect to the server. Please check your internet connection.'));
    }
    
    // Handle timeout errors
    if (error.code === 'ECONNABORTED') {
      console.error('Request timeout:', error);
      return Promise.reject(new Error('Request timed out. Please try again.'));
    }
    
    return Promise.reject(error);
  }
);

// Student API calls
export const studentApi = {
  getAllStudents: async () => {
    try {
      const response = await api.get('/students');
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  getStudent: async (id) => {
    try {
      const response = await api.get(`/students/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  createStudent: async (studentData) => {
    try {
      const response = await api.post('/students', studentData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  updateStudent: async (id, studentData) => {
    try {
      const response = await api.put(`/students/${id}`, studentData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  deleteStudent: async (id) => {
    try {
      const response = await api.delete(`/students/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  registerSubjects: async (id, subjects) => {
    try {
      const response = await api.post(`/students/${id}/subjects`, { subjects });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  addResults: async (id, results) => {
    try {
      const response = await api.post(`/students/${id}/results`, results);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  getResults: async (id, term, session) => {
    try {
      const response = await api.get(`/students/${id}/results/${term}/${session}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  getAllResults: async (id) => {
    try {
      const response = await api.get(`/students/${id}/results`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  }
};

// Auth API calls
export const authApi = {
  checkUser: async (email) => {
    try {
      const response = await api.post('/auth/check-user', { email });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  login: async (email, password, rememberMe, role) => {
    try {
      const payload = { email, password, rememberMe };
      if (role) payload.role = role;
      const response = await api.post('/auth/login', payload);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  register: async (userData) => {
    try {
      const response = await api.post('/auth/register', {
        email: userData.email,
        password: userData.password,
        role: userData.role,
        displayName: userData.displayName,
        firstName: userData.firstName,
        lastName: userData.lastName,
        rememberMe: userData.rememberMe
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('rememberMe');
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
  }
};

// Exam API calls
export const examApi = {
  getAllExams: async () => {
    try {
      const response = await api.get('/exams');
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  getExam: async (id) => {
    try {
      const response = await api.get(`/exams/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  getExamQuestions: async (id) => {
    try {
      const response = await api.get(`/exams/${id}/questions`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  createExam: async (examData) => {
    try {
      const response = await api.post('/exams', examData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  updateExam: async (id, examData) => {
    try {
      const response = await api.put(`/exams/${id}`, examData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  deleteExam: async (id) => {
    try {
      const response = await api.delete(`/exams/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  submitExam: async (id, answers) => {
    try {
      const response = await api.post(`/exams/${id}/submit`, { answers });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  getUpcomingExams: async () => {
    try {
      const response = await api.get('/exams/upcoming');
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  getActiveExams: async () => {
    try {
      const response = await api.get('/exams/active');
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  startExam: async (examId) => {
    const response = await api.post(`/exams/${examId}/start`);
    return response.data;
  },

  getUnapprovedExams: async () => {
    try {
      const response = await api.get('/exams/unapproved');
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  approveExam: async (examId) => {
    try {
      const response = await api.post(`/exams/${examId}/approve`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  submitForApproval: async (examId) => {
    try {
      const response = await api.post(`/exams/${examId}/submit-for-approval`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  getPendingApprovalExams: async () => {
    try {
      const response = await api.get('/exams/pending-approval');
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  rejectExam: async (examId, reason) => {
    try {
      const response = await api.post(`/exams/${examId}/reject`, { reason });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  disapproveExam: async (examId) => {
    try {
      const response = await api.post(`/exams/${examId}/disapprove`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  }
};

export const userApi = {
  getAllStudentUsers: async () => {
    try {
      const response = await api.get('/users/students-emails');
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },
};

export const subjectApi = {
  getAllSubjects: async () => {
    try {
      const response = await api.get('/subjects');
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },
  createSubject: async (name) => {
    try {
      const response = await api.post('/subjects', { name });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },
  assignTeachers: async (subjectId, teacherIds) => {
    try {
      const response = await api.post(`/subjects/${subjectId}/assign`, { teacherIds });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },
  unassignTeachers: async (subjectId, teacherIds = []) => {
    try {
      const response = await api.post(`/subjects/${subjectId}/unassign`, { teacherIds });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },
  deleteSubject: async (subjectId) => {
    try {
      const response = await api.delete(`/subjects/${subjectId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  }
};

export const teacherApi = {
  getAllTeachers: async () => {
    try {
      const response = await api.get('/users?role=teacher');
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  }
};

export default api; 