import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { examApi } from "../services/api";
import { Search } from "lucide-react";

function CreateExam() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [questions, setQuestions] = useState([]);
  const [selectedQuestions, setSelectedQuestions] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTerm, setSelectedTerm] = useState("all");
  const [selectedClass, setSelectedClass] = useState("all");
  const [examData, setExamData] = useState({
    title: "",
    description: "",
    duration_minutes: 60,
    is_published: false,
    questions: [],
  });

  useEffect(() => {
    fetchQuestions();
  }, []);

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      setError("");
      // Note: Questions are part of exams in new API
      // For now, just set empty array - questions will be managed during exam creation
      setQuestions([]);
    } catch (error) {
      console.error("Error fetching questions:", error);
      setError(
        error.response?.data?.message ||
          "Failed to fetch questions. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setExamData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleQuestionSelect = (questionId) => {
    setSelectedQuestions((prev) => {
      if (prev.includes(questionId)) {
        return prev.filter((id) => id !== questionId);
      } else {
        return [...prev, questionId];
      }
    });
  };

  // Calculate marks per question based on total marks and questions per student
  const calculateMarksPerQuestion = () => {
    if (examData.questionsPerStudent <= 0) return 0;
    return (
      Math.round((examData.totalMarks / examData.questionsPerStudent) * 100) /
      100
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate required fields
    if (!examData.title.trim()) {
      setError("Please enter an exam title");
      return;
    }

    if (examData.duration_minutes <= 0) {
      setError("Duration must be greater than 0 minutes");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const examDataToSubmit = {
        title: examData.title,
        description: examData.description,
        is_published: examData.is_published,
        duration_minutes: examData.duration_minutes,
        questions: examData.questions || [],
      };

      console.log("Submitting exam data:", examDataToSubmit);

      const response = await examApi.createExam(examDataToSubmit);

      console.log("Exam created:", response);
      alert("Exam created successfully!");
      navigate("/teacher/dashboard");
    } catch (error) {
      console.error("Error creating exam:", error);
      setError(error.message || "Failed to create exam");
    } finally {
      setLoading(false);
    }
  };

  const getSubjectStats = () => {
    const stats = {};
    questions.forEach((q) => {
      // Only count questions that match the current filters
      const matchesTerm = selectedTerm === "all" || q.term === selectedTerm;
      const matchesClass = selectedClass === "all" || q.class === selectedClass;

      if (matchesTerm && matchesClass) {
        if (!stats[q.subject]) {
          stats[q.subject] = { total: 0, selected: 0 };
        }
        stats[q.subject].total++;
        if (selectedQuestions.includes(q._id)) {
          stats[q.subject].selected++;
        }
      }
    });
    return stats;
  };

  const filteredQuestions = questions.filter((question) => {
    const matchesSearch = question.question
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesSubject =
      !examData.subject || question.subject === examData.subject;
    const matchesClass = !examData.class || question.class === examData.class;
    const matchesTerm =
      selectedTerm === "all" || question.term === selectedTerm;
    const matchesClassFilter =
      selectedClass === "all" || question.class === selectedClass;
    return (
      matchesSearch &&
      matchesSubject &&
      matchesClass &&
      matchesTerm &&
      matchesClassFilter
    );
  });

  const subjectStats = getSubjectStats();
  const marksPerQuestion = calculateMarksPerQuestion();

  // Get unique terms and classes for better organization
  const uniqueTerms = [...new Set(questions.map((q) => q.term))].sort();
  const uniqueClasses = [...new Set(questions.map((q) => q.class))].sort();

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6 text-left">Create New Exam</h1>

      {error && (
        <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded text-left">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Exam Details Form */}
        <div className="lg:col-span-1 bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4 text-left">Exam Details</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 text-left">
                Title
              </label>
              <input
                type="text"
                required
                value={examData.title}
                onChange={(e) => handleInputChange("title", e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-left"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 text-left">
                Description
              </label>
              <textarea
                value={examData.description}
                onChange={(e) =>
                  handleInputChange("description", e.target.value)
                }
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-left"
                rows="3"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 text-left">
                  Subject
                </label>
                <select
                  required
                  value={examData.subject}
                  onChange={(e) => handleInputChange("subject", e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-left"
                >
                  <option value="">Select Subject</option>
                  {Object.keys(subjectStats)
                    .sort()
                    .map((subject) => (
                      <option key={subject} value={subject}>
                        {subject} ({subjectStats[subject].total} questions)
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 text-left">
                  Class
                </label>
                <select
                  required
                  value={examData.class}
                  onChange={(e) => handleInputChange("class", e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-left"
                >
                  <option value="">Select Class</option>
                  <option value="JSS1">JSS1</option>
                  <option value="JSS2">JSS2</option>
                  <option value="JSS3">JSS3</option>
                  <option value="SS1">SS1</option>
                  <option value="SS2">SS2</option>
                  <option value="SS3">SS3</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 text-left">
                  Duration (minutes)
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={examData.duration}
                  onChange={(e) =>
                    handleInputChange("duration", parseInt(e.target.value))
                  }
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-left"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 text-left">
                  Total Marks
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={examData.totalMarks}
                  onChange={(e) =>
                    handleInputChange("totalMarks", parseInt(e.target.value))
                  }
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-left"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 text-left">
                  Start Time
                </label>
                <input
                  type="datetime-local"
                  required
                  value={examData.startTime}
                  onChange={(e) =>
                    handleInputChange("startTime", e.target.value)
                  }
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-left"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 text-left">
                  End Time
                </label>
                <input
                  type="datetime-local"
                  required
                  value={examData.endTime}
                  onChange={(e) => handleInputChange("endTime", e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-left"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 text-left">
                Questions Per Student
              </label>
              <input
                type="number"
                min="1"
                max={selectedQuestions.length}
                value={examData.questionsPerStudent}
                onChange={(e) =>
                  handleInputChange(
                    "questionsPerStudent",
                    Number(e.target.value),
                  )
                }
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-left"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 text-left">
                  Session
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 2023/2024"
                  value={examData.session}
                  onChange={(e) => handleInputChange("session", e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-left"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 text-left">
                  Term
                </label>
                <select
                  required
                  value={examData.term}
                  onChange={(e) => handleInputChange("term", e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-left"
                >
                  <option value="">Select Term</option>
                  <option value="1st Term">1st Term</option>
                  <option value="2nd Term">2nd Term</option>
                  <option value="3rd Term">3rd Term</option>
                </select>
              </div>
            </div>

            {/* Display marks per question */}
            <div className="bg-blue-50 p-3 rounded-md">
              <p className="text-sm text-blue-800 text-left">
                <strong>Marks per question:</strong> {marksPerQuestion} marks
              </p>
              <p className="text-xs text-blue-600 text-left mt-1">
                (Total marks ÷ Questions per student = {examData.totalMarks} ÷{" "}
                {examData.questionsPerStudent})
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 text-left">
                Instructions
              </label>
              <textarea
                value={examData.instructions}
                onChange={(e) =>
                  handleInputChange("instructions", e.target.value)
                }
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-left"
                rows="3"
                placeholder="Enter exam instructions..."
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
            >
              {loading ? "Creating Exam..." : "Create Exam"}
            </button>
          </form>
        </div>

        {/* Question Selection */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow">
          <div className="p-4 border-b">
            <h2 className="text-xl font-semibold text-left">
              Select Questions
            </h2>
            <p className="text-sm text-gray-600 mt-1 text-left">
              Selected {selectedQuestions.length} questions | Total marks:{" "}
              {examData.totalMarks} | Marks per question: {marksPerQuestion}
            </p>
            <p className="text-xs text-gray-500 mt-1 text-left">
              Note: Individual question marks shown below are for reference
              only. Actual marks per question will be {marksPerQuestion}.
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {selectedTerm !== "all" && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  Term: {selectedTerm}
                </span>
              )}
              {selectedClass !== "all" && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Class: {selectedClass}
                </span>
              )}
              {examData.subject && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                  Subject: {examData.subject}
                </span>
              )}
              {examData.class && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                  Exam Class: {examData.class}
                </span>
              )}
            </div>
          </div>

          <div className="p-4 border-b">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search questions..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-left"
                  />
                  <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                </div>
              </div>
              <div className="flex gap-2">
                <select
                  value={selectedTerm}
                  onChange={(e) => setSelectedTerm(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-left"
                >
                  <option value="all">All Terms</option>
                  {uniqueTerms.map((term) => (
                    <option key={term} value={term}>
                      {term}
                    </option>
                  ))}
                </select>
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-left"
                >
                  <option value="all">All Classes</option>
                  {uniqueClasses.map((classItem) => (
                    <option key={classItem} value={classItem}>
                      {classItem}
                    </option>
                  ))}
                </select>
                {(selectedTerm !== "all" ||
                  selectedClass !== "all" ||
                  searchTerm) && (
                  <button
                    onClick={() => {
                      setSelectedTerm("all");
                      setSelectedClass("all");
                      setSearchTerm("");
                    }}
                    className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="p-4">
            <div className="space-y-4">
              {filteredQuestions.map((question) => (
                <div
                  key={question._id}
                  className={`p-4 border rounded-lg ${
                    selectedQuestions.includes(question._id)
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200"
                  }`}
                >
                  <div className="flex items-start">
                    <input
                      type="checkbox"
                      checked={selectedQuestions.includes(question._id)}
                      onChange={() => handleQuestionSelect(question._id)}
                      className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <div className="ml-3 flex-1">
                      <p className="text-sm text-gray-900 text-left">
                        {question.question}
                      </p>
                      <div className="mt-2 flex items-center space-x-4">
                        <span className="text-xs text-gray-500 text-left">
                          {question.subject}
                        </span>
                        <span className="text-xs text-gray-500 text-left">
                          {question.term}
                        </span>
                        <span className="text-xs text-gray-500 text-left">
                          {question.class}
                        </span>
                        <span className="text-xs text-gray-500 text-left">
                          Original: {question.marks} marks | Will be:{" "}
                          {marksPerQuestion} marks
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CreateExam;
