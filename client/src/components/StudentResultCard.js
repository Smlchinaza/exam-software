// components/StudentResultCard.js
// Component for displaying and editing individual student results

import React, { useState, useEffect } from 'react';
import { FaUser, FaEdit, FaSave, FaTimes, FaHistory, FaCheck, FaExclamationTriangle } from 'react-icons/fa';
import StudentResultsApi from '../services/studentResultsApi';

const StudentResultCard = ({ 
  result, 
  index, 
  editingMode, 
  bulkEditMode, 
  selected, 
  onSelect, 
  onUpdate, 
  onViewHistory 
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValues, setEditValues] = useState({});
  const [validationErrors, setValidationErrors] = useState([]);
  const [saving, setSaving] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  // Initialize edit values when entering edit mode
  useEffect(() => {
    if (isEditing) {
      setEditValues({
        assessment1: result.assessment1 || 0,
        assessment2: result.assessment2 || 0,
        ca_test: result.ca_test || 0,
        exam_score: result.exam_score || 0,
        remark: result.remark || '',
        teacher_comment: result.teacher_comment || ''
      });
    }
  }, [isEditing, result]);

  // Calculate total score
  const calculateTotal = (values) => {
    return (parseFloat(values.assessment1) || 0) + 
           (parseFloat(values.assessment2) || 0) + 
           (parseFloat(values.ca_test) || 0) + 
           (parseFloat(values.exam_score) || 0);
  };

  // Validate score inputs
  const validateScores = (values) => {
    const errors = StudentResultsApi.validateScores(values);
    setValidationErrors(errors);
    return errors.length === 0;
  };

  // Handle score input changes
  const handleScoreChange = (field, value) => {
    const numValue = value === '' ? 0 : parseFloat(value);
    if (!isNaN(numValue)) {
      setEditValues(prev => ({ ...prev, [field]: numValue }));
      
      // Validate on change
      validateScores({ ...editValues, [field]: numValue });
    }
  };

  // Save changes
  const handleSave = async () => {
    if (!validateScores(editValues)) {
      return;
    }

    try {
      setSaving(true);
      await onUpdate(result.id, editValues);
      setIsEditing(false);
      setValidationErrors([]);
    } catch (error) {
      setValidationErrors([error.message]);
    } finally {
      setSaving(false);
    }
  };

  // Cancel editing
  const handleCancel = () => {
    setIsEditing(false);
    setEditValues({});
    setValidationErrors([]);
  };

  // Get grade color
  const getGradeColor = (grade) => {
    return StudentResultsApi.getGradeColor(grade);
  };

  // Get score color
  const getScoreColor = (score) => {
    return StudentResultsApi.getScoreColor(score);
  };

  const currentTotal = isEditing ? calculateTotal(editValues) : (result.total_score || 0);
  const currentGrade = isEditing ? StudentResultsApi.calculateGrade(currentTotal) : result.grade;

  return (
    <tr className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
      {/* Bulk Selection Checkbox */}
      {bulkEditMode && (
        <td className="px-4 py-3">
          <input
            type="checkbox"
            checked={selected}
            onChange={(e) => onSelect(e.target.checked)}
            className="rounded"
          />
        </td>
      )}

      {/* Student Info */}
      <td className="px-4 py-3">
        <div className="flex items-center">
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
            <FaUser className="text-blue-600 text-sm" />
          </div>
          <div>
            <div className="font-medium text-gray-900">{result.student_name}</div>
            <div className="text-sm text-gray-500">{result.student_email}</div>
            <div className="text-xs text-gray-400">{result.admission_number}</div>
          </div>
        </div>
      </td>

      {/* Assessment Scores */}
      {['assessment1', 'assessment2', 'ca_test', 'exam_score'].map((field, idx) => (
        <td key={field} className="px-4 py-3 text-center">
          {isEditing ? (
            <div>
              <input
                type="number"
                min="0"
                max={field === 'exam_score' ? 60 : field.startsWith('assessment') ? 15 : 10}
                step="0.5"
                value={editValues[field] || ''}
                onChange={(e) => handleScoreChange(field, e.target.value)}
                className={`w-16 px-2 py-1 text-center border rounded ${
                  validationErrors.some(error => error.toLowerCase().includes(field))
                    ? 'border-red-500' 
                    : 'border-gray-300'
                }`}
              />
              <div className="text-xs text-gray-500 mt-1">
                /{field === 'exam_score' ? 60 : field.startsWith('assessment') ? 15 : 10}
              </div>
            </div>
          ) : (
            <div className={`font-semibold ${getScoreColor(result[field] || 0)}`}>
              {result[field] || 0}
            </div>
          )}
        </td>
      ))}

      {/* Total Score */}
      <td className="px-4 py-3 text-center">
        <div className={`font-bold text-lg ${getScoreColor(currentTotal)}`}>
          {currentTotal.toFixed(1)}
        </div>
      </td>

      {/* Grade */}
      <td className="px-4 py-3 text-center">
        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getGradeColor(currentGrade)}`}>
          {currentGrade}
        </span>
      </td>

      {/* Position */}
      <td className="px-4 py-3 text-center">
        <div className="text-sm font-medium text-gray-900">
          {result.position_in_class || '-'}
        </div>
        {result.highest_in_class && (
          <div className="text-xs text-gray-500">
            Highest: {result.highest_in_class}
          </div>
        )}
      </td>

      {/* Actions */}
      <td className="px-4 py-3">
        <div className="flex justify-center space-x-2">
          {editingMode && !isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="p-2 text-blue-600 hover:bg-blue-100 rounded"
              title="Edit Result"
            >
              <FaEdit />
            </button>
          )}
          
          {isEditing && (
            <>
              <button
                onClick={handleSave}
                disabled={saving || validationErrors.length > 0}
                className="p-2 text-green-600 hover:bg-green-100 rounded disabled:text-gray-400"
                title="Save"
              >
                {saving ? <FaExclamationTriangle className="animate-spin" /> : <FaCheck />}
              </button>
              <button
                onClick={handleCancel}
                className="p-2 text-red-600 hover:bg-red-100 rounded"
                title="Cancel"
              >
                <FaTimes />
              </button>
            </>
          )}
          
          <button
            onClick={onViewHistory}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded"
            title="View History"
          >
            <FaHistory />
          </button>
          
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded"
            title="Toggle Details"
          >
            {showDetails ? <FaTimes /> : <FaUser />}
          </button>
        </div>
      </td>

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <td colSpan="100%" className="px-4 py-2 bg-red-50">
          <div className="text-red-600 text-sm">
            {validationErrors.map((error, idx) => (
              <div key={idx}>• {error}</div>
            ))}
          </div>
        </td>
      )}

      {/* Expanded Details */}
      {showDetails && (
        <td colSpan="100%" className="px-4 py-4 bg-gray-50">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Remarks */}
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Remarks</h4>
              {isEditing ? (
                <textarea
                  value={editValues.remark || ''}
                  onChange={(e) => setEditValues(prev => ({ ...prev, remark: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  rows="3"
                  placeholder="Add remarks..."
                />
              ) : (
                <p className="text-gray-600">{result.remark || 'No remarks'}</p>
              )}
            </div>

            {/* Teacher Comments */}
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Teacher Comments</h4>
              {isEditing ? (
                <textarea
                  value={editValues.teacher_comment || ''}
                  onChange={(e) => setEditValues(prev => ({ ...prev, teacher_comment: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  rows="3"
                  placeholder="Add teacher comments..."
                />
              ) : (
                <p className="text-gray-600">{result.teacher_comment || 'No comments'}</p>
              )}
            </div>

            {/* Attendance */}
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Attendance</h4>
              <div className="text-sm text-gray-600">
                <div>Days Present: {result.days_present || 0}</div>
                <div>School Days Opened: {result.days_school_opened || 0}</div>
                <div>Attendance Rate: {
                  result.days_school_opened > 0 
                    ? `${((result.days_present / result.days_school_opened) * 100).toFixed(1)}%`
                    : 'N/A'
                }</div>
              </div>
            </div>

            {/* Class Statistics */}
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Class Performance</h4>
              <div className="text-sm text-gray-600">
                <div>Class Average: {result.class_average ? result.class_average.toFixed(1) : 'N/A'}</div>
                <div>Highest in Class: {result.highest_in_class || 'N/A'}</div>
                <div>Position: {result.position_in_class || 'N/A'}</div>
              </div>
            </div>
          </div>
        </td>
      )}
    </tr>
  );
};

export default StudentResultCard;
