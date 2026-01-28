import React, { useState, useEffect } from "react";
import { FaDownload, FaPrint, FaClock } from "react-icons/fa";
import { submissionApi } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

const StudentResults = () => {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submissions, setSubmissions] = useState([]);

  useEffect(() => {
    const fetchResults = async () => {
      try {
        setLoading(true);
        setError(null);

        if (!currentUser || !currentUser.id) {
          navigate("/student/login");
          return;
        }

        if (currentUser.role !== "student") {
          navigate("/student/login");
          return;
        }

        // Fetch all student's submissions (their exam results)
        const response = await submissionApi.getAllSubmissions();
        setSubmissions(response || []);
      } catch (err) {
        console.error("Error fetching results:", err);
        setError(err.message || "Failed to fetch results");
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [currentUser, navigate]);

  const handleDownload = async () => {
    try {
      const headers = [
        "Exam Title",
        "Subject",
        "Score",
        "Total Marks",
        "Percentage",
        "Submitted At",
      ];
      const rows = submissions.map((result) => [
        result.exam?.title || "N/A",
        result.exam?.subject || "N/A",
        result.score,
        result.exam?.totalMarks || 0,
        `${calculatePercentage(result.score, result.exam?.totalMarks || 100)}%`,
        formatDate(result.submittedAt),
      ]);

      let csvContent = "";
      csvContent += headers.join(",") + "\n";
      rows.forEach((row) => {
        csvContent +=
          row
            .map((field) => '"' + String(field).replace(/"/g, '""') + '"')
            .join(",") + "\n";
      });

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `my_results_${new Date().toISOString().split('T')[0]}.csv`,
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError("Failed to download results");
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const calculatePercentage = (score, totalMarks) => {
    return ((score / totalMarks) * 100).toFixed(1);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const getGradeColor = (percentage) => {
    if (percentage >= 80) return "text-green-600";
    if (percentage >= 70) return "text-blue-600";
    if (percentage >= 60) return "text-yellow-600";
    if (percentage >= 50) return "text-orange-600";
    return "text-red-600";
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

  if (submissions.length === 0) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <FaClock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">
            No released results found for the selected term and session.
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Results will appear here once they are released by the admin.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Navigation Bar */}
      <nav className="bg-blue-600 text-white p-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold">Student Results Portal</h1>
          <span className="text-sm">Welcome, {currentUser?.displayName}</span>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold">Academic Results</h2>
            <div className="flex space-x-4">
              <button
                onClick={handleDownload}
                disabled={submissions.length === 0}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
              >
                <FaDownload />
                <span>Download CSV</span>
              </button>
              <button
                onClick={handlePrint}
                className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                <FaPrint />
                <span>Print</span>
              </button>
            </div>
          </div>

          {/* Results Summary */}
          <div className="bg-blue-50 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold mb-4">Results Summary</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-lg shadow">
                <p className="text-sm text-gray-600">Total Exams</p>
                <p className="text-2xl font-bold">{submissions.length}</p>
              </div>
              <div className="bg-white p-4 rounded-lg shadow">
                <p className="text-sm text-gray-600">Average Score</p>
                <p className="text-2xl font-bold">
                  {submissions.length > 0
                    ? (
                        submissions.reduce((sum, result) => sum + result.score, 0) /
                        submissions.length
                      ).toFixed(1)
                    : "0"}
                </p>
              </div>
              <div className="bg-white p-4 rounded-lg shadow">
                <p className="text-sm text-gray-600">Average Percentage</p>
                <p className="text-2xl font-bold">
                  {submissions.length > 0
                    ? (
                        submissions.reduce(
                          (sum, result) =>
                            sum +
                            calculatePercentage(
                              result.score,
                              result.exam?.totalMarks || 100,
                            ),
                          0,
                        ) / submissions.length
                      ).toFixed(1) + "%"
                    : "0%"}
                </p>
              </div>
              <div className="bg-white p-4 rounded-lg shadow">
                <p className="text-sm text-gray-600">Best Subject</p>
                <p className="text-2xl font-bold">
                  {submissions.length > 0
                    ? submissions.reduce((best, result) => {
                        const percentage = calculatePercentage(
                          result.score,
                          result.exam?.totalMarks || 100,
                        );
                        const bestPercentage = calculatePercentage(
                          best.score,
                          best.exam?.totalMarks || 100,
                        );
                        return percentage > bestPercentage ? result : best;
                      }).exam?.subject || "N/A"
                    : "N/A"}
                </p>
              </div>
            </div>
          </div>

          {/* Detailed Results Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Exam
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Subject
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Score
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Percentage
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Submitted
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {submissions.map((result) => {
                  const percentage = calculatePercentage(
                    result.score,
                    result.exam?.totalMarks || 100,
                  );
                  return (
                    <tr key={result._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {result.exam?.title || "N/A"}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {result.exam?.subject || "N/A"}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {result.score}/{result.exam?.totalMarks || 100}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`text-sm font-medium ${getGradeColor(percentage)}`}
                        >
                          {percentage}%
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(result.submittedAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentResults;
