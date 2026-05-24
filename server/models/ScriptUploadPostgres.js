const pool = require('../db/postgres');

class ScriptUploadPostgres {
  static async create(data) {
    const query = `
      INSERT INTO script_uploads (
        school_id, uploader_type, uploader_id, uploader_ip,
        file_path, file_name, mime_type, size_bytes, status
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      RETURNING *
    `;

    const values = [
      data.schoolId,
      data.uploaderType,
      data.uploaderId || null,
      data.uploaderIp || null,
      data.filePath,
      data.fileName,
      data.mimeType,
      data.sizeBytes,
      data.status || 'pending'
    ];

    const res = await pool.query(query, values);
    return res.rows[0];
  }

  static async findById(id) {
    const query = `SELECT su.*, s.name as school_name,
        u.first_name || ' ' || u.last_name as uploader_name,
        r.first_name || ' ' || r.last_name as reviewer_name
      FROM script_uploads su
      LEFT JOIN schools s ON su.school_id = s.id
      LEFT JOIN users u ON su.uploader_id = u.id
      LEFT JOIN users r ON su.reviewed_by = r.id
      WHERE su.id = $1`;
    const res = await pool.query(query, [id]);
    return res.rows[0] || null;
  }

  static async findPending(options = {}) {
    const {
      schoolId = null,
      page = 1,
      limit = 20
    } = options;

    const offset = (page - 1) * limit;
    let where = ['su.status = $1'];
    const params = ['pending'];

    if (schoolId) {
      where.push(`su.school_id = $${params.length + 1}`);
      params.push(schoolId);
    }

    const whereClause = where.join(' AND ');

    const countQ = `SELECT COUNT(*) as total FROM script_uploads su WHERE ${whereClause}`;
    const countRes = await pool.query(countQ, params);
    const total = parseInt(countRes.rows[0].total, 10);

    const q = `
      SELECT su.*, s.name as school_name,
             u.first_name || ' ' || u.last_name as uploader_name
      FROM script_uploads su
      LEFT JOIN schools s ON su.school_id = s.id
      LEFT JOIN users u ON su.uploader_id = u.id
      WHERE ${whereClause}
      ORDER BY su.created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;

    params.push(limit, offset);
    const res = await pool.query(q, params);

    return {
      uploads: res.rows,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    };
  }

  static async findHistory(options = {}) {
    const {
      schoolId = null,
      page = 1,
      limit = 20
    } = options;

    const offset = (page - 1) * limit;
    let where = ['su.status != $1'];
    const params = ['pending'];

    if (schoolId) {
      where.push(`su.school_id = $${params.length + 1}`);
      params.push(schoolId);
    }

    const whereClause = where.join(' AND ');

    const countQ = `SELECT COUNT(*) as total FROM script_uploads su WHERE ${whereClause}`;
    const countRes = await pool.query(countQ, params);
    const total = parseInt(countRes.rows[0].total, 10);

    const q = `
      SELECT su.*, s.name as school_name,
             u.first_name || ' ' || u.last_name as uploader_name,
             r.first_name || ' ' || r.last_name as reviewer_name
      FROM script_uploads su
      LEFT JOIN schools s ON su.school_id = s.id
      LEFT JOIN users u ON su.uploader_id = u.id
      LEFT JOIN users r ON su.reviewed_by = r.id
      WHERE ${whereClause}
      ORDER BY su.created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;

    params.push(limit, offset);
    const res = await pool.query(q, params);

    return {
      uploads: res.rows,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    };
  }

  static async approve(id, reviewerId) {
    const q = `
      UPDATE script_uploads
      SET status = 'approved', reviewed_by = $1, reviewed_at = NOW(), updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `;
    const res = await pool.query(q, [reviewerId, id]);
    return res.rows[0];
  }

  static async reject(id, reviewerId, reason) {
    const q = `
      UPDATE script_uploads
      SET status = 'rejected', rejection_reason = $1, reviewed_by = $2, reviewed_at = NOW(), updated_at = NOW()
      WHERE id = $3
      RETURNING *
    `;
    const res = await pool.query(q, [reason, reviewerId, id]);
    return res.rows[0];
  }

  // Count teacher uploads for a school+ip in a rolling window (minutes)
  static async countTeacherUploadsForWindow(schoolId, uploaderIp, windowMinutes = 60) {
    const q = `
      SELECT COUNT(*) as cnt
      FROM script_uploads
      WHERE uploader_type = 'teacher'
        AND school_id = $1
        AND uploader_ip = $2
        AND created_at > NOW() - INTERVAL '${windowMinutes} minutes'
    `;
    const res = await pool.query(q, [schoolId, uploaderIp]);
    return parseInt(res.rows[0].cnt, 10);
  }
}

module.exports = ScriptUploadPostgres;
