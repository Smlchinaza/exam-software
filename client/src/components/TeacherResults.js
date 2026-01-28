import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { examApi, submissionApi } from "../services/api";
import { CheckCircle, Clock, Check } from "lucide-react";

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
      
      // Fetch all exams (automatically scoped to teacher's school via JWT)
      const exams = await examApi.getAllExams();
      setExams(exams);
    } catch (err) {
      setError("Failed to fetch exams");
      console.error("Error fetching exams:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTeacherExams();
  }, [fetchTeacherExams]);

  const fetchPendingSubmissions = async (examId) => {
    try {
      setLoading(true);
      // Fetch all submissions for this exam
      const submissions = await submissionApi.getExamSubmissions(examId);
      // Filter for pending submissions (not graded)
      const pending = submissions.filter(sub => !sub.score);
      setPendingSubmissions(pending);
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
      const score = prompt("Enter the score for this submission:");
      if (score === null) return; // User cancelled
      
      const numScore = parseFloat(score);
      if (isNaN(numScore)) {
        alert("Please enter a valid number");
        return;
      }
      
      await submissionApi.gradeSubmission(submissionId, {
        score: numScore,
        feedback: comments[submissionId] || ""
      });

      // Remove the graded submission from the list
      setPendingSubmissions((prev) =>
        prev.filter((sub) => sub.id !== submissionId),
      );
      setComments((prev) => {
        const newComments = { ...prev };
        delete newComments[submissionId];
        return newComments;
      });

      alert("Submission graded successfully!");
    } catch (err) {
      alert("Failed to grade submission");
      console.error("Error grading submission:", err);
    } finally {
      setApproving(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  // eslint-disable-next-line no-unused-vars
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
                      key={exam.id}
                      onClick={() => handleExamSelect(exam)}
                      className={`w-full text-left p-3 rounded-lg border transition-colors ${
                        selectedExam?.id === exam.id
                          ? "border-green-500 bg-green-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <h3 className="font-medium text-gray-900">
                        {exam.title}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {exam.description || "No description"}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatDate(exam.created_at)}
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
                    <p className="text-gray-600">
                      {selectedExam.description || "No description"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">
                      Duration: {selectedExam.duration_minutes} minutes
                    </p>
                    <p className="text-sm text-gray-500">
                      {selectedExam.is_published ? "Published" : "Draft"}
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
                        key={submission.id}
                        className="border rounded-lg p-4"
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h4 className="font-medium text-gray-900">
                              {submission.student?.name || "Unknown Student"}
                            </h4>
                            <p className="text-sm text-gray-600">
                              {submission.student?.email || "No email"}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-gray-500">
                              Submitted: {formatDate(submission.submitted_at)}
                            </p>
                          </div>
                        </div>

                        {/* Score Input */}
                        <div className="mb-3">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Comments (optional)
                          </label>
                          <textarea
                            placeholder="Add feedback for the student"
                            value={comments[submission.id] || ""}
                            onChange={(e) =>
                              setComments((prev) => ({
                                ...prev,
                                [submission.id]: e.target.value,
                              }))
                            }
                            className="w-full p-2 border border-gray-300 rounded text-sm"
                            rows="2"
                          />
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleApprove(submission.id)}
                            disabled={approving}
                            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-green-300"
                          >
                            <Check className="w-4 h-4" />
                            Grade & Submit
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
