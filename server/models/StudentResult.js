// models/StudentResult.js
// PostgreSQL model for Student Results Management

const pool = require('../db/postgres');

class StudentResult {
  // Create a new student result
  static async create(resultData) {
    const school_id = resultData.school_id;
    const student_id = resultData.student_id;
    const subject_id = resultData.subject_id;
    const subject_name = resultData.subject_name;
    const teacher_id = resultData.teacher_id;
    const class_name = resultData.class;
    const session = resultData.session;
    const term = resultData.term;
    const assessment1 = resultData.assessment1 || 0;
    const assessment2 = resultData.assessment2 || 0;
    const ca_test = resultData.ca_test || 0;
    const exam_score = resultData.exam_score || 0;
    const remark = resultData.remark;
    const teacher_comment = resultData.teacher_comment;
    const days_present = resultData.days_present || 0;
    const days_school_opened = resultData.days_school_opened || 0;
    const created_by = resultData.created_by;

    const query = `
      INSERT INTO student_results (
        school_id, student_id, subject_id, subject_name, teacher_id,
        class, session, term, assessment1, assessment2, ca_test, exam_score,
        remark, teacher_comment, days_present, days_school_opened,
        last_updated_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      RETURNING *
    `;

    const values = [
      school_id, student_id, subject_id, subject_name, teacher_id,
      class_name, session, term, assessment1, assessment2, ca_test, exam_score,
      remark, teacher_comment, days_present, days_school_opened,
      created_by
    ];

    try {
      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      throw new Error(`Failed to create student result: ${error.message}`);
    }
  }

