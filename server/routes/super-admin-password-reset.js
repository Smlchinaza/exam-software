// routes/super-admin-password-reset.js
// Super Admin password reset functionality for school admins

const express = require('express');
const router = express.Router();
const pool = require('../db/postgres');
const bcrypt = require('bcryptjs');
const { authenticateJWT } = require('../middleware/auth');
const { PasswordGenerator, PasswordValidator } = require('../utils/password-generator');
const EmailService = require('../utils/email-service');

/**
 * Middleware to ensure user is a super admin
 */
const requireSuperAdmin = async (req, res, next) => {
  try {
    // Check if user has super admin privileges
    // This could be based on role, special flag, or membership in super admins table
    const userRes = await pool.query(
      `SELECT id, email, role 
       FROM users 
       WHERE id = $1 AND is_active = true`,
      [req.user.id]
    );

    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userRes.rows[0];

    // Check if user is super admin (you might have a different logic for this)
    // For now, we'll check if there's a super_admins table entry
    const superAdminRes = await pool.query(
      `SELECT id FROM super_admins WHERE user_id = $1 AND is_active = true`,
      [user.id]
    );

    if (superAdminRes.rows.length === 0) {
      return res.status(403).json({ error: 'Super admin access required' });
    }

    req.superAdmin = superAdminRes.rows[0];
    next();
  } catch (err) {
    console.error('Super admin check error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

/**
 * POST /api/super-admin/school-admins/:adminId/reset-password
 * Reset school admin password (Super Admin only)
 */
router.post('/school-admins/:adminId/reset-password', authenticateJWT, requireSuperAdmin, async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { adminId } = req.params;
    const { reason, notifyAdmin } = req.body;
    const superAdminId = req.user.id;

    // Validate admin ID
    if (!adminId) {
      return res.status(400).json({ error: 'Admin ID is required' });
    }

    // Get target admin information
    const adminRes = await client.query(
      `SELECT u.id, u.email, u.first_name, u.last_name, u.role, u.school_id,
              s.name as school_name, u.password_hash
       FROM users u
       LEFT JOIN schools s ON u.school_id = s.id
       WHERE u.id = $1 AND u.role = 'admin' AND u.is_active = true`,
      [adminId]
    );

    if (adminRes.rows.length === 0) {
      return res.status(404).json({ error: 'School admin not found' });
    }

    const targetAdmin = adminRes.rows[0];

    // Generate new secure password
    const newPassword = PasswordGenerator.generateSecurePassword(12);
    const newPasswordHash = await bcrypt.hash(newPassword, 12);

    // Store old password hash for audit
    const oldPasswordHash = targetAdmin.password_hash;

    // Update admin password and set reset required flag
    await client.query('BEGIN');

    await client.query(
      `UPDATE users 
       SET password_hash = $1, 
           password_reset_required = true, 
           is_first_login = false,
           last_password_change = NOW(),
           updated_at = NOW()
       WHERE id = $2`,
      [newPasswordHash, adminId]
    );

    // Log password reset for audit
    await client.query(
      `INSERT INTO password_reset_logs (user_id, reset_by, reset_type, reset_reason, old_password_hash)
       VALUES ($1, $2, 'forced', $3, $4)`,
      [adminId, superAdminId, reason || 'Password reset by super admin', oldPasswordHash]
    );

    await client.query('COMMIT');

    console.log('Super admin password reset completed:', {
      targetAdmin: targetAdmin.email,
      resetBy: req.user.email,
      reason: reason || 'Password reset by super admin'
    });

    // Send password reset email notification
    let emailSent = false;
    let emailError = null;
    
    if (notifyAdmin !== false) {
      const emailService = new EmailService();
      
      try {
        const emailResult = await emailService.sendPasswordResetEmail(
          {
            email: targetAdmin.email,
            firstName: targetAdmin.first_name,
            lastName: targetAdmin.last_name
          },
          {
            name: targetAdmin.school_name,
            domain: targetAdmin.school_domain
          },
          newPassword,
          req.user.email
        );
        
        emailSent = emailResult.success;
        if (!emailResult.success) {
          emailError = emailResult.error;
        }
        
        console.log('Password reset email sent:', emailResult.success ? 'SUCCESS' : 'FAILED');
      } catch (error) {
        emailError = error.message;
        console.error('Failed to send password reset email:', error);
      }
    }

    // Prepare response
    const response = {
      message: 'School admin password reset successfully',
      admin: {
        id: targetAdmin.id,
        email: targetAdmin.email,
        firstName: targetAdmin.first_name,
        lastName: targetAdmin.last_name,
        schoolName: targetAdmin.school_name,
        passwordChangeRequired: true
      },
      temporaryPassword: newPassword, // Include for development/setup
      resetBy: req.user.email,
      resetAt: new Date().toISOString(),
      reason: reason || 'Password reset by super admin',
      emailSent,
      emailMessage: emailSent 
        ? 'Password reset notification email sent to admin' 
        : emailError || 'Email notification was not sent'
    };

    res.json(response);

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Super admin password reset error:', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

/**
 * GET /api/super-admin/school-admins/:adminId/password-history
 * Get password reset history for a school admin (Super Admin only)
 */
router.get('/school-admins/:adminId/password-history', authenticateJWT, requireSuperAdmin, async (req, res) => {
  try {
    const { adminId } = req.params;
    const { limit = 20, offset = 0 } = req.query;

    // Validate admin exists and is a school admin
    const adminRes = await pool.query(
      `SELECT id, email, first_name, last_name, role
       FROM users 
       WHERE id = $1 AND role = 'admin' AND is_active = true`,
      [adminId]
    );

    if (adminRes.rows.length === 0) {
      return res.status(404).json({ error: 'School admin not found' });
    }

    // Get password reset history
    const historyRes = await pool.query(
      `SELECT prl.id, prl.reset_type, prl.reset_reason, prl.created_at,
              reset_by_user.email as reset_by_email,
              reset_by_user.first_name as reset_by_first_name,
              reset_by_user.last_name as reset_by_last_name
       FROM password_reset_logs prl
       LEFT JOIN users reset_by_user ON prl.reset_by = reset_by_user.id
       WHERE prl.user_id = $1
       ORDER BY prl.created_at DESC
       LIMIT $2 OFFSET $3`,
      [adminId, parseInt(limit), parseInt(offset)]
    );

    // Get total count for pagination
    const countRes = await pool.query(
      `SELECT COUNT(*) as total FROM password_reset_logs WHERE user_id = $1`,
      [adminId]
    );

    res.json({
      admin: adminRes.rows[0],
      history: historyRes.rows,
      pagination: {
        total: parseInt(countRes.rows[0].total),
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: (parseInt(offset) + parseInt(limit)) < parseInt(countRes.rows[0].total)
      }
    });

  } catch (err) {
    console.error('Password history error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/super-admin/school-admins
 * Get all school admins with password status (Super Admin only)
 */
router.get('/school-admins', authenticateJWT, requireSuperAdmin, async (req, res) => {
  try {
    const { schoolId, search, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let whereClause = 'WHERE u.role = \'admin\' AND u.is_active = true';
    let queryParams = [];
    let paramIndex = 1;

    if (schoolId) {
      whereClause += ` AND u.school_id = $${paramIndex}`;
      queryParams.push(schoolId);
      paramIndex++;
    }

    if (search) {
      whereClause += ` AND (u.email ILIKE $${paramIndex} OR u.first_name ILIKE $${paramIndex} OR u.last_name ILIKE $${paramIndex} OR s.name ILIKE $${paramIndex})`;
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    // Get school admins with password status
    const adminsRes = await pool.query(
      `SELECT u.id, u.email, u.first_name, u.last_name, u.school_id,
              u.password_reset_required, u.is_first_login, u.last_password_change,
              u.created_at, u.updated_at,
              s.name as school_name, s.domain as school_domain
       FROM users u
       LEFT JOIN schools s ON u.school_id = s.id
       ${whereClause}
       ORDER BY u.created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...queryParams, parseInt(limit), parseInt(offset)]
    );

    // Get total count for pagination
    const countRes = await pool.query(
      `SELECT COUNT(*) as total 
       FROM users u
       LEFT JOIN schools s ON u.school_id = s.id
       ${whereClause}`,
      queryParams
    );

    res.json({
      admins: adminsRes.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(countRes.rows[0].total),
        totalPages: Math.ceil(countRes.rows[0].total / limit)
      }
    });

  } catch (err) {
    console.error('Get school admins error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/super-admin/bulk-password-reset
 * Bulk password reset for multiple school admins (Super Admin only)
 */
router.post('/bulk-password-reset', authenticateJWT, requireSuperAdmin, async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { adminIds, reason } = req.body;
    const superAdminId = req.user.id;

    if (!adminIds || !Array.isArray(adminIds) || adminIds.length === 0) {
      return res.status(400).json({ error: 'Admin IDs array is required' });
    }

    if (adminIds.length > 50) {
      return res.status(400).json({ error: 'Cannot reset more than 50 passwords at once' });
    }

    const results = [];
    const errors = [];

    await client.query('BEGIN');

    for (const adminId of adminIds) {
      try {
        // Get admin info
        const adminRes = await client.query(
          `SELECT id, email, first_name, last_name, password_hash
           FROM users 
           WHERE id = $1 AND role = 'admin' AND is_active = true`,
          [adminId]
        );

        if (adminRes.rows.length === 0) {
          errors.push({ adminId, error: 'Admin not found or inactive' });
          continue;
        }

        const admin = adminRes.rows[0];

        // Generate new password
        const newPassword = PasswordGenerator.generateSecurePassword(12);
        const newPasswordHash = await bcrypt.hash(newPassword, 12);

        // Update password
        await client.query(
          `UPDATE users 
           SET password_hash = $1, 
               password_reset_required = true, 
               is_first_login = false,
               last_password_change = NOW(),
               updated_at = NOW()
           WHERE id = $2`,
          [newPasswordHash, adminId]
        );

        // Log reset
        await client.query(
          `INSERT INTO password_reset_logs (user_id, reset_by, reset_type, reset_reason, old_password_hash)
           VALUES ($1, $2, 'forced', $3, $4)`,
          [adminId, superAdminId, reason || 'Bulk password reset by super admin', admin.password_hash]
        );

        results.push({
          adminId,
          email: admin.email,
          name: `${admin.first_name} ${admin.last_name}`,
          temporaryPassword: newPassword,
          success: true
        });

      } catch (err) {
        console.error('Error resetting password for admin:', adminId, err);
        errors.push({ adminId, error: err.message });
      }
    }

    await client.query('COMMIT');

    console.log('Bulk password reset completed:', {
      totalRequested: adminIds.length,
      successful: results.length,
      failed: errors.length,
      resetBy: req.user.email
    });

    res.json({
      message: 'Bulk password reset completed',
      summary: {
        total: adminIds.length,
        successful: results.length,
        failed: errors.length
      },
      results,
      errors,
      resetBy: req.user.email,
      resetAt: new Date().toISOString()
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Bulk password reset error:', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

/**
 * GET /api/super-admin/school-admins/stats
 * Get password management statistics (Super Admin only)
 */
router.get('/school-admins/stats', authenticateJWT, requireSuperAdmin, async (req, res) => {
  try {
    // Get password management statistics
    const statsResult = await pool.query(`
      SELECT 
        COUNT(*) as total_admins,
        COUNT(*) FILTER (WHERE password_reset_required = true) as requiring_reset,
        COUNT(*) FILTER (WHERE is_first_login = true) as first_login,
        COUNT(*) FILTER (WHERE password_reset_required = false AND is_first_login = false) as active
      FROM users 
      WHERE role = 'admin' AND is_active = true
    `);

    const stats = statsResult.rows[0];

    res.json({
      totalAdmins: parseInt(stats.total_admins),
      requiringReset: parseInt(stats.requiring_reset),
      firstLogin: parseInt(stats.first_login),
      active: parseInt(stats.active)
    });

  } catch (err) {
    console.error('Password stats error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
