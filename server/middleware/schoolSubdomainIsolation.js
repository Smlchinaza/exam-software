// School Subdomain Isolation Middleware
// This middleware ensures proper subdomain-based data isolation

const jwt = require('jsonwebtoken');
const pool = require('../db/postgres');

const schoolSubdomainIsolation = async (req, res, next) => {
    try {
        // Extract subdomain from request
        const host = req.headers.host;
        const subdomain = host ? host.split('.')[0] : null;
        
        req.subdomain = subdomain;
        
        // For API endpoints that require subdomain validation
        if (req.path.startsWith('/api/school-admin') || 
            req.path.startsWith('/api/teacher') || 
            req.path.startsWith('/api/student')) {
            
            if (!subdomain) {
                return res.status(400).json({ 
                    error: 'Subdomain required for this request',
                    code: 'SUBDOMAIN_REQUIRED',
                    message: 'Please access this endpoint through your school subdomain'
                });
            }

            // Get school information
            const schoolQuery = `
                SELECT id, name, subdomain, is_active, status
                FROM schools 
                WHERE subdomain = $1
            `;
            
            const schoolResult = await pool.query(schoolQuery, [subdomain]);
            
            if (schoolResult.rows.length === 0) {
                return res.status(404).json({ 
                    error: 'School not found',
                    code: 'SCHOOL_NOT_FOUND',
                    subdomain: subdomain
                });
            }

            const school = schoolResult.rows[0];
            
            if (!school.is_active || school.status !== 'active') {
                return res.status(403).json({ 
                    error: 'School is not active',
                    code: 'SCHOOL_INACTIVE',
                    subdomain: subdomain
                });
            }

            // Attach school info to request
            req.school = school;
            
            // For school admin routes, verify admin belongs to this school
            if (req.path.startsWith('/api/school-admin')) {
                const token = req.headers.authorization?.split(' ')[1];
                if (token) {
                    try {
                        const decoded = jwt.verify(token, process.env.JWT_SECRET);
                        
                        // Verify admin belongs to this school
                        const adminQuery = `
                            SELECT id, school_id, is_active 
                            FROM school_admins 
                            WHERE id = $1 AND school_id = $2 AND is_active = true
                        `;
                        
                        const adminResult = await pool.query(adminQuery, [decoded.userId, school.id]);
                        
                        if (adminResult.rows.length === 0) {
                            return res.status(403).json({ 
                                error: 'Admin access denied for this school',
                                code: 'ADMIN_ACCESS_DENIED',
                                subdomain: subdomain
                            });
                        }
                        
                        req.adminId = decoded.userId;
                        
                    } catch (error) {
                        // Token invalid, but let the auth middleware handle it
                        console.log('Token validation failed in subdomain middleware:', error.message);
                    }
                }
            }
        }
        
        next();
    } catch (error) {
        console.error('Subdomain isolation error:', error);
        res.status(500).json({ 
            error: 'Subdomain validation failed',
            code: 'SUBDOMAIN_ERROR'
        });
    }
};

// Middleware to validate school data access
const validateSchoolDataAccess = (resourceType) => {
    return async (req, res, next) => {
        try {
            if (!req.school) {
                return res.status(400).json({ 
                    error: 'School context not available',
                    code: 'NO_SCHOOL_CONTEXT'
                });
            }

            const schoolId = req.school.id;
            const resourceId = req.params.id || req.params.userId || req.params.examId;
            
            if (!resourceId) {
                return res.status(400).json({ 
                    error: 'Resource ID is required',
                    code: 'RESOURCE_ID_REQUIRED'
                });
            }

            let query = '';
            let queryParams = [];

            switch (resourceType) {
                case 'user':
                    query = 'SELECT school_id FROM users WHERE id = $1';
                    queryParams = [resourceId];
                    break;
                case 'exam':
                    query = 'SELECT school_id FROM exams WHERE id = $1';
                    queryParams = [resourceId];
                    break;
                case 'submission':
                    query = 'SELECT school_id FROM exam_submissions WHERE id = $1';
                    queryParams = [resourceId];
                    break;
                case 'question':
                    query = 'SELECT school_id FROM questions WHERE id = $1';
                    queryParams = [resourceId];
                    break;
                default:
                    return res.status(400).json({ 
                        error: 'Invalid resource type',
                        code: 'INVALID_RESOURCE_TYPE'
                    });
            }

            const result = await pool.query(query, queryParams);
            
            if (result.rows.length === 0) {
                return res.status(404).json({ 
                    error: `${resourceType} not found`,
                    code: 'RESOURCE_NOT_FOUND'
                });
            }

            const resourceSchoolId = result.rows[0].school_id;
            
            if (resourceSchoolId !== schoolId) {
                return res.status(403).json({ 
                    error: `Access denied: ${resourceType} does not belong to this school`,
                    code: 'CROSS_SCHOOL_ACCESS_DENIED',
                    resourceSchool: resourceSchoolId,
                    requestSchool: schoolId
                });
            }

            next();
        } catch (error) {
            console.error('School data access validation error:', error);
            res.status(500).json({ 
                error: 'Data access validation failed',
                code: 'VALIDATION_ERROR'
            });
        }
    };
};

// Middleware to add school context to queries
const addSchoolContext = (req, res, next) => {
    if (req.school) {
        // Add school context to request for use in route handlers
        req.schoolContext = {
            schoolId: req.school.id,
            subdomain: req.school.subdomain,
            schoolName: req.school.name
        };
    }
    next();
};

// Middleware to check if user can access school data
const checkSchoolAccess = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({ 
                error: 'Authentication required',
                code: 'AUTH_REQUIRED'
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const schoolId = req.school ? req.school.id : null;
        
        if (!schoolId) {
            return res.status(400).json({ 
                error: 'School context required',
                code: 'SCHOOL_CONTEXT_REQUIRED'
            });
        }

        // Check if user belongs to this school
        const userQuery = `
            SELECT id, school_id, role, is_active 
            FROM users 
            WHERE id = $1 AND school_id = $2 AND is_active = true
        `;
        
        const userResult = await pool.query(userQuery, [decoded.userId, schoolId]);
        
        if (userResult.rows.length === 0) {
            return res.status(403).json({ 
                error: 'User does not belong to this school',
                code: 'USER_NOT_IN_SCHOOL'
            });
        }

        const user = userResult.rows[0];
        req.user = user;
        
        // For teachers, check if registration is approved
        if (user.role === 'teacher') {
            const teacherRegQuery = `
                SELECT status FROM teacher_registrations 
                WHERE user_id = $1 AND school_id = $2
            `;
            
            const regResult = await pool.query(teacherRegQuery, [user.id, schoolId]);
            
            if (regResult.rows.length === 0 || regResult.rows[0].status !== 'approved') {
                return res.status(403).json({ 
                    error: 'Teacher registration not approved',
                    code: 'TEACHER_NOT_APPROVED'
                });
            }
        }

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
            console.error('School access check error:', error);
            res.status(500).json({ 
                error: 'School access check failed',
                code: 'SCHOOL_ACCESS_ERROR'
            });
        }
    }
};

module.exports = {
    schoolSubdomainIsolation,
    validateSchoolDataAccess,
    addSchoolContext,
    checkSchoolAccess
};
