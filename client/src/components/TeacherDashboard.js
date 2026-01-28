import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { examApi, userApi } from "../services/api";
import {
  FaChalkboardTeacher,
  FaBook,
  FaClipboardList,
  FaTasks,
  FaSignOutAlt,
  FaBars,
  FaTimes,
  FaListAlt,
  FaUserCircle,
  FaChartBar,
  FaGraduationCap,
  FaCheckCircle,
  FaTable,
  FaUserFriends,
  FaEye,
} from "react-icons/fa";

function TeacherDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [stats, setStats] = useState({
    totalQuestions: 0,
    activeExams: 0,
    totalStudents: 0,
    averageScore: 0,
  });

  const [recentExams, setRecentExams] = useState([]);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [mySubjects, setMySubjects] = useState([]);
  const [studentsBySubject, setStudentsBySubject] = useState({});
  const [activeNav, setActiveNav] = useState("dashboard");
  const [showProfile, setShowProfile] = useState(false);
  const [examHistory, setExamHistory] = useState([]);
  const [examHistoryLoading, setExamHistoryLoading] = useState(false);
  const [examHistoryError, setExamHistoryError] = useState("");

  useEffect(() => {
    fetchDashboardData();
    fetchMySubjectsAndStudents();
  }, []);

  useEffect(() => {
    if (activeNav === "exam-history" && user) {
      setExamHistoryLoading(true);
      setExamHistoryError("");
      examApi
        .getAllExams()
        .then((exams) => {
          // Teacher can see all exams in school
          setExamHistory(exams || []);
        })
        .catch((err) => setExamHistoryError("Failed to fetch exam history."))
        .finally(() => setExamHistoryLoading(false));
    }
  }, [activeNav, user]);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      // Fetch teacher's exams and students using new API
      const exams = await examApi.getAllExams();
      // eslint-disable-next-line no-unused-vars
      const students = await userApi.getAllUsers();

      setStats((prev) => ({
        ...prev,
        totalQuestions: exams.reduce(
          (sum, exam) => sum + (exam.questions?.length || 0),
          0,
        ),
        activeExams: exams.filter((e) => e.is_published).length,
      }));

      // Sort exams by creation date and take the 5 most recent
      const sortedExams = exams.slice(0, 5);

      setRecentExams(
        sortedExams.map((exam) => ({
          id: exam.id,
          name: exam.title,
          subject: exam.subject || "General",
          students: 0,
          status: exam.is_published ? "Published" : "Draft",
        })),
      );
    } catch (error) {
      setError("Failed to fetch dashboard data");
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMySubjectsAndStudents = async () => {
    try {
      // eslint-disable-next-line no-unused-vars
      // Fetch all students in school (teacher can see all)
      const students = await userApi.getAllUsers();
      setStudentsBySubject({
        all: students.filter((s) => s.role === "student"),
      });
    } catch (error) {
      console.error("Error fetching subjects and students:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-100">
        <div className="w-64 bg-white shadow-lg">
          <div className="p-4">
            <h3 className="text-lg font-semibold text-gray-700 mb-4 text-left">
              Navigation
            </h3>
            <ul className="space-y-2">
              <li className="bg-blue-50 text-blue-600 p-2 rounded">
                <button
                  onClick={() => navigate("/teacher/dashboard")}
                  className="block text-left w-full bg-transparent border-none p-0 m-0 text-inherit"
                >
                  Dashboard
                </button>
              </li>
              <li className="hover:bg-gray-50 p-2 rounded">
                <button
                  onClick={() => navigate("/teacher/question-bank")}
                  className="block text-left w-full bg-transparent border-none p-0 m-0 text-inherit"
                >
                  Question Bank
                </button>
              </li>
              <li className="hover:bg-gray-50 p-2 rounded">
                <button
                  onClick={() => navigate("/teacher/create-exam")}
                  className="block text-left w-full bg-transparent border-none p-0 m-0 text-inherit"
                >
                  Create Exam
                </button>
              </li>
              <li className="hover:bg-gray-50 p-2 rounded">
                <button
                  onClick={() => navigate("/teacher/active-exams")}
                  className="block text-left w-full bg-transparent border-none p-0 m-0 text-inherit"
                >
                  Active Exams
                </button>
              </li>
              <li className="hover:bg-gray-50 p-2 rounded">
                <button
                  onClick={() => navigate("/teacher/results")}
                  className="block text-left w-full bg-transparent border-none p-0 m-0 text-inherit"
                >
                  Results
                </button>
              </li>
            </ul>
          </div>
        </div>
        <div className="flex-1 overflow-auto">
          <div className="p-8">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="bg-white p-6 rounded-lg shadow">
                    <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100 flex-col md:flex-row">
      {/* Header Bar */}
      <header className="bg-gradient-to-r from-blue-700 to-indigo-600 shadow-md w-full md:hidden animate-fade-in">
        <div className="flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <img
              src={require("../assets/images/SpectraLogo.jpg")}
              alt="Logo"
              className="w-10 h-10 rounded-full shadow animate-fade-in"
            />
            <h1 className="text-xl font-extrabold text-white tracking-wide drop-shadow animate-slide-in">
              Teacher Dashboard
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="md:hidden text-white text-2xl focus:outline-none"
              onClick={() => setMobileNavOpen(!mobileNavOpen)}
              aria-label="Toggle navigation"
            >
              {mobileNavOpen ? <FaTimes /> : <FaBars />}
            </button>
          </div>
        </div>
      </header>
      {/* Mobile Sidebar */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden animate-fade-in">
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-black bg-opacity-30"
            onClick={() => setMobileNavOpen(false)}
          ></div>
          {/* Sidebar */}
          <div className="relative z-50 h-full w-64 bg-white shadow-lg p-4 animate-slide-in-left rounded-r-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-blue-700 text-left flex items-center gap-2">
                <FaChalkboardTeacher /> Navigation
              </h3>
              <button
                className="text-gray-700 focus:outline-none"
                onClick={() => setMobileNavOpen(false)}
                aria-label="Close navigation menu"
              >
                <FaTimes className="w-6 h-6" />
              </button>
            </div>
            <ul className="space-y-2">
              <li
                className={`${activeNav === "dashboard" ? "bg-blue-100 text-blue-700" : "hover:bg-gray-50"} p-2 rounded flex items-center gap-2`}
              >
                <button
                  onClick={() => {
                    navigate("/teacher/dashboard");
                    setActiveNav("dashboard");
                    setMobileNavOpen(false);
                  }}
                  className="flex items-center gap-2 w-full text-left"
                >
                  <FaChartBar /> Dashboard
                </button>
              </li>
              <li
                className={`${activeNav === "question-bank" ? "bg-blue-100 text-blue-700" : "hover:bg-gray-50"} p-2 rounded flex items-center gap-2`}
              >
                <button
                  onClick={() => {
                    navigate("/teacher/question-bank");
                    setActiveNav("question-bank");
                    setMobileNavOpen(false);
                  }}
                  className="flex items-center gap-2 w-full text-left"
                >
                  <FaBook /> Question Bank
                </button>
              </li>
              <li
                className={`${activeNav === "create-exam" ? "bg-blue-100 text-blue-700" : "hover:bg-gray-50"} p-2 rounded flex items-center gap-2`}
              >
                <button
                  onClick={() => {
                    navigate("/teacher/create-exam");
                    setActiveNav("create-exam");
                    setMobileNavOpen(false);
                  }}
                  className="flex items-center gap-2 w-full text-left"
                >
                  <FaClipboardList /> Create Exam
                </button>
              </li>
              <li
                className={`${activeNav === "active-exams" ? "bg-blue-100 text-blue-700" : "hover:bg-gray-50"} p-2 rounded flex items-center gap-2`}
              >
                <button
                  onClick={() => {
                    navigate("/teacher/active-exams");
                    setActiveNav("active-exams");
                    setMobileNavOpen(false);
                  }}
                  className="flex items-center gap-2 w-full text-left"
                >
                  <FaListAlt /> Active Exams
                </button>
              </li>
              <li
                className={`${activeNav === "results" ? "bg-blue-100 text-blue-700" : "hover:bg-gray-50"} p-2 rounded flex items-center gap-2`}
              >
                <button
                  onClick={() => {
                    navigate("/teacher/results");
                    setActiveNav("results");
                    setMobileNavOpen(false);
                  }}
                  className="flex items-center gap-2 w-full text-left"
                >
                  <FaTasks /> Results
                </button>
              </li>
              <li
                className={`${activeNav === "exam-history" ? "bg-blue-100 text-blue-700" : "hover:bg-gray-50"} p-2 rounded flex items-center gap-2`}
              >
                <button
                  onClick={() => {
                    navigate("/teacher/exam-history");
                    setActiveNav("exam-history");
                    setMobileNavOpen(false);
                  }}
                  className="flex items-center gap-2 w-full text-left"
                >
                  <FaListAlt /> Exam History
                </button>
              </li>
              <li className="hover:bg-red-50 p-2 rounded border-t mt-4 flex items-center gap-2">
                <button
                  onClick={() => {
                    handleLogout();
                    setMobileNavOpen(false);
                  }}
                  className="flex items-center gap-2 w-full text-left text-red-600 hover:text-red-700"
                >
                  <FaSignOutAlt /> Logout
                </button>
              </li>
            </ul>
          </div>
        </div>
      )}
      {/* Desktop Sidebar */}
      <div className="w-56 xs:w-64 bg-white shadow-lg hidden md:block animate-fade-in">
        <div className="p-4">
          <div className="flex items-center gap-2 mb-6">
            <img
              src={require("../assets/images/SpectraLogo.jpg")}
              alt="Logo"
              className="w-8 h-8 rounded-full shadow"
            />
            <span className="font-bold text-blue-700 text-lg">
              Teacher Portal
            </span>
          </div>
          <ul className="space-y-2">
            <li
              className={`${activeNav === "dashboard" ? "bg-blue-100 text-blue-700" : "hover:bg-gray-50"} p-2 rounded flex items-center gap-2`}
            >
              <button
                onClick={() => {
                  navigate("/teacher/dashboard");
                  setActiveNav("dashboard");
                }}
                className="flex items-center gap-2 w-full text-left"
              >
                <FaChartBar /> Dashboard
              </button>
            </li>
            <li
              className={`${activeNav === "question-bank" ? "bg-blue-100 text-blue-700" : "hover:bg-gray-50"} p-2 rounded flex items-center gap-2`}
            >
              <button
                onClick={() => {
                  navigate("/teacher/question-bank");
                  setActiveNav("question-bank");
                }}
                className="flex items-center gap-2 w-full text-left"
              >
                <FaBook /> Question Bank
              </button>
            </li>
            <li
              className={`${activeNav === "create-exam" ? "bg-blue-100 text-blue-700" : "hover:bg-gray-50"} p-2 rounded flex items-center gap-2`}
            >
              <button
                onClick={() => {
                  navigate("/teacher/create-exam");
                  setActiveNav("create-exam");
                }}
                className="flex items-center gap-2 w-full text-left"
              >
                <FaClipboardList /> Create Exam
              </button>
            </li>
            <li
              className={`${activeNav === "active-exams" ? "bg-blue-100 text-blue-700" : "hover:bg-gray-50"} p-2 rounded flex items-center gap-2`}
            >
              <button
                onClick={() => {
                  navigate("/teacher/active-exams");
                  setActiveNav("active-exams");
                }}
                className="flex items-center gap-2 w-full text-left"
              >
                <FaListAlt /> Active Exams
              </button>
            </li>
            <li
              className={`${activeNav === "results" ? "bg-blue-100 text-blue-700" : "hover:bg-gray-50"} p-2 rounded flex items-center gap-2`}
            >
              <button
                onClick={() => {
                  navigate("/teacher/results");
                  setActiveNav("results");
                }}
                className="flex items-center gap-2 w-full text-left"
              >
                <FaTasks /> Results
              </button>
            </li>
            <li
              className={`${activeNav === "exam-history" ? "bg-blue-100 text-blue-700" : "hover:bg-gray-50"} p-2 rounded flex items-center gap-2`}
            >
              <button
                onClick={() => {
                  navigate("/teacher/exam-history");
                  setActiveNav("exam-history");
                }}
                className="flex items-center gap-2 w-full text-left"
              >
                <FaListAlt /> Exam History
              </button>
            </li>
            <li className="hover:bg-red-50 p-2 rounded border-t mt-4 flex items-center gap-2">
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 w-full text-left text-red-600 hover:text-red-700"
              >
                <FaSignOutAlt /> Logout
              </button>
            </li>
          </ul>
        </div>
      </div>
      {/* Main Content */}
      <div className="flex-1 overflow-auto w-full">
        <div className="p-2 xs:p-4 md:p-8 animate-fade-in">
          <div className="flex flex-col xs:flex-row justify-between items-center mb-6 gap-2 xs:gap-0">
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2 animate-slide-in">
              <FaChartBar className="text-blue-600" /> Dashboard Overview
            </h2>
            <button
              onClick={() => setShowProfile(!showProfile)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-semibold shadow flex items-center gap-2 animate-fade-in"
            >
              <FaUserCircle /> Profile
            </button>
          </div>

          {error && (
            <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded text-left text-sm animate-fade-in">
              {error}
            </div>
          )}

          {showProfile && (
            <div className="absolute right-4 mt-2 w-64 bg-white rounded-lg shadow-lg border p-4 z-50 animate-fade-in">
              <div className="flex items-center gap-3 mb-2">
                <FaUserCircle className="text-3xl text-blue-500" />
                <div>
                  <div className="font-bold text-gray-800">
                    {user?.displayName ||
                      user?.firstName + " " + user?.lastName}
                  </div>
                  <div className="text-xs text-gray-500">{user?.email}</div>
                </div>
              </div>
              <div className="text-sm text-gray-700 mb-2">
                Role: {user?.role}
              </div>
              <button
                onClick={() => setShowProfile(false)}
                className="w-full mt-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded px-3 py-1 text-xs"
              >
                Close
              </button>
            </div>
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-4 gap-4 mb-8 animate-fade-in">
            <div className="bg-white p-6 rounded-2xl shadow-lg flex flex-col items-center gap-2 border-t-4 border-blue-500 animate-scale-in">
              <FaBook className="text-blue-500 text-3xl mb-1" />
              <div className="text-3xl font-bold text-blue-600">
                {stats.totalQuestions}
              </div>
              <div className="text-gray-600 text-sm">Total Questions</div>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-lg flex flex-col items-center gap-2 border-t-4 border-green-500 animate-scale-in">
              <FaClipboardList className="text-green-500 text-3xl mb-1" />
              <div className="text-3xl font-bold text-green-600">
                {stats.activeExams}
              </div>
              <div className="text-gray-600 text-sm">Active Exams</div>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-lg flex flex-col items-center gap-2 border-t-4 border-purple-500 animate-scale-in">
              <FaUserFriends className="text-purple-500 text-3xl mb-1" />
              <div className="text-3xl font-bold text-purple-600">
                {stats.totalStudents}
              </div>
              <div className="text-gray-600 text-sm">Students</div>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-lg flex flex-col items-center gap-2 border-t-4 border-orange-500 animate-scale-in">
              <FaCheckCircle className="text-orange-500 text-3xl mb-1" />
              <div className="text-3xl font-bold text-orange-600">
                {stats.averageScore}%
              </div>
              <div className="text-gray-600 text-sm">Avg. Score</div>
            </div>
          </div>

          {/* Recent Exams Table */}
          <div className="mb-2 flex items-center gap-2 animate-fade-in">
            <FaTable className="text-blue-400" />
            <h3 className="text-lg font-semibold text-gray-800">
              Recent Exams
            </h3>
          </div>
          <div className="overflow-x-auto animate-fade-in">
            <table className="min-w-full bg-white border border-gray-200 rounded-xl overflow-hidden text-sm shadow-md">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-gray-600">
                    Exam Name
                  </th>
                  <th className="px-4 py-2 text-left font-medium text-gray-600">
                    Subject
                  </th>
                  <th className="px-4 py-2 text-left font-medium text-gray-600">
                    Students
                  </th>
                  <th className="px-4 py-2 text-left font-medium text-gray-600">
                    Status
                  </th>
                  <th className="px-4 py-2 text-left font-medium text-gray-600">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {recentExams.map((exam, idx) => (
                  <tr
                    key={exam.id}
                    className={
                      idx % 2 === 0
                        ? "bg-white"
                        : "bg-gray-50 hover:bg-blue-50 transition"
                    }
                  >
                    <td className="px-4 py-3 text-left font-medium">
                      {exam.name}
                    </td>
                    <td className="px-4 py-3 text-left">{exam.subject}</td>
                    <td className="px-4 py-3 text-left">{exam.students}</td>
                    <td className="px-4 py-3 text-left">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          exam.status === "Active"
                            ? "bg-green-100 text-green-800"
                            : exam.status === "Scheduled"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {exam.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-left flex gap-2">
                      <button
                        onClick={() =>
                          navigate(`/teacher/exam/${exam.id}/questions`)
                        }
                        className="bg-green-500 text-white px-3 py-1 rounded-lg text-xs hover:bg-green-600 flex items-center gap-1 shadow"
                        title="View Questions"
                      >
                        <FaBook />
                      </button>
                      {exam.status === "Active" ? (
                        <>
                          <button
                            className="bg-blue-500 text-white px-3 py-1 rounded-lg text-xs hover:bg-blue-600 flex items-center gap-1 shadow"
                            title="View"
                          >
                            <FaEye />
                          </button>
                          <button
                            className="bg-gray-500 text-white px-3 py-1 rounded-lg text-xs hover:bg-gray-600 flex items-center gap-1 shadow"
                            title="Edit"
                          >
                            <FaClipboardList />
                          </button>
                        </>
                      ) : exam.status === "Completed" ? (
                        <button
                          className="bg-blue-500 text-white px-3 py-1 rounded-lg text-xs hover:bg-blue-600 flex items-center gap-1 shadow"
                          onClick={() =>
                            navigate(`/teacher/exam/${exam.id}/results`)
                          }
                          title="Results"
                        >
                          <FaTasks />
                        </button>
                      ) : (
                        <button
                          className="bg-blue-500 text-white px-3 py-1 rounded-lg text-xs hover:bg-blue-600 flex items-center gap-1 shadow"
                          title="Preview"
                        >
                          <FaEye />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* My Subjects & Students */}
          <div className="mt-10 animate-fade-in">
            <div className="flex items-center gap-2 mb-2">
              <FaGraduationCap className="text-purple-500" />
              <h3 className="text-lg font-semibold text-gray-800">
                My Subjects & Students
              </h3>
            </div>
            {!mySubjects || mySubjects.length === 0 ? (
              <p className="text-gray-500 text-sm">
                No subjects assigned to you.
              </p>
            ) : (
              mySubjects.map((subj) => (
                <details
                  key={`${subj.name}|${subj.class}`}
                  className="mb-6 bg-white rounded-xl shadow-lg border border-gray-100 animate-slide-in"
                >
                  <summary className="cursor-pointer py-3 px-4 font-semibold text-blue-700 flex items-center gap-2 text-base hover:bg-blue-50 rounded-t-xl">
                    <FaBook className="text-blue-400" /> {subj.name}{" "}
                    <span className="text-xs text-gray-500 ml-2">
                      ({subj.class})
                    </span>
                  </summary>
                  <div className="p-4">
                    {!studentsBySubject[`${subj.name}|${subj.class}`] ||
                    studentsBySubject[`${subj.name}|${subj.class}`].length ===
                      0 ? (
                      <p className="text-gray-500 text-sm ml-2">
                        No students in this class.
                      </p>
                    ) : (
                      <table className="min-w-full text-xs sm:text-sm border mb-2 rounded-lg overflow-hidden shadow animate-fade-in">
                        <thead>
                          <tr className="bg-gray-50">
                            <th className="px-2 py-1 text-left font-medium text-gray-600">
                              Name
                            </th>
                            <th className="px-2 py-1 text-left font-medium text-gray-600">
                              Email
                            </th>
                            <th className="px-2 py-1 text-left font-medium text-gray-600">
                              Class
                            </th>
                            <th className="px-2 py-1 text-left font-medium text-gray-600">
                              Admission No.
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {studentsBySubject[`${subj.name}|${subj.class}`].map(
                            (stu) => (
                              <tr
                                key={stu._id}
                                className="even:bg-white odd:bg-gray-50 hover:bg-blue-50 transition"
                              >
                                <td className="px-2 py-1">{stu.fullName}</td>
                                <td className="px-2 py-1">{stu.email}</td>
                                <td className="px-2 py-1">
                                  {stu.currentClass}
                                </td>
                                <td className="px-2 py-1">
                                  {stu.admissionNumber}
                                </td>
                              </tr>
                            ),
                          )}
                        </tbody>
                      </table>
                    )}
                  </div>
                </details>
              ))
            )}
          </div>

          {/* Exam History */}
          {activeNav === "exam-history" && (
            <div className="mt-10 animate-fade-in">
              <div className="flex items-center gap-2 mb-2">
                <FaListAlt className="text-purple-500" />
                <h3 className="text-lg font-semibold text-gray-800">
                  My Exam History
                </h3>
              </div>
              {examHistoryLoading ? (
                <div className="text-center py-8">Loading...</div>
              ) : examHistoryError ? (
                <div className="text-red-600 mb-2">{examHistoryError}</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full bg-white border rounded text-xs xs:text-sm">
                    <thead>
                      <tr>
                        <th className="px-2 xs:px-4 py-2 border">Subject</th>
                        <th className="px-2 xs:px-4 py-2 border">Class</th>
                        <th className="px-2 xs:px-4 py-2 border">Exam Date</th>
                        <th className="px-2 xs:px-4 py-2 border">
                          No of Students
                        </th>
                        <th className="px-2 xs:px-4 py-2 border">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {examHistory.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="text-center py-4">
                            No exams found.
                          </td>
                        </tr>
                      ) : (
                        examHistory.map((exam) => (
                          <tr key={exam._id}>
                            <td className="px-2 xs:px-4 py-2 border">
                              {exam.subject}
                            </td>
                            <td className="px-2 xs:px-4 py-2 border">
                              {exam.class}
                            </td>
                            <td className="px-2 xs:px-4 py-2 border">
                              {exam.startTime
                                ? new Date(exam.startTime).toLocaleDateString()
                                : "N/A"}
                            </td>
                            <td className="px-2 xs:px-4 py-2 border">
                              {exam.submissionsCount}
                            </td>
                            <td className="px-2 xs:px-4 py-2 border">
                              {exam.status}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default TeacherDashboard;
