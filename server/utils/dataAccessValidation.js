// Data Access Validation Utilities
// Provides functions to validate and enforce school data isolation

const pool = require('../db/postgres');

/**
 * Validate that a user belongs to a specific school
 */
const validateUserSchoolAccess = async (userId, schoolId) => {
    try {
        const query = `
            SELECT id, school_id, role, is_active 
            FROM users 
            WHERE id = $1 AND school_id = $2
        `;
        
        const result = await pool.query(query, [userId, schoolId]);
        
        if (result.rows.length === 0) {
            return { 
                authorized: false, 
                reason: 'User not found in school',
                userId,
                schoolId
            };
        }

        const user = result.rows[0];
        
        if (!user.is_active) {
            return { 
                authorized: false, 
                reason: 'User account is inactive',
                userId
            };
        }

        // For teachers, check if registration is approved
        if (user.role === 'teacher') {
            const regQuery = `
                SELECT status FROM teacher_registrations 
                WHERE user_id = $1 AND school_id = $2
            `;
            
            const regResult = await pool.query(regQuery, [userId, schoolId]);
            
            if (regResult.rows.length === 0 || regResult.rows[0].status !== 'approved') {
                return { 
                    authorized: false, 
                    reason: 'Teacher registration not approved',
                    userId
                };
            }
        }

        return { authorized: true, user };
    } catch (error) {
        console.error('User school access validation error:', error);
        return { 
            authorized: false, 
            reason: 'Validation error',
            error: error.message
        };
    }
};

/**
 * Validate that a resource belongs to a specific school
 */
const validateSchoolResourceAccess = async (resourceType, resourceId, schoolId) => {
    try {
        let query = '';
        let queryParams = [];

        switch (resourceType) {
            case 'exam':
                query = 'SELECT id, school_id, title FROM exams WHERE id = $1';
                queryParams = [resourceId];
                break;
            
            case 'question':
                query = 'SELECT id, school_id, exam_id FROM questions WHERE id = $1';
                queryParams = [resourceId];
                break;
            
            case 'submission':
                query = 'SELECT id, school_id, exam_id, student_id FROM exam_submissions WHERE id = $1';
                queryParams = [resourceId];
                break;
            
            case 'answer':
                query = `
                    SELECT ea.id, ea.school_id, es.exam_id, es.student_id 
                    FROM exam_answers ea
                    JOIN exam_submissions es ON ea.submission_id = es.id
                    WHERE ea.id = $1
                `;
                queryParams = [resourceId];
                break;
            
            case 'user':
                query = 'SELECT id, school_id, email, role FROM users WHERE id = $1';
                queryParams = [resourceId];
                break;
            
            case 'teacher_registration':
                query = 'SELECT id, school_id, user_id, status FROM teacher_registrations WHERE id = $1';
                queryParams = [resourceId];
                break;
            
            case 'school_admin':
                query = 'SELECT id, school_id, user_id, is_active FROM school_admins WHERE id = $1';
                queryParams = [resourceId];
                break;
            
            default:
                return { 
                    authorized: false, 
                    reason: 'Invalid resource type',
                    resourceType
                };
        }

        const result = await pool.query(query, queryParams);
        
        if (result.rows.length === 0) {
            return { 
                authorized: false, 
                reason: `${resourceType} not found`,
                resourceType,
                resourceId
            };
        }

        const resource = result.rows[0];
        
        if (resource.school_id !== schoolId) {
            return { 
                authorized: false, 
                reason: 'Resource does not belong to this school',
                resourceType,
                resourceId,
                resourceSchool: resource.school_id,
                requestSchool: schoolId
            };
        }

        return { authorized: true, resource };
    } catch (error) {
        console.error('School resource access validation error:', error);
        return { 
            authorized: false, 
            reason: 'Validation error',
            error: error.message
        };
    }
};

/**
 * Check if a school admin has specific permission
 */
const checkSchoolAdminPermission = async (adminId, permissionType, requiredAccessLevel = 'read') => {
    try {
        const query = `
            SELECT check_school_admin_permission($1, $2, $3) as has_permission
        `;
        
        const result = await pool.query(query, [adminId, permissionType, requiredAccessLevel]);
        
        return { 
            authorized: result.rows[0].has_permission,
            adminId,
            permissionType,
            requiredAccessLevel
        };
    } catch (error) {
        console.error('School admin permission check error:', error);
        return { 
            authorized: false, 
            reason: 'Permission check failed',
            error: error.message
        };
    }
};

/**
 * Validate cross-school data access prevention
 */
