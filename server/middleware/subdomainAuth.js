// Subdomain Authentication Middleware
// Validates JWT tokens on subdomain requests and ensures user belongs to the school

const jwt = require('jsonwebtoken');
const UserPostgres = require('../models/users/UserPostgres');
const { validateUserSchoolMembership, getRoleBasedRedirectUrl } = require('../utils/subdomain');

/**
 * Subdomain Authentication Middleware
 * Validates JWT tokens and ensures user belongs to the requested subdomain's school
 */
const subdomainAuth = async (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.header('Authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        error: 'No token provided',
        message: 'Authentication token is required'
      });
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (!decoded.id) {
      return res.status(401).json({
        error: 'Invalid token',
        message: 'Token does not contain valid user ID'
      });
    }

    // Get user with school context
    const user = await UserPostgres.getWithContext(decoded.id);
    
    if (!user) {
      return res.status(401).json({
        error: 'User not found',
        message: 'The user associated with this token no longer exists'
      });
    }

    // Check if user is active
    if (!user.is_active) {
      return res.status(403).json({
        error: 'Account disabled',
        message: 'Your account has been disabled'
      });
    }

    // Check if teacher is approved
    if (user.role === 'teacher' && !user.approved) {
      return res.status(403).json({
        error: 'Account not approved',
        message: 'Your teacher registration is pending admin approval'
      });
    }

    // Validate school membership if school context is available
    if (req.schoolContext && !validateUserSchoolMembership(user, req.schoolContext)) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You do not belong to this school'
      });
    }

    // Attach user and school context to request
    req.user = user;
    req.schoolId = user.school_id;
    req.schoolContext = req.schoolContext || null;
    req.subdomain = req.subdomain || null;

    next();

  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        error: 'Invalid token',
        message: 'The provided token is not valid'
      });
    } else if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Token expired',
        message: 'Your session has expired, please login again'
      });
    } else {
      console.error('Subdomain authentication error:', error);
      return res.status(500).json({
        error: 'Authentication failed',
        message: 'Unable to authenticate your request'
      });
    }
  }
};

/**
 * Optional Subdomain Authentication
 * Similar to subdomainAuth but allows requests without tokens (for public endpoints)
 */
const optionalSubdomainAuth = async (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.header('Authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    if (!token) {
      // No token provided, continue without authentication
      req.user = null;
      req.schoolId = null;
      return next();
    }

    // Verify token and get user
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await UserPostgres.getWithContext(decoded.id);
    
    if (!user || !user.is_active) {
      req.user = null;
      req.schoolId = null;
      return next();
    }

    // Validate school membership if school context is available
    if (req.schoolContext && !validateUserSchoolMembership(user, req.schoolContext)) {
      req.user = null;
      req.schoolId = null;
      return next();
    }

    // Attach user and school context to request
    req.user = user;
    req.schoolId = user.school_id;
    req.schoolContext = req.schoolContext || null;
    req.subdomain = req.subdomain || null;

    next();

  } catch (error) {
    // Invalid token, continue without authentication
    req.user = null;
    req.schoolId = null;
    next();
  }
};

/**
 * School Admin Authentication
 * Ensures user is a school admin (teacher or admin role with proper permissions)
 */
const schoolAdminAuth = async (req, res, next) => {
  try {
    // First run subdomain authentication
    await subdomainAuth(req, res, () => {
      // Check if user has admin privileges for this school
      const user = req.user;
      
      if (!user) {
        return res.status(401).json({
          error: 'Authentication required',
          message: 'You must be logged in to access this resource'
        });
      }

      // Super admins can access any school
      if (user.role === 'super_admin') {
        return next();
      }

      // School admins and teachers can access their own school
      if (user.role === 'admin' || user.role === 'teacher') {
        if (req.schoolContext && user.school_id === req.schoolContext.id) {
          return next();
        } else {
          return res.status(403).json({
            error: 'Access denied',
            message: 'You can only admin your own school'
          });
        }
      }

      // Other roles are not allowed
      return res.status(403).json({
        error: 'Access denied',
        message: 'You do not have admin privileges'
      });
    });

  } catch (error) {
    console.error('School admin authentication error:', error);
    return res.status(500).json({
      error: 'Authentication failed',
      message: 'Unable to authenticate admin request'
    });
  }
};

