// routes/auth-postgres.js
// Multi-tenant authentication using PostgreSQL
// Issues JWTs with school_id included

const express = require('express');
const router = express.Router();
const pool = require('../db/postgres');
const bcryptjs = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { authenticateJWT } = require('../middleware/auth');

/**
 * POST /api/auth/register/teacher
 * Multi-tenant teacher registration with school assignment
 */
router.post('/register/teacher', async (req, res) => {
  const client = await pool.connect();
  
  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      password,
      schoolId,
      subjects,
      employmentType,
      experience,
      rememberMe
    } = req.body;

    // Validate required fields
    if (!firstName || !lastName || !email || !password || !schoolId) {
      return res.status(400).json({
        error: 'First name, last name, email, password, and school are required'
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        error: 'Password must be at least 8 characters long'
      });
    }

    // Start transaction
    await client.query('BEGIN');

    // 1. Check if school exists and is active
    const schoolRes = await client.query(
      `SELECT id, name FROM schools WHERE id = $1 AND status = 'active'`,
      [schoolId]
    );

    if (schoolRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Invalid or inactive school selected' });
    }

    // 2. Check if email already exists
    const emailRes = await client.query(
      `SELECT id FROM users WHERE email = $1`,
      [email]
    );

    if (emailRes.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Email already registered' });
    }

    // 3. Hash password
    const password_hash = await bcryptjs.hash(password, 10);

    // 4. Create teacher user
    const userRes = await client.query(
      `INSERT INTO users (
        school_id, email, password_hash, first_name, last_name, 
        role, is_active, profile, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, true, $7, NOW(), NOW())
       RETURNING id, email, first_name, last_name, role, school_id, created_at`,
      [
        schoolId, 
        email, 
        password_hash, 
        firstName, 
        lastName, 
        'teacher',
        JSON.stringify({
          phone,
          subjects,
          employmentType,
          experience,
          registeredAt: new Date().toISOString()
        })
      ]
    );

    const user = userRes.rows[0];

    // 5. Create JWT token
    const payload = {
      id: user.id,
      email: user.email,
      role: user.role,
      school_id: user.school_id
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '24h' });

    // Commit transaction
    await client.query('COMMIT');

    res.status(201).json({
      message: 'Teacher registration successful',
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role,
        school_id: user.school_id,
        created_at: user.created_at
      },
      school: {
        id: schoolRes.rows[0].id,
        name: schoolRes.rows[0].name
      },
      token,
      expiresIn: '24h'
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Teacher registration error:', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

/**
 * POST /api/auth/register
 * Register a new user in a school (uses default school for now)
 */
router.post('/register', async (req, res) => {
  try {
    const { email, password, first_name, last_name, role } = req.body;

    if (!email || !password || !role) {
      return res.status(400).json({ error: 'Email, password, and role required' });
    }

    // Hash password
    const password_hash = await bcryptjs.hash(password, 10);

    // Get default school (for now, single-tenant)
    const schoolRes = await pool.query(
      `SELECT id FROM schools LIMIT 1`
    );

    if (schoolRes.rows.length === 0) {
      return res.status(400).json({ error: 'No school configured' });
    }

    const schoolId = schoolRes.rows[0].id;

    const result = await pool.query(
      `INSERT INTO users (id, mongo_id, school_id, email, password_hash, first_name, last_name, role, is_active, created_at, updated_at)
       VALUES (gen_random_uuid(), null, $1, $2, $3, $4, $5, $6, true, NOW(), NOW())
       RETURNING id, email, first_name, last_name, role, school_id`,
      [schoolId, email, password_hash, first_name || null, last_name || null, role || 'student']
    );

    const user = result.rows[0];

    // Create JWT token (include school_id!)
    const payload = {
      id: user.id,
      email: user.email,
      role: user.role,
      school_id: user.school_id
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '24h' });

    res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        first_name: user.first_name,
        last_name: user.last_name,
        school_id: user.school_id
      }
    });
  } catch (err) {
    if (err.code === '23505') { // unique violation
      return res.status(409).json({ error: 'Email already exists' });
    }
    console.error('Registration error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/auth/check-user
 * Check if user exists by email
 */
router.post('/check-user', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email required' });
    }

    const result = await pool.query(
      `SELECT id, email, role, is_active
       FROM users
       WHERE email = $1`,
      [email]
    );

    const exists = result.rows.length > 0;
    
    res.json({ 
      exists,
      user: exists ? {
        id: result.rows[0].id,
        email: result.rows[0].email,
        role: result.rows[0].role,
        is_active: result.rows[0].is_active
      } : null
    });
  } catch (err) {
    console.error('Check user error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/auth/login
 * Login with email and password
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const result = await pool.query(
      `SELECT id, email, password_hash, first_name, last_name, role, school_id, is_active
       FROM users
       WHERE email = $1`,
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = result.rows[0];

    // Check if user is active
    if (!user.is_active) {
      return res.status(403).json({ error: 'User account is disabled' });
    }

    // Verify password
    const passwordMatch = await bcryptjs.compare(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Create JWT token (include school_id!)
    const payload = {
      id: user.id,
      email: user.email,
      role: user.role,
      school_id: user.school_id
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '24h' });

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        first_name: user.first_name,
        last_name: user.last_name,
        school_id: user.school_id
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/auth/logout
 * Logout (client-side JWT deletion, mainly for audit)
 */
router.post('/logout', authenticateJWT, (req, res) => {
  // Since we're using JWTs, logout is handled client-side by deleting token
  res.json({ message: 'Logged out successfully' });
});

/**
 * GET /api/auth/verify
 * Verify JWT and return user info
 */
router.get('/verify', authenticateJWT, async (req, res) => {
  try {
    const { id, school_id } = req.user;

    // Re-fetch user from DB to get latest info
    const result = await pool.query(
      `SELECT id, email, first_name, last_name, role, school_id, is_active
       FROM users
       WHERE id = $1 AND school_id = $2`,
      [id, school_id]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }

    const user = result.rows[0];

    if (!user.is_active) {
      return res.status(403).json({ error: 'User account is disabled' });
    }

    res.json({
      user,
      token: req.header('Authorization')?.replace('Bearer ', '')
    });
  } catch (err) {
    console.error('Token verify error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
