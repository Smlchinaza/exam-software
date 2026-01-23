import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { examApi } from "../services/api";
import { CheckCircle, Clock, Check, X } from "lucide-react";

const TeacherResults = () => {
  const { user: currentUser } = useAuth();
  const [exams, setExams] = useState([]);
  const [selectedExam, setSelectedExam] = useState(null);
  const [pendingSubmissions, setPendingSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [approving, setApproving] = useState(false);
  const [comments, setComments] = useState({});

  const fetchTeacherExams = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      console.log("TeacherResults - Current user:", currentUser);
      console.log("TeacherResults - User role:", currentUser?.role);
      console.log(
        "TeacherResults - User keys:",
        currentUser ? Object.keys(currentUser) : "No user",
      );
      console.log("TeacherResults - User _id:", currentUser?._id);
      console.log("TeacherResults - User id:", currentUser?.id);

      if (!currentUser || (!currentUser.id && !currentUser._id)) {
        setError("User not authenticated");
        return;
      }

      const response = await examApi.getAllExams();
      console.log("TeacherResults - All exams:", response);
      const userId = currentUser.id || currentUser._id;
      console.log("TeacherResults - Current user ID:", userId);
      console.log("TeacherResults - Current user ID type:", typeof userId);

      // Log some exam examples to understand the structure
      if (response.length > 0) {
        console.log(
          "TeacherResults - First exam createdBy:",
          response[0].createdBy,
        );
        console.log(
          "TeacherResults - Exam createdBy type:",
          typeof response[0].createdBy,
        );
        if (response[0].createdBy && response[0].createdBy._id) {
          console.log(
            "TeacherResults - First exam createdBy._id:",
            response[0].createdBy._id,
          );
          console.log(
            "TeacherResults - First exam createdBy._id type:",
            typeof response[0].createdBy._id,
          );
          console.log(
            "TeacherResults - ID comparison:",
            response[0].createdBy._id === currentUser.id,
          );
          console.log(
            "TeacherResults - String comparison:",
            response[0].createdBy._id.toString() === currentUser.id,
          );
        }
      }

      // Filter exams created by the current teacher with proper null checks
      const teacherExams = response.filter((exam) => {
        // Skip exams without createdBy field
        if (!exam.createdBy) {
          console.log("Skipping exam without createdBy:", exam.title);
          return false;
        }

        // Handle both string IDs and object IDs
        if (typeof exam.createdBy === "string") {
          const userId = currentUser.id || currentUser._id;
          const isMatch = exam.createdBy === userId;
          console.log(
            `Exam ${exam.title}: createdBy string "${exam.createdBy}" vs user "${userId}" = ${isMatch}`,
          );
          return isMatch;
        } else if (exam.createdBy._id) {
          // Try multiple comparison methods
          const userId = currentUser.id || currentUser._id;
          const directMatch = exam.createdBy._id === userId;
          const stringMatch = exam.createdBy._id.toString() === userId;
          const isMatch = directMatch || stringMatch;
          console.log(
            `Exam ${exam.title}: createdBy._id "${exam.createdBy._id}" vs user "${userId}" = ${isMatch} (direct: ${directMatch}, string: ${stringMatch})`,
          );
          return isMatch;
        }

        console.log(
          "Skipping exam with unknown createdBy format:",
          exam.title,
          exam.createdBy,
        );
        return false;
      });
      console.log("TeacherResults - Teacher exams:", teacherExams);
      setExams(teacherExams);
    } catch (err) {
      setError("Failed to fetch exams");
      console.error("Error fetching exams:", err);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser && currentUser.role === "teacher") {
      fetchTeacherExams();
    }
  }, [currentUser, fetchTeacherExams]);

  const fetchPendingSubmissions = async (examId) => {
    try {
      setLoading(true);
      const submissions = await examApi.getPendingSubmissions(examId);
      setPendingSubmissions(submissions);
    } catch (err) {
      setError("Failed to fetch pending submissions");
      console.error("Error fetching submissions:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleExamSelect = (exam) => {
    setSelectedExam(exam);
    fetchPendingSubmissions(exam._id);
  };

  const handleApprove = async (submissionId) => {
    try {
      setApproving(true);
      const comment = comments[submissionId] || "";
      await examApi.approveSubmission(selectedExam._id, submissionId, comment);

      // Remove the approved submission from the list
      setPendingSubmissions((prev) =>
        prev.filter((sub) => sub._id !== submissionId),
      );
      setComments((prev) => {
        const newComments = { ...prev };
        delete newComments[submissionId];
        return newComments;
      });

      alert("Submission approved successfully!");
    } catch (err) {
      alert("Failed to approve submission");
      console.error("Error approving submission:", err);
    } finally {
      setApproving(false);
    }
  };

  const handleReject = async (submissionId) => {
    try {
      setApproving(true);
      const comment = comments[submissionId] || "";
      await examApi.rejectSubmission(selectedExam._id, submissionId, comment);

      // Remove the rejected submission from the list
      setPendingSubmissions((prev) =>
        prev.filter((sub) => sub._id !== submissionId),
      );
      setComments((prev) => {
        const newComments = { ...prev };
        delete newComments[submissionId];
        return newComments;
      });

      alert("Submission rejected successfully!");
    } catch (err) {
      alert("Failed to reject submission");
      console.error("Error rejecting submission:", err);
    } finally {
      setApproving(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const calculatePercentage = (score, totalMarks) => {
    return ((score / totalMarks) * 100).toFixed(1);
  };

  if (loading && !selectedExam) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Navigation Bar */}
      <nav className="bg-green-600 text-white p-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold">Teacher Results Portal</h1>
          <span className="text-sm">Welcome, {currentUser?.displayName}</span>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Exam Selection */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-lg font-semibold mb-4">My Exams</h2>
              {exams.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-gray-500 mb-2">No exams found</p>
                  <p className="text-xs text-gray-400">This could mean:</p>
                  <ul className="text-xs text-gray-400 text-left mt-1">
                    <li>• You haven't created any exams yet</li>
                    <li>
                      • Your exams are not properly linked to your account
                    </li>
                    <li>• There's an authentication issue</li>
                  </ul>
                </div>
              ) : (
                <div className="space-y-3">
                  {exams.map((exam) => (
                    <button
                      key={exam._id}
                      onClick={() => handleExamSelect(exam)}
                      className={`w-full text-left p-3 rounded-lg border transition-colors ${
                        selectedExam?._id === exam._id
                          ? "border-green-500 bg-green-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <h3 className="font-medium text-gray-900">
                        {exam.title}
                      </h3>
                      <p className="text-sm text-gray-600">{exam.subject}</p>
                      <p className="text-xs text-gray-500">
                        {formatDate(exam.createdAt)}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Submissions */}
          <div className="lg:col-span-2">
            {selectedExam ? (
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h2 className="text-lg font-semibold">
                      {selectedExam.title}
                    </h2>
                    <p className="text-gray-600">{selectedExam.subject}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">
                      Total Marks: {selectedExam.totalMarks}
                    </p>
                    <p className="text-sm text-gray-500">
                      Duration: {selectedExam.duration} minutes
                    </p>
                  </div>
                </div>

                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-2 text-gray-600">Loading submissions...</p>
                  </div>
                ) : pendingSubmissions.length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                    <p className="text-gray-600">
                      No pending submissions for this exam
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <h3 className="font-medium text-gray-900 mb-4">
                      Pending Submissions ({pendingSubmissions.length})
                    </h3>
                    {pendingSubmissions.map((submission) => (
                      <div
                        key={submission._id}
                        className="border rounded-lg p-4"
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h4 className="font-medium text-gray-900">
                              {submission.student.displayName}
                            </h4>
                            <p className="text-sm text-gray-600">
                              {submission.student.email}
                            </p>
                            <p className="text-sm text-gray-500">
                              Class: {submission.student.currentClass}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-semibold text-blue-600">
                              {submission.score}/{selectedExam.totalMarks}
                            </p>
                            <p className="text-sm text-gray-500">
                              {calculatePercentage(
                                submission.score,
                                selectedExam.totalMarks,
                              )}
                              %
                            </p>
                            <p className="text-xs text-gray-400">
                              {formatDate(submission.submittedAt)}
                            </p>
                          </div>
                        </div>

                        {/* Comments Input */}
                        <div className="mb-3">
                          <textarea
                            placeholder="Add comments (optional)"
                            value={comments[submission._id] || ""}
                            onChange={(e) =>
                              setComments((prev) => ({
                                ...prev,
                                [submission._id]: e.target.value,
                              }))
                            }
                            className="w-full p-2 border border-gray-300 rounded text-sm"
                            rows="2"
                          />
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleApprove(submission._id)}
                            disabled={approving}
                            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-green-300"
                          >
                            <Check className="w-4 h-4" />
                            Approve
                          </button>
                          <button
                            onClick={() => handleReject(submission._id)}
                            disabled={approving}
                            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-red-300"
                          >
                            <X className="w-4 h-4" />
                            Reject
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-md p-6 text-center">
                <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">
                  Select an exam to view pending submissions
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeacherResults;
