/**
 * Middleware to extract school information from subdomain
 * Parses requests from schoolname.yourdomain.com and attaches school context
 */

const extractSchoolFromSubdomain = async (req, res, next) => {
  try {
    const host = req.get('host');
    const pool = require('../db/postgres');
    
    // Extract subdomain from host
    const parts = host.split('.');
    let subdomain = null;
    
    // Check if subdomain exists
    // schoolname.yourdomain.com -> parts = ['schoolname', 'yourdomain', 'com']
    // localhost:5000 -> parts = ['localhost:5000']
    // www.yourdomain.com -> parts = ['www', 'yourdomain', 'com']
    
    if (parts.length >= 3) {
      subdomain = parts[0];
    }
    
    // Skip www, api, and admin subdomains (these are system subdomains)
    if (subdomain && !['www', 'api', 'admin', 'localhost'].includes(subdomain)) {
      try {
        // Query database for school with matching domain
        const result = await pool.query(
          'SELECT id, name, domain FROM schools WHERE domain = $1 LIMIT 1',
          [`${subdomain}.schoolshubs.com`]
        );
        
        if (result.rows.length > 0) {
          req.schoolFromSubdomain = result.rows[0];
          req.schoolIdFromSubdomain = result.rows[0].id;
        }
      } catch (dbError) {
        console.error('Database error in subdomain extraction:', dbError);
        // Continue without subdomain school context
      }
    }
    
    next();
  } catch (error) {
    console.error('Subdomain extraction error:', error);
    next(); // Continue regardless of error
  }
};

module.exports = extractSchoolFromSubdomain;
