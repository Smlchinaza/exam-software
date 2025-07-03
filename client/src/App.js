import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
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
// Placeholder components for scaffolding
const TeacherResults = () => <div className="p-8">Results Page (Coming Soon)</div>;
const TeacherStudents = () => <div className="p-8">Students Page (Coming Soon)</div>;
const TeacherSettings = () => <div className="p-8">Settings Page (Coming Soon)</div>;
// import AdminDashboard from './components/AdminDashboard';

function AppLayout() {
  const location = useLocation();
  const hideNavbar = location.pathname === '/take-exam';
  return (
    <div className="min-h-screen bg-gray-100">
      {!hideNavbar && <Navbar />}
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Home />} />
        <Route path="/student/login" element={<StudentLogin />} />
        <Route path="/teacher/login" element={<TeacherLogin />} />
        <Route path="/register" element={<Register />} />
        <Route path="/auth-email" element={<AuthEmail />} />
        <Route path="/take-exam" element={<TakeExam />} />
        <Route path="/take-exam/:examId" element={<TakeExam />} />
        <Route path="/exam-selection" element={<ExamSelection />} />
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
        <Route path="/admin/dashboard" element={<ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>} />
        <Route path="/admin/login" element={<AdminLogin />} />
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
