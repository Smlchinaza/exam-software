// School Admin Security Routes
// Security monitoring, audit trail, and access control endpoints

const express = require('express');
const router = express.Router();
const pool = require('../../db/postgres');
const { schoolAdminAuth, checkPermission } = require('../../middleware/schoolAdminAuth');
const { logSecurityEvent } = require('../../middleware/security');

// Get security dashboard statistics
router.get('/dashboard/stats', schoolAdminAuth, checkPermission('analytics', 'read'), async (req, res) => {
    try {
        const schoolId = req.admin.school_id;
        
        // Get comprehensive security statistics
        const statsQuery = `
            SELECT 
                -- Login statistics
                (SELECT COUNT(*) FROM login_attempts WHERE school_id = $1 AND created_at > CURRENT_DATE - INTERVAL '7 days') as total_logins_week,
                (SELECT COUNT(*) FROM login_attempts WHERE school_id = $1 AND success = false AND created_at > CURRENT_DATE - INTERVAL '7 days') as failed_logins_week,
                (SELECT COUNT(*) FROM login_attempts WHERE school_id = $1 AND success = true AND created_at > CURRENT_DATE - INTERVAL '7 days') as successful_logins_week,
                
                -- Security events
                (SELECT COUNT(*) FROM security_events WHERE school_id = $1 AND created_at > CURRENT_DATE - INTERVAL '7 days') as security_events_week,
                (SELECT COUNT(*) FROM security_events WHERE school_id = $1 AND severity = 'high' AND created_at > CURRENT_DATE - INTERVAL '7 days') as high_severity_events_week,
                (SELECT COUNT(*) FROM security_events WHERE school_id = $1 AND resolved = false) as unresolved_events,
                
                -- Audit statistics
                (SELECT COUNT(*) FROM audit_logs WHERE school_id = $1 AND created_at > CURRENT_DATE - INTERVAL '7 days') as audit_actions_week,
                (SELECT COUNT(*) FROM audit_logs WHERE school_id = $1 AND success = false AND created_at > CURRENT_DATE - INTERVAL '7 days') as failed_actions_week,
                
                -- Data access statistics
                (SELECT COUNT(*) FROM data_access_logs WHERE school_id = $1 AND created_at > CURRENT_DATE - INTERVAL '7 days') as data_access_week,
                (SELECT COUNT(*) FROM data_access_logs WHERE school_id = $1 AND access_granted = false AND created_at > CURRENT_DATE - INTERVAL '7 days') as denied_access_week,
                
                -- Active sessions
                (SELECT COUNT(*) FROM active_sessions WHERE school_id = $1 AND created_at > CURRENT_DATE - INTERVAL '24 hours') as active_sessions_today,
                (SELECT COUNT(DISTINCT user_id) FROM active_sessions WHERE school_id = $1 AND created_at > CURRENT_DATE - INTERVAL '24 hours') as unique_users_today
        `;
        
        const result = await pool.query(statsQuery, [schoolId]);
        
        res.json({
            success: true,
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Error fetching security stats:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to fetch security statistics',
            code: 'SECURITY_STATS_ERROR'
        });
    }
});

