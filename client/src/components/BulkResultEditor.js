// components/BulkResultEditor.js
// Component for bulk editing student results

import React, { useState } from 'react';
import { FaUsers, FaEdit, FaSave, FaTimes, FaPlus, FaMinus } from 'react-icons/fa';
import StudentResultsApi from '../services/studentResultsApi';

const BulkResultEditor = ({ selectedCount, onUpdate, onCancel }) => {
  const [bulkValues, setBulkValues] = useState({
    assessment1: '',
    assessment2: '',
    ca_test: '',
    exam_score: '',
    remark: '',
    teacher_comment: '',
    operation: 'set' // 'set', 'add', 'subtract'
  });
  
  const [validationErrors, setValidationErrors] = useState([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [saving, setSaving] = useState(false);

  // Validate bulk values
  const validateBulkValues = () => {
    const errors = [];
    
    // Only validate fields that have values
    if (bulkValues.assessment1 !== '') {
      const val = parseFloat(bulkValues.assessment1);
      if (isNaN(val) || val < 0 || val > 15) {
        errors.push('Assessment 1 must be between 0 and 15');
      }
    }
    
    if (bulkValues.assessment2 !== '') {
      const val = parseFloat(bulkValues.assessment2);
      if (isNaN(val) || val < 0 || val > 15) {
        errors.push('Assessment 2 must be between 0 and 15');
      }
    }
    
    if (bulkValues.ca_test !== '') {
      const val = parseFloat(bulkValues.ca_test);
      if (isNaN(val) || val < 0 || val > 10) {
        errors.push('CA Test must be between 0 and 10');
      }
    }
    
    if (bulkValues.exam_score !== '') {
      const val = parseFloat(bulkValues.exam_score);
      if (isNaN(val) || val < 0 || val > 60) {
        errors.push('Exam Score must be between 0 and 60');
      }
    }
    
    setValidationErrors(errors);
    return errors.length === 0;
  };

  // Handle value changes
  const handleValueChange = (field, value) => {
    setBulkValues(prev => ({ ...prev, [field]: value }));
    validateBulkValues();
  };

  // Apply bulk changes
  const handleApply = async () => {
    if (!validateBulkValues()) {
      return;
    }

    // Check if at least one field has a value
    const hasValues = Object.values(bulkValues).some(val => 
      val !== '' && val !== undefined && val !== null
    );

    if (!hasValues) {
      setValidationErrors(['Please enter at least one value to update']);
      return;
    }

    try {
      setSaving(true);
      
      // Prepare update data based on operation
      let updateData = {};
      
      if (bulkValues.operation === 'set') {
        // Direct assignment
        ['assessment1', 'assessment2', 'ca_test', 'exam_score', 'remark', 'teacher_comment'].forEach(field => {
          if (bulkValues[field] !== '') {
            updateData[field] = field.includes('assessment') || field.includes('exam_score') || field.includes('ca_test') 
              ? parseFloat(bulkValues[field]) 
              : bulkValues[field];
          }
        });
      } else {
        // For add/subtract operations, we'll handle this on the backend
        updateData = {
          ...bulkValues,
          operation: bulkValues.operation
        };
      }

      await onUpdate(updateData);
      
    } catch (error) {
      setValidationErrors([error.message]);
    } finally {
      setSaving(false);
    }
  };

  // Quick templates
  const templates = [
    {
      name: 'Full Scores',
      values: { assessment1: 15, assessment2: 15, ca_test: 10, exam_score: 60 }
    },
    {
      name: 'Good Performance',
      values: { assessment1: 12, assessment2: 12, ca_test: 8, exam_score: 48 }
    },
    {
      name: 'Average Performance',
      values: { assessment1: 10, assessment2: 10, ca_test: 6, exam_score: 40 }
    },
    {
      name: 'Minimum Pass',
      values: { assessment1: 8, assessment2: 8, ca_test: 5, exam_score: 30 }
    }
  ];

  const applyTemplate = (template) => {
    setBulkValues(prev => ({ ...prev, ...template.values, operation: 'set' }));
    validateBulkValues();
  };

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-blue-800 flex items-center">
            <FaUsers className="mr-2" />
            Bulk Edit - {selectedCount} Students Selected
          </h3>
          <p className="text-sm text-blue-600">
            Apply changes to all selected students at once
          </p>
        </div>
        <button
          onClick={onCancel}
          className="text-blue-600 hover:text-blue-800"
        >
          <FaTimes className="text-xl" />
        </button>
      </div>

      {/* Operation Type */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Operation Type</label>
        <div className="flex space-x-4">
          <label className="flex items-center">
            <input
              type="radio"
              value="set"
              checked={bulkValues.operation === 'set'}
              onChange={(e) => handleValueChange('operation', e.target.value)}
              className="mr-2"
            />
            Set Values
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              value="add"
              checked={bulkValues.operation === 'add'}
              onChange={(e) => handleValueChange('operation', e.target.value)}
              className="mr-2"
            />
            Add to Existing
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              value="subtract"
              checked={bulkValues.operation === 'subtract'}
              onChange={(e) => handleValueChange('operation', e.target.value)}
              className="mr-2"
            />
            Subtract from Existing
          </label>
        </div>
      </div>

      {/* Quick Templates */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-700">Quick Templates</label>
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            {showAdvanced ? 'Simple View' : 'Advanced View'}
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {templates.map((template) => (
            <button
              key={template.name}
              onClick={() => applyTemplate(template)}
              className="px-3 py-1 bg-white border border-gray-300 rounded-full text-sm hover:bg-gray-50"
            >
              {template.name}
            </button>
          ))}
        </div>
      </div>

      {/* Score Inputs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { field: 'assessment1', label: 'Assessment 1', max: 15 },
          { field: 'assessment2', label: 'Assessment 2', max: 15 },
          { field: 'ca_test', label: 'CA Test', max: 10 },
          { field: 'exam_score', label: 'Exam Score', max: 60 }
        ].map(({ field, label, max }) => (
          <div key={field}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {label} (0-{max})
            </label>
            <div className="flex items-center">
              {showAdvanced && bulkValues.operation !== 'set' && (
                <button
                  onClick={() => {
                    const current = parseFloat(bulkValues[field]) || 0;
                    handleValueChange(field, Math.max(0, current - 1).toString());
                  }}
                  className="p-1 bg-gray-200 rounded-l hover:bg-gray-300"
                >
                  <FaMinus className="text-xs" />
                </button>
              )}
              <input
                type="number"
                min="0"
                max={max}
                step="0.5"
                value={bulkValues[field]}
                onChange={(e) => handleValueChange(field, e.target.value)}
                placeholder={bulkValues.operation === 'set' ? 'Enter value' : '+/- value'}
                className={`w-full px-3 py-2 border rounded ${
                  showAdvanced && bulkValues.operation !== 'set' ? 'rounded-none' : ''
                } ${
                  validationErrors.some(error => error.toLowerCase().includes(field.toLowerCase()))
                    ? 'border-red-500' 
                    : 'border-gray-300'
                }`}
              />
              {showAdvanced && bulkValues.operation !== 'set' && (
                <button
                  onClick={() => {
                    const current = parseFloat(bulkValues[field]) || 0;
                    handleValueChange(field, Math.min(max, current + 1).toString());
                  }}
                  className="p-1 bg-gray-200 rounded-r hover:bg-gray-300"
                >
                  <FaPlus className="text-xs" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Comments */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Remark</label>
          <textarea
            value={bulkValues.remark}
            onChange={(e) => handleValueChange('remark', e.target.value)}
            placeholder="Add remark for all selected students..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            rows="2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Teacher Comments</label>
          <textarea
            value={bulkValues.teacher_comment}
            onChange={(e) => handleValueChange('teacher_comment', e.target.value)}
            placeholder="Add teacher comments for all selected students..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            rows="2"
          />
        </div>
      </div>

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {validationErrors.map((error, idx) => (
            <div key={idx}>• {error}</div>
          ))}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-end space-x-3">
        <button
          onClick={onCancel}
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
        >
          Cancel
        </button>
        <button
          onClick={handleApply}
          disabled={saving || selectedCount === 0}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 flex items-center"
        >
          {saving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Applying...
            </>
          ) : (
            <>
              <FaSave className="mr-2" />
              Apply to {selectedCount} Students
            </>
          )}
        </button>
      </div>

      {/* Help Text */}
      <div className="mt-4 text-xs text-gray-600">
        <div className="mb-1">
          <strong>Set Values:</strong> Replace existing scores with new values
        </div>
        <div className="mb-1">
          <strong>Add to Existing:</strong> Add the specified value to current scores
        </div>
        <div>
          <strong>Subtract from Existing:</strong> Subtract the specified value from current scores
        </div>
      </div>
    </div>
  );
};

export default BulkResultEditor;
