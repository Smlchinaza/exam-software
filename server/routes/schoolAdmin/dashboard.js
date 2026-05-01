// School Admin Dashboard Routes
// Provides dashboard data and statistics for school administrators

const express = require('express');
const router = express.Router();
const pool = require('../../db/postgres');
const { schoolAdminAuth, checkPermission } = require('../../middleware/schoolAdminAuth');

// Get school admin dashboard statistics
router.get('/stats', schoolAdminAuth, async (req, res) => {
    try {
        const schoolId = req.admin.school_id;
        
        // Get comprehensive school statistics
        const statsQuery = `
            SELECT 
                -- Teacher statistics
                (SELECT COUNT(*) FROM users WHERE school_id = $1 AND role = 'teacher' AND is_active = true) as total_teachers,
                (SELECT COUNT(*) FROM users WHERE school_id = $1 AND role = 'teacher' AND is_active = true AND created_at > CURRENT_DATE - INTERVAL '30 days') as new_teachers_month,
                
                -- Student statistics
                (SELECT COUNT(*) FROM users WHERE school_id = $1 AND role = 'student' AND is_active = true) as total_students,
                (SELECT COUNT(*) FROM users WHERE school_id = $1 AND role = 'student' AND is_active = true AND created_at > CURRENT_DATE - INTERVAL '30 days') as new_students_month,
                
                -- Exam statistics
                (SELECT COUNT(*) FROM exams WHERE school_id = $1) as total_exams,
                (SELECT COUNT(*) FROM exams WHERE school_id = $1 AND is_published = true) as published_exams,
                (SELECT COUNT(*) FROM exams WHERE school_id = $1 AND created_at > CURRENT_DATE - INTERVAL '30 days') as new_exams_month,
                
                -- Submission statistics
                (SELECT COUNT(*) FROM exam_submissions WHERE school_id = $1) as total_submissions,
                (SELECT COUNT(*) FROM exam_submissions WHERE school_id = $1 AND submitted_at > CURRENT_DATE - INTERVAL '30 days') as submissions_month,
                (SELECT COUNT(*) FROM exam_submissions WHERE school_id = $1 AND submitted_at > CURRENT_DATE - INTERVAL '7 days') as submissions_week,
                
                -- Teacher registration statistics
                (SELECT COUNT(*) FROM teacher_registrations WHERE school_id = $1 AND status = 'pending') as pending_registrations,
                (SELECT COUNT(*) FROM teacher_registrations WHERE school_id = $1 AND status = 'approved') as approved_registrations,
                (SELECT COUNT(*) FROM teacher_registrations WHERE school_id = $1 AND status = 'rejected') as rejected_registrations,
                (SELECT COUNT(*) FROM teacher_registrations WHERE school_id = $1 AND created_at > CURRENT_DATE - INTERVAL '7 days') as registrations_week
        `;
        
        const statsResult = await pool.query(statsQuery, [schoolId]);
        const stats = statsResult.rows[0];
        
        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to fetch dashboard statistics',
            code: 'DASHBOARD_STATS_ERROR'
        });
    }
});

