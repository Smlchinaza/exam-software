// routes/super-admin-postgres.js
// Super Admin API endpoints for registration management and system oversight

const express = require('express');
const router = express.Router();
const pool = require('../db/postgres');
const bcryptjs = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { authenticateJWT } = require('../middleware/auth');

/**
 * Middleware to check if user is a super admin
 */
const requireSuperAdmin = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Check if user has super_admin role
    if (req.user.role !== 'super_admin') {
      // Check if user is in super_admins table
      const superAdminCheck = await pool.query(
        `SELECT sa.id, sa.is_active 
         FROM super_admins sa 
         WHERE sa.user_id = $1 AND sa.is_active = true`,
        [req.user.id]
      );

      if (superAdminCheck.rows.length === 0) {
        return res.status(403).json({ error: 'Super admin access required' });
      }
    }

    next();
  } catch (error) {
    console.error('Super admin check error:', error);
    res.status(500).json({ error: 'Authorization check failed' });
  }
};

/**
 * GET /api/super-admin/registrations/pending
 * Get all pending school registration requests
 */
router.get('/registrations/pending', authenticateJWT, requireSuperAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        srr.id,
        srr.school_id,
        srr.requester_name,
        srr.requester_email,
        srr.requester_phone,
        srr.proposed_admin_email,
        srr.proposed_admin_first_name,
        srr.proposed_admin_last_name,
        srr.supporting_documents,
        srr.additional_message,
        srr.submitted_at,
        s.name as school_name,
        s.address as school_address,
        s.city as school_city,
        s.type as school_type,
        s.phone as school_phone,
        s.email as school_email,
        s.website as school_website,
        s.description as school_description,
        st.name as state_name,
        st.code as state_code
      FROM school_registration_requests srr
      JOIN schools s ON srr.school_id = s.id
      JOIN states st ON s.state_id = st.id
      WHERE srr.status = 'pending'
      ORDER BY srr.submitted_at DESC
    `);

    res.json({
      pendingRequests: result.rows,
      count: result.rows.length
    });
  } catch (err) {
    console.error('Error fetching pending registrations:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/super-admin/registrations/:id
 * Get detailed information about a specific registration request
 */
router.get('/registrations/:id', authenticateJWT, requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      SELECT 
        srr.id,
        srr.school_id,
        srr.requester_name,
        srr.requester_email,
        srr.requester_phone,
        srr.proposed_admin_email,
        srr.proposed_admin_first_name,
        srr.proposed_admin_last_name,
        srr.supporting_documents,
        srr.additional_message,
        srr.status,
        srr.submitted_at,
        srr.reviewed_at,
        srr.reviewed_by,
        srr.approval_notes,
        srr.rejection_reason,
        s.name as school_name,
        s.address as school_address,
        s.city as school_city,
        s.postal_code as school_postal_code,
        s.type as school_type,
        s.is_public as school_is_public,
        s.phone as school_phone,
        s.email as school_email,
        s.website as school_website,
        s.description as school_description,
        s.establishment_year,
        s.student_capacity,
        s.facilities,
        st.name as state_name,
        st.code as state_code,
        reviewer.first_name || ' ' || reviewer.last_name as reviewer_name
      FROM school_registration_requests srr
      JOIN schools s ON srr.school_id = s.id
      JOIN states st ON s.state_id = st.id
      LEFT JOIN users reviewer ON srr.reviewed_by = reviewer.id
      WHERE srr.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Registration request not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching registration details:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/super-admin/registrations/:id/approve
 * Approve a school registration request
 */
router.post('/registrations/:id/approve', authenticateJWT, requireSuperAdmin, async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { id } = req.params;
    const { approvalNotes, adminPassword } = req.body;

    // Validate required fields
    if (!adminPassword) {
      return res.status(400).json({ error: 'Admin password is required for approval' });
    }

    await client.query('BEGIN');

    // 1. Get registration request details
    const requestRes = await client.query(`
      SELECT srr.*, s.name as school_name
      FROM school_registration_requests srr
      JOIN schools s ON srr.school_id = s.id
      WHERE srr.id = $1 AND srr.status = 'pending'
    `, [id]);

    if (requestRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Registration request not found or not pending' });
    }

    const request = requestRes.rows[0];

    // 2. Check if proposed admin email already exists
    const emailExistsRes = await client.query(
      `SELECT id FROM users WHERE email = $1`,
      [request.proposed_admin_email]
    );

    if (emailExistsRes.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Proposed admin email already exists' });
    }

    // 3. Hash the admin password
    const password_hash = await bcryptjs.hash(adminPassword, 10);

    // 4. Update school status to active
    await client.query(
      `UPDATE schools 
       SET status = 'active', is_verified = true, updated_at = NOW()
       WHERE id = $1`,
      [request.school_id]
    );

    // 5. Create admin user account
    const adminRes = await client.query(
      `INSERT INTO users (
         school_id, email, password_hash, first_name, last_name, 
         role, is_active, created_at, updated_at
       ) VALUES ($1, $2, $3, $4, $5, 'admin', true, NOW(), NOW())
       RETURNING id, email, first_name, last_name, role, school_id, created_at`,
      [
        request.school_id,
        request.proposed_admin_email,
        password_hash,
        request.proposed_admin_first_name,
        request.proposed_admin_last_name
      ]
    );

    // 6. Update registration request status
    await client.query(
      `UPDATE school_registration_requests 
       SET status = 'approved', reviewed_at = NOW(), reviewed_by = $1, 
           approval_notes = $2, updated_at = NOW()
       WHERE id = $3`,
      [req.user.id, approvalNotes || null, id]
    );

    // 7. Create audit record
    await client.query(
      `INSERT INTO admin_approval_audit (
         school_id, action, performed_by, reason, previous_status, 
         new_status, additional_data, ip_address, user_agent
       ) VALUES ($1, 'approved', $2, $3, 'pending', 'active', 
                $4, $5, $6)`,
      [
        request.school_id,
        req.user.id,
        approvalNotes || 'School registration approved',
        JSON.stringify({ request_id: id, admin_created_id: adminRes.rows[0].id }),
        req.ip,
        req.get('User-Agent')
      ]
    );

    await client.query('COMMIT');

    // Log the approval
    console.log('School registration approved:', {
      requestId: id,
      schoolId: request.school_id,
      schoolName: request.school_name,
      approvedBy: req.user.email,
      approvedAt: new Date().toISOString(),
      adminEmail: request.proposed_admin_email
    });

    res.json({
      message: 'School registration approved successfully',
      school: {
        id: request.school_id,
        name: request.school_name,
        status: 'active'
      },
      admin: {
        id: adminRes.rows[0].id,
        email: request.proposed_admin_email,
        firstName: request.proposed_admin_first_name,
        lastName: request.proposed_admin_last_name,
        role: 'admin'
      },
      approval: {
        requestId: id,
        approvedBy: req.user.email,
        approvedAt: new Date().toISOString(),
        notes: approvalNotes
      }
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error approving registration:', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

/**
 * POST /api/super-admin/registrations/:id/reject
 * Reject a school registration request
 */
router.post('/registrations/:id/reject', authenticateJWT, requireSuperAdmin, async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { id } = req.params;
    const { rejectionReason } = req.body;

    // Validate required fields
    if (!rejectionReason || rejectionReason.trim().length < 10) {
      return res.status(400).json({ 
        error: 'Rejection reason is required and must be at least 10 characters' 
      });
    }

    await client.query('BEGIN');

    // 1. Get registration request details
    const requestRes = await client.query(`
      SELECT srr.*, s.name as school_name
      FROM school_registration_requests srr
      JOIN schools s ON srr.school_id = s.id
      WHERE srr.id = $1 AND srr.status = 'pending'
    `, [id]);

    if (requestRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Registration request not found or not pending' });
    }

    const request = requestRes.rows[0];

    // 2. Update school status to rejected
    await client.query(
      `UPDATE schools 
       SET status = 'rejected', updated_at = NOW()
       WHERE id = $1`,
      [request.school_id]
    );

    // 3. Update registration request status
    await client.query(
      `UPDATE school_registration_requests 
       SET status = 'rejected', reviewed_at = NOW(), reviewed_by = $1, 
           rejection_reason = $2, updated_at = NOW()
       WHERE id = $3`,
      [req.user.id, rejectionReason, id]
    );

    // 4. Create audit record
    await client.query(
      `INSERT INTO admin_approval_audit (
         school_id, action, performed_by, reason, previous_status, 
         new_status, additional_data, ip_address, user_agent
       ) VALUES ($1, 'rejected', $2, $3, 'pending', 'rejected', 
                $4, $5, $6)`,
      [
        request.school_id,
        req.user.id,
        rejectionReason,
        JSON.stringify({ request_id: id }),
        req.ip,
        req.get('User-Agent')
      ]
    );

    await client.query('COMMIT');

    // Log the rejection
    console.log('School registration rejected:', {
      requestId: id,
      schoolId: request.school_id,
      schoolName: request.school_name,
      rejectedBy: req.user.email,
      rejectionReason,
      rejectedAt: new Date().toISOString()
    });

    res.json({
      message: 'School registration rejected',
      school: {
        id: request.school_id,
        name: request.school_name,
        status: 'rejected'
      },
      rejection: {
        requestId: id,
        rejectedBy: req.user.email,
        rejectedAt: new Date().toISOString(),
        reason: rejectionReason
      }
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error rejecting registration:', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

/**
 * GET /api/super-admin/registrations/history
 * Get all registration requests with their status (for audit/history)
 */
router.get('/registrations/history', authenticateJWT, requireSuperAdmin, async (req, res) => {
  try {
    const { status, limit = 50, offset = 0 } = req.query;

    let whereClause = '1=1';
    const params = [];
    let paramIndex = 1;

    if (status) {
      whereClause += ` AND srr.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    const query = `
      SELECT 
        srr.id,
        srr.school_id,
        srr.requester_name,
        srr.requester_email,
        srr.proposed_admin_email,
        srr.status,
        srr.submitted_at,
        srr.reviewed_at,
        srr.rejection_reason,
        s.name as school_name,
        s.city as school_city,
        st.name as state_name,
        reviewer.first_name || ' ' || reviewer.last_name as reviewer_name
      FROM school_registration_requests srr
      JOIN schools s ON srr.school_id = s.id
      JOIN states st ON s.state_id = st.id
      LEFT JOIN users reviewer ON srr.reviewed_by = reviewer.id
      WHERE ${whereClause}
      ORDER BY srr.submitted_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    params.push(limit, offset);

    const result = await pool.query(query, params);

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM school_registration_requests srr
      WHERE ${whereClause}
    `;
    const countResult = await pool.query(countQuery, params.slice(0, -2));

    res.json({
      requests: result.rows,
      pagination: {
        total: parseInt(countResult.rows[0].total),
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: (parseInt(offset) + parseInt(limit)) < parseInt(countResult.rows[0].total)
      }
    });
  } catch (err) {
    console.error('Error fetching registration history:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/super-admin/schools/all
 * Get all schools with their status and basic info
 */
router.get('/schools/all', authenticateJWT, requireSuperAdmin, async (req, res) => {
  try {
    const { status, stateId, limit = 100, offset = 0 } = req.query;

    let whereClause = '1=1';
    const params = [];
    let paramIndex = 1;

    if (status) {
      whereClause += ` AND s.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (stateId) {
      whereClause += ` AND s.state_id = $${paramIndex}`;
      params.push(stateId);
      paramIndex++;
    }

    const query = `
      SELECT 
        s.id,
        s.name,
        s.city,
        s.type,
        s.is_public,
        s.status,
        s.is_verified,
        s.created_at,
        s.updated_at,
        st.name as state_name,
        st.code as state_code,
        COUNT(DISTINCT u.id) as total_users,
        COUNT(DISTINCT CASE WHEN u.role = 'admin' THEN u.id END) as admin_count,
        COUNT(DISTINCT CASE WHEN u.role = 'teacher' THEN u.id END) as teacher_count,
        COUNT(DISTINCT CASE WHEN u.role = 'student' THEN u.id END) as student_count
      FROM schools s
      JOIN states st ON s.state_id = st.id
      LEFT JOIN users u ON s.id = u.school_id
      WHERE ${whereClause}
      GROUP BY s.id, s.name, s.city, s.type, s.is_public, s.status, s.is_verified, 
               s.created_at, s.updated_at, st.name, st.code
      ORDER BY s.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    params.push(limit, offset);

    const result = await pool.query(query, params);

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM schools s
      WHERE ${whereClause}
    `;
    const countResult = await pool.query(countQuery, params.slice(0, -2));

    res.json({
      schools: result.rows,
      pagination: {
        total: parseInt(countResult.rows[0].total),
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: (parseInt(offset) + parseInt(limit)) < parseInt(countResult.rows[0].total)
      }
    });
  } catch (err) {
    console.error('Error fetching all schools:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/super-admin/metrics/overview
 * Get system-wide metrics and statistics
 */
router.get('/metrics/overview', authenticateJWT, requireSuperAdmin, async (req, res) => {
  try {
    const [
      schoolsRes,
      usersRes,
      pendingRes,
      recentRes,
      stateRes
    ] = await Promise.all([
      // School metrics
      pool.query(`
        SELECT 
          COUNT(*) as total_schools,
          COUNT(CASE WHEN status = 'active' THEN 1 END) as active_schools,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_schools,
          COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected_schools,
          COUNT(CASE WHEN is_verified = true THEN 1 END) as verified_schools,
          COUNT(CASE WHEN is_public = true THEN 1 END) as public_schools
        FROM schools
      `),
      
      // User metrics
      pool.query(`
        SELECT 
          COUNT(*) as total_users,
          COUNT(CASE WHEN role = 'admin' THEN 1 END) as admin_users,
          COUNT(CASE WHEN role = 'teacher' THEN 1 END) as teacher_users,
          COUNT(CASE WHEN role = 'student' THEN 1 END) as student_users,
          COUNT(CASE WHEN is_active = true THEN 1 END) as active_users
        FROM users
      `),
      
      // Pending registrations
      pool.query(`
        SELECT COUNT(*) as pending_registrations
        FROM school_registration_requests
        WHERE status = 'pending'
      `),
      
      // Recent activity (last 7 days)
      pool.query(`
        SELECT 
          COUNT(CASE WHEN s.created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as new_schools,
          COUNT(CASE WHEN u.created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as new_users,
          COUNT(CASE WHEN srr.submitted_at >= NOW() - INTERVAL '7 days' THEN 1 END) as new_registrations
        FROM schools s
        FULL OUTER JOIN users u ON 1=1
        FULL OUTER JOIN school_registration_requests srr ON 1=1
      `),
      
      // Schools by state
      pool.query(`
        SELECT 
          st.name as state_name,
          st.code as state_code,
          COUNT(s.id) as school_count,
          COUNT(CASE WHEN s.status = 'active' THEN 1 END) as active_count
        FROM states st
        LEFT JOIN schools s ON st.id = s.state_id
        WHERE st.is_active = true
        GROUP BY st.id, st.name, st.code
        ORDER BY school_count DESC
        LIMIT 10
      `)
    ]);

    const metrics = {
      schools: schoolsRes.rows[0],
      users: usersRes.rows[0],
      pending: pendingRes.rows[0],
      recent: recentRes.rows[0],
      byState: stateRes.rows
    };

    res.json(metrics);
  } catch (err) {
    console.error('Error fetching system metrics:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/super-admin/audit-log
 * Get audit log of all admin actions
 */
router.get('/audit-log', authenticateJWT, requireSuperAdmin, async (req, res) => {
  try {
    const { action, schoolId, limit = 50, offset = 0 } = req.query;

    let whereClause = '1=1';
    const params = [];
    let paramIndex = 1;

    if (action) {
      whereClause += ` AND aaa.action = $${paramIndex}`;
      params.push(action);
      paramIndex++;
    }

    if (schoolId) {
      whereClause += ` AND aaa.school_id = $${paramIndex}`;
      params.push(schoolId);
      paramIndex++;
    }

    const query = `
      SELECT 
        aaa.id,
        aaa.school_id,
        aaa.action,
        aaa.performed_at,
        aaa.reason,
        aaa.previous_status,
        aaa.new_status,
        aaa.ip_address,
        s.name as school_name,
        performer.first_name || ' ' || performer.last_name as performer_name,
        performer.email as performer_email
      FROM admin_approval_audit aaa
      JOIN schools s ON aaa.school_id = s.id
      JOIN users performer ON aaa.performed_by = performer.id
      WHERE ${whereClause}
      ORDER BY aaa.performed_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    params.push(limit, offset);

    const result = await pool.query(query, params);

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM admin_approval_audit aaa
      WHERE ${whereClause}
    `;
    const countResult = await pool.query(countQuery, params.slice(0, -2));

    res.json({
      auditLog: result.rows,
      pagination: {
        total: parseInt(countResult.rows[0].total),
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: (parseInt(offset) + parseInt(limit)) < parseInt(countResult.rows[0].total)
      }
    });
  } catch (err) {
    console.error('Error fetching audit log:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
