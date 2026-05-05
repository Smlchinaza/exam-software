// routes/password-management.js
// Password management routes for forced password changes and admin resets

const express = require('express');
const router = express.Router();
const pool = require('../db/postgres');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { authenticateJWT } = require('../middleware/auth');
const { enforceMultiTenant } = require('../middleware/tenantScoping');
const { PasswordGenerator, PasswordValidator } = require('../utils/password-generator');
const EmailService = require('../utils/email-service');

/**
 * POST /api/password/change
 * Change password for authenticated user
 * Required for first-time login and regular password changes
 */
router.post('/change', authenticateJWT, enforceMultiTenant, async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    const userId = req.user.id;

    // Validate required fields
    if (!newPassword || !confirmPassword) {
      return res.status(400).json({ error: 'New password and confirmation are required' });
    }

    // Check if passwords match
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ error: 'New passwords do not match' });
    }

    // Get user information
    const userRes = await client.query(
      `SELECT id, email, password_hash, password_reset_required, is_first_login, first_name, last_name
       FROM users WHERE id = $1`,
      [userId]
    );

    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userRes.rows[0];

    // For first-time login, current password might not be required
    if (user.is_first_login && !currentPassword) {
      console.log('First-time password change for user:', user.email);
    } else if (!currentPassword) {
      return res.status(400).json({ error: 'Current password is required' });
    } else {
      // Verify current password
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);
      if (!isCurrentPasswordValid) {
        return res.status(400).json({ error: 'Current password is incorrect' });
      }
    }

    // Validate new password strength
    const validation = PasswordValidator.validate(newPassword, user.email, user.first_name);
    if (!validation.isValid) {
      return res.status(400).json({ 
        error: 'Password does not meet requirements',
        details: validation.feedback,
        warnings: validation.warnings
      });
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 12);

    // Store old password hash for audit
    const oldPasswordHash = user.password_hash;

    // Update user password and reset flags
    await client.query('BEGIN');
    
    await client.query(
      `UPDATE users 
       SET password_hash = $1, 
           password_reset_required = false, 
           is_first_login = false,
           last_password_change = NOW(),
           updated_at = NOW()
       WHERE id = $2`,
      [newPasswordHash, userId]
    );

    // Log password change for audit
    await client.query(
      `INSERT INTO password_reset_logs (user_id, reset_by, reset_type, reset_reason, old_password_hash)
       VALUES ($1, $1, 'self', 'User changed their own password', $2)`,
      [userId, oldPasswordHash]
    );

    await client.query('COMMIT');

    console.log('Password changed successfully for user:', user.email);

    // Send password change confirmation email
    const emailService = new EmailService();
    
    // Get school information for email
    const schoolRes = await pool.query(
      `SELECT name, domain FROM schools WHERE id = $1`,
      [user.school_id]
    );
    
    const schoolData = schoolRes.rows[0] || { name: 'Your School', domain: '' };
    
    // Send confirmation email (async, don't wait for it)
    emailService.sendPasswordChangeConfirmation(
      {
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name
      },
      schoolData
    ).catch(emailError => {
      console.error('Failed to send password change confirmation email:', emailError);
    });

    res.json({
      message: 'Password changed successfully',
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        passwordChangeRequired: false,
        isFirstLogin: false
      },
      emailNotification: 'Password change confirmation email sent'
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Password change error:', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

/**
 * POST /api/password/verify-temp-password
 * Verify temporary password before allowing change
 * Used for first-time login with generated passwords
 */
router.post('/verify-temp-password', authenticateJWT, enforceMultiTenant, async (req, res) => {
  try {
    const { temporaryPassword } = req.body;
    const userId = req.user.id;

    if (!temporaryPassword) {
      return res.status(400).json({ error: 'Temporary password is required' });
    }

    // Get user information
    const userRes = await pool.query(
      `SELECT id, email, password_hash, is_first_login, password_reset_required
       FROM users WHERE id = $1`,
      [userId]
    );

    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userRes.rows[0];

    // Verify temporary password
    const isTempPasswordValid = await bcrypt.compare(temporaryPassword, user.password_hash);
    if (!isTempPasswordValid) {
      return res.status(400).json({ error: 'Invalid temporary password' });
    }

    res.json({
      message: 'Temporary password verified',
      user: {
        id: user.id,
        email: user.email,
        isFirstLogin: user.is_first_login,
        passwordChangeRequired: user.password_reset_required
      }
    });

  } catch (err) {
    console.error('Temporary password verification error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/password/request-reset
 * Request password reset (self-service)
 * Sends reset token to user email
 */
router.post('/request-reset', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Find user by email
    const userRes = await pool.query(
      `SELECT id, email, first_name, last_name, school_id 
       FROM users WHERE email = $1 AND is_active = true`,
      [email]
    );

    if (userRes.rows.length === 0) {
      // Don't reveal if email exists or not for security
      return res.json({ message: 'If the email exists, a reset link will be sent' });
    }

    const user = userRes.rows[0];

    // Generate reset token
    const resetToken = PasswordGenerator.generateResetToken();
    const resetTokenHash = await bcrypt.hash(resetToken, 12);
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Update user with reset token
    await pool.query(
      `UPDATE users 
       SET password_reset_token = $1, 
           password_reset_expires = $2,
           updated_at = NOW()
       WHERE id = $3`,
      [resetTokenHash, resetExpires, user.id]
    );

    // Log password reset request
    await pool.query(
      `INSERT INTO password_reset_logs (user_id, reset_by, reset_type, reset_reason)
       VALUES ($1, NULL, 'self', 'User requested password reset')`,
      [user.id]
    );

    console.log('Password reset requested for user:', user.email);
    console.log('Reset token (for development):', resetToken);

    // In production, you would send an email with the reset link
    // For now, return the token for development purposes
    res.json({
      message: 'Password reset link sent to your email',
      resetToken: process.env.NODE_ENV === 'development' ? resetToken : undefined,
      expiresIn: '1 hour'
    });

  } catch (err) {
    console.error('Password reset request error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/password/reset-with-token
 * Reset password using reset token
 */
router.post('/reset-with-token', async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { resetToken, newPassword, confirmPassword } = req.body;

    if (!resetToken || !newPassword || !confirmPassword) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match' });
    }

    // Find user with valid reset token
    const userRes = await client.query(
      `SELECT id, email, password_hash, password_reset_token, password_reset_expires, first_name
       FROM users 
       WHERE password_reset_token IS NOT NULL 
       AND password_reset_expires > NOW()`
    );

    if (userRes.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    // Find the user whose token matches
    let user = null;
    for (const row of userRes.rows) {
      const isTokenValid = await bcrypt.compare(resetToken, row.password_reset_token);
      if (isTokenValid) {
        user = row;
        break;
      }
    }

    if (!user) {
      return res.status(400).json({ error: 'Invalid reset token' });
    }

    // Validate new password
    const validation = PasswordValidator.validate(newPassword, user.email, user.first_name);
    if (!validation.isValid) {
      return res.status(400).json({ 
        error: 'Password does not meet requirements',
        details: validation.feedback,
        warnings: validation.warnings
      });
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 12);

    // Update user password and clear reset token
    await client.query('BEGIN');

    await client.query(
      `UPDATE users 
       SET password_hash = $1, 
           password_reset_token = NULL,
           password_reset_expires = NULL,
           password_reset_required = false,
           is_first_login = false,
           last_password_change = NOW(),
           updated_at = NOW()
       WHERE id = $2`,
      [newPasswordHash, user.id]
    );

    // Log password reset
    await client.query(
      `INSERT INTO password_reset_logs (user_id, reset_by, reset_type, reset_reason, old_password_hash)
       VALUES ($1, $1, 'self', 'Password reset using token', $2)`,
      [user.id, user.password_hash]
    );

    await client.query('COMMIT');

    console.log('Password reset completed for user:', user.email);

    res.json({
      message: 'Password reset successfully',
      user: {
        id: user.id,
        email: user.email
      }
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Password reset error:', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

/**
 * GET /api/password/status
 * Check if user needs to change password
 */
router.get('/status', authenticateJWT, enforceMultiTenant, async (req, res) => {
  try {
    const userId = req.user.id;

    const userRes = await pool.query(
      `SELECT password_reset_required, is_first_login, last_password_change
       FROM users WHERE id = $1`,
      [userId]
    );

    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userRes.rows[0];

    res.json({
      passwordChangeRequired: user.password_reset_required,
      isFirstLogin: user.is_first_login,
      lastPasswordChange: user.last_password_change
    });

  } catch (err) {
    console.error('Password status check error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