// Get recent activity for the school
router.get('/activity', schoolAdminAuth, async (req, res) => {
    try {
        const schoolId = req.admin.school_id;
        const { limit = 10, type } = req.query;
        
        let whereConditions = ['school_id = $1'];
        let queryParams = [schoolId];
        let paramIndex = 2;
        
        // Add type filter if specified
        if (type && type !== 'all') {
            whereConditions.push(`activity_type = $${paramIndex}`);
            queryParams.push(type);
            paramIndex++;
        }
        
        const whereClause = whereConditions.join(' AND ');
        
        const activityQuery = `
            SELECT * FROM (
                -- Exam activities
                SELECT 
                    'exam_created' as activity_type,
                    e.title as description,
                    e.created_at as timestamp,
                    u.first_name || ' ' || u.last_name as actor_name,
                    u.email as actor_email
                FROM exams e
                JOIN users u ON e.created_by = u.id
                WHERE e.school_id = $1
                
                UNION ALL
                
                -- Exam submission activities
                SELECT 
                    'exam_submitted' as activity_type,
                    'Exam submitted by ' || u.first_name || ' ' || u.last_name as description,
                    es.submitted_at as timestamp,
                    u.first_name || ' ' || u.last_name as actor_name,
                    u.email as actor_email
                FROM exam_submissions es
                JOIN users u ON es.student_id = u.id
                WHERE es.school_id = $1 AND es.submitted_at IS NOT NULL
                
                UNION ALL
                
                -- Teacher registration activities
                SELECT 
                    CASE 
                        WHEN tr.status = 'pending' THEN 'teacher_registered'
                        WHEN tr.status = 'approved' THEN 'teacher_approved'
                        WHEN tr.status = 'rejected' THEN 'teacher_rejected'
                    END as activity_type,
                    CASE 
                        WHEN tr.status = 'pending' THEN u.first_name || ' ' || u.last_name || ' registered as teacher'
                        WHEN tr.status = 'approved' THEN u.first_name || ' ' || u.last_name || ' approved as teacher'
                        WHEN tr.status = 'rejected' THEN u.first_name || ' ' || u.last_name || ' registration rejected'
                    END as description,
                    COALESCE(tr.reviewed_at, tr.created_at) as timestamp,
                    CASE 
                        WHEN tr.status = 'pending' THEN u.first_name || ' ' || u.last_name
                        WHEN tr.reviewed_by IS NOT NULL THEN reviewer.first_name || ' ' || reviewer.last_name
                        ELSE u.first_name || ' ' || u.last_name
                    END as actor_name,
                    CASE 
                        WHEN tr.status = 'pending' THEN u.email
                        WHEN tr.reviewed_by IS NOT NULL THEN reviewer.email
                        ELSE u.email
                    END as actor_email
                FROM teacher_registrations tr
                JOIN users u ON tr.user_id = u.id
                LEFT JOIN school_admins sa ON tr.reviewed_by = sa.id
                LEFT JOIN users reviewer ON sa.user_id = reviewer.id
                WHERE tr.school_id = $1
                
                UNION ALL
                
                -- New user activities
                SELECT 
                    CASE 
                        WHEN u.role = 'teacher' THEN 'teacher_joined'
                        WHEN u.role = 'student' THEN 'student_joined'
                    END as activity_type,
                    u.first_name || ' ' || u.last_name || ' joined as ' || u.role as description,
                    u.created_at as timestamp,
                    u.first_name || ' ' || u.last_name as actor_name,
                    u.email as actor_email
                FROM users u
                WHERE u.school_id = $1 AND u.created_at > CURRENT_DATE - INTERVAL '30 days'
                
            ) activities
            WHERE ${whereClause}
            ORDER BY timestamp DESC
            LIMIT $${paramIndex}
        `;
        
        queryParams.push(parseInt(limit));
        
        const result = await pool.query(activityQuery, queryParams);
        
        res.json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        console.error('Error fetching recent activity:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to fetch recent activity',
            code: 'ACTIVITY_ERROR'
        });
    }
});

// Get school performance metrics
router.get('/performance', schoolAdminAuth, checkPermission('analytics', 'read'), async (req, res) => {
    try {
        const schoolId = req.admin.school_id;
        const { period = '30' } = req.query; // days
        
        const days = parseInt(period);
        
        // Get performance metrics over time
        const performanceQuery = `
            WITH date_series AS (
                SELECT generate_series(
                    CURRENT_DATE - INTERVAL '${days} days',
                    CURRENT_DATE,
                    '1 day'
                )::date as date
            ),
            daily_metrics AS (
                SELECT 
                    ds.date,
                    COALESCE(
                        (SELECT COUNT(*) FROM users 
                         WHERE school_id = $1 
                         AND DATE(created_at) = ds.date 
                         AND role = 'student'), 0
                    ) as new_students,
                    COALESCE(
                        (SELECT COUNT(*) FROM exam_submissions 
                         WHERE school_id = $1 
                         AND DATE(submitted_at) = ds.date), 0
                    ) as exam_submissions,
                    COALESCE(
                        (SELECT COUNT(*) FROM teacher_registrations 
                         WHERE school_id = $1 
                         AND DATE(created_at) = ds.date), 0
                    ) as teacher_registrations
                FROM date_series ds
            )
            SELECT 
                date,
                new_students,
                exam_submissions,
                teacher_registrations,
                SUM(new_students) OVER (ORDER BY date) as cumulative_students,
                SUM(exam_submissions) OVER (ORDER BY date) as cumulative_submissions
            FROM daily_metrics
            ORDER BY date DESC
            LIMIT 30
        `;
        
        const result = await pool.query(performanceQuery, [schoolId]);
        
        res.json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        console.error('Error fetching performance metrics:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to fetch performance metrics',
            code: 'PERFORMANCE_ERROR'
        });
    }
});

