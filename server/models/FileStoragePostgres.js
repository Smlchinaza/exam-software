// PostgreSQL File Storage Model
// Handles file operations with school-based isolation

const pool = require('../db/postgres');
const path = require('path');

class FileStoragePostgres {
  // Generate school-specific file path
  static generateFilePath(schoolId, fileType, fileName) {
    return `uploads/school-${schoolId}/${fileType}/${fileName}`;
  }

  // Create file record
  static async create(fileData) {
    const {
      schoolId,
      fileName,
      originalName,
      filePath,
      fileSize,
      mimeType,
      fileType,
      uploadedBy,
      metadata = {}
    } = fileData;

    const query = `
      INSERT INTO file_storage (
        school_id, file_name, original_name, file_path, file_size,
        mime_type, file_type, uploaded_by, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;

    const values = [
      schoolId,
      fileName,
      originalName,
      filePath,
      fileSize,
      mimeType,
      fileType,
      uploadedBy,
      JSON.stringify(metadata)
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  // Find file by ID
  static async findById(fileId) {
    const query = `
      SELECT 
        fs.*,
        u.first_name || ' ' || u.last_name as uploader_name,
        s.name as school_name
      FROM file_storage fs
      LEFT JOIN users u ON fs.uploaded_by = u.id
      LEFT JOIN schools s ON fs.school_id = s.id
      WHERE fs.id = $1 AND fs.is_active = true
    `;

    const result = await pool.query(query, [fileId]);
    return result.rows[0] || null;
  }

  // Find files by school
  static async findBySchool(schoolId, options = {}) {
    const {
      page = 1,
      limit = 20,
      fileType = null,
      search = null,
      uploadedBy = null
    } = options;

    const offset = (page - 1) * limit;
    let whereConditions = ['fs.school_id = $1', 'fs.is_active = true'];
    let queryParams = [schoolId];
    let paramIndex = 2;

    if (fileType) {
      whereConditions.push(`fs.file_type = $${paramIndex}`);
      queryParams.push(fileType);
      paramIndex++;
    }

    if (uploadedBy) {
      whereConditions.push(`fs.uploaded_by = $${paramIndex}`);
      queryParams.push(uploadedBy);
      paramIndex++;
    }

    if (search) {
      whereConditions.push(`(
        fs.original_name ILIKE $${paramIndex} OR 
        fs.file_name ILIKE $${paramIndex}
      )`);
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    const whereClause = whereConditions.join(' AND ');

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM file_storage fs
      WHERE ${whereClause}
    `;

    const countResult = await pool.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].total);

    // Get files
    const query = `
      SELECT 
        fs.*,
        u.first_name || ' ' || u.last_name as uploader_name
      FROM file_storage fs
      LEFT JOIN users u ON fs.uploaded_by = u.id
      WHERE ${whereClause}
      ORDER BY fs.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    queryParams.push(limit, offset);
    const result = await pool.query(query, queryParams);

    return {
      files: result.rows,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  // Find files by type and school
  static async findByTypeAndSchool(schoolId, fileType, options = {}) {
    return this.findBySchool(schoolId, { ...options, fileType });
  }

  // Find files uploaded by user
  static async findByUploader(userId, options = {}) {
    const {
      page = 1,
      limit = 20,
      fileType = null,
      schoolId = null
    } = options;

    const offset = (page - 1) * limit;
    let whereConditions = ['fs.uploaded_by = $1', 'fs.is_active = true'];
    let queryParams = [userId];
    let paramIndex = 2;

    if (fileType) {
      whereConditions.push(`fs.file_type = $${paramIndex}`);
      queryParams.push(fileType);
      paramIndex++;
    }

    if (schoolId) {
      whereConditions.push(`fs.school_id = $${paramIndex}`);
      queryParams.push(schoolId);
      paramIndex++;
    }

    const whereClause = whereConditions.join(' AND ');

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM file_storage fs
      WHERE ${whereClause}
    `;

    const countResult = await pool.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].total);

    // Get files
    const query = `
      SELECT 
        fs.*,
        s.name as school_name
      FROM file_storage fs
      LEFT JOIN schools s ON fs.school_id = s.id
      WHERE ${whereClause}
      ORDER BY fs.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    queryParams.push(limit, offset);
    const result = await pool.query(query, queryParams);

    return {
      files: result.rows,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  // Update file metadata
  static async update(fileId, updateData) {
    const allowedFields = [
      'original_name', 'file_path', 'metadata', 'is_active'
    ];
    
    const updates = [];
    const values = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(updateData)) {
      if (allowedFields.includes(key)) {
        updates.push(`${key} = $${paramIndex}`);
        values.push(key === 'metadata' ? JSON.stringify(value) : value);
        paramIndex++;
      }
    }

    if (updates.length === 0) {
      throw new Error('No valid fields to update');
    }

    updates.push(`updated_at = NOW()`);
    values.push(fileId);

    const query = `
      UPDATE file_storage 
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  // Soft delete file (mark as inactive)
  static async softDelete(fileId) {
    const query = `
      UPDATE file_storage 
      SET is_active = false, updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;

    const result = await pool.query(query, [fileId]);
    return result.rows[0];
  }

  // Hard delete file
  static async delete(fileId) {
    const query = 'DELETE FROM file_storage WHERE id = $1 RETURNING *';
    const result = await pool.query(query, [fileId]);
    return result.rows[0];
  }

  // Validate file access for user
  static async validateAccess(userId, fileId) {
    const query = 'SELECT validate_file_access($1, $2) as has_access';
    const result = await pool.query(query, [userId, fileId]);
    return result.rows[0].has_access;
  }

  // Get school file statistics
  static async getSchoolStats(schoolId) {
    const query = `
      SELECT 
        COUNT(*) as total_files,
        COUNT(CASE WHEN file_type = 'exam' THEN 1 END) as exam_files,
        COUNT(CASE WHEN file_type = 'submission' THEN 1 END) as submission_files,
        COUNT(CASE WHEN file_type = 'profile' THEN 1 END) as profile_files,
        COUNT(CASE WHEN file_type = 'material' THEN 1 END) as material_files,
        COALESCE(SUM(file_size), 0) as total_storage_used,
        COUNT(CASE WHEN created_at > NOW() - INTERVAL '30 days' THEN 1 END) as recent_files
      FROM file_storage
      WHERE school_id = $1 AND is_active = true
    `;

    const result = await pool.query(query, [schoolId]);
    return result.rows[0];
  }

  // Get school file directories
  static async getSchoolDirectories(schoolId) {
    const query = `
      SELECT directory_path, directory_type, created_at
      FROM file_directories
      WHERE school_id = $1
      ORDER BY directory_type
    `;

    const result = await pool.query(query, [schoolId]);
    return result.rows;
  }

  // Initialize school file directories
  static async initializeDirectories(schoolId) {
    const query = `
      INSERT INTO file_directories (school_id, directory_path, directory_type)
      VALUES ($1, 'exams', 'exams'),
             ($1, 'submissions', 'submissions'),
             ($1, 'profiles', 'profiles'),
             ($1, 'materials', 'materials')
      ON CONFLICT (school_id, directory_path, directory_type) DO NOTHING
      RETURNING *
    `;

    const result = await pool.query(query, [schoolId]);
    return result.rows;
  }

  // Get files by date range
  static async findByDateRange(schoolId, startDate, endDate, options = {}) {
    const { page = 1, limit = 20, fileType = null } = options;
    const offset = (page - 1) * limit;

    let whereConditions = [
      'school_id = $1',
      'is_active = true',
      'created_at >= $2',
      'created_at <= $3'
    ];
    let queryParams = [schoolId, startDate, endDate];
    let paramIndex = 4;

    if (fileType) {
      whereConditions.push(`file_type = $${paramIndex}`);
      queryParams.push(fileType);
      paramIndex++;
    }

    const whereClause = whereConditions.join(' AND ');

    const query = `
      SELECT *
      FROM file_storage
      WHERE ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    queryParams.push(limit, offset);
    const result = await pool.query(query, queryParams);

    return result.rows;
  }

  // Get storage usage by type
  static async getStorageUsageByType(schoolId) {
    const query = `
      SELECT 
        file_type,
        COUNT(*) as file_count,
        COALESCE(SUM(file_size), 0) as total_size,
        COALESCE(AVG(file_size), 0) as avg_size
      FROM file_storage
      WHERE school_id = $1 AND is_active = true
      GROUP BY file_type
      ORDER BY total_size DESC
    `;

    const result = await pool.query(query, [schoolId]);
    return result.rows;
  }
}

module.exports = FileStoragePostgres;
