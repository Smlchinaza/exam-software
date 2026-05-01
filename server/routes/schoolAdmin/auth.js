// School Admin Authentication Routes
// Handles login, logout, and authentication for school administrators

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const pool = require('../../db/postgres');

// School admin login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ 
                success: false,
                error: 'Email and password are required',
                code: 'MISSING_CREDENTIALS'
            });
        }

        // Get school admin with user and school details
        const query = `
            SELECT 
                sa.id,
                sa.user_id,
                sa.school_id,
                sa.permissions,
                sa.is_active as admin_active,
                sa.last_login,
                u.email,
                u.password_hash,
                u.first_name,
                u.last_name,
                u.role,
                u.is_active as user_active,
                s.name as school_name,
                s.subdomain,
                s.is_active as school_active,
                s.status as school_status
            FROM school_admins sa 
            JOIN users u ON sa.user_id = u.id
            JOIN schools s ON sa.school_id = s.id 
            WHERE u.email = $1
        `;
        
        const result = await pool.query(query, [email]);
        
        if (result.rows.length === 0) {
            return res.status(401).json({ 
                success: false,
                error: 'Invalid credentials',
                code: 'INVALID_CREDENTIALS'
            });
        }

        const admin = result.rows[0];
        
        // Check if admin account is active
        if (!admin.admin_active || !admin.user_active || !admin.school_active) {
            return res.status(403).json({ 
                success: false,
                error: 'Account is not active',
                code: 'ACCOUNT_INACTIVE',
                details: {
                    admin_active: admin.admin_active,
                    user_active: admin.user_active,
                    school_active: admin.school_active
                }
            });
        }

        // Check school status
        if (admin.school_status !== 'active') {
            return res.status(403).json({ 
                success: false,
                error: 'School is not active',
                code: 'SCHOOL_INACTIVE'
            });
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(password, admin.password_hash);
        
        if (!isValidPassword) {
            return res.status(401).json({ 
                success: false,
                error: 'Invalid credentials',
                code: 'INVALID_CREDENTIALS'
            });
        }

        // Generate JWT token
        const token = jwt.sign(
            { 
                userId: admin.id,
                email: admin.email,
                schoolId: admin.school_id,
                subdomain: admin.subdomain,
                role: 'school_admin'
            },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
        );

        // Update last login
        await pool.query(
            'UPDATE school_admins SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
            [admin.id]
        );

        // Get admin permissions
        const permissionsQuery = `
            SELECT permission_type, access_level
            FROM school_admin_permissions
            WHERE admin_id = $1
        `;
        
        const permissionsResult = await pool.query(permissionsQuery, [admin.id]);
        const permissions = permissionsResult.rows.reduce((acc, perm) => {
            acc[perm.permission_type] = perm.access_level;
            return acc;
        }, {});

        res.json({
            success: true,
            message: 'Login successful',
            data: {
                token,
                admin: {
                    id: admin.id,
                    email: admin.email,
                    first_name: admin.first_name,
                    last_name: admin.last_name,
                    school: {
                        id: admin.school_id,
                        name: admin.school_name,
                        subdomain: admin.subdomain
                    },
                    permissions,
                    last_login: admin.last_login
                }
            }
        });

    } catch (error) {
        console.error('School admin login error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Login failed',
            code: 'LOGIN_ERROR'
        });
    }
});

// Refresh token
router.post('/refresh', async (req, res) => {
    try {
        const { token } = req.body;
        
        if (!token) {
            return res.status(401).json({ 
                success: false,
                error: 'No token provided',
                code: 'TOKEN_MISSING'
            });
        }

        // Verify existing token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Get fresh admin data
        const query = `
            SELECT 
                sa.id,
                sa.user_id,
                sa.school_id,
                sa.is_active,
                u.email,
                u.first_name,
                u.last_name,
                s.name as school_name,
                s.subdomain,
                s.is_active as school_active,
                s.status as school_status
            FROM school_admins sa 
            JOIN users u ON sa.user_id = u.id
            JOIN schools s ON sa.school_id = s.id 
            WHERE sa.id = $1 AND sa.is_active = true AND u.is_active = true
        `;
        
        const result = await pool.query(query, [decoded.userId]);
        
        if (result.rows.length === 0) {
            return res.status(403).json({ 
                success: false,
                error: 'Admin account not found or inactive',
                code: 'ADMIN_NOT_FOUND'
            });
        }

        const admin = result.rows[0];
        
        // Check if school is still active
        if (!admin.school_active || admin.school_status !== 'active') {
            return res.status(403).json({ 
                success: false,
                error: 'School is not active',
                code: 'SCHOOL_INACTIVE'
            });
        }

        // Generate new token
        const newToken = jwt.sign(
            { 
                userId: admin.id,
                email: admin.email,
                schoolId: admin.school_id,
                subdomain: admin.subdomain,
                role: 'school_admin'
            },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
        );

        res.json({
            success: true,
            data: {
                token: newToken,
                admin: {
                    id: admin.id,
                    email: admin.email,
                    first_name: admin.first_name,
                    last_name: admin.last_name,
                    school: {
                        id: admin.school_id,
                        name: admin.school_name,
                        subdomain: admin.subdomain
                    }
                }
            }
        });

    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ 
                success: false,
                error: 'Invalid token',
                code: 'TOKEN_INVALID'
            });
        } else if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ 
                success: false,
                error: 'Token expired',
                code: 'TOKEN_EXPIRED'
            });
        } else {
            console.error('Token refresh error:', error);
            res.status(500).json({ 
                success: false,
                error: 'Token refresh failed',
                code: 'REFRESH_ERROR'
            });
        }
    }
});