/**
 * Teacher Authentication
 * Ensures user is a teacher with proper school membership
 */
const teacherAuth = async (req, res, next) => {
  try {
    // First run subdomain authentication
    await subdomainAuth(req, res, () => {
      const user = req.user;
      
      if (!user) {
        return res.status(401).json({
          error: 'Authentication required',
          message: 'You must be logged in to access this resource'
        });
      }

      // Check if user is a teacher
      if (user.role !== 'teacher') {
        return res.status(403).json({
          error: 'Access denied',
          message: 'This resource is only available to teachers'
        });
      }

      // Check if teacher is approved
      if (!user.approved) {
        return res.status(403).json({
          error: 'Account not approved',
          message: 'Your teacher registration is pending approval'
        });
      }

      // Validate school membership
      if (req.schoolContext && user.school_id !== req.schoolContext.id) {
        return res.status(403).json({
          error: 'Access denied',
          message: 'You can only access your own school'
        });
      }

      next();
    });

  } catch (error) {
    console.error('Teacher authentication error:', error);
    return res.status(500).json({
      error: 'Authentication failed',
      message: 'Unable to authenticate teacher request'
    });
  }
};

/**
 * Student Authentication
 * Ensures user is a student with proper school membership
 */
const studentAuth = async (req, res, next) => {
  try {
    // First run subdomain authentication
    await subdomainAuth(req, res, () => {
      const user = req.user;
      
      if (!user) {
        return res.status(401).json({
          error: 'Authentication required',
          message: 'You must be logged in to access this resource'
        });
      }

      // Check if user is a student
      if (user.role !== 'student') {
        return res.status(403).json({
          error: 'Access denied',
          message: 'This resource is only available to students'
        });
      }

      // Validate school membership
      if (req.schoolContext && user.school_id !== req.schoolContext.id) {
        return res.status(403).json({
          error: 'Access denied',
          message: 'You can only access your own school'
        });
      }

      next();
    });

  } catch (error) {
    console.error('Student authentication error:', error);
    return res.status(500).json({
      error: 'Authentication failed',
      message: 'Unable to authenticate student request'
    });
  }
};

/**
 * Cross-School Access Prevention
 * Prevents users from accessing data from other schools
 */
const preventCrossSchoolAccess = (req, res, next) => {
  try {
    const user = req.user;
    const schoolContext = req.schoolContext;
    
    // If no school context, allow (for main domain endpoints)
    if (!schoolContext) {
      return next();
    }
    
    // Super admins can access any school
    if (user && user.role === 'super_admin') {
      return next();
    }
    
    // For other users, ensure they belong to this school
    if (!user || !user.school_id || user.school_id !== schoolContext.id) {
      return res.status(403).json({
        error: 'Cross-school access denied',
        message: 'You cannot access data from other schools'
      });
    }
    
    next();
    
  } catch (error) {
    console.error('Cross-school access prevention error:', error);
    return res.status(500).json({
      error: 'Access control failed',
      message: 'Unable to validate school access'
    });
  }
};

/**
 * Generate school-specific JWT payload
 */
const generateSchoolJWTPayload = (user, schoolContext = null) => {
  const payload = {
    id: user.id,
    email: user.email,
    role: user.role,
    school_id: user.school_id
  };
  
  // Add school context if available
  if (schoolContext) {
    payload.school_name = schoolContext.name;
    payload.school_domain = schoolContext.domain;
    payload.school_subdomain = schoolContext.subdomain;
  }
  
  return payload;
};

module.exports = {
  subdomainAuth,
  optionalSubdomainAuth,
  schoolAdminAuth,
  teacherAuth,
  studentAuth,
  preventCrossSchoolAccess,
  generateSchoolJWTPayload
};
