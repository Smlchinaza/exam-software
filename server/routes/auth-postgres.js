// routes/auth-postgres.js
// Multi-tenant authentication using PostgreSQL
// Issues JWTs with school_id included

const express = require('express');
const router = express.Router();
const pool = require('../db/postgres');
const bcryptjs = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { authenticateJWT } = require('../middleware/auth');
const { getAvailableSchools } = require('../middleware/schoolValidation');
const { generateSchoolJWTPayload } = require('../middleware/subdomainAuth');
const { getRoleBasedRedirectUrl } = require('../utils/subdomain');

/**
 * POST /api/auth/register/teacher
 * Enhanced multi-tenant teacher registration with subdomain routing
 */
router.post('/register/teacher', 
  require('./../middleware/schoolValidation').validateSchoolSelection,
  require('./../middleware/schoolValidation').validateTeacherRegistration,
  async (req, res) => {
  const client = await pool.connect();
  
  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      password,
      schoolId,
      subjects = [],
      department,
      employmentType,
      experience,
      rememberMe
    } = req.body;

    const school = req.school; // Set by validation middleware

    // Start transaction
    await client.query('BEGIN');

    // 1. Check if email already exists globally
    const emailRes = await client.query(
      `SELECT id, school_id FROM users WHERE email = $1`,
      [email]
    );

    if (emailRes.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ 
        error: 'Email already registered',
        details: 'An account with this email already exists in the system'
      });
    }

    // 2. Hash password
    const password_hash = await bcryptjs.hash(password, 10);

    // 3. Generate subdomain from school domain
    const subdomain = school.domain ? school.domain.split('.')[0] : null;

    // 4. Create teacher user with enhanced profile
    const userRes = await client.query(
      `INSERT INTO users (
        school_id, email, password_hash, first_name, last_name, 
        role, is_active, approved, subdomain, profile, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, true, false, $7, $8, NOW(), NOW())
       RETURNING id, email, first_name, last_name, role, school_id, subdomain, approved, created_at`,
      [
        schoolId, 
        email, 
        password_hash, 
        firstName, 
        lastName, 
        'teacher',
        subdomain,
        JSON.stringify({
          phone,
          subjects,
          department,
          employmentType,
          experience,
          registeredAt: new Date().toISOString(),
          registrationSource: 'teacher_portal'
        })
      ]
    );

    const user = userRes.rows[0];

    // 5. Create school approval notification
    await client.query(
      `INSERT INTO notifications (
        school_id, user_id, type, title, message, data, is_read, created_at
      ) VALUES ($1, $2, 'teacher_registration', 'New Teacher Registration', 
        $3, $4, false, NOW())`,
      [
        schoolId,
        user.id,
        `${firstName} ${lastName} has registered as a teacher`,
        JSON.stringify({
          userId: user.id,
          userEmail: email,
          subjects,
          department,
          experience,
          registeredAt: new Date().toISOString()
        })
      ]
    );

    // 6. Create JWT token (for email verification, not login)
    const payload = {
      id: user.id,
      email: user.email,
      role: user.role,
      school_id: user.school_id,
      registration_pending: true
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });

    // 7. Generate subdomain redirect URL
    const redirectUrl = school.domain ? 
      `https://${school.domain}/dashboard?registration=pending` : 
      null;

    // Commit transaction
    await client.query('COMMIT');

    // Send registration success response
    res.status(201).json({
      success: true,
      message: 'Teacher registration successful',
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role,
        school_id: user.school_id,
        subdomain: user.subdomain,
        approved: user.approved,
        created_at: user.created_at
      },
      school: {
        id: school.id,
        name: school.name,
        domain: school.domain,
        subdomain: subdomain
      },
      redirectTo: redirectUrl,
      registrationStatus: {
        approved: false,
        requiresApproval: true,
        nextSteps: [
          'Wait for school administrator approval',
          'Check your email for updates',
          `Once approved, visit: ${redirectUrl}`
        ]
      },
      token,
      expiresIn: '7d'
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Teacher registration error:', err);
    res.status(500).json({ 
      error: 'Registration failed',
      details: err.message 
    });
  } finally {
    client.release();
  }
});

/**
 * GET /api/auth/schools/available
 * Get available schools for teacher registration
 */
router.get('/schools/available', getAvailableSchools);

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
 * OPTIONS /api/auth/login
 * Handle CORS preflight requests
 */
router.options('/login', (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Max-Age', '86400'); // 24 hours
  res.sendStatus(200);
});

/**
 * POST /api/auth/login
 * Enhanced login with subdomain routing and school context
 */
