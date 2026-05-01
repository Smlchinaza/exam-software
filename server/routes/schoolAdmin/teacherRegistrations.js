// Teacher Registration Management Routes
// Handles teacher registration approval workflow for school admins

const express = require('express');
const router = express.Router();
const pool = require('../../db/postgres');
const { schoolAdminAuth, checkPermission } = require('../../middleware/schoolAdminAuth');

// Get pending teacher registrations for the school
router.get('/pending', schoolAdminAuth, checkPermission('teachers', 'read'), async (req, res) => {
    try {
        const schoolId = req.admin.school_id;
        
        const query = `
            SELECT 
                tr.id,
                tr.user_id,
                tr.school_id,
                tr.registration_data,
                tr.created_at,
                u.email,
                u.first_name,
                u.last_name,
                u.phone,
                u.profile,
                u.created_at as user_created_at
            FROM teacher_registrations tr 
            JOIN users u ON tr.user_id = u.id 
            WHERE tr.school_id = $1 AND tr.status = 'pending'
            ORDER BY tr.created_at DESC
        `;
        
        const result = await pool.query(query, [schoolId]);
        
        res.json({
            success: true,
            data: result.rows,
            count: result.rows.length
        });
    } catch (error) {
        console.error('Error fetching pending registrations:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to fetch pending registrations',
            code: 'FETCH_PENDING_ERROR'
        });
    }
});

