// routes/student-results.js
// Student Results Management API Routes
// Multi-tenant student results routes using PostgreSQL

const express = require('express');
const router = express.Router();
const StudentResult = require('../models/StudentResult');
const { authenticateJWT } = require('../middleware/auth');
const { enforceMultiTenant } = require('../middleware/tenantScoping');

/**
 * GET /api/student-results/teacher
 * Get student results for the authenticated teacher
 */
router.get('/teacher', authenticateJWT, enforceMultiTenant, async (req, res) => {
  try {
    const { schoolId, userId, role } = req.tenant;
    
    if (role !== 'teacher') {
      return res.status(403).json({ error: 'Access denied. Teacher role required.' });
    }

    const {
      subject_name,
      class: className,
      session,
      term,
      student_search,
      limit = 50,
      offset = 0
    } = req.query;

    const filters = {
      school_id: schoolId,
      teacher_id: userId,
      subject_name,
      class: className,
      session,
      term,
      student_search,
      limit: parseInt(limit),
      offset: parseInt(offset)
    };

    const results = await StudentResult.getByTeacher(filters);
    res.json(results);
  } catch (err) {
    console.error('Error fetching teacher student results:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/student-results/teacher/:teacherId
 * Get student results for a specific teacher (admin only)
 */
router.get('/teacher/:teacherId', authenticateJWT, enforceMultiTenant, async (req, res) => {
  try {
    const { schoolId, role } = req.tenant;
    const { teacherId } = req.params;
    
    if (role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admin role required.' });
    }

    const {
      subject_name,
      class: className,
      session,
      term,
      student_search,
      limit = 50,
      offset = 0
    } = req.query;

    const filters = {
      school_id: schoolId,
      teacher_id: teacherId,
      subject_name,
      class: className,
      session,
      term,
      student_search,
      limit: parseInt(limit),
      offset: parseInt(offset)
    };

    const results = await StudentResult.getByTeacher(filters);
    res.json(results);
  } catch (err) {
    console.error('Error fetching teacher student results:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/student-results/class/:subject/:class/:session/:term
 * Get all student results for a specific class and subject
 */
router.get('/class/:subject/:class/:session/:term', authenticateJWT, enforceMultiTenant, async (req, res) => {
  try {
    const { schoolId, role } = req.tenant;
    const { subject, class: className, session, term } = req.params;
    
    if (!['admin', 'teacher'].includes(role)) {
      return res.status(403).json({ error: 'Access denied. Admin or teacher role required.' });
    }

    const filters = {
      school_id: schoolId,
      subject_name: subject,
      class: className,
      session,
      term,
      limit: 1000 // Get all students for class statistics
    };

    const results = await StudentResult.getByTeacher(filters);
    res.json(results);
  } catch (err) {
    console.error('Error fetching class student results:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/student-results/student/:studentId
 * Get all results for a specific student
 */
router.get('/student/:studentId', authenticateJWT, enforceMultiTenant, async (req, res) => {
  try {
    const { schoolId, userId, role } = req.tenant;
    const { studentId } = req.params;
    
    // Students can only see their own results, teachers/admins can see others
    if (role === 'student' && userId !== studentId) {
      return res.status(403).json({ error: 'Access denied. Students can only view their own results.' });
    }

    const filters = {
      school_id: schoolId,
      student_search: studentId
    };

    const results = await StudentResult.getByTeacher(filters);
    res.json(results);
  } catch (err) {
    console.error('Error fetching student results:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/student-results/:resultId
 * Get a specific student result by ID
 */
router.get('/:resultId', authenticateJWT, enforceMultiTenant, async (req, res) => {
  try {
    const { schoolId, role } = req.tenant;
    const { resultId } = req.params;
    
    const result = await StudentResult.getById(resultId, schoolId);
    
    if (!result) {
      return res.status(404).json({ error: 'Student result not found' });
    }

    // Students can only see their own results
    if (role === 'student' && result.student_id !== req.tenant.userId) {
      return res.status(403).json({ error: 'Access denied. Students can only view their own results.' });
    }

    res.json(result);
  } catch (err) {
    console.error('Error fetching student result:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/student-results
 * Create a new student result (teacher/admin only)
 */
router.post('/', authenticateJWT, enforceMultiTenant, async (req, res) => {
  try {
    const { schoolId, userId, role } = req.tenant;
    
    if (!['admin', 'teacher'].includes(role)) {
      return res.status(403).json({ error: 'Access denied. Admin or teacher role required.' });
    }

    const resultData = {
      ...req.body,
      school_id: schoolId,
      created_by: userId
    };

    const result = await StudentResult.create(resultData);
    res.status(201).json(result);
  } catch (err) {
    console.error('Error creating student result:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /api/student-results/:resultId
 * Update a student result (teacher/admin only)
 */
router.put('/:resultId', authenticateJWT, enforceMultiTenant, async (req, res) => {
  try {
    const { schoolId, userId, role } = req.tenant;
    const { resultId } = req.params;
    
    if (!['admin', 'teacher'].includes(role)) {
      return res.status(403).json({ error: 'Access denied. Admin or teacher role required.' });
    }

    // Check if result exists and user has permission
    const existingResult = await StudentResult.getById(resultId, schoolId);
    if (!existingResult) {
      return res.status(404).json({ error: 'Student result not found' });
    }

    // Teachers can only update their own subject results
    if (role === 'teacher' && existingResult.teacher_id !== userId) {
      return res.status(403).json({ error: 'Access denied. You can only update your own subject results.' });
    }

    const updateData = req.body;
    const updatedResult = await StudentResult.update(resultId, updateData, schoolId, userId);
    
    res.json(updatedResult);
  } catch (err) {
    console.error('Error updating student result:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /api/student-results/bulk-update
 * Bulk update multiple student results (teacher/admin only)
 */
router.put('/bulk-update', authenticateJWT, enforceMultiTenant, async (req, res) => {
  try {
    const { schoolId, userId, role } = req.tenant;
    const { updates } = req.body;
    
    if (!['admin', 'teacher'].includes(role)) {
      return res.status(403).json({ error: 'Access denied. Admin or teacher role required.' });
    }

    if (!Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({ error: 'Updates array is required and cannot be empty' });
    }

    // Verify teacher permissions for each update
    if (role === 'teacher') {
      for (const update of updates) {
        const existingResult = await StudentResult.getById(update.id, schoolId);
        if (!existingResult || existingResult.teacher_id !== userId) {
          return res.status(403).json({ 
            error: 'Access denied. You can only update your own subject results.' 
          });
        }
      }
    }

    const updatedResults = await StudentResult.bulkUpdate(updates, schoolId, userId);
    
    res.json({
      message: 'Bulk update completed successfully',
      updated_count: updatedResults.length,
      results: updatedResults
    });
  } catch (err) {
    console.error('Error bulk updating student results:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/student-results/:resultId
 * Delete a student result (admin only)
 */
router.delete('/:resultId', authenticateJWT, enforceMultiTenant, async (req, res) => {
  try {
    const { schoolId, role } = req.tenant;
    const { resultId } = req.params;
    
    if (role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admin role required.' });
    }

    const deletedResult = await StudentResult.delete(resultId, schoolId);
    
    if (!deletedResult) {
      return res.status(404).json({ error: 'Student result not found' });
    }

    res.json({ message: 'Student result deleted successfully', result: deletedResult });
  } catch (err) {
    console.error('Error deleting student result:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/student-results/statistics/:subject/:class/:session/:term
 * Get class statistics for a specific subject
 */
router.get('/statistics/:subject/:class/:session/:term', authenticateJWT, enforceMultiTenant, async (req, res) => {
  try {
    const { schoolId, role } = req.tenant;
    const { subject, class: className, session, term } = req.params;
    
    if (!['admin', 'teacher'].includes(role)) {
      return res.status(403).json({ error: 'Access denied. Admin or teacher role required.' });
    }

    const statistics = await StudentResult.getClassStatistics(schoolId, subject, className, session, term);
    
    if (!statistics) {
      return res.status(404).json({ error: 'Class statistics not found' });
    }

    res.json(statistics);
  } catch (err) {
    console.error('Error fetching class statistics:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/student-results/teacher-subjects
 * Get teacher's assigned subjects and classes
 */
router.get('/teacher-subjects', authenticateJWT, enforceMultiTenant, async (req, res) => {
  try {
    const { schoolId, userId, role } = req.tenant;
    
    if (role !== 'teacher') {
      return res.status(403).json({ error: 'Access denied. Teacher role required.' });
    }

    const subjects = await StudentResult.getTeacherSubjects(schoolId, userId);
    res.json(subjects);
  } catch (err) {
    console.error('Error fetching teacher subjects:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/student-results/recalculate-statistics/:subject/:class/:session/:term
 * Manually recalculate class statistics (admin/teacher only)
 */
router.post('/recalculate-statistics/:subject/:class/:session/:term', authenticateJWT, enforceMultiTenant, async (req, res) => {
  try {
    const { schoolId, role } = req.tenant;
    const { subject, class: className, session, term } = req.params;
    
    if (!['admin', 'teacher'].includes(role)) {
      return res.status(403).json({ error: 'Access denied. Admin or teacher role required.' });
    }

    await StudentResult.recalculateClassStatistics(schoolId, subject, className, session, term);
    await StudentResult.updateClassPositions(schoolId, subject, className, session, term);
    
    res.json({ message: 'Class statistics and positions recalculated successfully' });
  } catch (err) {
    console.error('Error recalculating statistics:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/student-results/history/:resultId
 * Get audit history for a specific student result
 */
router.get('/history/:resultId', authenticateJWT, enforceMultiTenant, async (req, res) => {
  try {
    const { schoolId, role } = req.tenant;
    const { resultId } = req.params;
    
    if (!['admin', 'teacher'].includes(role)) {
      return res.status(403).json({ error: 'Access denied. Admin or teacher role required.' });
    }

    const history = await StudentResult.getHistory(resultId, schoolId);
    res.json(history);
  } catch (err) {
    console.error('Error fetching result history:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