// Get recent security events
router.get('/events', schoolAdminAuth, checkPermission('analytics', 'read'), async (req, res) => {
    try {
        const schoolId = req.admin.school_id;
        const { page = 1, limit = 20, severity, event_type, resolved } = req.query;
        
        let offset = (page - 1) * limit;
        let whereConditions = ['se.school_id = $1'];
        let queryParams = [schoolId];
        let paramIndex = 2;
        
        // Add filters
        if (severity && severity !== 'all') {
            whereConditions.push(`se.severity = $${paramIndex}`);
            queryParams.push(severity);
            paramIndex++;
        }
        
        if (event_type && event_type !== 'all') {
            whereConditions.push(`se.event_type = $${paramIndex}`);
            queryParams.push(event_type);
            paramIndex++;
        }
        
        if (resolved !== undefined) {
            whereConditions.push(`se.resolved = $${paramIndex}`);
            queryParams.push(resolved === 'true');
            paramIndex++;
        }
        
        const whereClause = whereConditions.join(' AND ');
        
        const query = `
            SELECT 
                se.id,
                se.event_type,
                se.severity,
                se.description,
                se.resolved,
                se.resolved_at,
                se.created_at,
                se.details,
                u.email as user_email,
                u.first_name || ' ' || u.last_name as user_name,
                se.ip_address,
                se.user_agent
            FROM security_events se
            LEFT JOIN users u ON se.user_id = u.id
            WHERE ${whereClause}
            ORDER BY se.created_at DESC
            LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `;
        
        queryParams.push(parseInt(limit), parseInt(offset));
        
        const result = await pool.query(query, queryParams);
        
        // Get total count
        const countQuery = `
            SELECT COUNT(*) as total
            FROM security_events se
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
        console.error('Error fetching security events:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to fetch security events',
            code: 'SECURITY_EVENTS_ERROR'
        });
    }
});

// Get audit trail
router.get('/audit-trail', schoolAdminAuth, checkPermission('analytics', 'read'), async (req, res) => {
    try {
        const schoolId = req.admin.school_id;
        const { page = 1, limit = 20, action, resource_type, user_id, date_from, date_to } = req.query;
        
        let offset = (page - 1) * limit;
        let whereConditions = ['al.school_id = $1'];
        let queryParams = [schoolId];
        let paramIndex = 2;
        
        // Add filters
        if (action && action !== 'all') {
            whereConditions.push(`al.action = $${paramIndex}`);
            queryParams.push(action);
            paramIndex++;
        }
        
        if (resource_type && resource_type !== 'all') {
            whereConditions.push(`al.resource_type = $${paramIndex}`);
            queryParams.push(resource_type);
            paramIndex++;
        }
        
        if (user_id) {
            whereConditions.push(`al.user_id = $${paramIndex}`);
            queryParams.push(user_id);
            paramIndex++;
        }
        
        if (date_from) {
            whereConditions.push(`DATE(al.created_at) >= $${paramIndex}`);
            queryParams.push(date_from);
            paramIndex++;
        }
        
        if (date_to) {
            whereConditions.push(`DATE(al.created_at) <= $${paramIndex}`);
            queryParams.push(date_to);
            paramIndex++;
        }
        
        const whereClause = whereConditions.join(' AND ');
        
        const query = `
            SELECT 
                al.id,
                al.action,
                al.resource_type,
                al.resource_id,
                al.success,
                al.error_message,
                al.created_at,
                al.old_values,
                al.new_values,
                al.ip_address,
                al.user_agent,
                u.email as user_email,
                u.first_name || ' ' || u.last_name as user_name,
                admin_user.email as admin_email,
                admin_user.first_name || ' ' || admin_user.last_name as admin_name
            FROM audit_logs al
            LEFT JOIN users u ON al.user_id = u.id
            LEFT JOIN school_admins sa ON al.admin_id = sa.id
            LEFT JOIN users admin_user ON sa.user_id = admin_user.id
            WHERE ${whereClause}
            ORDER BY al.created_at DESC
            LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `;
        
        queryParams.push(parseInt(limit), parseInt(offset));
        
        const result = await pool.query(query, queryParams);
        
        // Get total count
        const countQuery = `
            SELECT COUNT(*) as total
            FROM audit_logs al
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
        console.error('Error fetching audit trail:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to fetch audit trail',
            code: 'AUDIT_TRAIL_ERROR'
        });
    }
});

