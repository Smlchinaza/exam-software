// routes/schools-postgres.js
// School management and registration routes

const express = require('express');
const router = express.Router();
const pool = require('../db/postgres');
const bcryptjs = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { authenticateJWT } = require('../middleware/auth');
const { enforceMultiTenant } = require('../middleware/tenantScoping');
const { PasswordGenerator } = require('../utils/password-generator');
const EmailService = require('../utils/email-service');

/**
 * Generate URL-friendly subdomain slug from school name
 * Example: "Spectra Group of Schools" -> "spectra-group-of-schools"
 */
function generateSubdomainSlug(schoolName) {
  return schoolName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')      // Remove special characters
    .replace(/\s+/g, '-')               // Replace spaces with hyphens
    .replace(/-+/g, '-')                // Replace multiple hyphens with single
    .slice(0, 50);                      // Limit to 50 characters
}

/**
 * POST /api/schools/register
 * Public endpoint - Register a new school and create admin account
 * 
 * Request body:
 * {
 *   "name": "School Name",
 *   "domain": "school.example.com",
 *   "adminEmail": "admin@school.example.com",
 *   "adminFirstName": "John",
 *   "adminLastName": "Doe",
 *   "stateId": "uuid",
 *   "address": "123 School St",
 *   "city": "School City",
 *   "postalCode": "12345",
 *   "phone": "+1234567890",
 *   "type": "primary",
 *   "isPublic": true
 * }
 * 
 * Note: adminPassword is no longer required - a secure password will be generated automatically
 */
