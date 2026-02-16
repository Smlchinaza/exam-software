// components/SubjectClassSelector.js
// Component for selecting subject, class, session, and term

import React, { useState, useEffect } from 'react';
import { FaBook, FaGraduationCap, FaCalendarAlt, FaSearch } from 'react-icons/fa';

const SubjectClassSelector = ({ filters, teacherSubjects, onFilterChange }) => {
  const [searchTerm, setSearchTerm] = useState('');
  
  // Extract unique values from teacher subjects
  const uniqueSubjects = [...new Set(teacherSubjects.map(s => s.subject_name))].sort();
  const uniqueClasses = [...new Set(teacherSubjects.map(s => s.class))].sort();
  const uniqueSessions = [...new Set(teacherSubjects.map(s => s.session))].sort();
  const uniqueTerms = ['1st Term', '2nd Term', '3rd Term'];

  // Current session (assuming current year)
  const currentSession = new Date().getFullYear() + '-' + (new Date().getFullYear() + 1);
  const currentTerm = uniqueTerms[0]; // Default to first term

  // Initialize filters with current values if not set
  useEffect(() => {
    if (!filters.session && uniqueSessions.length > 0) {
      onFilterChange({ 
        session: uniqueSessions[uniqueSessions.length - 1] || currentSession,
        term: currentTerm
      });
    }
  }, [filters.session, uniqueSessions, currentSession, currentTerm, onFilterChange]);

  // Filter subjects based on search
  const filteredSubjects = uniqueSubjects.filter(subject =>
    subject.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get available classes for selected subject
  const availableClasses = teacherSubjects
    .filter(s => !filters.subject_name || s.subject_name === filters.subject_name)
    .map(s => s.class)
    .filter((cls, index, arr) => arr.indexOf(cls) === index)
    .sort();

  const handleSubjectChange = (subject) => {
    onFilterChange({ 
      subject_name: subject,
      class: '' // Reset class when subject changes
    });
  };

  const handleClassChange = (className) => {
    onFilterChange({ class: className });
  };

  const handleSessionChange = (session) => {
    onFilterChange({ session });
  };

  const handleTermChange = (term) => {
    onFilterChange({ term });
  };

  const handleStudentSearch = (search) => {
    setSearchTerm(search);
    onFilterChange({ student_search: search });
  };

  const isFormComplete = filters.subject_name && filters.class && filters.session && filters.term;

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Subject Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <FaBook className="inline mr-2" />
            Subject
          </label>
          <div className="relative">
            <input
              type="text"
              placeholder="Search subjects..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2 top-2 text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            )}
          </div>
          <select
            value={filters.subject_name || ''}
            onChange={(e) => handleSubjectChange(e.target.value)}
            className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Select Subject</option>
            {filteredSubjects.map(subject => (
              <option key={subject} value={subject}>
                {subject}
              </option>
            ))}
          </select>
        </div>

        {/* Class Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <FaGraduationCap className="inline mr-2" />
            Class
          </label>
          <select
            value={filters.class || ''}
            onChange={(e) => handleClassChange(e.target.value)}
            disabled={!filters.subject_name}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
          >
            <option value="">Select Class</option>
            {availableClasses.map(className => (
              <option key={className} value={className}>
                {className}
              </option>
            ))}
          </select>
        </div>

        {/* Session Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <FaCalendarAlt className="inline mr-2" />
            Session
          </label>
          <select
            value={filters.session || ''}
            onChange={(e) => handleSessionChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Select Session</option>
            {uniqueSessions.map(session => (
              <option key={session} value={session}>
                {session}
              </option>
            ))}
            <option value={currentSession}>{currentSession}</option>
          </select>
        </div>

        {/* Term Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Term
          </label>
          <select
            value={filters.term || ''}
            onChange={(e) => handleTermChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Select Term</option>
            {uniqueTerms.map(term => (
              <option key={term} value={term}>
                {term}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Student Search */}
      <div className="mt-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <FaSearch className="inline mr-2" />
          Search Students
        </label>
        <input
          type="text"
          placeholder="Search by student name or email..."
          value={filters.student_search || ''}
          onChange={(e) => handleStudentSearch(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {/* Status Indicator */}
      <div className="mt-4">
        <div className={`flex items-center px-3 py-2 rounded-lg ${
          isFormComplete 
            ? 'bg-green-100 text-green-800' 
            : 'bg-yellow-100 text-yellow-800'
        }`}>
          <div className={`w-3 h-3 rounded-full mr-2 ${
            isFormComplete ? 'bg-green-500' : 'bg-yellow-500'
          }`} />
          {isFormComplete 
            ? `Showing results for ${filters.subject_name} - ${filters.class} (${filters.session}, ${filters.term})`
            : 'Please select subject, class, session, and term to view results'
          }
        </div>
      </div>

      {/* Quick Actions */}
      {isFormComplete && (
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={() => {
              // Reset to current session and term
              onFilterChange({
                session: currentSession,
                term: currentTerm
              });
            }}
            className="px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded-full hover:bg-blue-200"
          >
            Current Session
          </button>
          
          <button
            onClick={() => {
              // Clear all filters
              onFilterChange({
                subject_name: '',
                class: '',
                session: currentSession,
                term: currentTerm,
                student_search: ''
              });
              setSearchTerm('');
            }}
            className="px-3 py-1 text-sm bg-gray-100 text-gray-800 rounded-full hover:bg-gray-200"
          >
            Clear Filters
          </button>
        </div>
      )}
    </div>
  );
};

export default SubjectClassSelector;
