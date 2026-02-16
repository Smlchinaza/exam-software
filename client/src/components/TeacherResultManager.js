// components/TeacherResultManager.js
// Main component for managing student results

import React, { useState, useEffect, useCallback } from 'react';
import { FaUsers, FaBook, FaChartBar, FaEdit, FaSave, FaTimes, FaSearch, FaFilter, FaDownload, FaUpload, FaHistory, FaSpinner } from 'react-icons/fa';
import StudentResultsApi from '../services/studentResultsApi';
import SubjectClassSelector from './SubjectClassSelector';
import StudentResultCard from './StudentResultCard';
import ResultStatistics from './ResultStatistics';
import BulkResultEditor from './BulkResultEditor';

const TeacherResultManager = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [studentResults, setStudentResults] = useState([]);
  const [teacherSubjects, setTeacherSubjects] = useState([]);
  const [classStatistics, setClassStatistics] = useState(null);
  const [selectedFilters, setSelectedFilters] = useState({
    subject_name: '',
    class: '',
    session: '',
    term: '',
    student_search: ''
  });
  
  // UI States
  const [editingMode, setEditingMode] = useState(false);
  const [bulkEditMode, setBulkEditMode] = useState(false);
  const [showStatistics, setShowStatistics] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [saving, setSaving] = useState(false);
  const [changesMade, setChangesMade] = useState(false);
  
  // Bulk edit state
  const [selectedStudents, setSelectedStudents] = useState(new Set());
  const [bulkChanges, setBulkChanges] = useState({});

  // Load teacher subjects and initial data
  const loadInitialData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      // Get teacher's subjects
      const subjects = await StudentResultsApi.getTeacherSubjects();
      setTeacherSubjects(subjects);
      
      // Load student results if filters are set
      if (selectedFilters.subject_name && selectedFilters.class && selectedFilters.session && selectedFilters.term) {
        await loadStudentResults();
        await loadClassStatistics();
      }
      
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [selectedFilters]);

  // Load student results
  const loadStudentResults = useCallback(async () => {
    try {
      setLoading(true);
      const results = await StudentResultsApi.getTeacherResults(selectedFilters);
      setStudentResults(results);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [selectedFilters]);

  // Load class statistics
  const loadClassStatistics = useCallback(async () => {
    try {
      const stats = await StudentResultsApi.getClassStatistics(
        selectedFilters.subject_name,
        selectedFilters.class,
        selectedFilters.session,
        selectedFilters.term
      );
      setClassStatistics(stats);
    } catch (err) {
      // Statistics might not exist yet, that's okay
      setClassStatistics(null);
    }
  }, [selectedFilters]);

  // Handle filter changes
  const handleFilterChange = (newFilters) => {
    setSelectedFilters(prev => ({ ...prev, ...newFilters }));
    setChangesMade(false);
    setEditingMode(false);
    setBulkEditMode(false);
    setSelectedStudents(new Set());
  };

  // Handle individual student result update
  const handleStudentResultUpdate = async (studentId, updateData) => {
    try {
      setSaving(true);
      const updatedResult = await StudentResultsApi.updateStudentResult(studentId, updateData);
      
      // Update local state
      setStudentResults(prev => 
        prev.map(result => 
          result.id === studentId ? { ...result, ...updatedResult } : result
        )
      );
      
      setChangesMade(true);
      await loadClassStatistics(); // Refresh statistics
      
    } catch (err) {
      setError(`Failed to update student result: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  // Handle bulk update
  const handleBulkUpdate = async (updateData) => {
    try {
      setSaving(true);
      const updates = Array.from(selectedStudents).map(studentId => ({
        id: studentId,
        ...updateData
      }));
      
      const result = await StudentResultsApi.bulkUpdateStudentResults(updates);
      
      // Update local state
      setStudentResults(prev => 
        prev.map(result => {
          const update = result.updated.find(u => u.id === result.id);
          return update ? { ...result, ...update } : result;
        })
      );
      
      setChangesMade(true);
      setBulkEditMode(false);
      setSelectedStudents(new Set());
      await loadClassStatistics();
      
    } catch (err) {
      setError(`Failed to bulk update: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  // Handle student selection for bulk editing
  const handleStudentSelection = (studentId, selected) => {
    setSelectedStudents(prev => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(studentId);
      } else {
        newSet.delete(studentId);
      }
      return newSet;
    });
  };

  // Handle select all students
  const handleSelectAll = (selected) => {
    if (selected) {
      setSelectedStudents(new Set(studentResults.map(result => result.id)));
    } else {
      setSelectedStudents(new Set());
    }
  };

  // Export results to CSV
  const handleExportCSV = () => {
    const headers = [
      'Student Name', 'Email', 'Class', 'Assessment 1', 'Assessment 2', 
      'CA Test', 'Exam Score', 'Total', 'Grade', 'Position in Class'
    ];
    
    const rows = studentResults.map(result => [
      result.student_name || '',
      result.student_email || '',
      result.class || '',
      result.assessment1 || 0,
      result.assessment2 || 0,
      result.ca_test || 0,
      result.exam_score || 0,
      result.total_score || 0,
      result.grade || '',
      result.position_in_class || ''
    ]);
    
    let csvContent = '';
    csvContent += headers.join(',') + '\n';
    rows.forEach(row => {
      csvContent += row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(',') + '\n';
    });
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `student-results-${selectedFilters.subject_name}-${selectedFilters.class}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Recalculate statistics
  const handleRecalculateStatistics = async () => {
    try {
      setSaving(true);
      await StudentResultsApi.recalculateStatistics(
        selectedFilters.subject_name,
        selectedFilters.class,
        selectedFilters.session,
        selectedFilters.term
      );
      await loadClassStatistics();
    } catch (err) {
      setError(`Failed to recalculate statistics: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  if (loading && studentResults.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <FaSpinner className="animate-spin text-4xl text-blue-600 mr-3" />
        <span className="text-lg">Loading student results...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-800 flex items-center">
                <FaUsers className="mr-3 text-blue-600" />
                Student Results Management
              </h1>
              <p className="text-gray-600 mt-1">Manage and update student assessment scores</p>
            </div>
            
            <div className="flex space-x-2">
              <button
                onClick={() => setShowStatistics(!showStatistics)}
                className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                <FaChartBar className="mr-2" />
                {showStatistics ? 'Hide' : 'Show'} Statistics
              </button>
              
              <button
                onClick={handleExportCSV}
                disabled={studentResults.length === 0}
                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400"
              >
                <FaDownload className="mr-2" />
                Export CSV
              </button>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
            <button
              onClick={() => setError('')}
              className="float-right text-red-500 hover:text-red-700"
            >
              <FaTimes />
            </button>
          </div>
        )}

        {/* Subject and Class Selector */}
        <SubjectClassSelector
          filters={selectedFilters}
          teacherSubjects={teacherSubjects}
          onFilterChange={handleFilterChange}
        />

        {/* Statistics Panel */}
        {showStatistics && classStatistics && (
          <ResultStatistics
            statistics={classStatistics}
            subject={selectedFilters.subject_name}
            className={selectedFilters.class}
          />
        )}

        {/* Action Buttons */}
        {studentResults.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-4 mb-6">
            <div className="flex justify-between items-center">
              <div className="flex space-x-2">
                <button
                  onClick={() => {
                    setEditingMode(!editingMode);
                    setBulkEditMode(false);
                  }}
                  className={`flex items-center px-4 py-2 rounded-lg ${
                    editingMode 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  <FaEdit className="mr-2" />
                  {editingMode ? 'Exit Edit' : 'Edit Mode'}
                </button>
                
                <button
                  onClick={() => {
                    setBulkEditMode(!bulkEditMode);
                    setEditingMode(false);
                  }}
                  className={`flex items-center px-4 py-2 rounded-lg ${
                    bulkEditMode 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  <FaUsers className="mr-2" />
                  {bulkEditMode ? 'Exit Bulk Edit' : 'Bulk Edit'}
                </button>
                
                <button
                  onClick={handleRecalculateStatistics}
                  disabled={saving}
                  className="flex items-center px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-gray-400"
                >
                  {saving ? <FaSpinner className="animate-spin mr-2" /> : <FaChartBar className="mr-2" />}
                  Recalculate
                </button>
              </div>
              
              {changesMade && (
                <div className="text-green-600 font-semibold">
                  ✓ Changes saved successfully
                </div>
              )}
            </div>
          </div>
        )}

        {/* Bulk Edit Panel */}
        {bulkEditMode && (
          <BulkResultEditor
            selectedCount={selectedStudents.size}
            onUpdate={handleBulkUpdate}
            onCancel={() => {
              setBulkEditMode(false);
              setSelectedStudents(new Set());
            }}
          />
        )}

        {/* Student Results List */}
        {studentResults.length > 0 ? (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-100">
                  <tr>
                    {bulkEditMode && (
                      <th className="px-4 py-3 text-left">
                        <input
                          type="checkbox"
                          checked={selectedStudents.size === studentResults.length}
                          onChange={(e) => handleSelectAll(e.target.checked)}
                          className="rounded"
                        />
                      </th>
                    )}
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Student</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">Assessment 1</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">Assessment 2</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">CA Test</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">Exam</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">Total</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">Grade</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">Position</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {studentResults.map((result, index) => (
                    <StudentResultCard
                      key={result.id}
                      result={result}
                      index={index}
                      editingMode={editingMode}
                      bulkEditMode={bulkEditMode}
                      selected={selectedStudents.has(result.id)}
                      onSelect={(selected) => handleStudentSelection(result.id, selected)}
                      onUpdate={handleStudentResultUpdate}
                      onViewHistory={() => {
                        setSelectedStudent(result);
                        setShowHistory(true);
                      }}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <FaUsers className="text-6xl text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Student Results Found</h3>
            <p className="text-gray-600">
              {selectedFilters.subject_name && selectedFilters.class 
                ? 'No results found for the selected criteria.'
                : 'Please select a subject and class to view student results.'
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeacherResultManager;
