// PostgreSQL User Model
// Handles user operations with PostgreSQL database for multi-tenant architecture

const pool = require('../../db/postgres');

class UserPostgres {
  // Find user by ID with school information
  static async findById(userId) {
    const query = `
      SELECT 
        u.id,
        u.pg_id,
        u.email,
        u.role,
        u.first_name,
        u.last_name,
        u.profile,
        u.is_active,
        u.school_id,
        u.subdomain,
        u.approved,
        u.created_at,
        u.updated_at,
        s.name as school_name,
        s.domain as school_domain,
        s.status as school_status
      FROM users u
      LEFT JOIN schools s ON u.school_id = s.id
      WHERE u.id = $1
    `;
    
    const result = await pool.query(query, [userId]);
    return result.rows[0] || null;
  }

  // Find user by email with school information
  static async findByEmail(email) {
    const query = `
      SELECT 
        u.id,
        u.pg_id,
        u.email,
        u.role,
        u.password_hash,
        u.first_name,
        u.last_name,
        u.profile,
        u.is_active,
        u.school_id,
        u.subdomain,
        u.approved,
        u.created_at,
        u.updated_at,
        s.name as school_name,
        s.domain as school_domain,
        s.status as school_status
      FROM users u
      LEFT JOIN schools s ON u.school_id = s.id
      WHERE u.email = $1
    `;
    
    const result = await pool.query(query, [email]);
    return result.rows[0] || null;
  }

  // Find user by email and school (for tenant isolation)
  static async findByEmailAndSchool(email, schoolId) {
    const query = `
      SELECT 
        u.id,
        u.pg_id,
        u.email,
        u.role,
        u.password_hash,
        u.first_name,
        u.last_name,
        u.profile,
        u.is_active,
        u.school_id,
        u.subdomain,
        u.approved,
        u.created_at,
        u.updated_at,
        s.name as school_name,
        s.domain as school_domain,
        s.status as school_status
      FROM users u
      LEFT JOIN schools s ON u.school_id = s.id
      WHERE u.email = $1 AND u.school_id = $2
    `;
    
    const result = await pool.query(query, [email, schoolId]);
    return result.rows[0] || null;
  }

  // Create new user
  static async create(userData) {
    const {
      email,
      passwordHash,
      role,
      firstName,
      lastName,
      schoolId,
      pgId,
      profile = {},
      approved = false
    } = userData;

    const query = `
      INSERT INTO users (
        email,
        password_hash,
        role,
        first_name,
        last_name,
        school_id,
        pg_id,
        profile,
        approved,
        is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true)
      RETURNING *
    `;

    const values = [
      email,
      passwordHash,
      role,
      firstName,
      lastName,
      schoolId,
      pgId,
      JSON.stringify(profile),
      approved
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  // Update user
  static async update(userId, updateData) {
    const allowedFields = [
      'email', 'first_name', 'last_name', 'role', 'password_hash', 
      'school_id', 'subdomain', 'profile', 'approved', 'is_active'
    ];
    
    const updates = [];
    const values = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(updateData)) {
      if (allowedFields.includes(key)) {
        updates.push(`${key} = $${paramIndex}`);
        values.push(key === 'profile' ? JSON.stringify(value) : value);
        paramIndex++;
      }
    }

    if (updates.length === 0) {
      throw new Error('No valid fields to update');
    }

    updates.push(`updated_at = NOW()`);
    values.push(userId);

    const query = `
      UPDATE users 
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  // Get users by school with pagination
  static async findBySchool(schoolId, options = {}) {
    const {
      page = 1,
      limit = 20,
      role = null,
      search = null,
      status = null
    } = options;

    const offset = (page - 1) * limit;
    let whereConditions = ['u.school_id = $1'];
    let queryParams = [schoolId];
    let paramIndex = 2;

    if (role) {
      whereConditions.push(`u.role = $${paramIndex}`);
      queryParams.push(role);
      paramIndex++;
    }

    if (status !== null) {
      whereConditions.push(`u.is_active = $${paramIndex}`);
      queryParams.push(status);
      paramIndex++;
    }

    if (search) {
      whereConditions.push(`(
        u.first_name ILIKE $${paramIndex} OR 
        u.last_name ILIKE $${paramIndex} OR 
        u.email ILIKE $${paramIndex}
      )`);
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    const whereClause = whereConditions.join(' AND ');

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM users u
      WHERE ${whereClause}
    `;

    const countResult = await pool.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].total);

    // Get users
    const query = `
      SELECT 
        u.id,
        u.email,
        u.role,
        u.first_name,
        u.last_name,
        u.subdomain,
        u.approved,
        u.is_active,
        u.created_at,
        u.updated_at,
        s.name as school_name,
        s.domain as school_domain
      FROM users u
      LEFT JOIN schools s ON u.school_id = s.id
      WHERE ${whereClause}
      ORDER BY u.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    queryParams.push(limit, offset);
    const result = await pool.query(query, queryParams);

    return {
      users: result.rows,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  // Get teachers by school (for admin management)
  static async findTeachersBySchool(schoolId, options = {}) {
    return this.findBySchool(schoolId, { ...options, role: 'teacher' });
  }

  // Get students by school
  static async findStudentsBySchool(schoolId, options = {}) {
    return this.findBySchool(schoolId, { ...options, role: 'student' });
  }

  // Update user subdomain based on school
  static async updateSubdomain(userId) {
    const query = `
      UPDATE users u
      SET subdomain = split_part(s.domain, '.', 1)
      FROM schools s
      WHERE u.id = $1 AND u.school_id = s.id
      RETURNING u.subdomain
    `;

    const result = await pool.query(query, [userId]);
    return result.rows[0]?.subdomain || null;
  }

  // Check if user belongs to school (for security)
  static async verifySchoolMembership(userId, schoolId) {
    const query = `
      SELECT COUNT(*) as count
      FROM users
      WHERE id = $1 AND school_id = $2 AND is_active = true
    `;

    const result = await pool.query(query, [userId, schoolId]);
    return parseInt(result.rows[0].count) > 0;
  }

  // Get user with school context for JWT payload
  static async getWithContext(userId) {
    const query = `
      SELECT 
        u.id,
        u.email,
        u.role,
        u.first_name,
        u.last_name,
        u.school_id,
        u.subdomain,
        u.approved,
        s.name as school_name,
        s.domain as school_domain,
        s.status as school_status
      FROM users u
      LEFT JOIN schools s ON u.school_id = s.id
      WHERE u.id = $1 AND u.is_active = true
    `;

    const result = await pool.query(query, [userId]);
    return result.rows[0] || null;
  }

  // Delete user (soft delete by setting is_active = false)
  static async deactivate(userId) {
    const query = `
      UPDATE users 
      SET is_active = false, updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;

    const result = await pool.query(query, [userId]);
    return result.rows[0];
  }

  // Permanently delete user
  static async delete(userId) {
    const query = 'DELETE FROM users WHERE id = $1 RETURNING *';
    const result = await pool.query(query, [userId]);
    return result.rows[0];
  }
}

module.exports = UserPostgres;
