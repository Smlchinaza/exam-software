// routes/schools-postgres.js
// School management and registration routes

const express = require('express');
const router = express.Router();
const pool = require('../db/postgres');
const bcryptjs = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { authenticateJWT } = require('../middleware/auth');
const { enforceMultiTenant } = require('../middleware/tenantScoping');

/**
 * POST /api/schools/register
 * Public endpoint - Register a new school and create admin account
 * 
 * Request body:
 * {
 *   "name": "School Name",
 *   "domain": "school.example.com",
 *   "adminEmail": "admin@school.example.com",
 *   "adminPassword": "securepassword123",
 *   "adminFirstName": "John",
 *   "adminLastName": "Doe"
 * }
 */
router.post('/register', async (req, res) => {
  const client = await pool.connect();
  
  try {
    const {
      name,
      domain,
      adminEmail,
      adminPassword,
      adminFirstName,
      adminLastName
    } = req.body;

    // Validate required fields
    if (!name || !adminEmail || !adminPassword) {
      return res.status(400).json({
        error: 'School name, admin email, and password are required'
      });
    }

    if (adminPassword.length < 8) {
      return res.status(400).json({
        error: 'Password must be at least 8 characters long'
      });
    }

    // Start transaction
    await client.query('BEGIN');

    // 1. Check if school with this name already exists
    const schoolExistsRes = await client.query(
      `SELECT id FROM schools WHERE name = $1`,
      [name]
    );

    if (schoolExistsRes.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'School name already exists' });
    }

    // 2. Create school
    const schoolRes = await client.query(
      `INSERT INTO schools (name, domain, created_at, updated_at)
       VALUES ($1, $2, NOW(), NOW())
       RETURNING id, name, domain, created_at`,
      [name, domain || null]
    );

    const school = schoolRes.rows[0];
    const schoolId = school.id;

    // 3. Check if admin email already exists
    const emailExistsRes = await client.query(
      `SELECT id FROM users WHERE email = $1`,
      [adminEmail]
    );

    if (emailExistsRes.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Email already registered' });
    }

    // 4. Hash password
    const password_hash = await bcryptjs.hash(adminPassword, 10);

    // 5. Create admin user for this school
    const adminRes = await client.query(
      `INSERT INTO users (
        school_id, email, password_hash, first_name, last_name, 
        role, is_active, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, true, NOW(), NOW())
       RETURNING id, email, first_name, last_name, role, school_id, created_at`,
      [schoolId, adminEmail, password_hash, adminFirstName || null, adminLastName || null, 'admin']
    );

    const admin = adminRes.rows[0];

    // 6. Create JWT token for admin
    const payload = {
      id: admin.id,
      email: admin.email,
      role: admin.role,
      school_id: admin.school_id
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '24h' });

    // Commit transaction
    await client.query('COMMIT');

    // Return response
    res.status(201).json({
      message: 'School registered successfully',
      school: {
        id: school.id,
        name: school.name,
        domain: school.domain,
        created_at: school.created_at
      },
      admin: {
        id: admin.id,
        email: admin.email,
        first_name: admin.first_name,
        last_name: admin.last_name,
        role: admin.role,
        school_id: admin.school_id,
        created_at: admin.created_at
      },
      token,
      expiresIn: '24h'
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('School registration error:', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

/**
 * GET /api/schools
 * List all schools (admin only)
 */
router.get('/', authenticateJWT, async (req, res) => {
  try {
    // Only admins can list schools
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const result = await pool.query(
      `SELECT id, name, domain, created_at, updated_at FROM schools
       ORDER BY created_at DESC`
    );

    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching schools:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/schools/current
 * Get current school details for authenticated user
 */
router.get('/current', authenticateJWT, enforceMultiTenant, async (req, res) => {
  try {
    const { schoolId, role } = req.tenant;

    // Any authenticated user can view their school details
    if (!schoolId) {
      return res.status(400).json({ error: 'No school associated with user' });
    }

    const result = await pool.query(
      `SELECT id, name, domain, created_at, updated_at 
       FROM schools 
       WHERE id = $1`,
      [schoolId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'School not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching current school:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/schools/:schoolId
 * Get school details (authenticated users from that school)
 */
router.get('/:schoolId', authenticateJWT, enforceMultiTenant, async (req, res) => {
  try {
    const { schoolId: requestSchoolId } = req.params;
    const { schoolId: userSchoolId, role } = req.tenant;

    // Users can only view their own school, admins can view any
    if (role !== 'admin' && requestSchoolId !== userSchoolId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const result = await pool.query(
      `SELECT id, name, domain, created_at, updated_at FROM schools WHERE id = $1`,
      [requestSchoolId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'School not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching school:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /api/schools/:schoolId
 * Update school details (admin only)
 */
router.put('/:schoolId', authenticateJWT, enforceMultiTenant, async (req, res) => {
  try {
    const { schoolId: requestSchoolId } = req.params;
    const { schoolId: userSchoolId, role } = req.tenant;
    const { name, domain } = req.body;

    // Only school admins can update their school
    if (requestSchoolId !== userSchoolId || role !== 'admin') {
      return res.status(403).json({ error: 'Only school admins can update' });
    }

    const result = await pool.query(
      `UPDATE schools
       SET name = COALESCE($1, name),
           domain = COALESCE($2, domain),
           updated_at = NOW()
       WHERE id = $3
       RETURNING id, name, domain, created_at, updated_at`,
      [name || null, domain || null, requestSchoolId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'School not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating school:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/schools/:schoolId/stats
 * Get school statistics (admin only)
 */
router.get('/:schoolId/stats', authenticateJWT, enforceMultiTenant, async (req, res) => {
  try {
    const { schoolId: requestSchoolId } = req.params;
    const { schoolId: userSchoolId, role } = req.tenant;

    // Only school admins can view stats
    if (requestSchoolId !== userSchoolId || role !== 'admin') {
      return res.status(403).json({ error: 'Only school admins can view stats' });
    }

    const [
      usersRes,
      examsRes,
      submissionsRes,
      teachersRes,
      studentsRes
    ] = await Promise.all([
      pool.query(`SELECT COUNT(*) as count FROM users WHERE school_id = $1`, [requestSchoolId]),
      pool.query(`SELECT COUNT(*) as count FROM exams WHERE school_id = $1`, [requestSchoolId]),
      pool.query(`SELECT COUNT(*) as count FROM exam_submissions WHERE school_id = $1`, [requestSchoolId]),
      pool.query(`SELECT COUNT(*) as count FROM users WHERE school_id = $1 AND role = 'teacher'`, [requestSchoolId]),
      pool.query(`SELECT COUNT(*) as count FROM users WHERE school_id = $1 AND role = 'student'`, [requestSchoolId])
    ]);

    res.json({
      totalUsers: parseInt(usersRes.rows[0].count),
      totalExams: parseInt(examsRes.rows[0].count),
      totalSubmissions: parseInt(submissionsRes.rows[0].count),
      totalTeachers: parseInt(teachersRes.rows[0].count),
      totalStudents: parseInt(studentsRes.rows[0].count)
    });
  } catch (err) {
    console.error('Error fetching school stats:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
