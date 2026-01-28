// routes/exams-postgres.js
// Multi-tenant exam routes using PostgreSQL

const express = require('express');
const router = express.Router();
const pool = require('../db/postgres');
const { authenticateJWT } = require('../middleware/auth');
const { enforceMultiTenant } = require('../middleware/tenantScoping');

/**
 * GET /api/exams
 * List all exams for the authenticated user's school
 * Only published exams visible to students
 */
router.get('/', authenticateJWT, enforceMultiTenant, async (req, res) => {
  try {
    const { schoolId } = req.tenant;
    const { published } = req.query;

    let query = `
      SELECT 
        id, mongo_id, title, description, duration_minutes, 
        is_published, created_by, created_at, updated_at
      FROM exams
      WHERE school_id = $1
    `;
    const params = [schoolId];

    // Optional: filter by published status
    if (published === 'true') {
      query += ` AND is_published = true`;
    }

    query += ` ORDER BY created_at DESC`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching exams:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/exams/:examId
 * Get a specific exam with its questions
 */
router.get('/:examId', authenticateJWT, enforceMultiTenant, async (req, res) => {
  try {
    const { examId } = req.params;
    const { schoolId } = req.tenant;

    // Get exam
    const examRes = await pool.query(
      `SELECT * FROM exams WHERE id = $1 AND school_id = $2`,
      [examId, schoolId]
    );

    if (examRes.rows.length === 0) {
      return res.status(404).json({ error: 'Exam not found' });
    }

    const exam = examRes.rows[0];

    // Get questions for this exam
    const questionsRes = await pool.query(
      `SELECT id, type, text, points, metadata, created_at
       FROM questions
       WHERE exam_id = $1 AND school_id = $2
       ORDER BY created_at ASC`,
      [examId, schoolId]
    );

    // Get options for each question
    const questionsWithOptions = await Promise.all(
      questionsRes.rows.map(async (q) => {
        const optsRes = await pool.query(
          `SELECT id, text, is_correct, ordinal
           FROM question_options
           WHERE question_id = $1 AND school_id = $2
           ORDER BY ordinal ASC`,
          [q.id, schoolId]
        );
        return {
          ...q,
          options: optsRes.rows
        };
      })
    );

    res.json({ ...exam, questions: questionsWithOptions });
  } catch (err) {
    console.error('Error fetching exam:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/exams
 * Create a new exam (Teachers/Admins only)
 */
router.post('/', authenticateJWT, enforceMultiTenant, async (req, res) => {
  try {
    const { schoolId, userId, role } = req.tenant;
    
    // Only teachers and admins can create exams
    if (!['teacher', 'admin'].includes(role)) {
      return res.status(403).json({ error: 'Only teachers can create exams' });
    }

    const { title, description, duration_minutes, questions = [] } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Insert exam
      const examRes = await client.query(
        `INSERT INTO exams (school_id, created_by, title, description, duration_minutes, is_published, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
         RETURNING *`,
        [schoolId, userId, title, description, duration_minutes || 60, false]
      );

      const exam = examRes.rows[0];
      const examId = exam.id;

      // Insert questions if provided
      for (const q of questions) {
        const qRes = await client.query(
          `INSERT INTO questions (exam_id, school_id, created_by, type, text, points, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
           RETURNING id`,
          [examId, schoolId, userId, q.type || 'mcq', q.text, q.points || 1]
        );

        const questionId = qRes.rows[0].id;

        // Insert question options
        if (Array.isArray(q.options)) {
          for (let i = 0; i < q.options.length; i++) {
            await client.query(
              `INSERT INTO question_options (question_id, school_id, text, is_correct, ordinal, created_at)
               VALUES ($1, $2, $3, $4, $5, NOW())`,
              [questionId, schoolId, q.options[i].text, q.options[i].is_correct || false, i]
            );
          }
        }
      }

      await client.query('COMMIT');
      res.status(201).json({ id: examId, ...exam });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Error creating exam:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /api/exams/:examId
 * Update an exam (Teachers/Admins only, must be owner or admin)
 */
router.put('/:examId', authenticateJWT, enforceMultiTenant, async (req, res) => {
  try {
    const { examId } = req.params;
    const { schoolId, userId, role } = req.tenant;
    const { title, description, duration_minutes, is_published } = req.body;

    // Check if exam exists and belongs to this school
    const examRes = await pool.query(
      `SELECT * FROM exams WHERE id = $1 AND school_id = $2`,
      [examId, schoolId]
    );

    if (examRes.rows.length === 0) {
      return res.status(404).json({ error: 'Exam not found' });
    }

    const exam = examRes.rows[0];

    // Only owner or admin can edit
    if (exam.created_by !== userId && role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to edit this exam' });
    }

    // Update exam
    const result = await pool.query(
      `UPDATE exams
       SET title = COALESCE($1, title),
           description = COALESCE($2, description),
           duration_minutes = COALESCE($3, duration_minutes),
           is_published = COALESCE($4, is_published),
           updated_at = NOW()
       WHERE id = $5 AND school_id = $6
       RETURNING *`,
      [title || null, description || null, duration_minutes || null, is_published || null, examId, schoolId]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating exam:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/exams/:examId
 * Delete an exam (Teachers/Admins only)
 */
router.delete('/:examId', authenticateJWT, enforceMultiTenant, async (req, res) => {
  try {
    const { examId } = req.params;
    const { schoolId, userId, role } = req.tenant;

    const examRes = await pool.query(
      `SELECT * FROM exams WHERE id = $1 AND school_id = $2`,
      [examId, schoolId]
    );

    if (examRes.rows.length === 0) {
      return res.status(404).json({ error: 'Exam not found' });
    }

    const exam = examRes.rows[0];

    // Only owner or admin can delete
    if (exam.created_by !== userId && role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to delete this exam' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Delete answers
      await client.query(
        `DELETE FROM exam_answers
         WHERE submission_id IN (
           SELECT id FROM exam_submissions WHERE exam_id = $1 AND school_id = $2
         )`,
        [examId, schoolId]
      );

      // Delete submissions
      await client.query(
        `DELETE FROM exam_submissions WHERE exam_id = $1 AND school_id = $2`,
        [examId, schoolId]
      );

      // Delete question options
      await client.query(
        `DELETE FROM question_options
         WHERE question_id IN (
           SELECT id FROM questions WHERE exam_id = $1 AND school_id = $2
         )`,
        [examId, schoolId]
      );

      // Delete questions
      await client.query(
        `DELETE FROM questions WHERE exam_id = $1 AND school_id = $2`,
        [examId, schoolId]
      );

      // Delete exam
      await client.query(
        `DELETE FROM exams WHERE id = $1 AND school_id = $2`,
        [examId, schoolId]
      );

      await client.query('COMMIT');
      res.json({ message: 'Exam deleted successfully' });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Error deleting exam:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
