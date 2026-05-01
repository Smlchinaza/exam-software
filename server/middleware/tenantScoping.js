// middleware/tenantScoping.js
// Enhanced middleware for multi-tenant data isolation with school-based filtering

const authenticateJWT = require('./auth').authenticateJWT;

/**
 * Enhanced tenant scoping middleware with comprehensive school-based filtering
 * Enforces data isolation between schools and prevents cross-tenant access
 */
const enforceMultiTenant = (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Authentication required',
        message: 'Authentication is required to access this resource'
      });
    }

    // Extract school ID from JWT or request context
    const schoolId = req.user.school_id || req.user.tenant_id || req.schoolId;
    
    if (!schoolId) {
      return res.status(403).json({ 
        error: 'No school context',
        message: 'User is not assigned to a school'
      });
    }

    // Validate school context if available
    if (req.schoolContext && req.schoolContext.id !== schoolId) {
      return res.status(403).json({
        error: 'Cross-school access denied',
        message: 'You cannot access data from a different school'
      });
    }

    // Attach enhanced tenant context to request
    req.tenant = {
      schoolId,
      userId: req.user.id || req.user.user?.id,
      role: req.user.role || req.user.user?.role,
      isSuperAdmin: req.user.isSuperAdmin || req.user.role === 'super_admin',
      schoolContext: req.schoolContext || null
    };

    // Enhanced logging for security auditing
    console.log(`[TenantScoping] User ${req.tenant.userId} (${req.tenant.role}) accessing school ${req.tenant.schoolId}`);
    
    next();
  } catch (err) {
    console.error('Tenant scoping middleware error:', err);
    res.status(500).json({ 
      error: 'Tenant validation failed',
      message: 'Unable to validate school context'
    });
  }
};

/**
 * Automatic school ID injection middleware
 * Automatically adds school_id to queries and request bodies
 */
const injectSchoolId = (req, res, next) => {
  try {
    if (!req.tenant || !req.tenant.schoolId) {
      return res.status(403).json({
        error: 'No tenant context',
        message: 'School context is required for this operation'
      });
    }

    const schoolId = req.tenant.schoolId;

    // Inject school_id into query parameters
    if (req.query && !req.query.school_id) {
      req.query.school_id = schoolId;
    }

    // Inject school_id into request body for POST/PUT/PATCH requests
    if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body) {
      if (!req.body.school_id) {
        req.body.school_id = schoolId;
      } else if (req.body.school_id !== schoolId) {
        return res.status(403).json({
          error: 'School ID mismatch',
          message: 'Cannot modify data for a different school'
        });
      }
    }

    // Add school context for logging
    req.schoolContext = req.tenant.schoolContext;

    next();
  } catch (err) {
    console.error('School ID injection error:', err);
    res.status(500).json({
      error: 'School context injection failed',
      message: 'Unable to inject school context'
    });
  }
};

/**
 * Cross-access prevention middleware
 * Prevents users from accessing data from other schools
 */
const preventCrossSchoolAccess = (req, res, next) => {
  try {
    // Super admins can access any school
    if (req.tenant && req.tenant.isSuperAdmin) {
      return next();
    }

    // For other users, ensure they're accessing their own school
    const requestSchoolId = req.query.school_id || req.body.school_id || req.tenant?.schoolId;
    const userSchoolId = req.tenant?.schoolId;

    if (!requestSchoolId || !userSchoolId) {
      return res.status(403).json({
        error: 'School context required',
        message: 'School context is required for this operation'
      });
    }

    if (requestSchoolId !== userSchoolId) {
      // Log security violation
      console.warn(`[Security] Cross-school access attempt: User ${req.tenant.userId} trying to access school ${requestSchoolId} while belonging to ${userSchoolId}`);
      
      return res.status(403).json({
        error: 'Cross-school access denied',
        message: 'You cannot access data from other schools'
      });
    }

    next();
  } catch (err) {
    console.error('Cross-school access prevention error:', err);
    res.status(500).json({
      error: 'Access control failed',
      message: 'Unable to validate school access'
    });
  }
};

/**
 * Tenant-aware query builder
 * Helper function to build tenant-scoped queries
 */
const buildTenantQuery = (baseQuery, schoolId, additionalConditions = {}) => {
  const conditions = [`school_id = $1`];
  const values = [schoolId];
  let paramIndex = 2;

  // Add additional conditions
  Object.entries(additionalConditions).forEach(([key, value]) => {
    conditions.push(`${key} = $${paramIndex}`);
    values.push(value);
    paramIndex++;
  });

  const whereClause = conditions.join(' AND ');
  return {
    query: baseQuery.replace('WHERE 1=1', `WHERE ${whereClause}`),
    values
  };
};

/**
 * Validate tenant access to specific resource
 */
const validateTenantResourceAccess = (req, resourceId, resourceType = 'resource') => {
  return async (req, res, next) => {
    try {
      if (!req.tenant || !req.tenant.schoolId) {
        return res.status(403).json({
          error: 'No tenant context',
          message: 'School context is required'
        });
      }

      // Super admins can access any resource
      if (req.tenant.isSuperAdmin) {
        return next();
      }

      // For other users, validate resource belongs to their school
      const pool = require('../db/postgres');
      
      let query = '';
      switch (resourceType) {
        case 'exam':
          query = 'SELECT school_id FROM exams WHERE id = $1';
          break;
        case 'user':
          query = 'SELECT school_id FROM users WHERE id = $1';
          break;
        case 'student':
          query = 'SELECT school_id FROM users WHERE id = $1 AND role = \'student\'';
          break;
        case 'submission':
          query = 'SELECT school_id FROM exam_submissions WHERE id = $1';
          break;
        default:
          return next(); // Skip validation for unknown resource types
      }

      const result = await pool.query(query, [resourceId]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({
          error: 'Resource not found',
          message: `${resourceType} not found`
        });
      }

      const resourceSchoolId = result.rows[0].school_id;
      
      if (resourceSchoolId !== req.tenant.schoolId) {
        console.warn(`[Security] Cross-school resource access: User ${req.tenant.userId} trying to access ${resourceType} ${resourceId} from school ${resourceSchoolId} while belonging to ${req.tenant.schoolId}`);
        
        return res.status(403).json({
          error: 'Access denied',
          message: `You cannot access this ${resourceType} as it belongs to a different school`
        });
      }

      next();
    } catch (err) {
      console.error('Tenant resource validation error:', err);
      res.status(500).json({
        error: 'Resource validation failed',
        message: 'Unable to validate resource access'
      });
    }
  };
};

/**
 * Optional tenant scoping (for public endpoints that may have optional auth)
 */
const optionalTenantScoping = (req, res, next) => {
  try {
    // If user is authenticated, apply tenant scoping
    if (req.user && (req.user.school_id || req.user.tenant_id)) {
      return enforceMultiTenant(req, res, next);
    }
    
    // Otherwise, continue without tenant context
    req.tenant = null;
    next();
  } catch (err) {
    console.error('Optional tenant scoping error:', err);
    req.tenant = null;
    next();
  }
};

module.exports = {
  enforceMultiTenant,
  injectSchoolId,
  preventCrossSchoolAccess,
  buildTenantQuery,
  validateTenantResourceAccess,
  optionalTenantScoping
};