// Logout (client-side token invalidation)
router.post('/logout', (req, res) => {
    // Since we're using JWT, logout is handled client-side
    // by removing the token from storage
    res.json({
        success: true,
        message: 'Logout successful'
    });
});

// Verify token endpoint
router.get('/verify', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({ 
                success: false,
                error: 'No token provided',
                code: 'TOKEN_MISSING'
            });
        }

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Get admin details
        const query = `
            SELECT 
                sa.id,
                sa.user_id,
                sa.school_id,
                sa.is_active,
                u.email,
                u.first_name,
                u.last_name,
                s.name as school_name,
                s.subdomain,
                s.is_active as school_active,
                s.status as school_status
            FROM school_admins sa 
            JOIN users u ON sa.user_id = u.id
            JOIN schools s ON sa.school_id = s.id 
            WHERE sa.id = $1 AND sa.is_active = true AND u.is_active = true
        `;
        
        const result = await pool.query(query, [decoded.userId]);
        
        if (result.rows.length === 0) {
            return res.status(403).json({ 
                success: false,
                error: 'Admin account not found or inactive',
                code: 'ADMIN_NOT_FOUND'
            });
        }

        const admin = result.rows[0];
        
        if (!admin.school_active || admin.school_status !== 'active') {
            return res.status(403).json({ 
                success: false,
                error: 'School is not active',
                code: 'SCHOOL_INACTIVE'
            });
        }

        // Get admin permissions
        const permissionsQuery = `
            SELECT permission_type, access_level
            FROM school_admin_permissions
            WHERE admin_id = $1
        `;
        
        const permissionsResult = await pool.query(permissionsQuery, [admin.id]);
        const permissions = permissionsResult.rows.reduce((acc, perm) => {
            acc[perm.permission_type] = perm.access_level;
            return acc;
        }, {});

        res.json({
            success: true,
            data: {
                admin: {
                    id: admin.id,
                    email: admin.email,
                    first_name: admin.first_name,
                    last_name: admin.last_name,
                    school: {
                        id: admin.school_id,
                        name: admin.school_name,
                        subdomain: admin.subdomain
                    },
                    permissions
                }
            }
        });

    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ 
                success: false,
                error: 'Invalid token',
                code: 'TOKEN_INVALID'
            });
        } else if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ 
                success: false,
                error: 'Token expired',
                code: 'TOKEN_EXPIRED'
            });
        } else {
            console.error('Token verification error:', error);
            res.status(500).json({ 
                success: false,
                error: 'Token verification failed',
                code: 'VERIFICATION_ERROR'
            });
        }
    }
});

// Change password
router.post('/change-password', async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const token = req.headers.authorization?.split(' ')[1];
        
        if (!token || !currentPassword || !newPassword) {
            return res.status(400).json({ 
                success: false,
                error: 'Token, current password, and new password are required',
                code: 'MISSING_DATA'
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ 
                success: false,
                error: 'New password must be at least 6 characters long',
                code: 'WEAK_PASSWORD'
            });
        }

        // Verify token and get admin
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        const query = `
            SELECT 
                sa.id,
                u.password_hash,
                u.email
            FROM school_admins sa 
            JOIN users u ON sa.user_id = u.id
            WHERE sa.id = $1 AND sa.is_active = true AND u.is_active = true
        `;
        
        const result = await pool.query(query, [decoded.userId]);
        
        if (result.rows.length === 0) {
            return res.status(403).json({ 
                success: false,
                error: 'Admin account not found or inactive',
                code: 'ADMIN_NOT_FOUND'
            });
        }

        const admin = result.rows[0];
        
        // Verify current password
        const isValidPassword = await bcrypt.compare(currentPassword, admin.password_hash);
        
        if (!isValidPassword) {
            return res.status(401).json({ 
                success: false,
                error: 'Current password is incorrect',
                code: 'INVALID_CURRENT_PASSWORD'
            });
        }

        // Hash new password
        const newPasswordHash = await bcrypt.hash(newPassword, 10);
        
        // Update password
        await pool.query(
            'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            [newPasswordHash, admin.id]
        );

        res.json({
            success: true,
            message: 'Password changed successfully'
        });

    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ 
                success: false,
                error: 'Invalid token',
                code: 'TOKEN_INVALID'
            });
        } else {
            console.error('Password change error:', error);
            res.status(500).json({ 
                success: false,
                error: 'Password change failed',
                code: 'PASSWORD_CHANGE_ERROR'
            });
        }
    }
});

module.exports = router;