// Get teacher overview
router.get('/teachers', schoolAdminAuth, checkPermission('teachers', 'read'), async (req, res) => {
    try {
        const schoolId = req.admin.school_id;
        const { page = 1, limit = 20, search, status = 'active' } = req.query;
        
        let offset = (page - 1) * limit;
        let whereConditions = ['school_id = $1', 'role = $2'];
        let queryParams = [schoolId, 'teacher'];
        let paramIndex = 3;
        
        // Add status filter
        if (status === 'active') {
            whereConditions.push('is_active = true');
        } else if (status === 'inactive') {
            whereConditions.push('is_active = false');
        }
        
        // Add search filter
        if (search) {
            whereConditions.push(`(
                first_name ILIKE $${paramIndex} OR 
                last_name ILIKE $${paramIndex} OR 
                email ILIKE $${paramIndex}
            )`);
            queryParams.push(`%${search}%`);
            paramIndex++;
        }
        
        const whereClause = whereConditions.join(' AND ');
        
        const query = `
            SELECT 
                id,
                email,
                first_name,
                last_name,
                phone,
                is_active,
                created_at,
                last_login,
                profile
            FROM users
            WHERE ${whereClause}
            ORDER BY created_at DESC
            LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `;
        
        queryParams.push(parseInt(limit), parseInt(offset));
        
        const result = await pool.query(query, queryParams);
        
        // Get total count
        const countQuery = `
            SELECT COUNT(*) as total
            FROM users
            WHERE ${whereClause}
        `;
        
        const countResult = await pool.query(countQuery, queryParams.slice(0, -2));
        const total = parseInt(countResult.rows[0].total);
        
        res.json({
            success: true,
            data: result.rows,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Error fetching teachers:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to fetch teachers',
            code: 'TEACHERS_ERROR'
        });
    }
});

// Get student overview
router.get('/students', schoolAdminAuth, checkPermission('students', 'read'), async (req, res) => {
    try {
        const schoolId = req.admin.school_id;
        const { page = 1, limit = 20, search, status = 'active' } = req.query;
        
        let offset = (page - 1) * limit;
        let whereConditions = ['school_id = $1', 'role = $2'];
        let queryParams = [schoolId, 'student'];
        let paramIndex = 3;
        
        // Add status filter
        if (status === 'active') {
            whereConditions.push('is_active = true');
        } else if (status === 'inactive') {
            whereConditions.push('is_active = false');
        }
        
        // Add search filter
        if (search) {
            whereConditions.push(`(
                first_name ILIKE $${paramIndex} OR 
                last_name ILIKE $${paramIndex} OR 
                email ILIKE $${paramIndex}
            )`);
            queryParams.push(`%${search}%`);
            paramIndex++;
        }
        
        const whereClause = whereConditions.join(' AND ');
        
        const query = `
            SELECT 
                id,
                email,
                first_name,
                last_name,
                phone,
                is_active,
                created_at,
                last_login,
                profile
            FROM users
            WHERE ${whereClause}
            ORDER BY created_at DESC
            LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `;
        
        queryParams.push(parseInt(limit), parseInt(offset));
        
        const result = await pool.query(query, queryParams);
        
        // Get total count
        const countQuery = `
            SELECT COUNT(*) as total
            FROM users
            WHERE ${whereClause}
        `;
        
        const countResult = await pool.query(countQuery, queryParams.slice(0, -2));
        const total = parseInt(countResult.rows[0].total);
        
        res.json({
            success: true,
            data: result.rows,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Error fetching students:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to fetch students',
            code: 'STUDENTS_ERROR'
        });
    }
});

// Get exam overview
router.get('/exams', schoolAdminAuth, checkPermission('exams', 'read'), async (req, res) => {
    try {
        const schoolId = req.admin.school_id;
        const { page = 1, limit = 20, search, status } = req.query;
        
        let offset = (page - 1) * limit;
        let whereConditions = ['school_id = $1'];
        let queryParams = [schoolId];
        let paramIndex = 2;
        
        // Add status filter
        if (status === 'published') {
            whereConditions.push('is_published = true');
        } else if (status === 'draft') {
            whereConditions.push('is_published = false');
        }
        
        // Add search filter
        if (search) {
            whereConditions.push(`title ILIKE $${paramIndex}`);
            queryParams.push(`%${search}%`);
            paramIndex++;
        }
        
        const whereClause = whereConditions.join(' AND ');
        
        const query = `
            SELECT 
                id,
                title,
                description,
                duration_minutes,
                is_published,
                created_at,
                updated_at,
                (SELECT COUNT(*) FROM exam_submissions WHERE exam_id = exams.id) as submission_count
            FROM exams
            WHERE ${whereClause}
            ORDER BY created_at DESC
            LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `;
        
        queryParams.push(parseInt(limit), parseInt(offset));
        
        const result = await pool.query(query, queryParams);
        
        // Get total count
        const countQuery = `
            SELECT COUNT(*) as total
            FROM exams
            WHERE ${whereClause}
        `;
        
        const countResult = await pool.query(countQuery, queryParams.slice(0, -2));
        const total = parseInt(countResult.rows[0].total);
        
        res.json({
            success: true,
            data: result.rows,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Error fetching exams:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to fetch exams',
            code: 'EXAMS_ERROR'
        });
    }
});

module.exports = router;
