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
    const { approvalNotes, adminPassword, adminEmail } = req.body;

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

    // Use override admin email if provided, otherwise use proposed email
    const finalAdminEmail = adminEmail || request.proposed_admin_email;

    // 2. Check if final admin email already exists
    const emailExistsRes = await client.query(
      `SELECT id FROM users WHERE email = $1`,
      [finalAdminEmail]
    );

    if (emailExistsRes.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Admin email already exists. Please provide a different email.' });
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

    // 5. Create admin user account with final email
    const adminRes = await client.query(
      `INSERT INTO users (
         school_id, email, password_hash, first_name, last_name, 
         role, is_active, created_at, updated_at
       ) VALUES ($1, $2, $3, $4, $5, 'admin', true, NOW(), NOW())
       RETURNING id, email, first_name, last_name, role, school_id, created_at`,
      [
        request.school_id,
        finalAdminEmail,
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
        JSON.stringify({ 
          request_id: id, 
          admin_created_id: adminRes.rows[0].id,
          admin_email: finalAdminEmail,
          email_changed: adminEmail ? true : false,
          original_proposed_email: request.proposed_admin_email
        }),
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
      adminEmail: finalAdminEmail,
      emailChanged: adminEmail ? `${request.proposed_admin_email} → ${finalAdminEmail}` : 'no'
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

/**
 * GET /api/super-admin/metrics/school/:schoolId
 * Get detailed metrics for a specific school
 */
router.get('/metrics/school/:schoolId', authenticateJWT, requireSuperAdmin, async (req, res) => {
  try {
    const { schoolId } = req.params;
    const { timeRange = '30' } = req.query; // Default to last 30 days

    const [
      schoolInfo,
      userMetrics,
      examMetrics,
      activityMetrics,
      trendData
    ] = await Promise.all([
      // School basic information
      pool.query(`
        SELECT 
          s.id,
          s.name,
          s.city,
          s.type,
          s.status,
          s.is_verified,
          s.created_at,
          st.name as state_name,
          st.code as state_code
        FROM schools s
        JOIN states st ON s.state_id = st.id
        WHERE s.id = $1
      `, [schoolId]),
      
      // User distribution metrics
      pool.query(`
        SELECT 
          COUNT(*) as total_users,
          COUNT(CASE WHEN role = 'admin' THEN 1 END) as admin_count,
          COUNT(CASE WHEN role = 'teacher' THEN 1 END) as teacher_count,
          COUNT(CASE WHEN role = 'student' THEN 1 END) as student_count,
          COUNT(CASE WHEN is_active = true THEN 1 END) as active_users,
          COUNT(CASE WHEN created_at >= NOW() - INTERVAL '${timeRange} days' THEN 1 END) as new_users
        FROM users
        WHERE school_id = $1
      `, [schoolId]),
      
      // Exam participation metrics
      pool.query(`
        SELECT 
          COUNT(DISTINCT e.id) as total_exams,
          COUNT(DISTINCT CASE WHEN e.created_at >= NOW() - INTERVAL '${timeRange} days' THEN e.id END) as recent_exams,
          COUNT(DISTINCT es.id) as total_submissions,
          COUNT(DISTINCT CASE WHEN es.submitted_at >= NOW() - INTERVAL '${timeRange} days' THEN es.id END) as recent_submissions,
          ROUND(AVG(CASE WHEN es.score IS NOT NULL THEN es.score END), 2) as avg_score
        FROM exams e
        LEFT JOIN exam_submissions es ON e.id = es.exam_id
        WHERE e.school_id = $1
      `, [schoolId]),
      
      // Activity metrics
      pool.query(`
        SELECT 
          COUNT(CASE WHEN last_login >= NOW() - INTERVAL '7 days' THEN 1 END) as active_last_7_days,
          COUNT(CASE WHEN last_login >= NOW() - INTERVAL '30 days' THEN 1 END) as active_last_30_days,
          COUNT(CASE WHEN last_login >= NOW() - INTERVAL '${timeRange} days' THEN 1 END) as active_in_range
        FROM users
        WHERE school_id = $1 AND last_login IS NOT NULL
      `, [schoolId]),
      
      // Historical trend data
      pool.query(`
        SELECT 
          DATE_TRUNC('day', created_at) as date,
          COUNT(*) as new_users_count
        FROM users
        WHERE school_id = $1 
          AND created_at >= NOW() - INTERVAL '${timeRange} days'
        GROUP BY DATE_TRUNC('day', created_at)
        ORDER BY date DESC
        LIMIT 30
      `, [schoolId])
    ]);

    if (schoolInfo.rows.length === 0) {
      return res.status(404).json({ error: 'School not found' });
    }

    const metrics = {
      school: schoolInfo.rows[0],
      users: userMetrics.rows[0],
      exams: examMetrics.rows[0],
      activity: activityMetrics.rows[0],
      trends: trendData.rows,
      timeRange: timeRange
    };

    res.json(metrics);
  } catch (err) {
    console.error('Error fetching school metrics:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/super-admin/metrics/performance-analytics
 * Get performance analytics for school comparison
 */
router.get('/metrics/performance-analytics', authenticateJWT, requireSuperAdmin, async (req, res) => {
  try {
    const { 
      sortBy = 'total_users', 
      order = 'desc', 
      limit = '20', 
      offset = '0',
      schoolType,
      stateCode 
    } = req.query;

    let whereClause = 's.status = \'active\'';
    const params = [];
    let paramIndex = 1;

    if (schoolType && schoolType !== 'all') {
      whereClause += ` AND s.type = $${paramIndex}`;
      params.push(schoolType);
      paramIndex++;
    }

    if (stateCode && stateCode !== 'all') {
      whereClause += ` AND st.code = $${paramIndex}`;
      params.push(stateCode);
      paramIndex++;
    }

    const analyticsQuery = `
      SELECT 
        s.id,
        s.name,
        s.city,
        s.type,
        st.name as state_name,
        st.code as state_code,
        s.created_at,
        
        -- User metrics
        COALESCE(user_counts.total_users, 0) as total_users,
        COALESCE(user_counts.admin_count, 0) as admin_count,
        COALESCE(user_counts.teacher_count, 0) as teacher_count,
        COALESCE(user_counts.student_count, 0) as student_count,
        COALESCE(user_counts.active_users, 0) as active_users,
        
        -- Exam metrics
        COALESCE(exam_counts.total_exams, 0) as total_exams,
        COALESCE(exam_counts.total_submissions, 0) as total_submissions,
        COALESCE(exam_counts.avg_score, 0) as avg_score,
        
        -- Performance ratios
        CASE 
          WHEN COALESCE(user_counts.total_users, 0) > 0 
          THEN ROUND((COALESCE(exam_counts.total_submissions, 0)::decimal / COALESCE(user_counts.total_users, 1)) * 100, 2)
          ELSE 0 
        END as submission_rate,
        
        CASE 
          WHEN COALESCE(user_counts.total_users, 0) > 0 
          THEN ROUND((COALESCE(user_counts.active_users, 0)::decimal / COALESCE(user_counts.total_users, 1)) * 100, 2)
          ELSE 0 
        END as user_activity_rate,
        
        -- Growth metrics
        CASE 
          WHEN s.created_at >= NOW() - INTERVAL '30 days' THEN 'new'
          WHEN s.created_at >= NOW() - INTERVAL '90 days' THEN 'recent'
          ELSE 'established'
        END as growth_stage
        
      FROM schools s
      JOIN states st ON s.state_id = st.id
      LEFT JOIN (
        SELECT 
          school_id,
          COUNT(*) as total_users,
          COUNT(CASE WHEN role = 'admin' THEN 1 END) as admin_count,
          COUNT(CASE WHEN role = 'teacher' THEN 1 END) as teacher_count,
          COUNT(CASE WHEN role = 'student' THEN 1 END) as student_count,
          COUNT(CASE WHEN is_active = true THEN 1 END) as active_users
        FROM users
        GROUP BY school_id
      ) user_counts ON s.id = user_counts.school_id
      LEFT JOIN (
        SELECT 
          e.school_id,
          COUNT(DISTINCT e.id) as total_exams,
          COUNT(DISTINCT es.id) as total_submissions,
          ROUND(AVG(CASE WHEN es.score IS NOT NULL THEN es.score END), 2) as avg_score
        FROM exams e
        LEFT JOIN exam_submissions es ON e.id = es.exam_id
        GROUP BY e.school_id
      ) exam_counts ON s.id = exam_counts.school_id
      WHERE ${whereClause}
      ORDER BY ${sortBy} ${order.toUpperCase()}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    params.push(limit, offset);

    const result = await pool.query(analyticsQuery, params);

    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) as total
      FROM schools s
      JOIN states st ON s.state_id = st.id
      WHERE ${whereClause}
    `;
    const countResult = await pool.query(countQuery, params.slice(0, -2));

    res.json({
      analytics: result.rows,
      pagination: {
        total: parseInt(countResult.rows[0].total),
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: (parseInt(offset) + parseInt(limit)) < parseInt(countResult.rows[0].total)
      }
    });
  } catch (err) {
    console.error('Error fetching performance analytics:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/super-admin/metrics/trends
 * Get system-wide trend analysis with custom date range
 */
router.get('/metrics/trends', authenticateJWT, requireSuperAdmin, async (req, res) => {
  try {
    const { 
      startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Default 90 days ago
      endDate = new Date().toISOString().split('T')[0], // Today
      metric = 'all',
      granularity = 'day' // day, week, month
    } = req.query;

    let dateFormat;
    switch (granularity) {
      case 'week':
        dateFormat = 'YYYY-"W"WW';
        break;
      case 'month':
        dateFormat = 'YYYY-MM';
        break;
      default:
        dateFormat = 'YYYY-MM-DD';
    }

    const [schoolTrends, userTrends, examTrends, registrationTrends] = await Promise.all([
      // School registration trends
      pool.query(`
        SELECT 
          TO_CHAR(created_at, '${dateFormat}') as period,
          COUNT(*) as new_schools,
          COUNT(CASE WHEN status = 'active' THEN 1 END) as active_schools
        FROM schools
        WHERE DATE(created_at) BETWEEN $1 AND $2
        GROUP BY TO_CHAR(created_at, '${dateFormat}')
        ORDER BY period
      `, [startDate, endDate]),
      
      // User registration trends
      pool.query(`
        SELECT 
          TO_CHAR(created_at, '${dateFormat}') as period,
          COUNT(*) as new_users,
          COUNT(CASE WHEN role = 'admin' THEN 1 END) as new_admins,
          COUNT(CASE WHEN role = 'teacher' THEN 1 END) as new_teachers,
          COUNT(CASE WHEN role = 'student' THEN 1 END) as new_students
        FROM users
        WHERE DATE(created_at) BETWEEN $1 AND $2
        GROUP BY TO_CHAR(created_at, '${dateFormat}')
        ORDER BY period
      `, [startDate, endDate]),
      
      // Exam activity trends
      pool.query(`
        SELECT 
          TO_CHAR(e.created_at, '${dateFormat}') as period,
          COUNT(DISTINCT e.id) as new_exams,
          COUNT(DISTINCT es.id) as exam_submissions,
          ROUND(AVG(CASE WHEN es.score IS NOT NULL THEN es.score END), 2) as avg_score
        FROM exams e
        LEFT JOIN exam_submissions es ON e.id = es.exam_id
        WHERE DATE(e.created_at) BETWEEN $1 AND $2
        GROUP BY TO_CHAR(e.created_at, '${dateFormat}')
        ORDER BY period
      `, [startDate, endDate]),
      
      // Registration request trends
      pool.query(`
        SELECT 
          TO_CHAR(submitted_at, '${dateFormat}') as period,
          COUNT(*) as total_requests,
          COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_requests,
          COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected_requests,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_requests
        FROM school_registration_requests
        WHERE DATE(submitted_at) BETWEEN $1 AND $2
        GROUP BY TO_CHAR(submitted_at, '${dateFormat}')
        ORDER BY period
      `, [startDate, endDate])
    ]);

    const trends = {
      dateRange: { startDate, endDate },
      granularity,
      schools: schoolTrends.rows,
      users: userTrends.rows,
      exams: examTrends.rows,
      registrations: registrationTrends.rows
    };

    // Filter based on metric parameter if not 'all'
    if (metric !== 'all') {
      const filteredTrends = {};
      if (metric.includes('schools')) filteredTrends.schools = trends.schools;
      if (metric.includes('users')) filteredTrends.users = trends.users;
      if (metric.includes('exams')) filteredTrends.exams = trends.exams;
      if (metric.includes('registrations')) filteredTrends.registrations = trends.registrations;
      
      return res.json({
        ...trends,
        ...filteredTrends
      });
    }

    res.json(trends);
  } catch (err) {
    console.error('Error fetching trend analysis:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/super-admin/metrics/record
 * Record new metrics data (for automated data collection)
 */
router.post('/metrics/record', authenticateJWT, requireSuperAdmin, async (req, res) => {
  try {
    const { 
      schoolId, 
      metricType, 
      metricValue, 
      metricDate = new Date().toISOString().split('T')[0],
      additionalData = {} 
    } = req.body;

    // Validate required fields
    if (!schoolId || !metricType || metricValue === undefined) {
      return res.status(400).json({ 
        error: 'Missing required fields: schoolId, metricType, metricValue' 
      });
    }

    // Validate metric type
    const validMetricTypes = ['enrollment', 'exams', 'performance', 'usage', 'activity'];
    if (!validMetricTypes.includes(metricType)) {
      return res.status(400).json({ 
        error: `Invalid metricType. Must be one of: ${validMetricTypes.join(', ')}` 
      });
    }

    // Check if school exists
    const schoolCheck = await pool.query('SELECT id FROM schools WHERE id = $1', [schoolId]);
    if (schoolCheck.rows.length === 0) {
      return res.status(404).json({ error: 'School not found' });
    }

    // Insert or update metric
    const result = await pool.query(`
      INSERT INTO school_metrics (
        school_id, metric_type, metric_value, metric_date, additional_data
      ) VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (school_id, metric_type, metric_date) 
      DO UPDATE SET
        metric_value = EXCLUDED.metric_value,
        additional_data = EXCLUDED.additional_data,
        updated_at = NOW()
      RETURNING *
    `, [schoolId, metricType, metricValue, metricDate, additionalData]);

    res.json({
      success: true,
      metric: result.rows[0],
      message: 'Metric recorded successfully'
    });
  } catch (err) {
    console.error('Error recording metric:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/super-admin/metrics/school/:schoolId/history
 * Get historical metrics for a specific school
 */
router.get('/metrics/school/:schoolId/history', authenticateJWT, requireSuperAdmin, async (req, res) => {
  try {
    const { schoolId } = req.params;
    const { 
      metricType = 'all',
      startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      endDate = new Date().toISOString().split('T')[0]
    } = req.query;

    let whereClause = 'school_id = $1 AND DATE(metric_date) BETWEEN $2 AND $3';
    const params = [schoolId, startDate, endDate];

    if (metricType !== 'all') {
      whereClause += ` AND metric_type = $4`;
      params.push(metricType);
    }

    const result = await pool.query(`
      SELECT 
        id,
        metric_type,
        metric_value,
        metric_date,
        additional_data,
        created_at,
        updated_at
      FROM school_metrics
      WHERE ${whereClause}
      ORDER BY metric_date DESC, created_at DESC
    `, params);

    // Group metrics by type for easier consumption
    const groupedMetrics = result.rows.reduce((acc, metric) => {
      if (!acc[metric.metric_type]) {
        acc[metric.metric_type] = [];
      }
      acc[metric.metric_type].push(metric);
      return acc;
    }, {});

    res.json({
      schoolId,
      dateRange: { startDate, endDate },
      metrics: groupedMetrics,
      raw: result.rows
    });
  } catch (err) {
    console.error('Error fetching school metrics history:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/super-admin/admins/school/:schoolId
 * Get all admins for a specific school
 */
router.get('/admins/school/:schoolId', authenticateJWT, requireSuperAdmin, async (req, res) => {
  try {
    const { schoolId } = req.params;

    const result = await pool.query(`
      SELECT 
        u.id,
        u.first_name,
        u.last_name,
        u.email,
        u.role,
        u.is_active,
        u.created_at,
        s.name as school_name,
        s.id as school_id,
        -- Activity metrics
        (SELECT COUNT(*) FROM exam_submissions es 
         JOIN exams e ON es.exam_id = e.id 
         WHERE e.created_by = u.id AND es.submitted_at >= NOW() - INTERVAL '30 days') as recent_submissions,
        (SELECT COUNT(*) FROM exams 
         WHERE created_by = u.id AND created_at >= NOW() - INTERVAL '30 days') as recent_exams,
        -- Permission summary
        COALESCE(sa.permissions, '{}') as permissions
      FROM users u
      JOIN schools s ON u.school_id = s.id
      LEFT JOIN super_admins sa ON u.id = sa.user_id
      WHERE u.school_id = $1 AND u.role IN ('admin', 'teacher')
      ORDER BY u.created_at DESC
    `, [schoolId]);

    res.json({
      admins: result.rows,
      count: result.rows.length
    });
  } catch (err) {
    console.error('Error fetching school admins:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/super-admin/admins
 * Get all admins across all schools with filtering
 */
router.get('/admins', authenticateJWT, requireSuperAdmin, async (req, res) => {
  try {
    const { 
      status, 
      schoolId, 
      role = 'admin',
      limit = '50', 
      offset = '0',
      search 
    } = req.query;

    let whereClause = 'u.role IN ($1)';
    const params = [role];
    let paramIndex = 2;

    if (status && status !== 'all') {
      whereClause += ` AND u.is_active = $${paramIndex}`;
      params.push(status === 'active');
      paramIndex++;
    }

    if (schoolId && schoolId !== 'all') {
      whereClause += ` AND u.school_id = $${paramIndex}`;
      params.push(schoolId);
      paramIndex++;
    }

    if (search) {
      whereClause += ` AND (u.first_name ILIKE $${paramIndex} OR u.last_name ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    // Use a simpler query first to isolate the issue
    const query = `
      SELECT 
        u.id,
        u.first_name,
        u.last_name,
        u.email,
        u.role,
        u.is_active,
        u.created_at,
        s.name as school_name,
        s.id as school_id
      FROM users u
      JOIN schools s ON u.school_id = s.id
      WHERE ${whereClause}
      ORDER BY u.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    params.push(limit, offset);

    const result = await pool.query(query, params);

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM users u
      JOIN schools s ON u.school_id = s.id
      WHERE ${whereClause}
    `;
    const countResult = await pool.query(countQuery, params.slice(0, -2));

    res.json({
      admins: result.rows,
      pagination: {
        total: parseInt(countResult.rows[0].total),
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: (parseInt(offset) + parseInt(limit)) < parseInt(countResult.rows[0].total)
      }
    });
  } catch (err) {
    console.error('Error fetching admins:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/super-admin/admins/assign
 * Assign new admin to a school
 */
router.post('/admins/assign', authenticateJWT, requireSuperAdmin, async (req, res) => {
  try {
    const {
      schoolId,
      firstName,
      lastName,
      email,
      phone,
      password,
      permissions = {}
    } = req.body;

    // Validate required fields
    if (!schoolId || !firstName || !lastName || !email || !password) {
      return res.status(400).json({ 
        error: 'Missing required fields: schoolId, firstName, lastName, email, password' 
      });
    }

    // Check if school exists
    const schoolCheck = await pool.query('SELECT id FROM schools WHERE id = $1', [schoolId]);
    if (schoolCheck.rows.length === 0) {
      return res.status(404).json({ error: 'School not found' });
    }

    // Check if email already exists
    const emailCheck = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (emailCheck.rows.length > 0) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    // Hash password
    const bcryptjs = require('bcryptjs');
    const hashedPassword = await bcryptjs.hash(password, 10);

    // Create admin user
    const result = await pool.query(`
      INSERT INTO users (
        school_id, email, password_hash, first_name, last_name, 
        phone, role, is_active, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, 'admin', true, NOW(), NOW())
      RETURNING id, first_name, last_name, email, phone, role, is_active, created_at
    `, [schoolId, email, hashedPassword, firstName, lastName, phone]);

    const newAdmin = result.rows[0];

    // Create super admin record if permissions are provided
    if (Object.keys(permissions).length > 0) {
      await pool.query(`
        INSERT INTO super_admins (user_id, permissions, is_active, created_at, updated_at)
        VALUES ($1, $2, true, NOW(), NOW())
      `, [newAdmin.id, JSON.stringify(permissions)]);
    }

    // Log the action
    await pool.query(`
      INSERT INTO admin_approval_audit (
        school_id, action, performed_by, reason, previous_status, new_status, additional_data
      ) VALUES ($1, 'admin_assigned', $2, $3, NULL, 'active', $4)
    `, [schoolId, req.user.id, `Assigned admin: ${firstName} ${lastName}`, JSON.stringify({
      adminId: newAdmin.id,
      email: email,
      permissions: permissions
    })]);

    res.json({
      success: true,
      admin: newAdmin,
      message: 'Admin assigned successfully'
    });
  } catch (err) {
    console.error('Error assigning admin:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /api/super-admin/admins/:adminId
 * Update admin details and permissions
 */
router.put('/admins/:adminId', authenticateJWT, requireSuperAdmin, async (req, res) => {
  try {
    const { adminId } = req.params;
    const {
      firstName,
      lastName,
      email,
      phone,
      isActive,
      permissions
    } = req.body;

    // Check if admin exists
    const adminCheck = await pool.query('SELECT * FROM users WHERE id = $1', [adminId]);
    if (adminCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Admin not found' });
    }

    const admin = adminCheck.rows[0];

    // Update user details
    const updateFields = [];
    const updateValues = [];
    let paramIndex = 1;

    if (firstName !== undefined) {
      updateFields.push(`first_name = $${paramIndex}`);
      updateValues.push(firstName);
      paramIndex++;
    }

    if (lastName !== undefined) {
      updateFields.push(`last_name = $${paramIndex}`);
      updateValues.push(lastName);
      paramIndex++;
    }

    if (email !== undefined) {
      // Check if email is already used by another user
      const emailCheck = await pool.query(
        'SELECT id FROM users WHERE email = $1 AND id != $2', 
        [email, adminId]
      );
      if (emailCheck.rows.length > 0) {
        return res.status(400).json({ error: 'Email already exists' });
      }
      updateFields.push(`email = $${paramIndex}`);
      updateValues.push(email);
      paramIndex++;
    }

    if (phone !== undefined) {
      updateFields.push(`phone = $${paramIndex}`);
      updateValues.push(phone);
      paramIndex++;
    }

    if (isActive !== undefined) {
      updateFields.push(`is_active = $${paramIndex}`);
      updateValues.push(isActive);
      paramIndex++;
    }

    if (updateFields.length > 0) {
      updateFields.push(`updated_at = NOW()`);
      updateValues.push(adminId);

      await pool.query(`
        UPDATE users 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex}
      `, updateValues);
    }

    // Update permissions if provided
    if (permissions !== undefined) {
      await pool.query(`
        INSERT INTO super_admins (user_id, permissions, is_active, created_at, updated_at)
        VALUES ($1, $2, true, NOW(), NOW())
        ON CONFLICT (user_id) 
        DO UPDATE SET
          permissions = EXCLUDED.permissions,
          updated_at = NOW()
      `, [adminId, JSON.stringify(permissions)]);
    }

    // Log the action
    await pool.query(`
      INSERT INTO admin_approval_audit (
        school_id, action, performed_by, reason, previous_status, new_status, additional_data
      ) VALUES ($1, 'admin_updated', $2, $3, $4, $5, $6)
    `, [admin.school_id, req.user.id, `Updated admin: ${firstName || admin.first_name} ${lastName || admin.last_name}`, 
        admin.is_active, isActive !== undefined ? isActive : admin.is_active, JSON.stringify({
          adminId: adminId,
          changes: { firstName, lastName, email, phone, isActive, permissions }
        })]);

    res.json({
      success: true,
      message: 'Admin updated successfully'
    });
  } catch (err) {
    console.error('Error updating admin:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/super-admin/admins/:adminId
 * Remove admin assignment
 */
router.delete('/admins/:adminId', authenticateJWT, requireSuperAdmin, async (req, res) => {
  try {
    const { adminId } = req.params;
    const { reason = 'Removed by super admin' } = req.body;

    // Check if admin exists and get details
    const adminCheck = await pool.query(`
      SELECT u.*, s.name as school_name 
      FROM users u 
      JOIN schools s ON u.school_id = s.id 
      WHERE u.id = $1
    `, [adminId]);

    if (adminCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Admin not found' });
    }

    const admin = adminCheck.rows[0];

    // Cannot remove yourself
    if (adminId === req.user.id) {
      return res.status(400).json({ error: 'Cannot remove your own admin account' });
    }

    // Soft delete by deactivating
    await pool.query(`
      UPDATE users 
      SET is_active = false, updated_at = NOW()
      WHERE id = $1
    `, [adminId]);

    // Log the action
    await pool.query(`
      INSERT INTO admin_approval_audit (
        school_id, action, performed_by, reason, previous_status, new_status, additional_data
      ) VALUES ($1, 'admin_removed', $2, $3, 'active', 'inactive', $4)
    `, [admin.school_id, req.user.id, reason, JSON.stringify({
      adminId: adminId,
      adminName: `${admin.first_name} ${admin.last_name}`,
      email: admin.email
    })]);

    res.json({
      success: true,
      message: 'Admin removed successfully'
    });
  } catch (err) {
    console.error('Error removing admin:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/super-admin/admins/:adminId/activity
 * Get activity log for specific admin
 */
router.get('/admins/:adminId/activity', authenticateJWT, requireSuperAdmin, async (req, res) => {
  try {
    const { adminId } = req.params;
    const { limit = '50', offset = '0' } = req.query;

    // Check if admin exists
    const adminCheck = await pool.query('SELECT id, first_name, last_name FROM users WHERE id = $1', [adminId]);
    if (adminCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Admin not found' });
    }

    const result = await pool.query(`
      SELECT 
        aaa.id,
        aaa.action,
        aaa.performed_at,
        aaa.reason,
        aaa.previous_status,
        aaa.new_status,
        aaa.additional_data,
        s.name as school_name
      FROM admin_approval_audit aaa
      JOIN schools s ON aaa.school_id = s.id
      WHERE aaa.performed_by = $1
      ORDER BY aaa.performed_at DESC
      LIMIT $2 OFFSET $3
    `, [adminId, limit, offset]);

    // Get total count
    const countResult = await pool.query(
      'SELECT COUNT(*) as total FROM admin_approval_audit WHERE performed_by = $1',
      [adminId]
    );

    res.json({
      admin: adminCheck.rows[0],
      activities: result.rows,
      pagination: {
        total: parseInt(countResult.rows[0].total),
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: (parseInt(offset) + parseInt(limit)) < parseInt(countResult.rows[0].total)
      }
    });
  } catch (err) {
    console.error('Error fetching admin activity:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
