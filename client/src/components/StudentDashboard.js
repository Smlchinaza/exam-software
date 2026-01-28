import React, { useState, useEffect } from "react";
import {
  FaUser,
  FaBook,
  FaChartBar,
  FaSignOutAlt,
  FaBars,
  FaTimes,
  FaGraduationCap,
  FaClipboardList,
  FaCheckCircle,
  FaListAlt,
} from "react-icons/fa";
import { examApi, submissionApi } from "../services/api";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const StudentDashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [availableExams, setAvailableExams] = useState([]);
  const [studentSubmissions, setStudentSubmissions] = useState([]);
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    const fetchStudentData = async () => {
      try {
        setLoading(true);

        // Check if user is authenticated and is a student
        if (!user || user.role !== "student") {
          navigate("/student/login");
          return;
        }

        // Fetch published exams available for the student
        const exams = await examApi.getAvailableExams();
        setAvailableExams(exams);

        // Fetch student's submissions (completed exams)
        const submissions = await submissionApi.getAllSubmissions();
        setStudentSubmissions(submissions);
      } catch (err) {
        console.error("Error fetching student data:", err);
        setError(err.message || "Failed to fetch student data");
      } finally {
        setLoading(false);
      }
    };

    fetchStudentData();
  }, [user, navigate]);

  /*
  const handleClassSelect = async (className) => {
    try {
      setSelectedClass(className);
      if (studentData) {
        await studentApi.updateStudent(studentData._id, { currentClass: className });
        setStudentData(prev => ({ ...prev, currentClass: className }));
      }
    } catch (err) {
      setError(err.message || 'Failed to update class');
    }
  };
  */

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div
          className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative"
          role="alert"
        >
          <strong className="font-bold">Error!</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header Bar */}
      <header className="bg-gradient-to-r from-blue-700 to-indigo-600 shadow-md animate-fade-in">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <img
              src={require("../assets/images/SpectraLogo.jpg")}
              alt="Logo"
              className="w-10 h-10 rounded-full shadow animate-fade-in"
            />
            <h1 className="text-2xl font-extrabold text-white tracking-wide drop-shadow animate-slide-in">
              Student Portal
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {/* Hamburger for mobile */}
            <button
              className="sm:hidden text-white text-2xl focus:outline-none"
              onClick={() => setNavOpen(!navOpen)}
              aria-label="Toggle navigation"
            >
              {navOpen ? <FaTimes /> : <FaBars />}
            </button>
          </div>
        </div>
      </header>
      {/* Navigation Bar */}
      {/* Desktop Nav */}
      <nav className="bg-white shadow-sm border-b hidden sm:block animate-fade-in">
        <div className="max-w-7xl mx-auto px-4">
          <ul className="flex flex-wrap gap-2 py-3 justify-center sm:justify-end">
            <li>
              <button
                className="px-5 py-2 rounded-full font-medium transition text-sm flex items-center gap-2 bg-blue-600 text-white shadow"
                onClick={() => navigate("/student/profile")}
              >
                <FaUser /> Profile
              </button>
            </li>
            <li>
              <button
                className="px-5 py-2 rounded-full font-medium transition text-sm flex items-center gap-2 bg-purple-600 text-white shadow"
                onClick={() => navigate("/student/results")}
              >
                <FaChartBar /> Results
              </button>
            </li>
            <li>
              <button
                className="px-5 py-2 rounded-full font-medium transition text-sm flex items-center gap-2 bg-green-600 text-white shadow"
                onClick={handleLogout}
              >
                <FaSignOutAlt /> Logout
              </button>
            </li>
          </ul>
        </div>
      </nav>
      {/* Mobile Nav */}
      <nav
        className={`sm:hidden fixed top-0 left-0 w-full h-full bg-black bg-opacity-40 z-50 transition-all duration-300 ${navOpen ? "block animate-fade-in" : "hidden"}`}
        onClick={() => setNavOpen(false)}
      >
        <div
          className="bg-white shadow-lg rounded-b-2xl max-w-xs w-11/12 mx-auto mt-4 p-4 animate-slide-in-down"
          onClick={(e) => e.stopPropagation()}
        >
          <ul className="flex flex-col gap-3">
            <li>
              <button
                className="w-full px-5 py-3 rounded-lg font-medium transition text-base flex items-center gap-3 bg-blue-600 text-white shadow"
                onClick={() => {
                  navigate("/student/profile");
                  setNavOpen(false);
                }}
              >
                <FaUser /> Profile
              </button>
            </li>
            <li>
              <button
                className="w-full px-5 py-3 rounded-lg font-medium transition text-base flex items-center gap-3 bg-purple-600 text-white shadow"
                onClick={() => {
                  navigate("/student/results");
                  setNavOpen(false);
                }}
              >
                <FaChartBar /> Results
              </button>
            </li>
            <li>
              <button
                className="w-full px-5 py-3 rounded-lg font-medium transition text-base flex items-center gap-3 bg-green-600 text-white shadow"
                onClick={() => {
                  handleLogout();
                  setNavOpen(false);
                }}
              >
                <FaSignOutAlt /> Logout
              </button>
            </li>
          </ul>
        </div>
      </nav>
      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-2 xs:px-4 sm:px-6 lg:px-8 py-6 xs:py-8 animate-fade-in">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 xs:gap-8">
          {/* Student Info Card */}
          <div className="lg:col-span-1 animate-scale-in">
            <div className="bg-white rounded-2xl shadow-lg p-6 flex flex-col items-center gap-3 border-t-4 border-blue-500">
              <FaUser className="text-blue-500 text-3xl mb-1" />
              <h2 className="text-xl font-bold mb-2 text-gray-800">
                Student Information
              </h2>
              <div className="space-y-2 w-full">
                <div>
                  <label className="block text-xs font-medium text-gray-700">
                    Name:
                  </label>
                  <p className="text-gray-900 text-sm font-semibold">
                    {user?.displayName || "N/A"}
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700">
                    Email:
                  </label>
                  <p className="text-gray-900 text-sm">
                    {user?.email || "N/A"}
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700">
                    Current Class:
                  </label>
                  <p className="text-gray-900 text-sm">
                    {user?.role || "Student"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Available Subjects */}
          <div className="lg:col-span-2 mt-6 lg:mt-0 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-lg p-6 border-t-4 border-purple-500">
              <div className="flex items-center gap-2 mb-2">
                <FaBook className="text-purple-500 text-2xl" />
                <h2 className="text-lg font-semibold text-gray-800">
                  Available Subjects
                </h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                {availableExams.length === 0 ? (
                  <p className="text-gray-500 text-sm col-span-2">
                    No subjects available for your class at this time.
                  </p>
                ) : (
                  [...new Set(availableExams.map((exam) => exam.subject))].map((subject) => (
                    <div
                      key={subject}
                      className="flex items-center gap-2 p-3 border rounded-lg bg-gray-50 animate-fade-in"
                    >
                      <FaBook className="text-blue-400" />
                      <span className="text-gray-900 text-sm font-medium">
                        {subject}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Available Exams Section */}
        <div className="mt-10 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-lg p-6 border-t-4 border-green-500">
            <div className="flex items-center gap-2 mb-2">
              <FaClipboardList className="text-green-500 text-2xl" />
              <h2 className="text-lg font-semibold text-gray-800">
                Available Exams
              </h2>
            </div>
            {availableExams.length === 0 ? (
              <p className="text-gray-500 text-sm">
                You have either completed all available exams or there are no
                active exams for your class at this time.
              </p>
            ) : (
              <ul className="divide-y divide-gray-200">
                {availableExams.map((exam) => (
                  <li
                    key={exam._id}
                    className="py-3 flex items-center justify-between animate-fade-in"
                  >
                    <div className="flex items-center gap-2">
                      <FaBook className="text-blue-400" />
                      <span className="font-medium text-gray-900 text-sm">
                        {exam.title}
                      </span>
                      <span className="ml-2 text-gray-500 text-xs">
                        ({exam.subject})
                      </span>
                    </div>
                    <button
                      onClick={() => navigate("/exam-selection")}
                      className="bg-green-600 text-white px-4 py-2 rounded-lg text-xs hover:bg-green-700 font-semibold shadow flex items-center gap-2"
                    >
                      <FaGraduationCap /> Start Exam
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Completed Exams Section */}
        {studentSubmissions.length > 0 && (
          <div className="mt-8 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-lg p-6 border-t-4 border-yellow-500">
              <div className="flex items-center gap-2 mb-2">
                <FaCheckCircle className="text-yellow-500 text-2xl" />
                <h2 className="text-lg font-semibold text-gray-800">
                  My Exam Submissions
                </h2>
              </div>
              <p className="text-xs text-gray-500 mb-3">
                These are your submitted exams. Official results will appear in
                the Results section once approved and released.
              </p>
              <ul className="divide-y divide-gray-200">
                {studentSubmissions.map((submission) => (
                  <li
                    key={submission._id}
                    className="py-3 flex items-center justify-between animate-fade-in"
                  >
                    <div>
                      <span className="font-medium text-gray-900 text-sm">
                        {submission.exam?.title || "Unknown Exam"}
                      </span>
                      <span className="ml-2 text-gray-500 text-xs">
                        ({submission.exam?.subject || "N/A"})
                      </span>
                      {submission.adminReleased ? (
                        <div className="text-xs text-gray-400 mt-1">
                          Score: {submission.score}/{submission.exam?.totalMarks || 0}
                          (
                          {(
                            (submission.score / submission.exam.totalMarks) *
                            100
                          ).toFixed(1)}
                          %)
                        </div>
                      ) : null}
                      <div className="text-xs text-gray-400">
                        Status:{" "}
                        {submission.adminReleased
                          ? "Released"
                          : submission.teacherApproved === true
                            ? "Approved (awaiting release)"
                            : submission.teacherApproved === false
                              ? "Rejected"
                              : "Pending Approval"}
                      </div>
                    </div>
                    <span className="text-green-600 text-xs font-medium flex items-center gap-1">
                      <FaCheckCircle /> Submitted
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-lg p-6 flex flex-col items-center gap-3 border-t-4 border-blue-500 animate-scale-in">
            <FaChartBar className="text-blue-600 text-3xl mb-1" />
            <h3 className="text-lg font-medium text-gray-900">View Results</h3>
            <p className="text-gray-500 text-sm">
              Check your academic performance
            </p>
            <button
              onClick={() => navigate("/student/results")}
              className="mt-3 w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 text-sm font-semibold shadow flex items-center gap-2"
            >
              <FaChartBar /> View Results
            </button>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 flex flex-col items-center gap-3 border-t-4 border-green-500 animate-scale-in">
            <FaUser className="text-green-600 text-3xl mb-1" />
            <h3 className="text-lg font-medium text-gray-900">Profile</h3>
            <p className="text-gray-500 text-sm">
              Update your personal information
            </p>
            <button
              onClick={() => navigate("/student/profile")}
              className="mt-3 w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 text-sm font-semibold shadow flex items-center gap-2"
            >
              <FaUser /> View Profile
            </button>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 flex flex-col items-center gap-3 border-t-4 border-purple-500 animate-scale-in">
            <FaListAlt className="text-purple-600 text-3xl mb-1" />
            <h3 className="text-lg font-medium text-gray-900">Analytics</h3>
            <p className="text-gray-500 text-sm">
              View your progress analytics
            </p>
            <button
              onClick={() => navigate("/student/analytics")}
              className="mt-3 w-full bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700 text-sm font-semibold shadow flex items-center gap-2"
            >
              <FaChartBar /> View Analytics
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;
