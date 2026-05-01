// School Admin Authentication Middleware
// This middleware handles authentication and authorization for school admin routes

const jwt = require('jsonwebtoken');
const pool = require('../db/postgres');

const schoolAdminAuth = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ 
                error: 'No token provided',
                code: 'TOKEN_MISSING'
            });
        }

        // Verify JWT token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Get school admin details with school information
        const adminQuery = `
            SELECT 
                sa.id,
                sa.user_id,
                sa.school_id,
                sa.permissions,
                sa.is_active,
                sa.last_login,
                sa.created_at,
                u.email,
                u.first_name,
                u.last_name,
                u.role,
                s.name as school_name,
                s.subdomain,
                s.is_active as school_active,
                s.status as school_status
            FROM school_admins sa 
            JOIN users u ON sa.user_id = u.id
            JOIN schools s ON sa.school_id = s.id 
            WHERE sa.id = $1 AND sa.is_active = true AND u.is_active = true
        `;
        
        const adminResult = await pool.query(adminQuery, [decoded.userId]);
        
        if (adminResult.rows.length === 0) {
            return res.status(403).json({ 
                error: 'Invalid school admin credentials',
                code: 'ADMIN_NOT_FOUND'
            });
        }

        const admin = adminResult.rows[0];

        // Check if school is active
        if (!admin.school_active || admin.school_status !== 'active') {
            return res.status(403).json({ 
                error: 'School is not active',
                code: 'SCHOOL_INACTIVE'
            });
        }

        // Verify subdomain matches admin's school
        const adminSubdomain = admin.subdomain;
        const requestSubdomain = req.subdomain;
        
        if (adminSubdomain !== requestSubdomain) {
            return res.status(403).json({ 
                error: 'Subdomain mismatch - access denied',
                code: 'SUBDOMAIN_MISMATCH',
                expected: adminSubdomain,
                received: requestSubdomain
            });
        }

        // Attach admin info to request
        req.admin = admin;
        
        // Update last login
        await pool.query(
            'UPDATE school_admins SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
            [admin.id]
        );

        next();
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ 
                error: 'Invalid token',
                code: 'TOKEN_INVALID'
            });
        } else if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ 
                error: 'Token expired',
                code: 'TOKEN_EXPIRED'
            });
        } else {
            console.error('School admin auth error:', error);
            return res.status(500).json({ 
                error: 'Authentication error',
                code: 'AUTH_ERROR'
            });
        }
    }
};

// Permission checking middleware
const checkPermission = (permissionType, requiredAccessLevel = 'read') => {
    return async (req, res, next) => {
        try {
            if (!req.admin) {
                return res.status(401).json({ 
                    error: 'Admin not authenticated',
                    code: 'NOT_AUTHENTICATED'
                });
            }

            // Check permission using database function
            const permissionQuery = `
                SELECT check_school_admin_permission($1, $2, $3) as has_permission
            `;
            
            const result = await pool.query(permissionQuery, [
                req.admin.id, 
                permissionType, 
                requiredAccessLevel
            ]);
            
            const hasPermission = result.rows[0].has_permission;
            
            if (!hasPermission) {
                return res.status(403).json({ 
                    error: `Insufficient permissions for ${permissionType}`,
                    code: 'INSUFFICIENT_PERMISSIONS',
                    required: requiredAccessLevel,
                    permission: permissionType
                });
            }

            next();
        } catch (error) {
            console.error('Permission check error:', error);
            return res.status(500).json({ 
                error: 'Permission check failed',
                code: 'PERMISSION_ERROR'
            });
        }
    };
};

// School data access validation middleware
const validateSchoolDataAccess = async (req, res, next) => {
    try {
        if (!req.admin) {
            return res.status(401).json({ 
                error: 'Admin not authenticated',
                code: 'NOT_AUTHENTICATED'
            });
        }

        const schoolId = req.admin.school_id;
        
        // Validate that requested resource belongs to admin's school
        if (req.params.userId) {
            const userQuery = `
                SELECT school_id FROM users 
                WHERE id = $1 AND school_id = $2
            `;
            const userResult = await pool.query(userQuery, [req.params.userId, schoolId]);
            
            if (userResult.rows.length === 0) {
                return res.status(403).json({ 
                    error: 'User not found in your school',
                    code: 'USER_NOT_IN_SCHOOL'
                });
            }
        }

        if (req.params.examId) {
            const examQuery = `
                SELECT school_id FROM exams 
                WHERE id = $1 AND school_id = $2
            `;
            const examResult = await pool.query(examQuery, [req.params.examId, schoolId]);
            
            if (examResult.rows.length === 0) {
                return res.status(403).json({ 
                    error: 'Exam not found in your school',
                    code: 'EXAM_NOT_IN_SCHOOL'
                });
            }
        }

        next();
    } catch (error) {
        console.error('School data access validation error:', error);
        return res.status(500).json({ 
            error: 'Data access validation failed',
            code: 'VALIDATION_ERROR'
        });
    }
};

module.exports = {
    schoolAdminAuth,
    checkPermission,
    validateSchoolDataAccess
};
