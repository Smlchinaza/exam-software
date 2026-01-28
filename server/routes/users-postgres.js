// routes/users-postgres.js
// Multi-tenant user management routes using PostgreSQL

const express = require('express');
const router = express.Router();
const pool = require('../db/postgres');
const bcryptjs = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { authenticateJWT } = require('../middleware/auth');
const { enforceMultiTenant } = require('../middleware/tenantScoping');

/**
 * GET /api/users/profile
 * Get current user's profile
 */
router.get('/profile', authenticateJWT, enforceMultiTenant, async (req, res) => {
  try {
    const { schoolId, userId } = req.tenant;

    const result = await pool.query(
      `SELECT id, email, first_name, last_name, role, school_id, profile, is_active, created_at
       FROM users
       WHERE id = $1 AND school_id = $2`,
      [userId, schoolId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching profile:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /api/users/profile
 * Update current user's profile
 */
router.put('/profile', authenticateJWT, enforceMultiTenant, async (req, res) => {
  try {
    const { schoolId, userId } = req.tenant;
    const { first_name, last_name, profile } = req.body;

    const result = await pool.query(
      `UPDATE users
       SET first_name = COALESCE($1, first_name),
           last_name = COALESCE($2, last_name),
           profile = COALESCE($3, profile),
           updated_at = NOW()
       WHERE id = $4 AND school_id = $5
       RETURNING id, email, first_name, last_name, role, school_id`,
      [first_name || null, last_name || null, profile ? JSON.stringify(profile) : null, userId, schoolId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating profile:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/users
 * List users in the school (Admin/Teachers only)
 */
router.get('/', authenticateJWT, enforceMultiTenant, async (req, res) => {
  try {
    const { schoolId, role } = req.tenant;
    const { role: filterRole } = req.query;

    // Only admins and teachers can list users
    if (!['admin', 'teacher'].includes(role)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    let query = `
      SELECT id, email, first_name, last_name, role, is_active, created_at
      FROM users
      WHERE school_id = $1
    `;
    const params = [schoolId];

    if (filterRole) {
      query += ` AND role = $2`;
      params.push(filterRole);
    }

    query += ` ORDER BY created_at DESC`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/users
 * Create a new user in the school (Admin only)
 */
router.post('/', authenticateJWT, enforceMultiTenant, async (req, res) => {
  try {
    const { schoolId, role } = req.tenant;
    const { email, password, first_name, last_name, role: userRole } = req.body;

    if (role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can create users' });
    }

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    // Hash password
    const password_hash = await bcryptjs.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO users (id, school_id, email, password_hash, first_name, last_name, role, is_active, created_at, updated_at)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, true, NOW(), NOW())
       RETURNING id, email, first_name, last_name, role`,
      [schoolId, email, password_hash, first_name || null, last_name || null, userRole || 'student']
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') { // unique violation
      return res.status(409).json({ error: 'Email already exists in this school' });
    }
    console.error('Error creating user:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /api/users/:userId
 * Update user (Admin/Owner only)
 */
router.put('/:userId', authenticateJWT, enforceMultiTenant, async (req, res) => {
  try {
    const { userId: targetUserId } = req.params;
    const { schoolId, userId, role } = req.tenant;
    const { first_name, last_name, is_active } = req.body;

    // Only admins or user updating self
    if (role !== 'admin' && userId !== targetUserId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const result = await pool.query(
      `UPDATE users
       SET first_name = COALESCE($1, first_name),
           last_name = COALESCE($2, last_name),
           is_active = COALESCE($3, is_active),
           updated_at = NOW()
       WHERE id = $4 AND school_id = $5
       RETURNING id, email, first_name, last_name, role, is_active`,
      [first_name || null, last_name || null, is_active !== undefined ? is_active : null, targetUserId, schoolId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating user:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/users/:userId
 * Delete user (Admin only)
 */
router.delete('/:userId', authenticateJWT, enforceMultiTenant, async (req, res) => {
  try {
    const { userId: targetUserId } = req.params;
    const { schoolId, role } = req.tenant;

    if (role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can delete users' });
    }

    const result = await pool.query(
      `DELETE FROM users
       WHERE id = $1 AND school_id = $2
       RETURNING id`,
      [targetUserId, schoolId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    console.error('Error deleting user:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