router.post('/register', async (req, res) => {
  const client = await pool.connect();
  
  try {
    const {
      name,
      domain,
      adminEmail,
      adminFirstName,
      adminLastName,
      stateId,
      address,
      city,
      postalCode,
      phone,
      type,
      isPublic
    } = req.body;

    // Validate required fields
    if (!name || !adminEmail || !stateId) {
      return res.status(400).json({
        error: 'School name, state, and admin email are required'
      });
    }

    // Generate secure password for admin account
    const generatedPassword = PasswordGenerator.generateSecurePassword(12);
    console.log('Generated secure password for admin:', { email: adminEmail, passwordLength: generatedPassword.length });

    // Start transaction
    await client.query('BEGIN');

    // 1. Check if state exists and is active
    const stateExistsRes = await client.query(
      `SELECT id, name FROM states WHERE id = $1 AND is_active = true`,
      [stateId]
    );

    if (stateExistsRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Invalid or inactive state selected' });
    }

    // 2. Check if school with this name already exists
    const schoolExistsRes = await client.query(
      `SELECT id FROM schools WHERE name = $1`,
      [name]
    );

    if (schoolExistsRes.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'School name already exists' });
    }

    // If domain not provided, auto-generate from school name
    const schoolDomain = domain || `${generateSubdomainSlug(name)}.schoolshubs.com`;

    // 3. Create school
    const schoolRes = await client.query(
      `INSERT INTO schools (name, domain, state_id, address, city, postal_code, phone, type, is_public, status, is_verified, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'active', true, NOW(), NOW())
       RETURNING id, name, domain, state_id, address, city, postal_code, phone, type, is_public, status, is_verified, created_at`,
      [name, schoolDomain, stateId, address || null, city || null, postalCode || null, phone || null, type || 'secondary', isPublic !== undefined ? isPublic : true]
    );

    const school = schoolRes.rows[0];
    const schoolId = school.id;

    // 4. Check if admin email already exists
    const emailExistsRes = await client.query(
      `SELECT id FROM users WHERE email = $1`,
      [adminEmail]
    );

    if (emailExistsRes.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Email already registered' });
    }

    // 5. Hash generated password
    const password_hash = await bcryptjs.hash(generatedPassword, 10);

    // 6. Create admin user for this school with password reset required
    const adminRes = await client.query(
      `INSERT INTO users (
        school_id, email, password_hash, first_name, last_name, 
        role, is_active, password_reset_required, is_first_login, 
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, true, true, true, NOW(), NOW())
       RETURNING id, email, first_name, last_name, role, school_id, created_at`,
      [schoolId, adminEmail, password_hash, adminFirstName || null, adminLastName || null, 'admin']
    );

    const admin = adminRes.rows[0];

    // 7. Create default homepage for the school
    await client.query(
      `INSERT INTO school_homepages (
         school_id, welcome_title, welcome_message, mission_statement, vision_statement,
         total_students, total_teachers, total_classes, established_year,
         contact_email, contact_phone, address, city, state, postal_code,
         primary_color, secondary_color, accent_color,
         show_hero_section, show_features_section, show_news_section, 
         show_gallery_section, show_testimonials_section, show_footer,
         created_by, updated_by
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26)`,
      [
        schoolId,
        `Welcome to ${name}`,
        'We are committed to providing quality education and nurturing our students to reach their full potential.',
        'To create a learning environment that fosters academic excellence, character development, and lifelong learning.',
        'To be a leading educational institution that prepares students for success in a rapidly changing world.',
        0, 0, 0, new Date().getFullYear(),
        null, null, address || null, city || null, null, postalCode || null,
        '#1e40af', '#64748b', '#f59e0b',
        true, true, true, true, true, true,
        admin.id, admin.id
      ]
    );

    // 8. Create JWT token for admin
    const payload = {
      id: admin.id,
      email: admin.email,
      role: admin.role,
      school_id: admin.school_id
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '24h' });

    // Commit transaction
    await client.query('COMMIT');

    // Log password reset for audit
    await client.query(
      `INSERT INTO password_reset_logs (user_id, reset_by, reset_type, reset_reason)
       VALUES ($1, NULL, 'auto', 'Automatic password generation during school registration')`,
      [admin.id]
    );

    // Send welcome email with generated password
    const emailService = new EmailService();
    const emailResult = await emailService.sendWelcomePasswordEmail(
      {
        email: admin.email,
        firstName: admin.first_name,
        lastName: admin.last_name
      },
      {
        name: school.name,
        domain: school.domain
      },
      generatedPassword
    );

    // Return response with generated password
    res.status(201).json({
      message: 'School registered successfully',
      school: {
        id: school.id,
        name: school.name,
        domain: school.domain,
        subdomain: school.domain.split('.')[0], // Extract subdomain from domain
        state_id: school.state_id,
        address: school.address,
        city: school.city,
        postal_code: school.postal_code,
        phone: school.phone,
        type: school.type,
        is_public: school.is_public,
        status: school.status,
        created_at: school.created_at
      },
      admin: {
        id: admin.id,
        email: admin.email,
        first_name: admin.first_name,
        last_name: admin.last_name,
        role: admin.role,
        school_id: admin.school_id,
        created_at: admin.created_at,
        temporaryPassword: generatedPassword, // Include generated password for initial setup
        passwordChangeRequired: true
      },
      token,
      expiresIn: '24h',
      emailSent: emailResult.success,
      emailMessage: emailResult.success 
        ? 'Welcome email with login credentials sent to admin' 
        : 'Email sending failed - please contact admin directly',
      securityNote: 'The admin will be required to change their password on first login'
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

    // Add subdomain to each school
    const schoolsWithSubdomain = result.rows.map(school => ({
      ...school,
      subdomain: school.domain ? school.domain.split('.')[0] : null
    }));

    res.json(schoolsWithSubdomain);
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

    const school = result.rows[0];
    // Add subdomain to school response
    const schoolWithSubdomain = {
      ...school,
      subdomain: school.domain ? school.domain.split('.')[0] : null
    };

    res.json(schoolWithSubdomain);
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

    const school = result.rows[0];
    // Add subdomain to school response
    const schoolWithSubdomain = {
      ...school,
      subdomain: school.domain ? school.domain.split('.')[0] : null
    };

    res.json(schoolWithSubdomain);
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

    const school = result.rows[0];
    // Add subdomain to school response
    const schoolWithSubdomain = {
      ...school,
      subdomain: school.domain ? school.domain.split('.')[0] : null
    };

    res.json(schoolWithSubdomain);
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

/**
 * POST /api/schools/migrate-approved
 * Temporary endpoint to add missing columns to users table
 */
router.post('/migrate-approved', async (req, res) => {
  try {
    console.log('Adding missing columns to users table...');
    
    // Check and add approved column
    const approvedCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
        AND table_schema = 'public' 
        AND column_name = 'approved'
    `);
    
    if (approvedCheck.rows.length === 0) {
      await pool.query(`
        ALTER TABLE users 
        ADD COLUMN approved boolean DEFAULT false
      `);
      
      await pool.query(`
        UPDATE users 
        SET approved = true 
        WHERE role IN ('admin', 'student') AND approved IS NULL
      `);
      
      console.log('Approved column added');
    }
    
    // Check and add subdomain column
    const subdomainCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
        AND table_schema = 'public' 
        AND column_name = 'subdomain'
    `);
    
    if (subdomainCheck.rows.length === 0) {
      await pool.query(`
        ALTER TABLE users 
        ADD COLUMN subdomain text
      `);
      
      // Update existing users with subdomain based on school
      await pool.query(`
        UPDATE users 
        SET subdomain = split_part(s.domain, '.', 1)
        FROM schools s 
        WHERE users.school_id = s.id 
        AND s.domain IS NOT NULL 
        AND users.subdomain IS NULL
      `);
      
      console.log('Subdomain column added');
    }
    
    // Check and create notifications table
    const notificationsTableCheck = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name = 'notifications'
    `);
    
    if (notificationsTableCheck.rows.length === 0) {
      await pool.query(`
        CREATE TABLE notifications (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
          user_id uuid REFERENCES users(id) ON DELETE CASCADE,
          type text NOT NULL,
          title text NOT NULL,
          message text NOT NULL,
          data jsonb,
          is_read boolean DEFAULT false,
          created_at timestamptz NOT NULL DEFAULT now()
        )
      `);
      
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_notifications_school_user ON notifications(school_id, user_id)
      `);
      
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_notifications_school_type ON notifications(school_id, type)
      `);
      
      console.log('Notifications table created');
    }
    
    res.json({ 
      success: true, 
      message: 'Migration completed successfully' 
    });
    
  } catch (error) {
    console.error('Migration error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

/**
 * GET /api/schools/by-state/:stateId
 * Public endpoint - Get schools by state
 */
router.get('/by-state/:stateId', async (req, res) => {
  try {
    const { stateId } = req.params;

    // Verify state exists and is active
    const stateRes = await pool.query(
      `SELECT id, name FROM states WHERE id = $1 AND is_active = true`,
      [stateId]
    );

    if (stateRes.rows.length === 0) {
      return res.status(404).json({ error: 'State not found or inactive' });
    }

    // Get schools in this state
    const schoolsRes = await pool.query(
      `SELECT id, name, domain, city, type, is_public, status, created_at
       FROM schools 
       WHERE state_id = $1 AND status = 'active'
       ORDER BY name ASC`,
      [stateId]
    );

    // Add subdomain to each school
    const schoolsWithSubdomain = schoolsRes.rows.map(school => ({
      ...school,
      subdomain: school.domain ? school.domain.split('.')[0] : null
    }));

    res.json({
      state: stateRes.rows[0],
      schools: schoolsWithSubdomain
    });
  } catch (err) {
    console.error('Error fetching schools by state:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/schools/search
 * Public endpoint - Search schools with optional state filter
 * Query parameters:
 * - q: search query (school name)
 * - stateId: optional state ID to filter by
 */
router.get('/search', async (req, res) => {
  try {
    // Explicitly make this route public - bypass any auth middleware
    const { q, stateId } = req.query;

    if (!q || q.trim().length < 2) {
      return res.status(400).json({ error: 'Search query must be at least 2 characters' });
    }

    let query = `
      SELECT s.id, s.name, s.domain, s.city, s.type, s.is_public, s.status, s.created_at,
             st.id as state_id, st.name as state_name
      FROM schools s
      LEFT JOIN states st ON s.state_id = st.id
      WHERE s.status = 'active' AND s.name ILIKE $1
    `;
    
    const params = [`%${q.trim()}%`];

    if (stateId) {
      query += ` AND s.state_id = $2`;
      params.push(stateId);
    }

    query += ` ORDER BY s.name ASC LIMIT 50`;

    const result = await pool.query(query, params);

    // Add subdomain to each school
    const schoolsWithSubdomain = result.rows.map(school => ({
      ...school,
      subdomain: school.domain ? school.domain.split('.')[0] : null
    }));

    res.json({
      query: q.trim(),
      stateId: stateId || null,
      schools: schoolsWithSubdomain
    });
  } catch (err) {
    console.error('Error searching schools:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/schools/request-registration
 * Public endpoint - Request new school registration with pending approval
 */
router.post('/request-registration', async (req, res) => {
  const client = await pool.connect();
  
  try {
    const {
      schoolName,
      stateId,
      requesterName,
      requesterEmail,
      requesterPhone,
      schoolAddress,
      schoolCity,
      schoolType,
      proposedAdminEmail,
      proposedAdminFirstName,
      proposedAdminLastName,
      supportingDocuments,
      message
    } = req.body;

    // Validate required fields
    if (!schoolName || !stateId || !requesterName || !requesterEmail || !proposedAdminEmail) {
      return res.status(400).json({
        error: 'School name, state, requester name/email, and proposed admin email are required'
      });
    }

    // Start transaction
    await client.query('BEGIN');

    // 1. Check if state exists and is active
    const stateExistsRes = await client.query(
      `SELECT id, name FROM states WHERE id = $1 AND is_active = true`,
      [stateId]
    );

    if (stateExistsRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Invalid or inactive state selected' });
    }

    // 2. Check if school already exists
    const schoolExistsRes = await client.query(
      `SELECT id FROM schools WHERE name = $1`,
      [schoolName]
    );

    if (schoolExistsRes.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'School already exists' });
    }

    // 3. Create school with 'pending' status
    const schoolRes = await client.query(
      `INSERT INTO schools (name, state_id, address, city, type, status, is_verified, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, 'pending', false, NOW(), NOW())
       RETURNING id, name, state_id, status, created_at`,
      [schoolName, stateId, schoolAddress || null, schoolCity || null, schoolType || 'secondary']
    );

    const school = schoolRes.rows[0];

    // 4. Create registration request record
    const requestRes = await client.query(
      `INSERT INTO school_registration_requests (
         school_id, requester_name, requester_email, requester_phone,
         proposed_admin_email, proposed_admin_first_name, proposed_admin_last_name,
         supporting_documents, additional_message, submitted_at, updated_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
       RETURNING id, school_id, status, submitted_at`,
      [
        school.id,
        requesterName,
        requesterEmail,
        requesterPhone || null,
        proposedAdminEmail,
        proposedAdminFirstName || null,
        proposedAdminLastName || null,
        supportingDocuments || '[]',
        message || null
      ]
    );

    const registrationRequest = requestRes.rows[0];

    // 5. Log the request for notification purposes
    console.log('School registration request submitted:', {
      requestId: registrationRequest.id,
      schoolId: school.id,
      schoolName,
      stateId,
      stateName: stateExistsRes.rows[0].name,
      requester: {
        name: requesterName,
        email: requesterEmail,
        phone: requesterPhone
      },
      proposedAdmin: {
        email: proposedAdminEmail,
        firstName: proposedAdminFirstName,
        lastName: proposedAdminLastName
      },
      supportingDocuments,
      message,
      submittedAt: registrationRequest.submitted_at
    });

    // Commit transaction
    await client.query('COMMIT');

    res.status(201).json({
      message: 'School registration request submitted successfully. Awaiting super admin approval.',
      request: {
        id: registrationRequest.id,
        schoolId: school.id,
        schoolName,
        state: stateExistsRes.rows[0].name,
        status: 'pending',
        submittedAt: registrationRequest.submitted_at
      },
      requester: {
        name: requesterName,
        email: requesterEmail
      },
      proposedAdmin: {
        email: proposedAdminEmail,
        firstName: proposedAdminFirstName,
        lastName: proposedAdminLastName
      }
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('School registration request error:', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});
