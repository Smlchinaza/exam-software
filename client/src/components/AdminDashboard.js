import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { subjectApi, teacherApi, examApi, schoolApi } from "../services/api";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import {
  FaChalkboardTeacher,
  FaBook,
  FaCheckCircle,
  FaUserShield,
  FaClipboardList,
  FaSignOutAlt,
  FaBars,
  FaTimes,
  FaUser,
  FaTasks,
} from "react-icons/fa";

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState("subjects");
  const [subjects, setSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [subjectStats, setSubjectStats] = useState(null);
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedTeachers, setSelectedTeachers] = useState([]);
  const [newSubject, setNewSubject] = useState("");
  const [newSubjectClass, setNewSubjectClass] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [unapprovedExams, setUnapprovedExams] = useState([]);
  const [examLoading, setExamLoading] = useState(false);
  const [selectedSubjectForUnassign, setSelectedSubjectForUnassign] =
    useState("");
  const [selectedTeachersForUnassign, setSelectedTeachersForUnassign] =
    useState([]);
  const [showUnassignModal, setShowUnassignModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [subjectToDelete, setSubjectToDelete] = useState(null);
  const [approvalLoading, setApprovalLoading] = useState(false);
  const [approvalMessage, setApprovalMessage] = useState("");
  const [approvalError, setApprovalError] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [examToReject, setExamToReject] = useState(null);
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedAssignClass, setSelectedAssignClass] = useState("");
  const [subjectsOpen, setSubjectsOpen] = useState(false);
  const [unapprovedTeachers, setUnapprovedTeachers] = useState([]);
  const [teacherApprovalLoading, setTeacherApprovalLoading] = useState(false);
  const [teacherApprovalError, setTeacherApprovalError] = useState("");
  const [teacherApprovalMessage, setTeacherApprovalMessage] = useState("");
  const [examHistory, setExamHistory] = useState([]);
  const [examHistoryLoading, setExamHistoryLoading] = useState(false);
  const [examHistoryError, setExamHistoryError] = useState("");
  const [approvedExams, setApprovedExams] = useState([]);
  const [approvedExamsLoading, setApprovedExamsLoading] = useState(false);
  const [approvedExamsError, setApprovedExamsError] = useState("");
  const [school, setSchool] = useState(null);
  const [schoolLoading, setSchoolLoading] = useState(false);
  const { user, logout, schoolId } = useAuth();
  const navigate = useNavigate();
  const [navOpen, setNavOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const fetchSchool = async () => {
    if (!schoolId) return;
    setSchoolLoading(true);
    try {
      const schoolData = await schoolApi.getCurrentSchool();
      setSchool(schoolData);
    } catch (err) {
      console.error("Failed to fetch school data:", err);
    } finally {
      setSchoolLoading(false);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      const [subjectsRes, teachersRes, statsRes] = await Promise.all([
        subjectApi.getAllSubjects(),
        teacherApi.getAllTeachers(),
        subjectApi.getSubjectStats(),
      ]);
      setSubjects(subjectsRes);
      setTeachers(teachersRes);
      setSubjectStats(statsRes);
    } catch (err) {
      setError("Failed to fetch data.");
    } finally {
      setLoading(false);
    }
  };

  const fetchSubjectsByClass = React.useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      let subjectsRes;
      if (selectedClass) {
        subjectsRes = await subjectApi.getSubjectsByClass(selectedClass);
      } else {
        subjectsRes = await subjectApi.getAllSubjects();
      }
      setSubjects(subjectsRes);
    } catch (err) {
      setError("Failed to fetch subjects.");
    } finally {
      setLoading(false);
    }
  }, [selectedClass]);

  const fetchAssignSubjectsByClass = React.useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      let subjectsRes;
      if (selectedAssignClass) {
        subjectsRes = await subjectApi.getSubjectsByClass(selectedAssignClass);
      } else {
        subjectsRes = await subjectApi.getAllSubjects();
      }
      setSubjects(subjectsRes);
    } catch (err) {
      setError("Failed to fetch subjects.");
    } finally {
      setLoading(false);
    }
  }, [selectedAssignClass]);

  const fetchTeachersForAssign = async () => {
    try {
      const teachersRes = await teacherApi.getAllTeachers();
      setTeachers(teachersRes);
    } catch (err) {
      setError("Failed to fetch teachers.");
    }
  };

  const fetchUnapprovedExams = async () => {
    setExamLoading(true);
    setApprovalError("");
    try {
      const exams = await examApi.getUnapprovedExams();
      setUnapprovedExams(exams);
    } catch (err) {
      setApprovalError("Failed to fetch unapproved exams.");
    } finally {
      setExamLoading(false);
    }
  };

  const fetchUnapprovedTeachers = async () => {
    setTeacherApprovalLoading(true);
    setTeacherApprovalError("");
    try {
      const res = await api.get("/users/unapproved-teachers");
      setUnapprovedTeachers(res.data);
    } catch (err) {
      setTeacherApprovalError("Failed to fetch unapproved teachers.");
    } finally {
      setTeacherApprovalLoading(false);
    }
  };

  useEffect(() => {
    console.log("AdminDashboard - Current user:", user);
    console.log("AdminDashboard - User role:", user?.role);
    console.log("AdminDashboard - School ID:", schoolId);
    
    // Fetch school data when component mounts
    if (user && schoolId) {
      fetchSchool();
    }
    
    if ((activeTab === "assign" || activeTab === "subjects") && user) {
      fetchData();
    }
    if (activeTab === "approve") {
      fetchUnapprovedExams();
    }
    if (activeTab === "teacher-approval") {
      fetchUnapprovedTeachers();
    }
    if (activeTab === "exam-history") {
      setExamHistoryLoading(true);
      setExamHistoryError("");
      api
        .get("/exams/history-with-counts")
        .then((res) => setExamHistory(res.data))
        .catch((err) => setExamHistoryError("Failed to fetch exam history."))
        .finally(() => setExamHistoryLoading(false));
    }
  }, [activeTab, user, schoolId]);

  // Add effect to fetch subjects by class when selectedClass changes in 'subjects' tab
  useEffect(() => {
    if (activeTab === "subjects" && user) {
      fetchSubjectsByClass();
    }
  }, [selectedClass, activeTab, user, fetchSubjectsByClass]);

  // Add effect to fetch subjects by class for assign tab
  useEffect(() => {
    if (activeTab === "assign" && user) {
      fetchAssignSubjectsByClass();
    }
  }, [selectedAssignClass, activeTab, user, fetchAssignSubjectsByClass]);

  // Add effect to always fetch teachers when Assign tab is active
  useEffect(() => {
    if (activeTab === "assign" && user) {
      fetchTeachersForAssign();
    }
  }, [activeTab, user]);

  // Fetch exam history when tab is selected
  useEffect(() => {
    if (activeTab === "exam-history") {
      setExamHistoryLoading(true);
      setExamHistoryError("");
      api
        .get("/exams/history-with-counts")
        .then((res) => setExamHistory(res.data))
        .catch((err) => setExamHistoryError("Failed to fetch exam history."))
        .finally(() => setExamHistoryLoading(false));
    }
  }, [activeTab]);

  // Fetch all approved exams when the approve tab is active
  useEffect(() => {
    if (activeTab === "approve") {
      setApprovedExamsLoading(true);
      setApprovedExamsError("");
      api
        .get("/exams")
        .then((res) => {
          // Filter for approved exams
          const approved = (res.data || []).filter(
            (exam) => exam.approved === true,
          );
          setApprovedExams(approved);
        })
        .catch(() => setApprovedExamsError("Failed to fetch approved exams."))
        .finally(() => setApprovedExamsLoading(false));
    }
  }, [activeTab]);

  const handleAssign = async () => {
    if (!selectedSubject || selectedTeachers.length === 0) {
      setError("Please select a subject and at least one teacher.");
      return;
    }
    setLoading(true);
    setError("");
    setMessage("");
    try {
      await subjectApi.assignTeachers(selectedSubject, selectedTeachers);
      setMessage("Teachers assigned successfully!");
      fetchData();
    } catch (err) {
      setError("Failed to assign teachers.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSubject = async () => {
    if (!newSubject.trim() || !newSubjectClass.trim()) {
      setError("Please enter a subject name and select a class.");
      return;
    }
    setLoading(true);
    setError("");
    setMessage("");
    try {
      await subjectApi.createSubject(newSubject.trim(), newSubjectClass.trim());
      setMessage("Subject created successfully!");
      setNewSubject("");
      setNewSubjectClass("");
      fetchData();
    } catch (err) {
      setError("Failed to create subject.");
    } finally {
      setLoading(false);
    }
  };

  const handleApproveExam = async (examId) => {
    setApprovalLoading(true);
    setApprovalError("");
    setApprovalMessage("");
    try {
      await examApi.approveExam(examId);
      setApprovalMessage("Exam approved successfully!");
      fetchUnapprovedExams();
    } catch (err) {
      setApprovalError("Failed to approve exam.");
    } finally {
      setApprovalLoading(false);
    }
  };

  const handleRejectExam = async (examId, reason) => {
    setApprovalLoading(true);
    setApprovalError("");
    setApprovalMessage("");
    try {
      await examApi.rejectExam(examId, reason);
      setApprovalMessage("Exam rejected successfully!");
      setShowRejectModal(false);
      setRejectReason("");
      setExamToReject(null);
      fetchUnapprovedExams();
    } catch (err) {
      setApprovalError("Failed to reject exam.");
    } finally {
      setApprovalLoading(false);
    }
  };

  const handleUnassignTeachers = async () => {
    if (!selectedSubjectForUnassign) return;
    setLoading(true);
    setError("");
    setMessage("");
    try {
      await subjectApi.unassignTeachers(
        selectedSubjectForUnassign,
        selectedTeachersForUnassign,
      );
      setMessage("Teachers unassigned successfully!");
      setShowUnassignModal(false);
      setSelectedSubjectForUnassign("");
      setSelectedTeachersForUnassign([]);
      fetchData();
    } catch (err) {
      setError("Failed to unassign teachers.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSubject = async () => {
    if (!subjectToDelete) return;
    setLoading(true);
    setError("");
    setMessage("");
    try {
      await subjectApi.deleteSubject(subjectToDelete._id);
      setMessage("Subject deleted successfully!");
      setShowDeleteModal(false);
      setSubjectToDelete(null);
      fetchData();
    } catch (err) {
      setError("Failed to delete subject.");
    } finally {
      setLoading(false);
    }
  };

  const handleApproveTeacher = async (teacherId) => {
    setTeacherApprovalLoading(true);
    setTeacherApprovalError("");
    setTeacherApprovalMessage("");
    try {
      await api.patch(`/users/${teacherId}/approve`);
      setTeacherApprovalMessage("Teacher approved successfully!");
      fetchUnapprovedTeachers();
    } catch (err) {
      setTeacherApprovalError("Failed to approve teacher.");
    } finally {
      setTeacherApprovalLoading(false);
    }
  };

  /* 
  const handleUnassignTeacher = async (subjectId, teacherId) => {
    const confirm = window.confirm('Are you sure you want to unassign this teacher from the subject?');
    if (!confirm) return;
    try {
      await subjectApi.unassignTeachers(subjectId, [teacherId]);
      setUnassignSuccess('Teacher unassigned successfully!');
      fetchData(); // Refresh assignments
      setTimeout(() => setUnassignSuccess(''), 2500);
    } catch (err) {
      alert('Failed to unassign teacher');
    }
  };
  */

  const openUnassignModal = (subject) => {
    setSelectedSubjectForUnassign(subject._id);
    setShowUnassignModal(true);
  };

  const openDeleteModal = (subject) => {
    setSubjectToDelete(subject);
    setShowDeleteModal(true);
  };

  /*
  const openRejectModal = (exam) => {
    setExamToReject(exam);
    setShowRejectModal(true);
  };
  */

  const handleDisapproveExam = async (examId) => {
    setApprovalLoading(true);
    setApprovalError("");
    setApprovalMessage("");
    try {
      await examApi.disapproveExam(examId);
      setApprovalMessage("Exam disapproved successfully!");
      fetchUnapprovedExams();
    } catch (err) {
      setApprovalError("Failed to disapprove exam.");
    } finally {
      setApprovalLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Bar */}
      <header className="bg-gradient-to-r from-red-600 to-pink-500 shadow-md">
        <div className="max-w-5xl mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <img
              src={require("../assets/images/SpectraLogo.jpg")}
              alt="Logo"
              className="w-10 h-10 rounded-full shadow animate-fade-in"
            />
            <div className="flex flex-col">
              <h1 className="text-2xl font-extrabold text-white tracking-wide drop-shadow animate-slide-in">
                Admin Dashboard
              </h1>
              {schoolLoading ? (
                <div className="text-xs text-red-100">Loading school...</div>
              ) : school ? (
                <div className="text-xs text-red-100">{school.name}</div>
              ) : (
                <div className="text-xs text-red-200">School not found</div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Hamburger for mobile */}
            <button
              className="md:hidden text-white text-2xl focus:outline-none"
              onClick={() => setNavOpen(!navOpen)}
              aria-label="Toggle navigation"
            >
              {navOpen ? <FaTimes /> : <FaBars />}
            </button>
            <button
              onClick={handleLogout}
              className="bg-white text-red-600 font-semibold px-4 py-2 rounded-lg shadow hover:bg-red-50 transition text-sm flex items-center gap-2"
            >
              <FaSignOutAlt />
              Logout
            </button>
          </div>
        </div>
      </header>
      {/* Tab Navigation */}
      {/* Desktop Nav */}
      <nav className="bg-white shadow-sm border-b hidden md:block animate-fade-in">
        <div className="max-w-5xl mx-auto px-4">
          <ul className="flex flex-wrap gap-2 py-3 justify-center sm:justify-start">
            <li>
              <button
                className={`px-5 py-2 rounded-full font-medium transition text-sm flex items-center gap-2 ${activeTab === "assign" ? "bg-red-600 text-white shadow" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
                onClick={() => setActiveTab("assign")}
              >
                <FaClipboardList /> Assign Subjects
              </button>
            </li>
            <li>
              <button
                className={`px-5 py-2 rounded-full font-medium transition text-sm flex items-center gap-2 ${activeTab === "subjects" ? "bg-red-600 text-white shadow" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
                onClick={() => setActiveTab("subjects")}
              >
                <FaBook /> Manage Subjects
              </button>
            </li>
            <li>
              <button
                className={`px-5 py-2 rounded-full font-medium transition text-sm flex items-center gap-2 ${activeTab === "approve" ? "bg-red-600 text-white shadow" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
                onClick={() => setActiveTab("approve")}
              >
                <FaCheckCircle /> Approve Exams
              </button>
            </li>
            <li>
              <button
                className={`px-5 py-2 rounded-full font-medium transition text-sm flex items-center gap-2 ${activeTab === "teacher-approval" ? "bg-red-600 text-white shadow" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
                onClick={() => setActiveTab("teacher-approval")}
              >
                <FaChalkboardTeacher /> Approve Teachers
              </button>
            </li>
            <li>
              <button
                className={`px-5 py-2 rounded-full font-medium transition text-sm flex items-center gap-2 ${activeTab === "exam-history" ? "bg-red-600 text-white shadow" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
                onClick={() => setActiveTab("exam-history")}
              >
                <FaTasks /> Exam History
              </button>
            </li>
            <li>
              <button
                className={`px-5 py-2 rounded-full font-medium transition text-sm flex items-center gap-2 ${activeTab === "results" ? "bg-red-600 text-white shadow" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
                onClick={() => setActiveTab("results")}
              >
                <FaTasks /> Results Management
              </button>
            </li>
          </ul>
        </div>
      </nav>
      {/* Mobile Nav */}
      <nav
        className={`md:hidden fixed top-0 left-0 w-full h-full bg-black bg-opacity-40 z-50 transition-all duration-300 ${navOpen ? "block animate-fade-in" : "hidden"}`}
        onClick={() => setNavOpen(false)}
      >
        <div
          className="bg-white shadow-lg rounded-b-2xl max-w-xs w-11/12 mx-auto mt-4 p-4 animate-slide-in-down"
          onClick={(e) => e.stopPropagation()}
        >
          <ul className="flex flex-col gap-3">
            <li>
              <button
                className={`w-full px-5 py-3 rounded-lg font-medium transition text-base flex items-center gap-3 ${activeTab === "assign" ? "bg-red-600 text-white shadow" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
                onClick={() => {
                  setActiveTab("assign");
                  setNavOpen(false);
                }}
              >
                <FaClipboardList /> Assign Subjects
              </button>
            </li>
            <li>
              <button
                className={`w-full px-5 py-3 rounded-lg font-medium transition text-base flex items-center gap-3 ${activeTab === "subjects" ? "bg-red-600 text-white shadow" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
                onClick={() => {
                  setActiveTab("subjects");
                  setNavOpen(false);
                }}
              >
                <FaBook /> Manage Subjects
              </button>
            </li>
            <li>
              <button
                className={`w-full px-5 py-3 rounded-lg font-medium transition text-base flex items-center gap-3 ${activeTab === "approve" ? "bg-red-600 text-white shadow" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
                onClick={() => {
                  setActiveTab("approve");
                  setNavOpen(false);
                }}
              >
                <FaCheckCircle /> Approve Exams
              </button>
            </li>
            <li>
              <button
                className={`w-full px-5 py-3 rounded-lg font-medium transition text-base flex items-center gap-3 ${activeTab === "teacher-approval" ? "bg-red-600 text-white shadow" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
                onClick={() => {
                  setActiveTab("teacher-approval");
                  setNavOpen(false);
                }}
              >
                <FaChalkboardTeacher /> Approve Teachers
              </button>
            </li>
            <li>
              <button
                className={`w-full px-5 py-3 rounded-lg font-medium transition text-base flex items-center gap-3 ${activeTab === "exam-history" ? "bg-red-600 text-white shadow" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
                onClick={() => {
                  setActiveTab("exam-history");
                  setNavOpen(false);
                }}
              >
                <FaTasks /> Exam History
              </button>
            </li>
            <li>
              <button
                className={`w-full px-5 py-3 rounded-lg font-medium transition text-base flex items-center gap-3 ${activeTab === "results" ? "bg-red-600 text-white shadow" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
                onClick={() => {
                  setActiveTab("results");
                  setNavOpen(false);
                }}
              >
                <FaTasks /> Results Management
              </button>
            </li>
            <li>
              <button
                onClick={() => {
                  handleLogout();
                  setNavOpen(false);
                }}
                className="w-full px-5 py-3 rounded-lg font-medium transition text-base flex items-center gap-3 bg-gray-100 text-red-600 hover:bg-red-50"
              >
                <FaSignOutAlt /> Logout
              </button>
            </li>
          </ul>
        </div>
      </nav>
      {/* User Info */}
      <div className="max-w-5xl mx-auto px-4 mt-6 mb-4 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center bg-pink-50 border border-pink-100 rounded-xl shadow-sm px-4 py-3 gap-2">
          <div className="text-sm text-gray-700 flex items-center gap-2">
            <FaUser className="text-pink-400" />
            <strong>Current User:</strong> {user?.displayName || user?.email}
          </div>
          <div className="text-sm text-gray-700 flex items-center gap-2">
            <FaUserShield className="text-pink-400" />
            <strong>Role:</strong> {user?.role}
          </div>
        </div>
      </div>
      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-4 pb-10 animate-fade-in">
        {activeTab === "assign" && (
          <div>
            <h2 className="text-base xs:text-lg sm:text-xl font-semibold mb-2">
              Assign Subjects to Teachers
            </h2>
            {error && (
              <div className="mb-2 text-xs xs:text-sm text-red-600">
                {error}
              </div>
            )}
            {message && (
              <div className="mb-2 text-xs xs:text-sm text-green-600">
                {message}
              </div>
            )}
            {/* Class Filter Dropdown for Assign */}
            <div className="mb-3 xs:mb-4 flex items-center space-x-2">
              <label className="text-xs xs:text-sm font-medium">
                Filter by Class:
              </label>
              <select
                value={selectedAssignClass}
                onChange={(e) => setSelectedAssignClass(e.target.value)}
                className="border px-2 py-1 rounded text-xs xs:text-sm"
              >
                <option value="">All Classes</option>
                <option value="JSS1">JSS1</option>
                <option value="JSS2">JSS2</option>
                <option value="JSS3">JSS3</option>
                <option value="SS1">SS1</option>
                <option value="SS2">SS2</option>
                <option value="SS3">SS3</option>
              </select>
            </div>
            <div className="mb-3 xs:mb-4 flex flex-col xs:flex-row items-center xs:space-x-2 gap-2 xs:gap-0">
              <input
                type="text"
                placeholder="New subject name"
                value={newSubject}
                onChange={(e) => setNewSubject(e.target.value)}
                className="border px-2 py-1 rounded text-xs xs:text-sm"
              />
              <select
                value={newSubjectClass}
                onChange={(e) => setNewSubjectClass(e.target.value)}
                className="border px-2 py-1 rounded text-xs xs:text-sm"
              >
                <option value="">Select Class</option>
                <option value="JSS1">JSS1</option>
                <option value="JSS2">JSS2</option>
                <option value="JSS3">JSS3</option>
                <option value="SS1">SS1</option>
                <option value="SS2">SS2</option>
                <option value="SS3">SS3</option>
              </select>
              <button
                onClick={handleCreateSubject}
                className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 text-xs xs:text-sm"
                disabled={loading}
              >
                Add Subject
              </button>
            </div>
            {!newSubjectClass && error && (
              <div className="mb-2 text-xs xs:text-sm text-red-600">
                Please select a class for the subject.
              </div>
            )}
            <div className="mb-3 xs:mb-4">
              <label className="block font-medium mb-1 text-xs xs:text-sm">
                Select Subject
              </label>
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="border px-2 py-1 rounded w-full text-xs xs:text-sm"
              >
                <option value="">-- Select Subject --</option>
                {subjects.map((subject) => (
                  <option key={subject._id} value={subject._id}>
                    {subject.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="mb-3 xs:mb-4">
              <label className="block font-medium mb-1 text-xs xs:text-sm">
                Select Teachers
              </label>
              <select
                multiple
                value={selectedTeachers}
                onChange={(e) =>
                  setSelectedTeachers(
                    Array.from(
                      e.target.selectedOptions,
                      (option) => option.value,
                    ),
                  )
                }
                className="border px-2 py-1 rounded w-full h-24 xs:h-32 text-xs xs:text-sm"
              >
                {teachers.map((teacher) => (
                  <option key={teacher._id} value={teacher._id}>
                    {teacher.displayName} ({teacher.email})
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={handleAssign}
              className="bg-blue-600 text-white px-3 xs:px-4 py-2 rounded hover:bg-blue-700 text-xs xs:text-sm"
              disabled={loading}
            >
              Assign Teachers
            </button>
            <div className="mt-6 xs:mt-8 overflow-x-auto">
              <h3 className="font-semibold mb-2 text-xs xs:text-sm">
                Current Subject Assignments
              </h3>
              <table className="min-w-full bg-white border rounded text-xs xs:text-sm">
                <thead>
                  <tr>
                    <th className="px-2 xs:px-4 py-2 border">Subject</th>
                    <th className="px-2 xs:px-4 py-2 border">Class</th>
                    <th className="px-2 xs:px-4 py-2 border">
                      Assigned Teachers
                    </th>
                    <th className="px-2 xs:px-4 py-2 border">Teacher Count</th>
                  </tr>
                </thead>
                <tbody>
                  {subjects.map((subject) => (
                    <tr key={subject._id}>
                      <td className="px-2 xs:px-4 py-2 border">
                        {subject.name}
                      </td>
                      <td className="px-2 xs:px-4 py-2 border">
                        {subject.class}
                      </td>
                      <td className="px-2 xs:px-4 py-2 border">
                        {subject.teachers && subject.teachers.length > 0 ? (
                          <div className="space-y-1">
                            {subject.teachers.map((teacher) => (
                              <div
                                key={teacher._id}
                                className="text-xs text-gray-700 bg-gray-50 px-2 py-1 rounded"
                              >
                                {teacher.displayName || teacher.email}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400 italic">
                            No teachers assigned
                          </span>
                        )}
                      </td>
                      <td className="px-2 xs:px-4 py-2 border">
                        {subject.teachers ? subject.teachers.length : 0}{" "}
                        teacher(s)
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {activeTab === "subjects" && (
          <div>
            <h2 className="text-base xs:text-lg sm:text-xl font-semibold mb-2">
              All Subjects
            </h2>
            {error && (
              <div className="mb-2 text-xs xs:text-sm text-red-600">
                {error}
              </div>
            )}
            {message && (
              <div className="mb-2 text-xs xs:text-sm text-green-600">
                {message}
              </div>
            )}

            {/* Add New Subject Section */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="text-sm xs:text-base font-semibold mb-3">
                Add New Subject
              </h3>
              <div className="flex flex-col xs:flex-row items-center xs:space-x-2 gap-2 xs:gap-0">
                <input
                  type="text"
                  placeholder="Enter subject name"
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  className="border px-3 py-2 rounded text-xs xs:text-sm flex-1"
                />
                <select
                  value={newSubjectClass}
                  onChange={(e) => setNewSubjectClass(e.target.value)}
                  className="border px-3 py-2 rounded text-xs xs:text-sm"
                >
                  <option value="">Select Class</option>
                  <option value="JSS1">JSS1</option>
                  <option value="JSS2">JSS2</option>
                  <option value="JSS3">JSS3</option>
                  <option value="SS1">SS1</option>
                  <option value="SS2">SS2</option>
                  <option value="SS3">SS3</option>
                </select>
                <button
                  onClick={handleCreateSubject}
                  className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 text-xs xs:text-sm"
                  disabled={
                    loading || !newSubject.trim() || !newSubjectClass.trim()
                  }
                >
                  {loading ? "Adding..." : "Add Subject"}
                </button>
              </div>
            </div>
            {!newSubjectClass && error && (
              <div className="mb-2 text-xs xs:text-sm text-red-600">
                Please select a class for the subject.
              </div>
            )}

            {/* Subject Statistics */}
            {subjectStats && (
              <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                <h3 className="text-sm xs:text-base font-semibold mb-3">
                  Subject Statistics
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="text-center">
                    <div className="text-lg xs:text-xl font-bold text-blue-600">
                      {subjectStats.totalSubjects}
                    </div>
                    <div className="text-xs text-gray-600">Total Subjects</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg xs:text-xl font-bold text-green-600">
                      {subjectStats.subjectsWithTeachers}
                    </div>
                    <div className="text-xs text-gray-600">With Teachers</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg xs:text-xl font-bold text-orange-600">
                      {subjectStats.subjectsWithoutTeachers}
                    </div>
                    <div className="text-xs text-gray-600">
                      Without Teachers
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg xs:text-xl font-bold text-purple-600">
                      {subjectStats.totalTeacherAssignments}
                    </div>
                    <div className="text-xs text-gray-600">
                      Total Assignments
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg xs:text-xl font-bold text-indigo-600">
                      {subjectStats.uniqueTeachersAssigned}
                    </div>
                    <div className="text-xs text-gray-600">Unique Teachers</div>
                  </div>
                </div>
              </div>
            )}

            {/* Class Filter Dropdown */}
            <div className="mb-4 flex items-center space-x-2">
              <label className="text-xs xs:text-sm font-medium">
                Filter by Class:
              </label>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="border px-2 py-1 rounded text-xs xs:text-sm"
              >
                <option value="">All Classes</option>
                <option value="JSS1">JSS1</option>
                <option value="JSS2">JSS2</option>
                <option value="JSS3">JSS3</option>
                <option value="SS1">SS1</option>
                <option value="SS2">SS2</option>
                <option value="SS3">SS3</option>
              </select>
            </div>

            {/* Foldable Subject List */}
            <div className="mb-6">
              <button
                className="flex items-center space-x-2 focus:outline-none"
                onClick={() => setSubjectsOpen((open) => !open)}
                aria-expanded={subjectsOpen}
              >
                <span
                  className={`transform transition-transform duration-200 ${subjectsOpen ? "rotate-90" : ""}`}
                >
                  ▶
                </span>
                <span className="text-sm xs:text-base font-semibold">
                  Subject List ({subjects.length} subjects)
                </span>
              </button>
              {subjectsOpen &&
                (loading ? (
                  <div className="text-center py-4 text-gray-500">
                    Loading subjects...
                  </div>
                ) : subjects.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                    <p className="text-sm">No subjects created yet.</p>
                    <p className="text-xs mt-1">
                      Create your first subject using the form above.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                    {subjects.map((subject) => (
                      <div
                        key={subject._id}
                        className="bg-white border rounded-lg p-4 shadow-sm"
                      >
                        <div className="flex justify-between items-start mb-3">
                          <h4 className="font-semibold text-sm xs:text-base text-gray-900">
                            {subject.name}
                          </h4>
                          <div className="flex space-x-1">
                            <button
                              onClick={() => openUnassignModal(subject)}
                              className="bg-orange-600 text-white px-2 py-1 rounded text-xs hover:bg-orange-700"
                              disabled={
                                !subject.teachers ||
                                subject.teachers.length === 0
                              }
                              title="Unassign Teachers"
                            >
                              Unassign
                            </button>
                            <button
                              onClick={() => openDeleteModal(subject)}
                              className="bg-red-600 text-white px-2 py-1 rounded text-xs hover:bg-red-700"
                              title="Delete Subject"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div>
                            <span className="text-xs font-medium text-gray-600">
                              Assigned Teachers:
                            </span>
                            <div className="mt-1">
                              {subject.teachers &&
                              subject.teachers.length > 0 ? (
                                <div className="space-y-1">
                                  {subject.teachers.map((teacher) => (
                                    <div
                                      key={teacher._id}
                                      className="text-xs text-gray-700 bg-gray-50 px-2 py-1 rounded"
                                    >
                                      {teacher.displayName || teacher.email}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-xs text-gray-400 italic">
                                  No teachers assigned
                                </span>
                              )}
                            </div>
                          </div>
                          <div>
                            <span className="text-xs font-medium text-gray-600">
                              Teacher Count:
                            </span>
                            <span className="text-xs text-gray-700 ml-1">
                              {subject.teachers ? subject.teachers.length : 0}{" "}
                              teacher(s)
                            </span>
                          </div>
                          <div>
                            <span className="text-xs font-medium text-gray-600">
                              Subject ID:
                            </span>
                            <span className="text-xs text-gray-500 ml-1 font-mono">
                              {subject._id}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
            </div>

            {/* Assign Teachers Section */}
            <div className="p-4 bg-blue-50 rounded-lg">
              <h3 className="text-sm xs:text-base font-semibold mb-3">
                Assign Teachers to Subjects
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="block font-medium mb-1 text-xs xs:text-sm">
                    Select Subject
                  </label>
                  <select
                    value={selectedSubject}
                    onChange={(e) => setSelectedSubject(e.target.value)}
                    className="border px-3 py-2 rounded w-full text-xs xs:text-sm"
                  >
                    <option value="">-- Select Subject --</option>
                    {subjects.map((subject) => (
                      <option key={subject._id} value={subject._id}>
                        {subject.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-medium mb-1 text-xs xs:text-sm">
                    Select Teachers
                  </label>
                  <select
                    multiple
                    value={selectedTeachers}
                    onChange={(e) =>
                      setSelectedTeachers(
                        Array.from(
                          e.target.selectedOptions,
                          (option) => option.value,
                        ),
                      )
                    }
                    className="border px-3 py-2 rounded w-full h-24 xs:h-32 text-xs xs:text-sm"
                  >
                    {teachers.map((teacher) => (
                      <option key={teacher._id} value={teacher._id}>
                        {teacher.displayName} ({teacher.email})
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={handleAssign}
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-xs xs:text-sm"
                  disabled={
                    loading || !selectedSubject || selectedTeachers.length === 0
                  }
                >
                  {loading ? "Assigning..." : "Assign Teachers"}
                </button>
              </div>
            </div>
          </div>
        )}
        {activeTab === "approve" && (
          <div>
            <h2 className="text-base xs:text-lg sm:text-xl font-semibold mb-2">
              Approve Exams
            </h2>
            {approvalError && (
              <div className="mb-2 text-xs xs:text-sm text-red-600">
                {approvalError}
              </div>
            )}
            {approvalMessage && (
              <div className="mb-2 text-xs xs:text-sm text-green-600">
                {approvalMessage}
              </div>
            )}
            {/* Unapproved Exams (Legacy) */}
            <div className="overflow-x-auto">
              <h3 className="text-xs xs:text-sm sm:text-lg font-medium mb-3 xs:mb-4">
                All Unapproved Exams
              </h3>
              {examLoading ? (
                <div>Loading...</div>
              ) : (
                <div>
                  {unapprovedExams.length === 0 ? (
                    <div className="bg-gray-100 p-2 xs:p-4 rounded text-xs xs:text-sm">
                      No unapproved exams.
                    </div>
                  ) : (
                    <table className="min-w-full bg-white border rounded text-xs xs:text-sm">
                      <thead>
                        <tr>
                          <th className="px-2 xs:px-4 py-2 border">Title</th>
                          <th className="px-2 xs:px-4 py-2 border">Subject</th>
                          <th className="px-2 xs:px-4 py-2 border">Status</th>
                          <th className="px-2 xs:px-4 py-2 border">
                            Created By
                          </th>
                          <th className="px-2 xs:px-4 py-2 border">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {unapprovedExams.map((exam) => (
                          <tr key={exam._id}>
                            <td className="px-2 xs:px-4 py-2 border">
                              {exam.title}
                            </td>
                            <td className="px-2 xs:px-4 py-2 border">
                              {exam.subject}
                            </td>
                            <td className="px-2 xs:px-4 py-2 border">
                              <span
                                className={`px-2 py-1 rounded text-xs ${
                                  exam.status === "pending_approval"
                                    ? "bg-yellow-100 text-yellow-800"
                                    : "bg-gray-100 text-gray-800"
                                }`}
                              >
                                {exam.status}
                              </span>
                            </td>
                            <td className="px-2 xs:px-4 py-2 border">
                              {exam.createdBy?.displayName ||
                                exam.createdBy?.email ||
                                "N/A"}
                            </td>
                            <td className="px-2 xs:px-4 py-2 border">
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => handleApproveExam(exam._id)}
                                  className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                                  disabled={examLoading}
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => handleDisapproveExam(exam._id)}
                                  className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
                                  disabled={examLoading}
                                >
                                  Disapprove
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
            <div className="overflow-x-auto mt-8">
              <h3 className="text-xs xs:text-sm sm:text-lg font-medium mb-3 xs:mb-4">
                All Approved Exams
              </h3>
              {approvedExamsLoading ? (
                <div>Loading...</div>
              ) : approvedExamsError ? (
                <div className="text-red-600 mb-2">{approvedExamsError}</div>
              ) : (
                <table className="min-w-full bg-white border rounded text-xs xs:text-sm">
                  <thead>
                    <tr>
                      <th className="px-2 xs:px-4 py-2 border">Title</th>
                      <th className="px-2 xs:px-4 py-2 border">Subject</th>
                      <th className="px-2 xs:px-4 py-2 border">Status</th>
                      <th className="px-2 xs:px-4 py-2 border">Created By</th>
                      <th className="px-2 xs:px-4 py-2 border">Approved At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {approvedExams.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center py-4">
                          No approved exams.
                        </td>
                      </tr>
                    ) : (
                      approvedExams.map((exam) => (
                        <tr key={exam._id}>
                          <td className="px-2 xs:px-4 py-2 border">
                            {exam.title}
                          </td>
                          <td className="px-2 xs:px-4 py-2 border">
                            {exam.subject}
                          </td>
                          <td className="px-2 xs:px-4 py-2 border">
                            {(() => {
                              const now = new Date();
                              const start = exam.startTime
                                ? new Date(exam.startTime)
                                : null;
                              const end = exam.endTime
                                ? new Date(exam.endTime)
                                : null;
                              if (start && end) {
                                if (now > end) return "completed";
                                if (now < start) return "draft";
                                if (now >= start && now <= end) return "active";
                              }
                              return exam.status;
                            })()}
                          </td>
                          <td className="px-2 xs:px-4 py-2 border">
                            {exam.createdBy?.displayName ||
                              exam.createdBy?.email ||
                              "N/A"}
                          </td>
                          <td className="px-2 xs:px-4 py-2 border">
                            {exam.approvedAt
                              ? new Date(exam.approvedAt).toLocaleDateString()
                              : "N/A"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
        {activeTab === "teacher-approval" && (
          <div>
            <h2 className="text-base xs:text-lg sm:text-xl font-semibold mb-2">
              Approve Teachers
            </h2>
            {teacherApprovalError && (
              <div className="mb-2 text-xs xs:text-sm text-red-600">
                {teacherApprovalError}
              </div>
            )}
            {teacherApprovalMessage && (
              <div className="mb-2 text-xs xs:text-sm text-green-600">
                {teacherApprovalMessage}
              </div>
            )}
            {teacherApprovalLoading ? (
              <div>Loading...</div>
            ) : (
              <table className="min-w-full bg-white border rounded text-xs xs:text-sm">
                <thead>
                  <tr>
                    <th className="px-2 xs:px-4 py-2 border">Name</th>
                    <th className="px-2 xs:px-4 py-2 border">Email</th>
                    <th className="px-2 xs:px-4 py-2 border">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {unapprovedTeachers.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="text-center py-4">
                        No unapproved teachers.
                      </td>
                    </tr>
                  ) : (
                    unapprovedTeachers.map((teacher) => (
                      <tr key={teacher._id}>
                        <td className="px-2 xs:px-4 py-2 border">
                          {teacher.displayName} {teacher.firstName}{" "}
                          {teacher.lastName}
                        </td>
                        <td className="px-2 xs:px-4 py-2 border">
                          {teacher.email}
                        </td>
                        <td className="px-2 xs:px-4 py-2 border">
                          <button
                            onClick={() => handleApproveTeacher(teacher._id)}
                            className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                            disabled={teacherApprovalLoading}
                          >
                            Approve
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        )}
        {activeTab === "exam-history" && (
          <div>
            <h2 className="text-base xs:text-lg sm:text-xl font-semibold mb-2">
              Exam History
            </h2>
            {examHistoryLoading ? (
              <div>Loading...</div>
            ) : examHistoryError ? (
              <div className="text-red-600 mb-2">{examHistoryError}</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white border rounded text-xs xs:text-sm">
                  <thead>
                    <tr>
                      <th className="px-2 xs:px-4 py-2 border">Teacher Name</th>
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
                        <td colSpan={6} className="text-center py-4">
                          No exams found.
                        </td>
                      </tr>
                    ) : (
                      examHistory.map((exam) => (
                        <tr key={exam._id}>
                          <td className="px-2 xs:px-4 py-2 border">
                            {exam.createdBy?.displayName ||
                              exam.createdBy?.email ||
                              "N/A"}
                          </td>
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
                            {(() => {
                              const now = new Date();
                              const start = exam.startTime
                                ? new Date(exam.startTime)
                                : null;
                              const end = exam.endTime
                                ? new Date(exam.endTime)
                                : null;
                              if (start && end) {
                                if (now > end) return "completed";
                                if (now < start) return "draft";
                                if (now >= start && now <= end) return "active";
                              }
                              return exam.status;
                            })()}
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
        {activeTab === "results" && (
          <div>
            <h2 className="text-base xs:text-lg sm:text-xl font-semibold mb-2">
              Results Management
            </h2>
            <p className="text-xs xs:text-sm text-gray-600 mb-4">
              Manage and release exam results for students. Teachers must
              approve submissions before results can be released.
            </p>
            <div className="bg-blue-50 p-4 rounded-lg mb-4">
              <h3 className="text-sm xs:text-base font-semibold mb-2">
                Quick Actions
              </h3>
              <div className="flex flex-col xs:flex-row gap-2">
                <button
                  onClick={() => navigate("/admin/results")}
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-xs xs:text-sm"
                >
                  View Results Portal
                </button>
                <button
                  onClick={() => navigate("/teacher/results")}
                  className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 text-xs xs:text-sm"
                >
                  Teacher Approval Portal
                </button>
              </div>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg">
              <h3 className="text-sm xs:text-base font-semibold mb-2">
                Results Workflow
              </h3>
              <ol className="text-xs xs:text-sm text-gray-700 space-y-1">
                <li>1. Students submit exams</li>
                <li>2. Teachers review and approve submissions</li>
                <li>3. Admin releases approved results for students to view</li>
                <li>4. Students can access their released results</li>
              </ol>
            </div>
          </div>
        )}
      </div>

      {/* Unassign Teachers Modal */}
      {showUnassignModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-2 xs:px-4">
          <div className="bg-white p-4 xs:p-6 rounded-lg max-w-xs xs:max-w-md w-full mx-2 xs:mx-4">
            <h3 className="text-base xs:text-lg font-semibold mb-3 xs:mb-4">
              Unassign Teachers
            </h3>
            <p className="mb-3 xs:mb-4 text-xs xs:text-sm">
              Select teachers to unassign from this subject:
            </p>
            <div className="mb-3 xs:mb-4 max-h-32 xs:max-h-40 overflow-y-auto">
              {subjects
                .find((s) => s._id === selectedSubjectForUnassign)
                ?.teachers?.map((teacher) => (
                  <label key={teacher._id} className="flex items-center mb-2">
                    <input
                      type="checkbox"
                      value={teacher._id}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedTeachersForUnassign([
                            ...selectedTeachersForUnassign,
                            teacher._id,
                          ]);
                        } else {
                          setSelectedTeachersForUnassign(
                            selectedTeachersForUnassign.filter(
                              (id) => id !== teacher._id,
                            ),
                          );
                        }
                      }}
                      className="mr-2"
                    />
                    {teacher.displayName || teacher.email}
                  </label>
                )) || <p className="text-gray-500">No teachers assigned</p>}
            </div>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowUnassignModal(false)}
                className="px-3 xs:px-4 py-2 border rounded hover:bg-gray-100 text-xs xs:text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleUnassignTeachers}
                className="px-3 xs:px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 text-xs xs:text-sm"
                disabled={loading}
              >
                {loading ? "Unassigning..." : "Unassign"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Subject Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-2 xs:px-4">
          <div className="bg-white p-4 xs:p-6 rounded-lg max-w-xs xs:max-w-md w-full mx-2 xs:mx-4">
            <h3 className="text-base xs:text-lg font-semibold mb-3 xs:mb-4">
              Delete Subject
            </h3>
            <p className="mb-3 xs:mb-4 text-xs xs:text-sm">
              Are you sure you want to delete "{subjectToDelete?.name}"? This
              action cannot be undone.
            </p>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-3 xs:px-4 py-2 border rounded hover:bg-gray-100 text-xs xs:text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteSubject}
                className="px-3 xs:px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-xs xs:text-sm"
                disabled={loading}
              >
                {loading ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Exam Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-2 xs:px-4">
          <div className="bg-white p-4 xs:p-6 rounded-lg max-w-xs xs:max-w-md w-full mx-2 xs:mx-4">
            <h3 className="text-base xs:text-lg font-semibold mb-3 xs:mb-4">
              Reject Exam
            </h3>
            <p className="mb-3 xs:mb-4 text-xs xs:text-sm">
              Are you sure you want to reject "{examToReject?.title}"?
            </p>
            <div className="mb-3 xs:mb-4">
              <label className="block text-xs xs:text-sm font-medium mb-2">
                Reason for rejection (optional):
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full px-2 xs:px-3 py-2 border rounded text-xs xs:text-sm"
                rows="3"
                placeholder="Enter reason for rejection..."
              />
            </div>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectReason("");
                  setExamToReject(null);
                }}
                className="px-3 xs:px-4 py-2 border rounded hover:bg-gray-100 text-xs xs:text-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => handleRejectExam(examToReject._id, rejectReason)}
                className="px-3 xs:px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-xs xs:text-sm"
                disabled={approvalLoading}
              >
                {approvalLoading ? "Rejecting..." : "Reject"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
