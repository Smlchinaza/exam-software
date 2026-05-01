// Subdomain Utilities
// Helper functions for subdomain extraction, validation, and routing

/**
 * Extract subdomain from request hostname
 * @param {string} hostname - Request hostname (e.g., 'schoolname.schoolshubs.com')
 * @returns {string|null} - Subdomain (e.g., 'schoolname') or null
 */
const extractSubdomain = (hostname) => {
  if (!hostname) return null;
  
  // Remove port if present
  const hostWithoutPort = hostname.split(':')[0];
  
  // Split hostname into parts
  const parts = hostWithoutPort.split('.');
  
  // Need at least 3 parts for subdomain (subdomain.domain.tld)
  if (parts.length < 3) return null;
  
  // Extract subdomain (first part)
  const subdomain = parts[0];
  
  // Validate subdomain format
  if (!/^[a-z0-9-]+$/.test(subdomain)) return null;
  
  // Exclude common subdomains that aren't schools
  const excludedSubdomains = ['www', 'api', 'admin', 'mail', 'ftp', 'test', 'dev', 'staging'];
  if (excludedSubdomains.includes(subdomain)) return null;
  
  return subdomain.toLowerCase();
};

/**
 * Validate subdomain format
 * @param {string} subdomain - Subdomain to validate
 * @returns {boolean} - True if valid
 */
const validateSubdomain = (subdomain) => {
  if (!subdomain) return false;
  
  // Length constraints
  if (subdomain.length < 3 || subdomain.length > 63) return false;
  
  // Format validation
  const subdomainRegex = /^[a-z0-9-]+$/;
  if (!subdomainRegex.test(subdomain)) return false;
  
  // Cannot start or end with hyphen
  if (subdomain.startsWith('-') || subdomain.endsWith('-')) return false;
  
  // Cannot have consecutive hyphens
  if (subdomain.includes('--')) return false;
  
  return true;
};

/**
 * Generate school domain from subdomain
 * @param {string} subdomain - Valid subdomain
 * @param {string} baseDomain - Base domain (e.g., 'schoolshubs.com')
 * @returns {string} - Full domain (e.g., 'schoolname.schoolshubs.com')
 */
const generateSchoolDomain = (subdomain, baseDomain = 'schoolshubs.com') => {
  if (!validateSubdomain(subdomain)) return null;
  
  return `${subdomain}.${baseDomain}`;
};

/**
 * Check if hostname represents a school subdomain
 * @param {string} hostname - Request hostname
 * @param {string} baseDomain - Base domain to check against
 * @returns {boolean} - True if it's a school subdomain
 */
const isSchoolSubdomain = (hostname, baseDomain = 'schoolshubs.com') => {
  const subdomain = extractSubdomain(hostname);
  if (!subdomain) return false;
  
  const expectedDomain = generateSchoolDomain(subdomain, baseDomain);
  return hostname === expectedDomain || hostname.endsWith(`.${expectedDomain}`);
};

/**
 * Get school context from subdomain
 * @param {string} hostname - Request hostname
 * @param {object} pool - PostgreSQL connection pool
 * @returns {Promise<object|null>} - School context or null
 */
const getSchoolContextFromSubdomain = async (hostname, pool) => {
  const subdomain = extractSubdomain(hostname);
  if (!subdomain) return null;
  
  try {
    const query = `
      SELECT 
        id, name, domain, subdomain, status, is_verified, is_public,
        city, state_id, type, phone, email, description
      FROM schools 
      WHERE domain LIKE $1 OR subdomain = $2
      AND status = 'active' AND is_verified = true
    `;
    
    const result = await pool.query(query, [`%${subdomain}%`, subdomain]);
    
    if (result.rows.length === 0) return null;
    
    // Return the first matching school
    const school = result.rows[0];
    
    return {
      id: school.id,
      name: school.name,
      domain: school.domain,
      subdomain: subdomain,
      status: school.status,
      isVerified: school.is_verified,
      isPublic: school.is_public,
      city: school.city,
      stateId: school.state_id,
      type: school.type,
      phone: school.phone,
      email: school.email,
      description: school.description
    };
    
  } catch (error) {
    console.error('Error getting school context from subdomain:', error);
    return null;
  }
};

