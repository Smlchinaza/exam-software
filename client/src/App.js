import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { useSchoolSubdomain } from './hooks/useSchoolSubdomain';
import Navbar from './components/Navbar';
import Home from './components/Home';
import StudentLogin from './components/StudentLogin';
import TeacherLogin from './components/TeacherLogin';
import Register from './components/Register';
import StudentDashboard from './components/StudentDashboard';
import StudentProfile from './components/StudentProfile';
import StudentResults from './components/StudentResults';
import TeacherDashboard from './components/TeacherDashboard';
import QuestionBank from './components/QuestionBank';
import CreateExam from './components/CreateExam';
import ExamQuestions from './components/ExamQuestions';
import ProtectedRoute from './components/ProtectedRoute';
import TakeExam from './components/TakeExam';
import AuthEmail from './components/AuthEmail';
import ExamSelection from './components/ExamSelection';
import ActiveExams from './components/ActiveExams';
import ExamResults from './components/ExamResults';
import AdminDashboard from './components/AdminDashboard';
import AdminLogin from './components/AdminLogin';
import TeacherProfile from './components/TeacherProfile';
import TeacherStudents from './components/TeacherStudents';
import TeacherResults from './components/TeacherResults';
import AdminResults from './components/AdminResults';
import SchoolRegistration from './components/SchoolRegistration';
import ResultPreviewPage from './pages/ResultPreviewPage';
import SubdomainTestPage from './pages/SubdomainTestPage';
import SuperAdminLogin from './components/SuperAdmin/SuperAdminLogin';
import SuperAdminDashboard from './components/SuperAdmin/SuperAdminDashboard';
// Placeholder components for scaffolding
const TeacherSettings = () => <div className="p-8">Settings Page (Coming Soon)</div>;

function AppLayout() {
  const location = useLocation();
  const { user } = useAuth();
  const { schoolInfo, loading: subdomainLoading } = useSchoolSubdomain();
  
  // Hide navbar for take-exam route or when user is logged in
  const hideNavbar = location.pathname === '/take-exam' || user;

  // Pass school info through context or props
  React.useEffect(() => {
    if (schoolInfo && schoolInfo.isSubdomain) {
      // User is accessing via school subdomain
      console.log('School subdomain detected:', schoolInfo.subdomain);
      
      // Update app state or context with school information
      // This helps with branding, routing, etc.
    }
  }, [schoolInfo]);

  if (subdomainLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-100">
      {!hideNavbar && <Navbar />}
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Home />} />
        <Route path="/student/login" element={<StudentLogin />} />
        <Route path="/teacher/login" element={<TeacherLogin />} />
        <Route path="/register" element={<Register />} />
        <Route path="/school-registration" element={<SchoolRegistration />} />
        <Route path="/auth-email" element={<AuthEmail />} />
        <Route path="/take-exam" element={<TakeExam />} />
        <Route path="/take-exam/:examId" element={<TakeExam />} />
        <Route path="/exam-selection" element={<ExamSelection />} />
        <Route path="/result-preview" element={<ResultPreviewPage />} />
        <Route path="/subdomain-test" element={<SubdomainTestPage />} />
        {/* Protected Student Routes */}
        <Route path="/student/dashboard" element={<ProtectedRoute role="student"><StudentDashboard /></ProtectedRoute>} />
        <Route path="/student/profile" element={<ProtectedRoute role="student"><StudentProfile /></ProtectedRoute>} />
        <Route path="/student/results" element={<ProtectedRoute role="student"><StudentResults /></ProtectedRoute>} />
        {/* Protected Teacher Routes */}
        <Route path="/teacher/dashboard" element={<ProtectedRoute role="teacher"><TeacherDashboard /></ProtectedRoute>} />
        <Route path="/teacher/question-bank" element={<ProtectedRoute role="teacher"><QuestionBank /></ProtectedRoute>} />
        <Route path="/teacher/create-exam" element={<ProtectedRoute role="teacher"><CreateExam /></ProtectedRoute>} />
        <Route path="/teacher/active-exams" element={<ProtectedRoute role="teacher"><ActiveExams /></ProtectedRoute>} />
        <Route path="/teacher/results" element={<ProtectedRoute role="teacher"><TeacherResults /></ProtectedRoute>} />
        <Route path="/teacher/students" element={<ProtectedRoute role="teacher"><TeacherStudents /></ProtectedRoute>} />
        <Route path="/teacher/settings" element={<ProtectedRoute role="teacher"><TeacherSettings /></ProtectedRoute>} />
        <Route path="/teacher/exam/:examId/questions" element={<ProtectedRoute role="teacher"><ExamQuestions /></ProtectedRoute>} />
        <Route path="/teacher/exam/:examId/results" element={<ProtectedRoute role="teacher"><ExamResults /></ProtectedRoute>} />
        <Route path="/teacher/profile" element={<ProtectedRoute role="teacher"><TeacherProfile /></ProtectedRoute>} />
        <Route path="/admin/dashboard" element={<ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>} />
        <Route path="/admin/results" element={<ProtectedRoute role="admin"><AdminResults /></ProtectedRoute>} />
        <Route path="/admin/login" element={<AdminLogin />} />
        {/* Super Admin Routes */}
        <Route path="/super-admin/login" element={<SuperAdminLogin />} />
        <Route path="/super-admin" element={<ProtectedRoute role="super_admin"><SuperAdminDashboard /></ProtectedRoute>} />
        {/* Fallback Route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppLayout />
      </Router>
    </AuthProvider>
  );
}

export default App;
