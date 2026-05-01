// PostgreSQL Notification Model
// Handles teacher registration notifications and approval workflow

const pool = require('../db/postgres');

class NotificationPostgres {
  // Create teacher registration notification
  static async createTeacherRegistrationNotification(schoolId, userId, teacherData) {
    const {
      firstName,
      lastName,
      email,
      subjects,
      department,
      experience
    } = teacherData;

    const query = `
      INSERT INTO notifications (
        school_id, user_id, type, title, message, data, is_read, is_actioned
      ) VALUES ($1, $2, 'teacher_registration', 'New Teacher Registration', 
        $3, $4, false, false)
      RETURNING *
    `;

    const values = [
      schoolId,
      userId,
      `${firstName} ${lastName} has registered as a teacher`,
      JSON.stringify({
        userId,
        userEmail: email,
        teacherName: `${firstName} ${lastName}`,
        subjects: subjects || [],
        department: department || null,
        experience: experience || null,
        registeredAt: new Date().toISOString()
      })
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  // Get notifications for a school
  static async getSchoolNotifications(schoolId, options = {}) {
    const {
      page = 1,
      limit = 20,
      unread = null,
      type = null,
      actioned = null
    } = options;

    const offset = (page - 1) * limit;
    let whereConditions = ['n.school_id = $1'];
    let queryParams = [schoolId];
    let paramIndex = 2;

    if (unread !== null) {
      whereConditions.push(`n.is_read = $${paramIndex}`);
      queryParams.push(unread);
      paramIndex++;
    }

    if (type) {
      whereConditions.push(`n.type = $${paramIndex}`);
      queryParams.push(type);
      paramIndex++;
    }

    if (actioned !== null) {
      whereConditions.push(`n.is_actioned = $${paramIndex}`);
      queryParams.push(actioned);
      paramIndex++;
    }

    const whereClause = whereConditions.join(' AND ');

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM notifications n
      WHERE ${whereClause}
    `;

    const countResult = await pool.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].total);

    // Get notifications
    const query = `
      SELECT 
        n.*,
        u.first_name || ' ' || u.last_name as user_name,
        u.email as user_email
      FROM notifications n
      LEFT JOIN users u ON n.user_id = u.id
      WHERE ${whereClause}
      ORDER BY n.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    queryParams.push(limit, offset);
    const result = await pool.query(query, queryParams);

    return {
      notifications: result.rows,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  // Get teacher registration notifications for a school
  static async getTeacherRegistrationNotifications(schoolId, options = {}) {
    return this.getSchoolNotifications(schoolId, { ...options, type: 'teacher_registration' });
  }

  // Get unread notifications count for a school
  static async getUnreadCount(schoolId, type = null) {
    let query = `
      SELECT COUNT(*) as count
      FROM notifications
      WHERE school_id = $1 AND is_read = false
    `;
    let params = [schoolId];

    if (type) {
      query += ' AND type = $2';
      params.push(type);
    }

    const result = await pool.query(query, params);
    return parseInt(result.rows[0].count);
  }

  // Mark notification as read
  static async markAsRead(notificationId, userId = null) {
    const query = `
      UPDATE notifications 
      SET is_read = true, updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;

    const result = await pool.query(query, [notificationId]);
    return result.rows[0];
  }

  // Mark multiple notifications as read
  static async markMultipleAsRead(notificationIds, userId = null) {
    if (notificationIds.length === 0) return [];

    const query = `
      UPDATE notifications 
      SET is_read = true, updated_at = NOW()
      WHERE id = ANY($1)
      RETURNING *
    `;

    const result = await pool.query(query, [notificationIds]);
    return result.rows;
  }

  // Action notification (approve/reject teacher registration)
  static async actionNotification(notificationId, actionedBy, actionData) {
    const { action, notes } = actionData;

    await pool.query('BEGIN');

    try {
      // Get notification details
      const notificationQuery = `
        SELECT n.*, u.email as user_email, u.first_name, u.last_name
        FROM notifications n
        LEFT JOIN users u ON n.user_id = u.id
        WHERE n.id = $1
      `;

      const notificationResult = await pool.query(notificationQuery, [notificationId]);
      
      if (notificationResult.rows.length === 0) {
        throw new Error('Notification not found');
      }

      const notification = notificationResult.rows[0];

      // Update notification
      const updateQuery = `
        UPDATE notifications 
        SET 
          is_read = true,
          is_actioned = true,
          action_taken_by = $1,
          action_taken_at = NOW(),
          data = jsonb_set(
            jsonb_set(data, '{action}', to_jsonb($2)),
            '{actionedBy}', 
            to_jsonb($3)
          ),
          updated_at = NOW()
        WHERE id = $4
        RETURNING *
      `;

      const updateResult = await pool.query(updateQuery, [
        actionedBy,
        action,
        actionedBy,
        notificationId
      ]);

      // Update user approval status if action is approve/reject
      if (notification.type === 'teacher_registration' && (action === 'approved' || action === 'rejected')) {
        const isApproved = action === 'approved';
        
        await pool.query(
          'UPDATE users SET approved = $1, updated_at = NOW() WHERE id = $2',
          [isApproved, notification.user_id]
        );

        // Create approval notification for the teacher
        await this.createUserNotification(
          notification.user_id,
          'user_approval',
          `Registration ${action}`,
          `Your teacher registration has been ${action}. ${notes ? `Notes: ${notes}` : ''}`,
          {
            action,
            notes,
            actionedBy,
            actionedAt: new Date().toISOString()
          }
        );
      }

      await pool.query('COMMIT');

      return {
        notification: updateResult.rows[0],
        user: {
          email: notification.user_email,
          firstName: notification.first_name,
          lastName: notification.last_name
        }
      };

    } catch (error) {
      await pool.query('ROLLBACK');
      throw error;
    }
  }

  // Create notification for a user
  static async createUserNotification(userId, type, title, message, data = {}) {
    const query = `
      INSERT INTO notifications (
        school_id, user_id, type, title, message, data, is_read, is_actioned
      ) 
      SELECT school_id, $1, $2, $3, $4, $5, false, false
      FROM users WHERE id = $1
      RETURNING *
    `;

    const values = [
      userId,
      type,
      title,
      message,
      JSON.stringify(data)
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  // Get notifications for a user
  static async getUserNotifications(userId, options = {}) {
    const {
      page = 1,
      limit = 20,
      unread = null
    } = options;

    const offset = (page - 1) * limit;
    let whereConditions = ['n.user_id = $1'];
    let queryParams = [userId];
    let paramIndex = 2;

    if (unread !== null) {
      whereConditions.push(`n.is_read = $${paramIndex}`);
      queryParams.push(unread);
      paramIndex++;
    }

    const whereClause = whereConditions.join(' AND ');

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM notifications n
      WHERE ${whereClause}
    `;

    const countResult = await pool.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].total);

    // Get notifications
    const query = `
      SELECT *
      FROM notifications n
      WHERE ${whereClause}
      ORDER BY n.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    queryParams.push(limit, offset);
    const result = await pool.query(query, queryParams);

    return {
      notifications: result.rows,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  // Get notification statistics for a school
  static async getSchoolStatistics(schoolId) {
    const query = `
      SELECT 
        COUNT(*) as total_notifications,
        COUNT(CASE WHEN is_read = false THEN 1 END) as unread_count,
        COUNT(CASE WHEN type = 'teacher_registration' THEN 1 END) as teacher_registrations,
        COUNT(CASE WHEN is_actioned = true THEN 1 END) as actioned_count,
        COUNT(CASE WHEN is_actioned = false THEN 1 END) as pending_count
      FROM notifications
      WHERE school_id = $1
    `;

    const result = await pool.query(query, [schoolId]);
    return result.rows[0];
  }

  // Delete old notifications (cleanup)
  static async cleanupOldNotifications(daysOld = 90) {
    const query = `
      DELETE FROM notifications 
      WHERE created_at < NOW() - INTERVAL '${daysOld} days'
      AND is_read = true AND is_actioned = true
      RETURNING COUNT(*) as deleted_count
    `;

    const result = await pool.query(query);
    return parseInt(result.rows[0].deleted_count);
  }

  // Get pending teacher registrations for a school
  static async getPendingTeacherRegistrations(schoolId) {
    const query = `
      SELECT 
        n.id as notification_id,
        n.created_at as registration_date,
        n.data,
        u.id as user_id,
        u.first_name,
        u.last_name,
        u.email,
        u.created_at as user_created_at
      FROM notifications n
      JOIN users u ON n.user_id = u.id
      WHERE n.school_id = $1 
        AND n.type = 'teacher_registration' 
        AND n.is_actioned = false
      ORDER BY n.created_at ASC
    `;

    const result = await pool.query(query, [schoolId]);
    return result.rows;
  }
}

module.exports = NotificationPostgres;
