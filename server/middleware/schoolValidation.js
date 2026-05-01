// School Validation Middleware
// Validates school codes and availability during registration

const pool = require('../db/postgres');
const SchoolPostgres = require('../models/SchoolPostgres');

/**
 * Validates school selection during teacher registration
 * Checks if school exists, is active, and accepts registrations
 */
const validateSchoolSelection = async (req, res, next) => {
  try {
    const { schoolId, schoolCode } = req.body;
    
    // If schoolId is provided, validate it directly
    if (schoolId) {
      const school = await SchoolPostgres.findById(schoolId);
      
      if (!school) {
        return res.status(400).json({
          error: 'Invalid school selected',
          details: 'The selected school does not exist'
        });
      }
      
      if (school.status !== 'active') {
        return res.status(400).json({
          error: 'School not active',
          details: 'The selected school is currently not accepting registrations'
        });
      }
      
      if (!school.is_verified) {
        return res.status(400).json({
          error: 'School not verified',
          details: 'The selected school has not been verified by the administration'
        });
      }
      
      if (!school.is_public) {
        return res.status(400).json({
          error: 'Private school',
          details: 'Registration for this school requires an invitation code'
        });
      }
      
      // Attach school info to request for later use
      req.school = school;
      return next();
    }
    
    // If schoolCode is provided, validate and find school
    if (schoolCode) {
      // Try to find school by code (could be stored in various ways)
      const schoolQuery = `
        SELECT id, name, domain, status, is_verified, is_public
        FROM schools 
        WHERE 
          LOWER(name) LIKE LOWER($1) OR
          LOWER(domain) LIKE LOWER($1) OR
          id::text = $1 OR
          email LIKE $1
      `;
      
      const result = await pool.query(schoolQuery, [`%${schoolCode}%`]);
      
      if (result.rows.length === 0) {
        return res.status(400).json({
          error: 'School not found',
          details: 'No school matches the provided code or name'
        });
      }
      
      // Filter for active, verified, public schools
      const validSchools = result.rows.filter(school => 
        school.status === 'active' && 
        school.is_verified && 
        school.is_public
      );
      
      if (validSchools.length === 0) {
        return res.status(400).json({
          error: 'School not accepting registrations',
          details: 'The found school is not currently accepting public registrations'
        });
      }
      
      // If multiple schools match, return them for user selection
      if (validSchools.length > 1) {
        return res.status(300).json({
          message: 'Multiple schools found',
          details: 'Please select your specific school from the list',
          schools: validSchools.map(school => ({
            id: school.id,
            name: school.name,
            domain: school.domain
          }))
        });
      }
      
      // Single school found
      const school = validSchools[0];
      req.school = school;
      req.body.schoolId = school.id; // Set schoolId for downstream processing
      return next();
    }
    
    // Neither schoolId nor schoolCode provided
    return res.status(400).json({
      error: 'School required',
      details: 'Please select a school or provide a school code'
    });
    
  } catch (error) {
    console.error('School validation error:', error);
    return res.status(500).json({
      error: 'Validation failed',
      details: 'Unable to validate school selection'
    });
  }
};

/**
 * Validates school domain availability
 * Used for new school registration or domain updates
 */
const validateSchoolDomain = async (req, res, next) => {
  try {
    const { domain, excludeSchoolId } = req.body;
    
    if (!domain) {
      return res.status(400).json({
        error: 'Domain required',
        details: 'School domain is required'
      });
    }
    
    // Validate domain format
    const domainRegex = /^[a-z0-9-]+(\.[a-z0-9-]+)*$/;
    if (!domainRegex.test(domain)) {
      return res.status(400).json({
        error: 'Invalid domain format',
        details: 'Domain can only contain lowercase letters, numbers, and hyphens'
      });
    }
    
    // Check domain availability
    const isAvailable = await SchoolPostgres.isDomainAvailable(domain, excludeSchoolId);
    
    if (!isAvailable) {
      return res.status(400).json({
        error: 'Domain not available',
        details: 'This domain is already in use by another school'
      });
    }
    
    next();
    
  } catch (error) {
    console.error('Domain validation error:', error);
    return res.status(500).json({
      error: 'Validation failed',
      details: 'Unable to validate domain availability'
    });
  }
};

