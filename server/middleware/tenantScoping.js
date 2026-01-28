// middleware/tenantScoping.js
// Middleware to extract and enforce school_id (tenant scoping)

const authenticateJWT = require('./auth').authenticateJWT;

/**
 * Middleware to attach school_id to req.tenant
 * Used by all multi-tenant routes
 * 
 * Requires:
 * - Authentication via JWT (req.user must exist)
 * - JWT must contain school_id or tenant_id
 */
const enforceMultiTenant = (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    // Extract tenant ID from JWT (school_id or tenant_id)
    const schoolId = req.user.school_id || req.user.tenant_id;
    
    if (!schoolId) {
      return res.status(403).json({ 
        message: 'User not assigned to a school/tenant' 
      });
    }

    // Attach to request for use in route handlers
    req.tenant = {
      schoolId,
      userId: req.user.id || req.user.user?.id,
      role: req.user.role || req.user.user?.role
    };

    console.log(`[Tenant] User ${req.tenant.userId} accessing school ${req.tenant.schoolId}`);
    next();
  } catch (err) {
    console.error('Multi-tenant middleware error:', err);
    res.status(500).json({ message: 'Tenant validation failed' });
  }
};

module.exports = {
  enforceMultiTenant
};