const preventCrossSchoolAccess = async (req, res, next) => {
    try {
        const schoolId = req.school ? req.school.id : null;
        
        if (!schoolId) {
            return res.status(400).json({ 
                error: 'School context required',
                code: 'NO_SCHOOL_CONTEXT'
            });
        }

        // Validate all resource IDs in the request
        const resourceIds = {
            userId: req.params.userId,
            examId: req.params.examId,
            questionId: req.params.questionId,
            submissionId: req.params.submissionId,
            registrationId: req.params.registrationId,
            adminId: req.params.adminId
        };

        for (const [resourceType, resourceId] of Object.entries(resourceIds)) {
            if (resourceId) {
                const validation = await validateSchoolResourceAccess(
                    resourceType.replace('Id', ''), 
                    resourceId, 
                    schoolId
                );
                
                if (!validation.authorized) {
                    return res.status(403).json({ 
                        error: validation.reason,
                        code: 'CROSS_SCHOOL_ACCESS_DENIED',
                        resourceType,
                        resourceId
                    });
                }
            }
        }

        next();
    } catch (error) {
        console.error('Cross-school access prevention error:', error);
        res.status(500).json({ 
            error: 'Access validation failed',
            code: 'ACCESS_VALIDATION_ERROR'
        });
    }
};

/**
 * Build school-isolated query
 */
const buildSchoolIsolatedQuery = (baseQuery, schoolId, additionalConditions = []) => {
    let query = baseQuery;
    let conditions = [`school_id = $${additionalConditions.length + 1}`];
    
    // Add additional conditions
    conditions.push(...additionalConditions);
    
    // Add WHERE clause if not present
    if (!query.toLowerCase().includes('where')) {
        query += ' WHERE ' + conditions.join(' AND ');
    } else {
        query += ' AND ' + conditions.join(' AND ');
    }
    
    return { query, params: [schoolId, ...additionalConditions.slice(1)] };
};

/**
 * Audit trail for data access
 */
const logDataAccess = async (userId, schoolId, action, resourceType, resourceId, accessGranted) => {
    try {
        const auditQuery = `
            INSERT INTO data_access_logs 
            (user_id, school_id, action, resource_type, resource_id, access_granted, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
        `;
        
        await pool.query(auditQuery, [userId, schoolId, action, resourceType, resourceId, accessGranted]);
    } catch (error) {
        console.error('Audit log error:', error);
        // Don't fail the request if audit logging fails
    }
};

/**
 * Comprehensive data access validator
 */
const validateDataAccess = async (req, res, next) => {
    try {
        const schoolId = req.school ? req.school.id : null;
        const userId = req.user ? req.user.id : null;
        
        if (!schoolId) {
            return res.status(400).json({ 
                error: 'School context required',
                code: 'NO_SCHOOL_CONTEXT'
            });
        }

        if (!userId) {
            return res.status(401).json({ 
                error: 'User authentication required',
                code: 'AUTH_REQUIRED'
            });
        }

        // Validate user belongs to school
        const userValidation = await validateUserSchoolAccess(userId, schoolId);
        
        if (!userValidation.authorized) {
            await logDataAccess(userId, schoolId, 'ACCESS_DENIED', 'user', userId, false);
            return res.status(403).json({ 
                error: userValidation.reason,
                code: 'USER_ACCESS_DENIED'
            });
        }

        // Validate school admin permissions if applicable
        if (req.user && req.user.role === 'school_admin') {
            const requiredPermission = getRequiredPermission(req.method, req.path);
            
            if (requiredPermission) {
                const permissionCheck = await checkSchoolAdminPermission(
                    userId, 
                    requiredPermission.type, 
                    requiredPermission.level
                );
                
                if (!permissionCheck.authorized) {
                    await logDataAccess(userId, schoolId, 'ACCESS_DENIED', 'permission', userId, false);
                    return res.status(403).json({ 
                        error: 'Insufficient permissions',
                        code: 'INSUFFICIENT_PERMISSIONS',
                        required: requiredPermission
                    });
                }
            }
        }

        // Log successful access
        await logDataAccess(userId, schoolId, 'ACCESS_GRANTED', 'request', req.path, true);
        
        next();
    } catch (error) {
        console.error('Data access validation error:', error);
        res.status(500).json({ 
            error: 'Data access validation failed',
            code: 'VALIDATION_ERROR'
        });
    }
};

/**
 * Get required permission based on HTTP method and path
 */
const getRequiredPermission = (method, path) => {
    const permissionMap = {
        'GET': {
            '/dashboard/stats': { type: 'analytics', level: 'read' },
            '/dashboard/activity': { type: 'analytics', level: 'read' },
            '/dashboard/teachers': { type: 'teachers', level: 'read' },
            '/dashboard/students': { type: 'students', level: 'read' },
            '/dashboard/exams': { type: 'exams', level: 'read' },
            '/teacher-registrations': { type: 'teachers', level: 'read' },
            '/teacher-registrations/pending': { type: 'teachers', level: 'read' }
        },
        'POST': {
            '/teacher-registrations': { type: 'teachers', level: 'write' },
            '/teacher-registrations/*/approve': { type: 'teachers', level: 'write' },
            '/teacher-registrations/*/reject': { type: 'teachers', level: 'write' }
        }
    };

    const methodPermissions = permissionMap[method];
    if (!methodPermissions) return null;

    for (const [pattern, permission] of Object.entries(methodPermissions)) {
        if (path.match(pattern.replace('*', '.*'))) {
            return permission;
        }
    }

    return null;
};

module.exports = {
    validateUserSchoolAccess,
    validateSchoolResourceAccess,
    checkSchoolAdminPermission,
    preventCrossSchoolAccess,
    buildSchoolIsolatedQuery,
    logDataAccess,
    validateDataAccess
};
