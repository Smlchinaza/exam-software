import axios from "axios";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

// Create axios instance with better error handling
const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30000, // 30 second timeout
  withCredentials: true, // Enable credentials
});

// Add request interceptor
api.interceptors.request.use(
  (config) => {
    const token =
      localStorage.getItem("token") || sessionStorage.getItem("token");
    if (token && token !== "null" && token !== "undefined") {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    console.error("Request error:", error);
    return Promise.reject(error);
  },
);

// Add response interceptor with better error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear auth data on unauthorized
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      localStorage.removeItem("schoolId");
      localStorage.removeItem("rememberMe");
      sessionStorage.removeItem("token");
      sessionStorage.removeItem("user");
      sessionStorage.removeItem("schoolId");
    }

    // Handle network errors
    if (error.code === "ERR_NETWORK") {
      console.error("Network error:", error);
      return Promise.reject(
        new Error(
          "Unable to connect to the server. Please check your internet connection.",
        ),
      );
    }

    // Handle timeout errors
    if (error.code === "ECONNABORTED") {
      console.error("Request timeout:", error);
      return Promise.reject(new Error("Request timed out. Please try again."));
    }

    return Promise.reject(error);
  },
);

// ============================================
// AUTH API (Postgres multi-tenant backend)
// ============================================
export const authApi = {
  // Register new user (returns JWT with school_id)
  register: async (userData) => {
    try {
      const payload = {
        email: userData.email,
        password: userData.password,
        role: userData.role || 'student',
        first_name: userData.firstName || userData.displayName || '',
        last_name: userData.lastName || '',
        // Note: school_id is assigned by backend (default school)
      };
      const response = await api.post("/auth/register", payload);
      return response.data; // Returns: { token, user: {id, email, role, school_id} }
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Login (returns JWT with school_id in payload)
  login: async (email, password) => {
    try {
      const payload = { email, password };
      const response = await api.post("/auth/login", payload);
      return response.data; // Returns: { token, user: {id, email, role, school_id} }
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Verify JWT token (validates school_id)
  verify: async () => {
    try {
      const response = await api.get("/auth/verify");
      return response.data; // Returns: { user: {id, email, role, school_id, is_active} }
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Check if user exists by email
  checkUser: async (email) => {
    try {
      const response = await api.post("/auth/check-user", { email });
      return response.data; // Returns: { exists: boolean }
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Logout (client-side cleanup)
  logout: () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("schoolId");
    localStorage.removeItem("rememberMe");
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user");
    sessionStorage.removeItem("schoolId");
  },
};

// ============================================
// EXAM API (multi-tenant, scoped by school_id)
// ============================================
export const examApi = {
  // List all exams for authenticated user's school
  getAllExams: async (published = null) => {
    try {
      const params = {};
      if (published !== null) {
        params.published = published;
      }
      const response = await api.get("/exams", { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Get specific exam with questions and options (school-scoped)
  getExam: async (id) => {
    try {
      const response = await api.get(`/exams/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Create new exam (teacher/admin only)
  createExam: async (examData) => {
    try {
      const payload = {
        title: examData.title,
        description: examData.description,
        is_published: examData.is_published || false,
        duration_minutes: examData.duration_minutes,
        questions: examData.questions || [],
        subject_id: examData.subject_id || null,
      };
      const response = await api.post("/exams", payload);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Update exam (owner or admin only)
  updateExam: async (id, examData) => {
    try {
      const payload = {
        title: examData.title,
        description: examData.description,
        is_published: examData.is_published,
        duration_minutes: examData.duration_minutes,
      };
      const response = await api.put(`/exams/${id}`, payload);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Delete exam (owner or admin only, cascades to submissions)
  deleteExam: async (id) => {
    try {
      const response = await api.delete(`/exams/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Get published exams available for students
  getAvailableExams: async () => {
    try {
      const response = await api.get("/exams", { params: { published: true } });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },
};

// ============================================
// SUBMISSION API (multi-tenant, scoped by school_id)
// ============================================
export const submissionApi = {
  // List all submissions (role-scoped: students see own, teachers see all)
  getAllSubmissions: async () => {
    try {
      const response = await api.get("/submissions");
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Get specific submission with answers (school-scoped)
  getSubmission: async (id) => {
    try {
      const response = await api.get(`/submissions/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Start exam (creates submission record)
  startExam: async (examId) => {
    try {
      const response = await api.post(`/submissions/${examId}/start`);
      return response.data; // Returns: { id, exam_id, started_at, ... }
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Submit answers (marks submission as submitted)
  submitExam: async (submissionId, answers) => {
    try {
      const payload = {
        answers: answers || [], // Array of {question_id, answer}
      };
      const response = await api.post(
        `/submissions/${submissionId}/submit`,
        payload
      );
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Grade submission (teacher/admin only)
  gradeSubmission: async (submissionId, answers) => {
    try {
      const payload = {
        answers: answers || [], // Array of {answer_id, score}
      };
      const response = await api.post(
        `/submissions/${submissionId}/grade`,
        payload
      );
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },
};

// ============================================
// USER API (multi-tenant, scoped by school_id)
// ============================================
export const userApi = {
  // Get authenticated user's profile
  getProfile: async () => {
    try {
      const response = await api.get("/users/profile");
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Update authenticated user's profile
  updateProfile: async (profileData) => {
    try {
      const payload = {
        first_name: profileData.first_name || profileData.firstName,
        last_name: profileData.last_name || profileData.lastName,
        // Add other optional fields as needed
      };
      const response = await api.put("/users/profile", payload);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // List all users in school (admin/teacher only)
  getAllUsers: async () => {
    try {
      const response = await api.get("/users");
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Create new user (admin only)
  createUser: async (userData) => {
    try {
      const payload = {
        email: userData.email,
        password: userData.password,
        role: userData.role || 'student',
        first_name: userData.first_name || userData.firstName || '',
        last_name: userData.last_name || userData.lastName || '',
      };
      const response = await api.post("/users", payload);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Update user (admin or self only)
  updateUser: async (id, userData) => {
    try {
      const payload = {
        first_name: userData.first_name || userData.firstName,
        last_name: userData.last_name || userData.lastName,
        role: userData.role,
      };
      const response = await api.put(`/users/${id}`, payload);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Delete user (admin only)
  deleteUser: async (id) => {
    try {
      const response = await api.delete(`/users/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },
};

// ============================================
// STUDENT API (legacy - for backward compatibility)
// ============================================
export const studentApi = {
  getAllStudents: async () => {
    try {
      const response = await api.get("/users", { params: { role: 'student' } });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  getStudent: async (id) => {
    try {
      const response = await api.get(`/users/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  createStudent: async (studentData) => {
    try {
      const response = await api.post("/users", {
        ...studentData,
        role: 'student',
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  updateStudent: async (id, studentData) => {
    try {
      const response = await api.put(`/users/${id}`, studentData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  deleteStudent: async (id) => {
    try {
      const response = await api.delete(`/users/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },
};

// ============================================
// SCHOOL API (Multi-tenant management)
// ============================================
export const schoolApi = {
  // Register a new school and create admin account
  registerSchool: async (schoolData) => {
    try {
      const response = await api.post("/schools/register", schoolData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // List all schools (admin only)
  getAllSchools: async () => {
    try {
      const response = await api.get("/schools");
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Get school details
  getSchool: async (schoolId) => {
    try {
      const response = await api.get(`/schools/${schoolId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Update school details
  updateSchool: async (schoolId, schoolData) => {
    try {
      const response = await api.put(`/schools/${schoolId}`, schoolData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Get current school details for authenticated user
  getCurrentSchool: async () => {
    try {
      const response = await api.get("/schools/current");
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Get school statistics
  getSchoolStats: async (schoolId) => {
    try {
      const response = await api.get(`/schools/${schoolId}/stats`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },
};

// ============================================
// TEACHER API (legacy - for backward compatibility)
// ============================================
export const teacherApi = {
  getAllTeachers: async () => {
    try {
      const response = await api.get("/users", { params: { role: 'teacher' } });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },
};

// ============================================
// SUBJECT API (legacy - for backward compatibility)
// ============================================
export const subjectApi = {
  getAllSubjects: async () => {
    try {
      const response = await api.get("/subjects");
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },
};

export default api;