/**
 * Validates teacher registration data against school requirements
 */
const validateTeacherRegistration = async (req, res, next) => {
  try {
    const { 
      firstName, 
      lastName, 
      email, 
      phone, 
      password,
      subjects,
      department,
      experience
    } = req.body;
    
    const errors = [];
    
    // Required fields validation
    if (!firstName || firstName.trim().length < 2) {
      errors.push('First name must be at least 2 characters long');
    }
    
    if (!lastName || lastName.trim().length < 2) {
      errors.push('Last name must be at least 2 characters long');
    }
    
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push('Valid email address is required');
    }
    
    if (!password || password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }
    
    if (!phone || !/^\+?[\d\s\-\(\)]+$/.test(phone)) {
      errors.push('Valid phone number is required');
    }
    
    // Optional fields validation
    if (subjects && Array.isArray(subjects)) {
      if (subjects.length === 0) {
        errors.push('At least one subject must be specified');
      }
      
      // Validate subject format
      const invalidSubjects = subjects.filter(subject => 
        typeof subject !== 'string' || subject.trim().length < 2
      );
      
      if (invalidSubjects.length > 0) {
        errors.push('Invalid subject format provided');
      }
    }
    
    if (experience !== undefined) {
      const expYears = parseInt(experience);
      if (isNaN(expYears) || expYears < 0 || expYears > 50) {
        errors.push('Experience must be a number between 0 and 50 years');
      }
    }
    
    if (errors.length > 0) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors
      });
    }
    
    // Check if email already exists globally
    const existingUser = await pool.query(
      'SELECT id, email FROM users WHERE email = $1',
      [email]
    );
    
    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        error: 'Email already registered',
        details: 'An account with this email already exists'
      });
    }
    
    next();
    
  } catch (error) {
    console.error('Teacher registration validation error:', error);
    return res.status(500).json({
      error: 'Validation failed',
      details: 'Unable to validate registration data'
    });
  }
};

/**
 * Middleware to get available schools for registration
 * Used by frontend registration form
 */
const getAvailableSchools = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      state, 
      type, 
      search 
    } = req.query;
    
    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      stateFilter: state,
      typeFilter: type,
      searchQuery: search
    };
    
    const result = await SchoolPostgres.getActiveVerifiedSchools(options);
    
    res.json({
      success: true,
      schools: result.schools.map(school => ({
        id: school.id,
        name: school.name,
        domain: school.domain,
        state: school.state_name,
        city: school.city,
        type: school.type,
        description: school.description
      })),
      pagination: result.pagination
    });
    
  } catch (error) {
    console.error('Get available schools error:', error);
    res.status(500).json({
      error: 'Failed to fetch schools',
      details: 'Unable to retrieve available schools for registration'
    });
  }
};

/**
 * Middleware to validate school code for private school registration
 */
const validatePrivateSchoolCode = async (req, res, next) => {
  try {
    const { schoolCode, schoolId } = req.body;
    
    if (!schoolCode) {
      return res.status(400).json({
        error: 'School code required',
        details: 'Private school registration requires an invitation code'
      });
    }
    
    // Find school by ID first
    const school = await SchoolPostgres.findById(schoolId);
    
    if (!school) {
      return res.status(400).json({
        error: 'School not found',
        details: 'The specified school does not exist'
      });
    }
    
    if (school.is_public) {
      return res.status(400).json({
        error: 'Public school',
        details: 'This school is open for public registration and does not require a code'
      });
    }
    
    // For private schools, validate against stored invitation codes
    // This would typically be stored in a separate invitation_codes table
    // For now, we'll use a simple validation against school domain
    const expectedCode = school.domain.replace(/\./g, '').toUpperCase();
    
    if (schoolCode !== expectedCode) {
      return res.status(400).json({
        error: 'Invalid school code',
        details: 'The provided school code is not valid for this school'
      });
    }
    
    req.school = school;
    next();
    
  } catch (error) {
    console.error('Private school code validation error:', error);
    return res.status(500).json({
      error: 'Validation failed',
      details: 'Unable to validate private school code'
    });
  }
};

module.exports = {
  validateSchoolSelection,
  validateSchoolDomain,
  validateTeacherRegistration,
  getAvailableSchools,
  validatePrivateSchoolCode
};