// Get login attempts
router.get('/login-attempts', schoolAdminAuth, checkPermission('analytics', 'read'), async (req, res) => {
    try {
        const schoolId = req.admin.school_id;
        const { page = 1, limit = 20, success, date_from, date_to } = req.query;
        
        let offset = (page - 1) * limit;
        let whereConditions = ['school_id = $1'];
        let queryParams = [schoolId];
        let paramIndex = 2;
        
        // Add filters
        if (success !== undefined) {
            whereConditions.push(`success = $${paramIndex}`);
            queryParams.push(success === 'true');
            paramIndex++;
        }
        
        if (date_from) {
            whereConditions.push(`DATE(created_at) >= $${paramIndex}`);
            queryParams.push(date_from);
            paramIndex++;
        }
        
        if (date_to) {
            whereConditions.push(`DATE(created_at) <= $${paramIndex}`);
            queryParams.push(date_to);
            paramIndex++;
        }
        
        const whereClause = whereConditions.join(' AND ');
        
        const query = `
            SELECT 
                id,
                email,
                ip_address,
                user_agent,
                success,
                failure_reason,
                created_at
            FROM login_attempts
            WHERE ${whereClause}
            ORDER BY created_at DESC
            LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `;
        
        queryParams.push(parseInt(limit), parseInt(offset));
        
        const result = await pool.query(query, queryParams);
        
        // Get total count
        const countQuery = `
            SELECT COUNT(*) as total
            FROM login_attempts
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
        console.error('Error fetching login attempts:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to fetch login attempts',
            code: 'LOGIN_ATTEMPTS_ERROR'
        });
    }
});

// Resolve security event
router.post('/events/:eventId/resolve', schoolAdminAuth, checkPermission('settings', 'write'), async (req, res) => {
    try {
        const { eventId } = req.params;
        const schoolId = req.admin.school_id;
        const adminId = req.admin.id;
        const { resolution_notes } = req.body;
        
        // Update security event
        const updateQuery = `
            UPDATE security_events 
            SET resolved = true, 
                resolved_by = $1, 
                resolved_at = CURRENT_TIMESTAMP,
                details = jsonb_set(details, '{resolution_notes}', $2)
            WHERE id = $3 AND school_id = $4
            RETURNING *
        `;
        
        const result = await pool.query(updateQuery, [
            adminId, 
            JSON.stringify(resolution_notes || ''), 
            eventId, 
            schoolId
        ]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ 
                success: false,
                error: 'Security event not found',
                code: 'EVENT_NOT_FOUND'
            });
        }
        
        // Log the resolution action
        await logSecurityEvent({
            eventType: 'SECURITY_EVENT_RESOLVED',
            severity: 'low',
            userId: adminId,
            schoolId: schoolId,
            description: `Security event ${eventId} resolved`,
            details: {
                eventId: eventId,
                resolvedBy: adminId,
                resolutionNotes: resolution_notes
            }
        });
        
        res.json({
            success: true,
            message: 'Security event resolved successfully',
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Error resolving security event:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to resolve security event',
            code: 'RESOLVE_EVENT_ERROR'
        });
    }
});

// Get active sessions
router.get('/active-sessions', schoolAdminAuth, checkPermission('analytics', 'read'), async (req, res) => {
    try {
        const schoolId = req.admin.school_id;
        const { page = 1, limit = 20 } = req.query;
        
        let offset = (page - 1) * limit;
        
        const query = `
            SELECT 
                s.id,
                s.user_id,
                s.ip_address,
                s.user_agent,
                s.created_at,
                s.last_activity,
                u.email,
                u.first_name || ' ' || u.last_name as user_name,
                u.role,
                EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - s.last_activity)) as idle_seconds
            FROM active_sessions s
            JOIN users u ON s.user_id = u.id
            WHERE s.school_id = $1
            ORDER BY s.last_activity DESC
            LIMIT $2 OFFSET $3
        `;
        
        const result = await pool.query(query, [schoolId, parseInt(limit), parseInt(offset)]);
        
        // Get total count
        const countQuery = `
            SELECT COUNT(*) as total
            FROM active_sessions s
            WHERE s.school_id = $1
        `;
        
        const countResult = await pool.query(countQuery, [schoolId]);
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
        console.error('Error fetching active sessions:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to fetch active sessions',
            code: 'ACTIVE_SESSIONS_ERROR'
        });
    }
});

// Terminate session
router.post('/sessions/:sessionId/terminate', schoolAdminAuth, checkPermission('settings', 'write'), async (req, res) => {
    try {
        const { sessionId } = req.params;
        const schoolId = req.admin.school_id;
        const adminId = req.admin.id;
        
        // Get session details before termination
        const sessionQuery = `
            SELECT s.*, u.email, u.first_name || ' ' || u.last_name as user_name
            FROM active_sessions s
            JOIN users u ON s.user_id = u.id
            WHERE s.id = $1 AND s.school_id = $2
        `;
        
        const sessionResult = await pool.query(sessionQuery, [sessionId, schoolId]);
        
        if (sessionResult.rows.length === 0) {
            return res.status(404).json({ 
                success: false,
                error: 'Session not found',
                code: 'SESSION_NOT_FOUND'
            });
        }
        
        const session = sessionResult.rows[0];
        
        // Delete the session
        await pool.query('DELETE FROM active_sessions WHERE id = $1', [sessionId]);
        
        // Log the session termination
        await logSecurityEvent({
            eventType: 'SESSION_TERMINATED',
            severity: 'medium',
            userId: session.user_id,
            schoolId: schoolId,
            ipAddress: session.ip_address,
            userAgent: session.user_agent,
            description: `Session terminated by admin`,
            details: {
                sessionId: sessionId,
                terminatedBy: adminId,
                terminatedUserEmail: session.email,
                terminatedUserName: session.user_name
            }
        });
        
        res.json({
            success: true,
            message: 'Session terminated successfully',
            data: {
                sessionId: sessionId,
                userEmail: session.email,
                userName: session.user_name
            }
        });
    } catch (error) {
        console.error('Error terminating session:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to terminate session',
            code: 'TERMINATE_SESSION_ERROR'
        });
    }
});

// Get security analytics
router.get('/analytics', schoolAdminAuth, checkPermission('analytics', 'read'), async (req, res) => {
    try {
        const schoolId = req.admin.school_id;
        const { period = '30' } = req.query; // days
        
        const days = parseInt(period);
        
        // Get security analytics over time
        const analyticsQuery = `
            WITH date_series AS (
                SELECT generate_series(
                    CURRENT_DATE - INTERVAL '${days} days',
                    CURRENT_DATE,
                    '1 day'
                )::date as date
            ),
            security_metrics AS (
                SELECT 
                    ds.date,
                    COALESCE(
                        (SELECT COUNT(*) FROM login_attempts 
                         WHERE school_id = $1 
                         AND DATE(created_at) = ds.date), 0
                    ) as login_attempts,
                    COALESCE(
                        (SELECT COUNT(*) FROM login_attempts 
                         WHERE school_id = $1 
                         AND DATE(created_at) = ds.date 
                         AND success = false), 0
                    ) as failed_logins,
                    COALESCE(
                        (SELECT COUNT(*) FROM security_events 
                         WHERE school_id = $1 
                         AND DATE(created_at) = ds.date), 0
                    ) as security_events,
                    COALESCE(
                        (SELECT COUNT(*) FROM audit_logs 
                         WHERE school_id = $1 
                         AND DATE(created_at) = ds.date), 0
                    ) as audit_actions
                FROM date_series ds
            )
            SELECT 
                date,
                login_attempts,
                failed_logins,
                security_events,
                audit_actions,
                CASE 
                    WHEN login_attempts > 0 THEN 
                        ROUND((failed_logins::decimal / login_attempts) * 100, 2)
                    ELSE 0
                END as failure_rate
            FROM security_metrics
            ORDER BY date DESC
            LIMIT 30
        `;
        
        const result = await pool.query(analyticsQuery, [schoolId]);
        
        res.json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        console.error('Error fetching security analytics:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to fetch security analytics',
            code: 'SECURITY_ANALYTICS_ERROR'
        });
    }
});

// Export security data
router.get('/export', schoolAdminAuth, checkPermission('analytics', 'read'), async (req, res) => {
    try {
        const schoolId = req.admin.school_id;
        const { type = 'events', format = 'csv', date_from, date_to } = req.query;
        
        let query = '';
        let filename = '';
        
        switch (type) {
            case 'events':
                query = `
                    SELECT 
                        se.event_type,
                        se.severity,
                        se.description,
                        se.resolved,
                        se.created_at,
                        u.email as user_email,
                        u.first_name || ' ' || u.last_name as user_name,
                        se.ip_address,
                        se.user_agent
                    FROM security_events se
                    LEFT JOIN users u ON se.user_id = u.id
                    WHERE se.school_id = $1
                    ${date_from ? `AND DATE(se.created_at) >= '${date_from}'` : ''}
                    ${date_to ? `AND DATE(se.created_at) <= '${date_to}'` : ''}
                    ORDER BY se.created_at DESC
                `;
                filename = 'security-events';
                break;
                
            case 'audit':
                query = `
                    SELECT 
                        al.action,
                        al.resource_type,
                        al.success,
                        al.error_message,
                        al.created_at,
                        u.email as user_email,
                        u.first_name || ' ' || u.last_name as user_name,
                        al.ip_address,
                        al.user_agent
                    FROM audit_logs al
                    LEFT JOIN users u ON al.user_id = u.id
                    WHERE al.school_id = $1
                    ${date_from ? `AND DATE(al.created_at) >= '${date_from}'` : ''}
                    ${date_to ? `AND DATE(al.created_at) <= '${date_to}'` : ''}
                    ORDER BY al.created_at DESC
                `;
                filename = 'audit-trail';
                break;
                
            case 'login':
                query = `
                    SELECT 
                        email,
                        ip_address,
                        user_agent,
                        success,
                        failure_reason,
                        created_at
                    FROM login_attempts
                    WHERE school_id = $1
                    ${date_from ? `AND DATE(created_at) >= '${date_from}'` : ''}
                    ${date_to ? `AND DATE(created_at) <= '${date_to}'` : ''}
                    ORDER BY created_at DESC
                `;
                filename = 'login-attempts';
                break;
                
            default:
                return res.status(400).json({
                    success: false,
                    error: 'Invalid export type',
                    code: 'INVALID_EXPORT_TYPE'
                });
        }
        
        const result = await pool.query(query, [schoolId]);
        
        if (format === 'csv') {
            // Convert to CSV
            const headers = Object.keys(result.rows[0] || {});
            const csvHeader = headers.join(',') + '\n';
            const csvData = result.rows.map(row => 
                headers.map(header => {
                    const value = row[header];
                    if (value === null || value === undefined) return '';
                    if (typeof value === 'string' && value.includes(',')) {
                        return `"${value.replace(/"/g, '""')}"`;
                    }
                    return value;
                }).join(',')
            ).join('\n');
            
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename=${filename}-${new Date().toISOString().split('T')[0]}.csv`);
            res.send(csvHeader + csvData);
        } else {
            res.json({
                success: true,
                data: result.rows
            });
        }
    } catch (error) {
        console.error('Error exporting security data:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to export security data',
            code: 'EXPORT_ERROR'
        });
    }
});

module.exports = router;