/**
 * Generate redirect URL for school subdomain
 * @param {string} subdomain - School subdomain
 * @param {string} path - URL path (e.g., '/dashboard')
 * @param {object} queryParams - Query parameters
 * @returns {string} - Full redirect URL
 */
const generateRedirectUrl = (subdomain, path = '/dashboard', queryParams = {}) => {
  const domain = generateSchoolDomain(subdomain);
  const url = new URL(`https://${domain}${path}`);
  
  // Add query parameters
  Object.entries(queryParams).forEach(([key, value]) => {
    url.searchParams.append(key, value);
  });
  
  return url.toString();
};

/**
 * Parse user agent to detect if request is from mobile device
 * @param {string} userAgent - User agent string
 * @returns {boolean} - True if mobile
 */
const isMobileDevice = (userAgent) => {
  if (!userAgent) return false;
  
  const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
  return mobileRegex.test(userAgent);
};

/**
 * Get appropriate redirect URL based on user role and device
 * @param {object} user - User object
 * @param {string} subdomain - School subdomain
 * @param {string} userAgent - User agent string
 * @returns {string} - Redirect URL
 */
const getRoleBasedRedirectUrl = (user, subdomain, userAgent = '') => {
  const isMobile = isMobileDevice(userAgent);
  
  let path = '/dashboard';
  
  // Role-based path selection
  switch (user.role) {
    case 'student':
      path = isMobile ? '/student/dashboard' : '/student/dashboard';
      break;
    case 'teacher':
      path = isMobile ? '/teacher/dashboard' : '/teacher/dashboard';
      break;
    case 'admin':
      path = isMobile ? '/admin/dashboard' : '/admin/dashboard';
      break;
    default:
      path = '/dashboard';
  }
  
  return generateRedirectUrl(subdomain, path);
};

/**
 * Validate that user belongs to the school subdomain
 * @param {object} user - User object with school_id
 * @param {object} schoolContext - School context from subdomain
 * @returns {boolean} - True if user belongs to school
 */
const validateUserSchoolMembership = (user, schoolContext) => {
  if (!user || !schoolContext) return false;
  
  // Super admins can access any school
  if (user.role === 'super_admin') return true;
  
  // Check if user's school_id matches the school context
  return user.school_id === schoolContext.id;
};

/**
 * Create school context object for middleware
 * @param {object} school - School data from database
 * @returns {object} - School context object
 */
const createSchoolContext = (school) => {
  return {
    id: school.id,
    name: school.name,
    domain: school.domain,
    subdomain: extractSubdomain(school.domain),
    status: school.status,
    isVerified: school.is_verified,
    isPublic: school.is_public,
    city: school.city,
    stateId: school.state_id,
    type: school.type,
    phone: school.phone,
    email: school.email,
    description: school.description
  };
};

/**
 * Middleware to extract school context from subdomain
 */
const subdomainMiddleware = (pool) => {
  return async (req, res, next) => {
    try {
      const hostname = req.hostname || req.headers.host;
      
      // Extract subdomain
      const subdomain = extractSubdomain(hostname);
      
      if (!subdomain) {
        // No subdomain, continue without school context
        req.schoolContext = null;
        req.subdomain = null;
        return next();
      }
      
      // Get school context
      const schoolContext = await getSchoolContextFromSubdomain(hostname, pool);
      
      if (!schoolContext) {
        return res.status(404).json({
          error: 'School not found',
          message: 'The school subdomain does not exist or is not active'
        });
      }
      
      // Attach school context to request
      req.schoolContext = schoolContext;
      req.subdomain = subdomain;
      
      next();
      
    } catch (error) {
      console.error('Subdomain middleware error:', error);
      res.status(500).json({
        error: 'Server error',
        message: 'Unable to process subdomain request'
      });
    }
  };
};

module.exports = {
  extractSubdomain,
  validateSubdomain,
  generateSchoolDomain,
  isSchoolSubdomain,
  getSchoolContextFromSubdomain,
  generateRedirectUrl,
  isMobileDevice,
  getRoleBasedRedirectUrl,
  validateUserSchoolMembership,
  createSchoolContext,
  subdomainMiddleware
};
