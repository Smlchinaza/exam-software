// services/studentResultsApi.js
// API service for Student Results Management

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

class StudentResultsApi {
  // Get teacher's student results
  async getTeacherResults(filters = {}) {
    const params = new URLSearchParams();
    
    if (filters.subject_name) params.append('subject_name', filters.subject_name);
    if (filters.class) params.append('class', filters.class);
    if (filters.session) params.append('session', filters.session);
    if (filters.term) params.append('term', filters.term);
    if (filters.student_search) params.append('student_search', filters.student_search);
    if (filters.limit) params.append('limit', filters.limit);
    if (filters.offset) params.append('offset', filters.offset);

    const response = await fetch(`${API_BASE_URL}/student-results/teacher?${params}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch teacher results: ${response.statusText}`);
    }

    return response.json();
  }

  // Get specific student result
  async getStudentResult(resultId) {
    const response = await fetch(`${API_BASE_URL}/student-results/${resultId}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch student result: ${response.statusText}`);
    }

    return response.json();
  }

  // Create new student result
  async createStudentResult(resultData) {
    const response = await fetch(`${API_BASE_URL}/student-results`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(resultData),
    });

    if (!response.ok) {
      throw new Error(`Failed to create student result: ${response.statusText}`);
    }

    return response.json();
  }

  // Update student result
  async updateStudentResult(resultId, updateData) {
    const response = await fetch(`${API_BASE_URL}/student-results/${resultId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updateData),
    });

    if (!response.ok) {
      throw new Error(`Failed to update student result: ${response.statusText}`);
    }

    return response.json();
  }

  // Bulk update student results
  async bulkUpdateStudentResults(updates) {
    const response = await fetch(`${API_BASE_URL}/student-results/bulk-update`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ updates }),
    });

    if (!response.ok) {
      throw new Error(`Failed to bulk update student results: ${response.statusText}`);
    }

    return response.json();
  }

  // Get class statistics
  async getClassStatistics(subject, className, session, term) {
    const response = await fetch(
      `${API_BASE_URL}/student-results/statistics/${encodeURIComponent(subject)}/${encodeURIComponent(className)}/${encodeURIComponent(session)}/${encodeURIComponent(term)}`,
      {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch class statistics: ${response.statusText}`);
    }

    return response.json();
  }

  // Get teacher's subjects and classes
  async getTeacherSubjects() {
    const response = await fetch(`${API_BASE_URL}/student-results/teacher-subjects`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch teacher subjects: ${response.statusText}`);
    }

    return response.json();
  }

  // Get result history
  async getResultHistory(resultId) {
    const response = await fetch(`${API_BASE_URL}/student-results/history/${resultId}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch result history: ${response.statusText}`);
    }

    return response.json();
  }

  // Recalculate class statistics
  async recalculateStatistics(subject, className, session, term) {
    const response = await fetch(
      `${API_BASE_URL}/student-results/recalculate-statistics/${encodeURIComponent(subject)}/${encodeURIComponent(className)}/${encodeURIComponent(session)}/${encodeURIComponent(term)}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to recalculate statistics: ${response.statusText}`);
    }

    return response.json();
  }

  // Helper method to validate scores
  validateScores(scores) {
    const errors = [];
    
    if (scores.assessment1 !== undefined && (scores.assessment1 < 0 || scores.assessment1 > 15)) {
      errors.push('Assessment 1 must be between 0 and 15');
    }
    
    if (scores.assessment2 !== undefined && (scores.assessment2 < 0 || scores.assessment2 > 15)) {
      errors.push('Assessment 2 must be between 0 and 15');
    }
    
    if (scores.ca_test !== undefined && (scores.ca_test < 0 || scores.ca_test > 10)) {
      errors.push('CA Test must be between 0 and 10');
    }
    
    if (scores.exam_score !== undefined && (scores.exam_score < 0 || scores.exam_score > 60)) {
      errors.push('Exam Score must be between 0 and 60');
    }
    
    return errors;
  }

  // Helper method to calculate grade from total score
  calculateGrade(totalScore) {
    if (totalScore >= 75) return 'A1';
    if (totalScore >= 70) return 'B2';
    if (totalScore >= 65) return 'B3';
    if (totalScore >= 60) return 'C4';
    if (totalScore >= 55) return 'C5';
    if (totalScore >= 50) return 'C6';
    if (totalScore >= 45) return 'D7';
    if (totalScore >= 40) return 'E8';
    return 'F9';
  }

  // Helper method to get grade color
  getGradeColor(grade) {
    const colors = {
      'A1': 'bg-[#004400] text-white',
      'B2': 'bg-green-600 text-white',
      'B3': 'bg-green-600 text-white',
      'C4': 'bg-green-500 text-white',
      'C5': 'bg-green-500 text-white',
      'C6': 'bg-green-500 text-white',
      'D7': 'bg-amber-600 text-white',
      'E8': 'bg-orange-500 text-white',
      'F9': 'bg-red-700 text-white',
    };
    return colors[grade] || 'bg-gray-500 text-white';
  }

  // Helper method to get score color
  getScoreColor(score) {
    if (score >= 70) return 'text-[#006600] font-semibold';
    if (score >= 50) return 'text-[#b07800] font-semibold';
    return 'text-[#b30000] font-semibold';
  }
}

export default new StudentResultsApi();
