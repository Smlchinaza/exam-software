import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import Navbar from "./components/Navbar";
import Login from "./components/Login";
import SignUp from "./components/SignUp";
import Dashboard from "./components/Dashboard";
import QuestionBank from "./components/QuestionBank";
import CreateExam from "./components/CreateExam";
import ForgotPassword from "./components/ForgotPassword";
import UserProfile from "./components/UserProfile";
import TakeExam from "./components/TakeExam";
// import ExamList from "./components/ExamList";
// import "./App.css";

// This is the main entry point of the React application.
// It sets up the router and provides the authentication context to the entire app.
// The Navbar component is displayed on all pages, and the Routes define the different pages of the application.
// The Login, Dashboard, ExamList, and TakeExam components are rendered based on the current route.
// The application uses React Router for navigation and context API for managing authentication state.
// The App component is wrapped in the AuthProvider to provide authentication context to all components.
// The application is structured to allow users to log in, view their dashboard, see a list of exams, and take exams.
// The main entry point of the React application is set up to handle routing and authentication context.
// The application is designed to be modular, with separate components for different functionalities.
// The Routes component defines the paths and the components that should be rendered for each path.
// The application is built using React and follows best practices for component-based architecture.
// The AuthProvider component is used to manage authentication state across the application.

function PrivateRoute({ children }) {
  const token = localStorage.getItem("token");
  return token ? children : <Navigate to="/login" />;
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Navbar />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route
              path="/dashboard"
              element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <PrivateRoute>
                  <UserProfile />
                </PrivateRoute>
              }
            />
            <Route
              path="/question-bank"
              element={
                <PrivateRoute>
                  <QuestionBank />
                </PrivateRoute>
              }
            />
            <Route
              path="/create-exam"
              element={
                <PrivateRoute>
                  <CreateExam />
                </PrivateRoute>
              }
            />
            <Route path="/" element={<Navigate to="/dashboard" />} />
            <Route
              path="/take-exam/:examId"
              element={
                <PrivateRoute>
                  <TakeExam />
                </PrivateRoute>
              }
            />
            {/* <Route path="/exams" element={<ExamList />} /> */}
            {/* <Route path="/exam/:id" element={<TakeExam />} /> */}
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
