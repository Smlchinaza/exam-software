// routes/submissions-postgres.js
// Multi-tenant exam submission routes using PostgreSQL

const express = require('express');
const router = express.Router();
const pool = require('../db/postgres');
const { authenticateJWT } = require('../middleware/auth');
const { enforceMultiTenant } = require('../middleware/tenantScoping');

/**
 * GET /api/submissions
 * List submissions for the authenticated user (students see their own, teachers see their class)
 */
router.get('/', authenticateJWT, enforceMultiTenant, async (req, res) => {
  try {
    const { schoolId, userId, role } = req.tenant;

    let query = `
      SELECT 
        s.id, s.exam_id, s.student_id, s.started_at, s.submitted_at, 
        s.total_score, s.created_at,
        e.title as exam_title
      FROM exam_submissions s
      LEFT JOIN exams e ON s.exam_id = e.id
      WHERE s.school_id = $1
    `;
    const params = [schoolId];

    // Students see only their own submissions
    if (role === 'student') {
      query += ` AND s.student_id = $2`;
      params.push(userId);
    }

    query += ` ORDER BY s.created_at DESC`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching submissions:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/submissions/:submissionId
 * Get a specific submission with answers (students see own, teachers see their class)
 */
router.get('/:submissionId', authenticateJWT, enforceMultiTenant, async (req, res) => {
  try {
    const { submissionId } = req.params;
    const { schoolId, userId, role } = req.tenant;

    // Get submission
    const subRes = await pool.query(
      `SELECT * FROM exam_submissions WHERE id = $1 AND school_id = $2`,
      [submissionId, schoolId]
    );

    if (subRes.rows.length === 0) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    const submission = subRes.rows[0];

    // Access control: students see only own, teachers see their students
    if (role === 'student' && submission.student_id !== userId) {
      return res.status(403).json({ error: 'Not authorized to view this submission' });
    }

    // Get answers with question details
    const answersRes = await pool.query(
      `SELECT 
        a.id, a.question_id, a.answer, a.score, a.graded_by, a.graded_at,
        q.text as question_text, q.type, q.points
       FROM exam_answers a
       LEFT JOIN questions q ON a.question_id = q.id
       WHERE a.submission_id = $1 AND a.school_id = $2
       ORDER BY a.created_at ASC`,
      [submissionId, schoolId]
    );

    res.json({
      ...submission,
      answers: answersRes.rows
    });
  } catch (err) {
    console.error('Error fetching submission:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/submissions/:examId/start
 * Start/initialize a new exam submission for a student
 */
router.post('/:examId/start', authenticateJWT, enforceMultiTenant, async (req, res) => {
  try {
    const { examId } = req.params;
    const { schoolId, userId, role } = req.tenant;

    if (role !== 'student') {
      return res.status(403).json({ error: 'Only students can start exams' });
    }

    // Verify exam exists and is published
    const examRes = await pool.query(
      `SELECT * FROM exams WHERE id = $1 AND school_id = $2`,
      [examId, schoolId]
    );

    if (examRes.rows.length === 0) {
      return res.status(404).json({ error: 'Exam not found' });
    }

    // Check if student already submitted this exam
    const existingRes = await pool.query(
      `SELECT id FROM exam_submissions 
       WHERE exam_id = $1 AND student_id = $2 AND school_id = $3`,
      [examId, userId, schoolId]
    );

    if (existingRes.rows.length > 0) {
      return res.status(409).json({ error: 'You have already submitted this exam' });
    }

    // Create submission record
    const result = await pool.query(
      `INSERT INTO exam_submissions (exam_id, school_id, student_id, started_at, created_at, updated_at)
       VALUES ($1, $2, $3, NOW(), NOW(), NOW())
       RETURNING id, started_at`,
      [examId, schoolId, userId]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error starting exam:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/submissions/:submissionId/submit
 * Submit completed exam with answers
 */
router.post('/:submissionId/submit', authenticateJWT, enforceMultiTenant, async (req, res) => {
  try {
    const { submissionId } = req.params;
    const { schoolId, userId } = req.tenant;
    const { answers } = req.body; // [ { question_id, answer } ]

    // Verify submission exists and belongs to user
    const subRes = await pool.query(
      `SELECT * FROM exam_submissions WHERE id = $1 AND school_id = $2 AND student_id = $3`,
      [submissionId, schoolId, userId]
    );

    if (subRes.rows.length === 0) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Update submission to mark as submitted
      const updateRes = await client.query(
        `UPDATE exam_submissions
         SET submitted_at = NOW(), updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [submissionId]
      );

      // Insert/update answers
      if (Array.isArray(answers)) {
        for (const ans of answers) {
          await client.query(
            `INSERT INTO exam_answers (id, submission_id, question_id, school_id, answer, created_at)
             VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW())`,
            [submissionId, ans.question_id, schoolId, JSON.stringify(ans.answer || {})]
          );
        }
      }

      await client.query('COMMIT');
      res.json({ message: 'Exam submitted successfully', submission: updateRes.rows[0] });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Error submitting exam:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/submissions/:submissionId/grade
 * Grade a submission (Teachers/Admins only)
 */
router.post('/:submissionId/grade', authenticateJWT, enforceMultiTenant, async (req, res) => {
  try {
    const { submissionId } = req.params;
    const { schoolId, userId, role } = req.tenant;
    const { answers } = req.body; // [ { answer_id, score } ]

    if (!['teacher', 'admin'].includes(role)) {
      return res.status(403).json({ error: 'Only teachers can grade exams' });
    }

    // Verify submission exists
    const subRes = await pool.query(
      `SELECT * FROM exam_submissions WHERE id = $1 AND school_id = $2`,
      [submissionId, schoolId]
    );

    if (subRes.rows.length === 0) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      let totalScore = 0;

      // Update answer scores
      if (Array.isArray(answers)) {
        for (const ans of answers) {
          await client.query(
            `UPDATE exam_answers
             SET score = $1, graded_by = $2, graded_at = NOW()
             WHERE id = $3 AND submission_id = $4`,
            [ans.score, userId, ans.answer_id, submissionId]
          );
          totalScore += ans.score || 0;
        }
      }

      // Update submission total score
      await client.query(
        `UPDATE exam_submissions
         SET total_score = $1, updated_at = NOW()
         WHERE id = $2`,
        [totalScore, submissionId]
      );

      await client.query('COMMIT');
      res.json({ message: 'Exam graded successfully', total_score: totalScore });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Error grading submission:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