  // Get student results by teacher and filters
  static async getByTeacher(filters) {
    const school_id = filters.school_id;
    const teacher_id = filters.teacher_id;
    const subject_name = filters.subject_name;
    const className = filters.class;
    const session = filters.session;
    const term = filters.term;
    const student_search = filters.student_search;
    const limit = filters.limit || 50;
    const offset = filters.offset || 0;

    let query = `
      SELECT 
        sr.*,
        u.first_name || ' ' || u.last_name as student_name,
        u.email as student_email,
        u.admission_number,
        t.first_name || ' ' || t.last_name as teacher_name
      FROM student_results sr
      JOIN users u ON sr.student_id = u.id
      LEFT JOIN users t ON sr.teacher_id = t.id
      WHERE sr.school_id = $1
    `;
    
    const values = [school_id];
    let paramIndex = 2;

    if (teacher_id) {
      query += ` AND sr.teacher_id = $${paramIndex}`;
      values.push(teacher_id);
      paramIndex++;
    }

    if (subject_name) {
      query += ` AND sr.subject_name = $${paramIndex}`;
      values.push(subject_name);
      paramIndex++;
    }

    if (className) {
      query += ` AND sr.class = $${paramIndex}`;
      values.push(className);
      paramIndex++;
    }

    if (session) {
      query += ` AND sr.session = $${paramIndex}`;
      values.push(session);
      paramIndex++;
    }

    if (term) {
      query += ` AND sr.term = $${paramIndex}`;
      values.push(term);
      paramIndex++;
    }

    if (student_search) {
      query += ` AND (u.first_name ILIKE $${paramIndex} OR u.last_name ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex})`;
      values.push(`%${student_search}%`);
      paramIndex++;
    }

    query += ` ORDER BY sr.total_score DESC, u.last_name ASC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    values.push(limit, offset);

    try {
      const result = await pool.query(query, values);
      return result.rows;
    } catch (error) {
      throw new Error(`Failed to fetch student results: ${error.message}`);
    }
  }

  // Get single student result by ID
  static async getById(id, school_id) {
    const query = `
      SELECT 
        sr.*,
        u.first_name || ' ' || u.last_name as student_name,
        u.email as student_email,
        u.admission_number,
        t.first_name || ' ' || t.last_name as teacher_name,
        ads.* as affective_domain,
        pds.* as psychomotor_domain
      FROM student_results sr
      JOIN users u ON sr.student_id = u.id
      LEFT JOIN users t ON sr.teacher_id = t.id
      LEFT JOIN affective_domain_scores ads ON sr.id = ads.student_result_id
      LEFT JOIN psychomotor_domain_scores pds ON sr.id = pds.student_result_id
      WHERE sr.id = $1 AND sr.school_id = $2
    `;

    try {
      const result = await pool.query(query, [id, school_id]);
      return result.rows[0];
    } catch (error) {
      throw new Error(`Failed to fetch student result: ${error.message}`);
    }
  }

  // Update student result
  static async update(id, updateData, school_id, updated_by) {
    const {
      assessment1,
      assessment2,
      ca_test,
      exam_score,
      remark,
      teacher_comment,
      days_present,
      days_school_opened
    } = updateData;

    // Get current result for audit trail
    const currentResult = await this.getById(id, school_id);
    if (!currentResult) {
      throw new Error('Student result not found');
    }

    const query = `
      UPDATE student_results 
      SET 
        assessment1 = COALESCE($1, assessment1),
        assessment2 = COALESCE($2, assessment2),
        ca_test = COALESCE($3, ca_test),
        exam_score = COALESCE($4, exam_score),
        remark = COALESCE($5, remark),
        teacher_comment = COALESCE($6, teacher_comment),
        days_present = COALESCE($7, days_present),
        days_school_opened = COALESCE($8, days_school_opened),
        last_updated_by = $9
      WHERE id = $10 AND school_id = $11
      RETURNING *
    `;

    const values = [
      assessment1, assessment2, ca_test, exam_score,
      remark, teacher_comment, days_present, days_school_opened,
      updated_by, id, school_id
    ];

    try {
      const result = await pool.query(query, values);
      const updatedResult = result.rows[0];

      // Create audit trail
      await this.createHistoryEntry({
        school_id,
        student_result_id: id,
        previous_values: {
          assessment1: currentResult.assessment1,
          assessment2: currentResult.assessment2,
          ca_test: currentResult.ca_test,
          exam_score: currentResult.exam_score,
          total_score: currentResult.total_score,
          grade: currentResult.grade
        },
        new_values: {
          assessment1: updatedResult.assessment1,
          assessment2: updatedResult.assessment2,
          ca_test: updatedResult.ca_test,
          exam_score: updatedResult.exam_score,
          total_score: updatedResult.total_score,
          grade: updatedResult.grade
        },
        changed_by: updated_by
      });

      return updatedResult;
    } catch (error) {
      throw new Error(`Failed to update student result: ${error.message}`);
    }
  }

  // Bulk update student results
  static async bulkUpdate(updates, school_id, updated_by) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      const results = [];
      for (const update of updates) {
        const { id, ...updateData } = update;
        const result = await this.update(id, updateData, school_id, updated_by);
        results.push(result);
      }

      await client.query('COMMIT');
      return results;
    } catch (error) {
      await client.query('ROLLBACK');
      throw new Error(`Failed to bulk update student results: ${error.message}`);
    } finally {
      client.release();
    }
  }

  // Delete student result
  static async delete(id, school_id) {
    const query = 'DELETE FROM student_results WHERE id = $1 AND school_id = $2 RETURNING *';
    
    try {
      const result = await pool.query(query, [id, school_id]);
      return result.rows[0];
    } catch (error) {
      throw new Error(`Failed to delete student result: ${error.message}`);
    }
  }

  // Get class statistics
  static async getClassStatistics(school_id, subject_name, class_name, session, term) {
    const query = `
      SELECT * FROM class_statistics 
      WHERE school_id = $1 AND subject_name = $2 AND class = $3 AND session = $4 AND term = $5
    `;

    try {
      const result = await pool.query(query, [school_id, subject_name, class_name, session, term]);
      return result.rows[0];
    } catch (error) {
      throw new Error(`Failed to fetch class statistics: ${error.message}`);
    }
  }

  // Get teacher's subjects and classes
  static async getTeacherSubjects(school_id, teacher_id) {
    const query = `
      SELECT DISTINCT subject_name, class, session, term
      FROM student_results
      WHERE school_id = $1 AND teacher_id = $2
      ORDER BY subject_name, class
    `;

    try {
      const result = await pool.query(query, [school_id, teacher_id]);
      return result.rows;
    } catch (error) {
      throw new Error(`Failed to fetch teacher subjects: ${error.message}`);
    }
  }

  // Create history entry for audit trail
  static async createHistoryEntry(historyData) {
    const {
      school_id,
      student_result_id,
      previous_values,
      new_values,
      changed_by,
      change_reason,
      ip_address,
      user_agent
    } = historyData;

    const query = `
      INSERT INTO result_history (
        school_id, student_result_id,
        previous_assessment1, previous_assessment2, previous_ca_test, previous_exam_score,
        previous_total_score, previous_grade,
        new_assessment1, new_assessment2, new_ca_test, new_exam_score,
        new_total_score, new_grade,
        changed_by, change_reason, ip_address, user_agent
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
    `;

    const values = [
      school_id, student_result_id,
      previous_values.assessment1, previous_values.assessment2, 
      previous_values.ca_test, previous_values.exam_score,
      previous_values.total_score, previous_values.grade,
      new_values.assessment1, new_values.assessment2,
      new_values.ca_test, new_values.exam_score,
      new_values.total_score, new_values.grade,
      changed_by, change_reason, ip_address, user_agent
    ];

    try {
      await pool.query(query, values);
    } catch (error) {
      console.error('Failed to create history entry:', error);
      // Don't throw error here as it's not critical
    }
  }

  // Get result history
  static async getHistory(student_result_id, school_id) {
    const query = `
      SELECT 
        rh.*,
        u.first_name || ' ' || u.last_name as changed_by_name
      FROM result_history rh
      LEFT JOIN users u ON rh.changed_by = u.id
      WHERE rh.student_result_id = $1 AND rh.school_id = $2
      ORDER BY rh.created_at DESC
    `;

    try {
      const result = await pool.query(query, [student_result_id, school_id]);
      return result.rows;
    } catch (error) {
      throw new Error(`Failed to fetch result history: ${error.message}`);
    }
  }

  // Calculate and update class statistics manually
  static async recalculateClassStatistics(school_id, subject_name, class_name, session, term) {
    const query = 'SELECT calculate_class_statistics($1, $2, $3, $4, $5)';
    
    try {
      await pool.query(query, [school_id, subject_name, class_name, session, term]);
      return true;
    } catch (error) {
      throw new Error(`Failed to recalculate class statistics: ${error.message}`);
    }
  }

  // Update class positions manually
  static async updateClassPositions(school_id, subject_name, class_name, session, term) {
    const query = 'SELECT update_class_positions($1, $2, $3, $4, $5)';
    
    try {
      await pool.query(query, [school_id, subject_name, class_name, session, term]);
      return true;
    } catch (error) {
      throw new Error(`Failed to update class positions: ${error.message}`);
    }
  }
}

module.exports = StudentResult;
