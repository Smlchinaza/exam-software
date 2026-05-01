// PostgreSQL School Model
// Handles school operations for multi-tenant architecture

const pool = require('../db/postgres');

class SchoolPostgres {
  // Find school by ID
  static async findById(schoolId) {
    const query = `
      SELECT 
        s.*,
        st.name as state_name,
        st.code as state_code
      FROM schools s
      LEFT JOIN states st ON s.state_id = st.id
      WHERE s.id = $1
    `;
    
    const result = await pool.query(query, [schoolId]);
    return result.rows[0] || null;
  }

  // Find school by domain
  static async findByDomain(domain) {
    const query = `
      SELECT 
        s.*,
        st.name as state_name,
        st.code as state_code
      FROM schools s
      LEFT JOIN states st ON s.state_id = st.id
      WHERE s.domain = $1
    `;
    
    const result = await pool.query(query, [domain]);
    return result.rows[0] || null;
  }

  // Find school by subdomain
  static async findBySubdomain(subdomain) {
    const query = `
      SELECT 
        s.*,
        st.name as state_name,
        st.code as state_code
      FROM schools s
      LEFT JOIN states st ON s.state_id = st.id
      WHERE s.domain LIKE $1
    `;
    
    const result = await pool.query(query, [`${subdomain}.%`]);
    return result.rows[0] || null;
  }

