import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor
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

  login: async (email, password, rememberMe) => {
    try {
      const response = await api.post('/auth/login', {
        email,
        password,
        rememberMe
      });
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

export default api; 