router.post('/login', async (req, res) => {
  try {
    console.log('Enhanced login endpoint hit');
    const { email, password, rememberMe = false } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        error: 'Email and password required',
        details: 'Both email and password must be provided'
      });
    }

    // Get user with school context
    const result = await pool.query(
      `SELECT 
        u.id, u.email, u.password_hash, u.first_name, u.last_name, 
        u.role, u.school_id, u.is_active, u.approved, u.subdomain,
        s.name as school_name, s.domain as school_domain, s.status as school_status
       FROM users u
       LEFT JOIN schools s ON u.school_id = s.id
       WHERE u.email = $1`,
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ 
        error: 'Invalid credentials',
        details: 'The email or password you entered is incorrect'
      });
    }

    const user = result.rows[0];

    // Check if user is active
    if (!user.is_active) {
      return res.status(403).json({ 
        error: 'Account disabled',
        details: 'Your account has been disabled. Please contact your school administrator.'
      });
    }

    // Check if teacher is approved
    if (user.role === 'teacher' && !user.approved) {
      return res.status(403).json({ 
        error: 'Account not approved',
        details: 'Your teacher registration is pending approval from your school administrator.'
      });
    }

    // Verify password
    const passwordMatch = await bcryptjs.compare(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ 
        error: 'Invalid credentials',
        details: 'The email or password you entered is incorrect'
      });
    }

    // Check if user is a super admin
    let isSuperAdmin = user.role === 'super_admin';
    if (!isSuperAdmin) {
      const superAdminCheck = await pool.query(
        `SELECT id FROM super_admins WHERE user_id = $1 AND is_active = true`,
        [user.id]
      );
      isSuperAdmin = superAdminCheck.rows.length > 0;
    }

    // Create enhanced JWT payload with school context
    const payload = generateSchoolJWTPayload(user, {
      id: user.school_id,
      name: user.school_name,
      domain: user.school_domain,
      subdomain: user.subdomain
    });

    // Set token expiration based on remember me
    const expiresIn = rememberMe ? '7d' : '24h';
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn });

    // Generate redirect URL for non-super admins
    let redirectTo = null;
    let schoolInfo = null;

    if (!isSuperAdmin && user.school_domain) {
      // Get subdomain from school domain
      const subdomain = user.school_domain.split('.')[0];
      
      // Generate role-based redirect URL
      redirectTo = getRoleBasedRedirectUrl(user, subdomain, req.headers['user-agent']);
      
      schoolInfo = {
        id: user.school_id,
        name: user.school_name,
        domain: user.school_domain,
        subdomain: subdomain,
        status: user.school_status
      };
    }

    // Prepare response data
    const responseData = {
      success: true,
      token,
      expiresIn,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        first_name: user.first_name,
        last_name: user.last_name,
        school_id: user.school_id,
        subdomain: user.subdomain,
        approved: user.approved,
        isSuperAdmin
      }
    };

    // Add school and redirect info for non-super admins
    if (schoolInfo) {
      responseData.school = schoolInfo;
      responseData.redirectTo = redirectTo;
    }

    // Add login metadata
    responseData.loginInfo = {
      timestamp: new Date().toISOString(),
      rememberMe,
      requiresRedirect: !!redirectTo
    };

    console.log('Enhanced login successful:', {
      userId: user.id,
      role: user.role,
      hasSchool: !!user.school_id,
      redirectTo: redirectTo ? 'set' : 'none'
    });
    
    res.json(responseData);

  } catch (err) {
    console.error('Enhanced login error:', err);
    res.status(500).json({ 
      error: 'Login failed',
      details: 'An unexpected error occurred during login. Please try again.'
    });
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

/**
 * POST /api/auth/promote-super-admin
 * Promote a user to super admin (for initial setup - should be protected)
 */
router.post('/promote-super-admin', async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { email, permissions = '{}' } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    await client.query('BEGIN');

    // 1. Find the user
    const userRes = await client.query(
      `SELECT id, email, first_name, last_name, role, is_active
       FROM users
       WHERE email = $1`,
      [email]
    );

    if (userRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userRes.rows[0];

    if (!user.is_active) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'User account is disabled' });
    }

    // 2. Check if already a super admin
    const existingSuperAdminRes = await client.query(
      `SELECT id FROM super_admins WHERE user_id = $1`,
      [user.id]
    );

    if (existingSuperAdminRes.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'User is already a super admin' });
    }

    // 3. Add to super_admins table
    await client.query(
      `INSERT INTO super_admins (user_id, permissions, is_active, created_at, updated_at)
       VALUES ($1, $2, true, NOW(), NOW())`,
      [user.id, permissions]
    );

    // 4. Optionally update user role to super_admin
    await client.query(
      `UPDATE users SET role = 'super_admin', updated_at = NOW() WHERE id = $1`,
      [user.id]
    );

    await client.query('COMMIT');

    console.log('User promoted to super admin:', {
      userId: user.id,
      email: user.email,
      promotedAt: new Date().toISOString()
    });

    res.json({
      message: 'User successfully promoted to super admin',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: 'super_admin'
      }
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Promote super admin error:', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

module.exports = router;