// Get all teacher registrations with filtering
router.get('/', schoolAdminAuth, checkPermission('teachers', 'read'), async (req, res) => {
    try {
        const schoolId = req.admin.school_id;
        const { status, page = 1, limit = 20, search } = req.query;
        
        let offset = (page - 1) * limit;
        let whereConditions = ['tr.school_id = $1'];
        let queryParams = [schoolId];
        let paramIndex = 2;

        // Add status filter
        if (status && status !== 'all') {
            whereConditions.push(`tr.status = $${paramIndex}`);
            queryParams.push(status);
            paramIndex++;
        }

        // Add search filter
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

        // Get registrations
        const query = `
            SELECT 
                tr.id,
                tr.user_id,
                tr.school_id,
                tr.status,
                tr.registration_data,
                tr.reviewed_at,
                tr.rejection_reason,
                tr.created_at,
                u.email,
                u.first_name,
                u.last_name,
                u.phone,
                u.profile,
                reviewer.email as reviewer_email,
                reviewer.first_name as reviewer_first_name,
                reviewer.last_name as reviewer_last_name
            FROM teacher_registrations tr 
            JOIN users u ON tr.user_id = u.id 
            LEFT JOIN school_admins sa ON tr.reviewed_by = sa.id
            LEFT JOIN users reviewer ON sa.user_id = reviewer.id
            WHERE ${whereClause}
            ORDER BY tr.created_at DESC
            LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `;
        
        queryParams.push(limit, offset);
        
        const result = await pool.query(query, queryParams);

        // Get total count for pagination
        const countQuery = `
            SELECT COUNT(*) as total
            FROM teacher_registrations tr 
            JOIN users u ON tr.user_id = u.id 
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
        console.error('Error fetching teacher registrations:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to fetch teacher registrations',
            code: 'FETCH_REGISTRATIONS_ERROR'
        });
    }
});

// Get specific teacher registration details
router.get('/:registrationId', schoolAdminAuth, checkPermission('teachers', 'read'), async (req, res) => {
    try {
        const { registrationId } = req.params;
        const schoolId = req.admin.school_id;
        
        const query = `
            SELECT 
                tr.id,
                tr.user_id,
                tr.school_id,
                tr.status,
                tr.registration_data,
                tr.reviewed_at,
                tr.rejection_reason,
                tr.created_at,
                tr.updated_at,
                u.email,
                u.first_name,
                u.last_name,
                u.phone,
                u.profile,
                u.created_at as user_created_at,
                reviewer.email as reviewer_email,
                reviewer.first_name as reviewer_first_name,
                reviewer.last_name as reviewer_last_name
            FROM teacher_registrations tr 
            JOIN users u ON tr.user_id = u.id 
            LEFT JOIN school_admins sa ON tr.reviewed_by = sa.id
            LEFT JOIN users reviewer ON sa.user_id = reviewer.id
            WHERE tr.id = $1 AND tr.school_id = $2
        `;
        
        const result = await pool.query(query, [registrationId, schoolId]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ 
                success: false,
                error: 'Teacher registration not found',
                code: 'REGISTRATION_NOT_FOUND'
            });
        }

        res.json({
            success: true,
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Error fetching teacher registration:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to fetch teacher registration',
            code: 'FETCH_REGISTRATION_ERROR'
        });
    }
});

// Approve teacher registration
router.post('/:registrationId/approve', schoolAdminAuth, checkPermission('teachers', 'write'), async (req, res) => {
    try {
        const { registrationId } = req.params;
        const schoolId = req.admin.school_id;
        const adminId = req.admin.id;
        
        // Start transaction
        const client = await pool.connect();
        
        try {
            await client.query('BEGIN');
            
            // Update registration status
            const updateQuery = `
                UPDATE teacher_registrations 
                SET status = 'approved', 
                    reviewed_by = $1, 
                    reviewed_at = CURRENT_TIMESTAMP,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $2 AND school_id = $3 AND status = 'pending'
                RETURNING *
            `;
            
            const result = await client.query(updateQuery, [adminId, registrationId, schoolId]);
            
            if (result.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({ 
                    success: false,
                    error: 'Teacher registration not found or already processed',
                    code: 'REGISTRATION_NOT_FOUND'
                });
            }

            const registration = result.rows[0];

            // Update user role to teacher
            const updateUserQuery = `
                UPDATE users 
                SET role = 'teacher', 
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $1
                RETURNING id, email, role
            `;
            
            const userResult = await client.query(updateUserQuery, [registration.user_id]);
            
            if (userResult.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(500).json({ 
                    success: false,
                    error: 'Failed to update user role',
                    code: 'USER_UPDATE_FAILED'
                });
            }

            await client.query('COMMIT');
            
            res.json({
                success: true,
                message: 'Teacher registration approved successfully',
                data: {
                    registration: result.rows[0],
                    user: userResult.rows[0]
                }
            });
            
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
        
    } catch (error) {
        console.error('Error approving registration:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to approve teacher registration',
            code: 'APPROVAL_ERROR'
        });
    }
});

// Reject teacher registration
router.post('/:registrationId/reject', schoolAdminAuth, checkPermission('teachers', 'write'), async (req, res) => {
    try {
        const { registrationId } = req.params;
        const { rejectionReason } = req.body;
        const schoolId = req.admin.school_id;
        const adminId = req.admin.id;
        
        if (!rejectionReason || rejectionReason.trim().length === 0) {
            return res.status(400).json({ 
                success: false,
                error: 'Rejection reason is required',
                code: 'REJECTION_REASON_REQUIRED'
            });
        }
        
        const updateQuery = `
            UPDATE teacher_registrations 
            SET status = 'rejected', 
                reviewed_by = $1, 
                reviewed_at = CURRENT_TIMESTAMP,
                rejection_reason = $2,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $3 AND school_id = $4 AND status = 'pending'
            RETURNING *
        `;
        
        const result = await pool.query(updateQuery, [
            adminId, 
            rejectionReason.trim(), 
            registrationId, 
            schoolId
        ]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ 
                success: false,
                error: 'Teacher registration not found or already processed',
                code: 'REGISTRATION_NOT_FOUND'
            });
        }

        res.json({
            success: true,
            message: 'Teacher registration rejected',
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Error rejecting registration:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to reject teacher registration',
            code: 'REJECTION_ERROR'
        });
    }
});

// Get registration statistics
router.get('/stats/summary', schoolAdminAuth, checkPermission('teachers', 'read'), async (req, res) => {
    try {
        const schoolId = req.admin.school_id;
        
        const query = `
            SELECT 
                COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
                COUNT(*) FILTER (WHERE status = 'approved') as approved_count,
                COUNT(*) FILTER (WHERE status = 'rejected') as rejected_count,
                COUNT(*) as total_count,
                COUNT(*) FILTER (WHERE status = 'pending' AND created_at > CURRENT_DATE - INTERVAL '7 days') as pending_this_week,
                COUNT(*) FILTER (WHERE status = 'approved' AND reviewed_at > CURRENT_DATE - INTERVAL '7 days') as approved_this_week
            FROM teacher_registrations 
            WHERE school_id = $1
        `;
        
        const result = await pool.query(query, [schoolId]);
        
        res.json({
            success: true,
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Error fetching registration stats:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to fetch registration statistics',
            code: 'STATS_ERROR'
        });
    }
});

// Export registrations data
router.get('/export', schoolAdminAuth, checkPermission('teachers', 'read'), async (req, res) => {
    try {
        const schoolId = req.admin.school_id;
        const { status, format = 'csv' } = req.query;
        
        let whereConditions = ['tr.school_id = $1'];
        let queryParams = [schoolId];
        
        if (status && status !== 'all') {
            whereConditions.push(`tr.status = $2`);
            queryParams.push(status);
        }
        
        const whereClause = whereConditions.join(' AND ');
        
        const query = `
            SELECT 
                tr.id,
                tr.status,
                tr.created_at,
                tr.reviewed_at,
                tr.rejection_reason,
                u.email,
                u.first_name,
                u.last_name,
                u.phone,
                reviewer.email as reviewed_by_email
            FROM teacher_registrations tr 
            JOIN users u ON tr.user_id = u.id 
            LEFT JOIN school_admins sa ON tr.reviewed_by = sa.id
            LEFT JOIN users reviewer ON sa.user_id = reviewer.id
            WHERE ${whereClause}
            ORDER BY tr.created_at DESC
        `;
        
        const result = await pool.query(query, queryParams);
        
        if (format === 'csv') {
            // Convert to CSV
            const csvHeader = 'ID,Status,Email,First Name,Last Name,Phone,Created At,Reviewed At,Reviewed By,Rejection Reason\n';
            const csvData = result.rows.map(row => [
                row.id,
                row.status,
                row.email,
                row.first_name,
                row.last_name,
                row.phone || '',
                row.created_at,
                row.reviewed_at || '',
                row.reviewed_by_email || '',
                `"${row.rejection_reason || ''}"`
            ].join(',')).join('\n');
            
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename=teacher-registrations.csv');
            res.send(csvHeader + csvData);
        } else {
            res.json({
                success: true,
                data: result.rows
            });
        }
    } catch (error) {
        console.error('Error exporting registrations:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to export registrations',
            code: 'EXPORT_ERROR'
        });
    }
});

module.exports = router;