  // Get all active and verified schools for teacher registration
  static async getActiveVerifiedSchools(options = {}) {
    const {
      page = 1,
      limit = 50,
      stateFilter = null,
      typeFilter = null,
      searchQuery = null
    } = options;

    const offset = (page - 1) * limit;
    let whereConditions = [
      's.status = $1',
      's.is_verified = $2',
      's.is_public = $3'
    ];
    let queryParams = ['active', true, true];
    let paramIndex = 4;

    if (stateFilter) {
      whereConditions.push(`s.state_id = $${paramIndex}`);
      queryParams.push(stateFilter);
      paramIndex++;
    }

    if (typeFilter) {
      whereConditions.push(`s.type = $${paramIndex}`);
      queryParams.push(typeFilter);
      paramIndex++;
    }

    if (searchQuery) {
      whereConditions.push(`(
        to_tsvector('english', s.name || ' ' || COALESCE(s.city, '') || ' ' || COALESCE(s.description, '')) 
        @@ plainto_tsquery('english', $${paramIndex})
      )`);
      queryParams.push(searchQuery);
      paramIndex++;
    }

    const whereClause = whereConditions.join(' AND ');

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM schools s
      WHERE ${whereClause}
    `;

    const countResult = await pool.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].total);

    // Get schools
    const query = `
      SELECT 
        s.id,
        s.name,
        s.domain,
        s.state_id,
        st.name as state_name,
        st.code as state_code,
        s.city,
        s.type,
        s.is_public,
        s.phone,
        s.email,
        s.establishment_year,
        s.description,
        s.created_at
      FROM schools s
      LEFT JOIN states st ON s.state_id = st.id
      WHERE ${whereClause}
      ORDER BY 
        CASE 
          WHEN $${paramIndex} IS NOT NULL THEN 
            ts_rank(to_tsvector('english', s.name || ' ' || COALESCE(s.city, '') || ' ' || COALESCE(s.description, '')), 
                   plainto_tsquery('english', $${paramIndex}))
          ELSE 0 
        END DESC,
        s.name ASC
      LIMIT $${paramIndex + 1} OFFSET $${paramIndex + 2}
    `;

    queryParams.push(searchQuery, limit, offset);
    const result = await pool.query(query, queryParams);

    return {
      schools: result.rows,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  // Create new school
  static async create(schoolData) {
    const {
      name,
      domain,
      stateId,
      address,
      city,
      postalCode,
      phone,
      email,
      type = 'secondary',
      isPublic = true,
      website,
      establishmentYear,
      studentCapacity,
      description,
      facilities
    } = schoolData;

    const query = `
      INSERT INTO schools (
        name, domain, state_id, address, city, postal_code, phone, email,
        type, is_public, website, establishment_year, student_capacity,
        description, facilities, status, is_verified
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 'pending', false)
      RETURNING *
    `;

    const values = [
      name, domain, stateId, address, city, postalCode, phone, email,
      type, isPublic, website, establishmentYear, studentCapacity,
      description, facilities ? JSON.stringify(facilities) : null
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  // Update school
  static async update(schoolId, updateData) {
    const allowedFields = [
      'name', 'domain', 'state_id', 'address', 'city', 'postal_code',
      'phone', 'email', 'type', 'is_public', 'website', 'establishment_year',
      'student_capacity', 'description', 'facilities', 'status', 'is_verified'
    ];
    
    const updates = [];
    const values = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(updateData)) {
      if (allowedFields.includes(key)) {
        updates.push(`${key} = $${paramIndex}`);
        values.push(key === 'facilities' ? JSON.stringify(value) : value);
        paramIndex++;
      }
    }

    if (updates.length === 0) {
      throw new Error('No valid fields to update');
    }

    updates.push(`updated_at = NOW()`);
    values.push(schoolId);

    const query = `
      UPDATE schools 
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  // Get school statistics
  static async getStatistics(schoolId) {
    const queries = [
      // Total users by role
      `SELECT role, COUNT(*) as count FROM users WHERE school_id = $1 AND is_active = true GROUP BY role`,
      // Total exams
      `SELECT COUNT(*) as count FROM exams WHERE school_id = $1`,
      // Published exams
      `SELECT COUNT(*) as count FROM exams WHERE school_id = $1 AND is_published = true`,
      // Total submissions
      `SELECT COUNT(*) as count FROM exam_submissions WHERE school_id = $1`,
      // Recent activity
      `SELECT COUNT(*) as count FROM users WHERE school_id = $1 AND created_at > NOW() - INTERVAL '30 days'`
    ];

    const results = await Promise.all(
      queries.map(query => pool.query(query, [schoolId]))
    );

    return {
      users: {
        total: results[0].rows.reduce((sum, row) => sum + parseInt(row.count), 0),
        byRole: results[0].rows.reduce((acc, row) => {
          acc[row.role] = parseInt(row.count);
          return acc;
        }, {})
      },
      exams: {
        total: parseInt(results[1].rows[0].count),
        published: parseInt(results[2].rows[0].count)
      },
      submissions: parseInt(results[3].rows[0].count),
      recentActivity: parseInt(results[4].rows[0].count)
    };
  }

  // Validate school domain uniqueness
  static async isDomainAvailable(domain, excludeId = null) {
    let query = 'SELECT COUNT(*) as count FROM schools WHERE domain = $1';
    let params = [domain];
    
    if (excludeId) {
      query += ' AND id != $2';
      params.push(excludeId);
    }
    
    const result = await pool.query(query, params);
    return parseInt(result.rows[0].count) === 0;
  }

  // Get schools by state
  static async findByState(stateId, options = {}) {
    const { page = 1, limit = 20, status = 'active' } = options;
    const offset = (page - 1) * limit;

    const query = `
      SELECT 
        s.id, s.name, s.domain, s.city, s.type, s.is_public,
        s.phone, s.email, s.created_at,
        st.name as state_name
      FROM schools s
      LEFT JOIN states st ON s.state_id = st.id
      WHERE s.state_id = $1 AND s.status = $2
      ORDER BY s.name ASC
      LIMIT $3 OFFSET $4
    `;

    const result = await pool.query(query, [stateId, status, limit, offset]);
    return result.rows;
  }

  // Delete school (cascade will handle related records)
  static async delete(schoolId) {
    const query = 'DELETE FROM schools WHERE id = $1 RETURNING *';
    const result = await pool.query(query, [schoolId]);
    return result.rows[0];
  }
}

module.exports = SchoolPostgres;
