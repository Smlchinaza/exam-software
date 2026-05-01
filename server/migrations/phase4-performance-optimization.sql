-- Phase 4.2: Performance Optimization
-- Database optimization for improved performance and scalability

-- Create optimized indexes for frequently queried columns
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_school_role_active 
ON users(school_id, role, is_active) 
WHERE is_active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email_school 
ON users(email, school_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_exams_school_published 
ON exams(school_id, is_published) 
WHERE is_published = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_exam_submissions_school_student 
ON exam_submissions(school_id, student_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_exam_submissions_exam_student 
ON exam_submissions(exam_id, student_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_questions_school_exam 
ON questions(school_id, exam_id) 
WHERE school_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_exam_answers_submission_question 
ON exam_answers(submission_id, question_id);

-- Create partial indexes for better performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_active_teachers 
ON users(school_id, created_at DESC) 
WHERE role = 'teacher' AND is_active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_active_students 
ON users(school_id, created_at DESC) 
WHERE role = 'student' AND is_active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_teacher_registrations_pending 
ON teacher_registrations(school_id, created_at DESC) 
WHERE status = 'pending';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_recent 
ON audit_logs(created_at DESC) 
WHERE created_at > CURRENT_DATE - INTERVAL '30 days';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_security_events_unresolved 
ON security_events(created_at DESC) 
WHERE resolved = false;

-- Create composite indexes for dashboard queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dashboard_stats 
ON users(school_id, role, is_active, created_at) 
INCLUDE (email, first_name, last_name);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_exam_stats 
ON exams(school_id, is_published, created_at DESC) 
INCLUDE (title, duration_minutes);

-- Create GIN indexes for JSONB columns
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_profile_gin 
ON users USING GIN (profile) 
WHERE profile IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_exams_metadata_gin 
ON exams USING GIN (metadata) 
WHERE metadata IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_questions_metadata_gin 
ON questions USING GIN (metadata) 
WHERE metadata IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_values_gin 
ON audit_logs USING GIN (old_values, new_values) 
WHERE old_values IS NOT NULL OR new_values IS NOT NULL;

-- Create expression indexes for common queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_lower_email 
ON users(LOWER(email));

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_name_search 
ON users USING gin(to_tsvector('english', first_name || ' ' || last_name));

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_exams_title_search 
ON exams USING gin(to_tsvector('english', title));

-- Create partitioned tables for large datasets (audit logs)
-- Note: This is a simplified version - in production you'd want proper partitioning
CREATE TABLE IF NOT EXISTS audit_logs_partitioned (
    LIKE audit_logs INCLUDING ALL
) PARTITION BY RANGE (created_at);

-- Create monthly partitions for audit logs
DO $$
DECLARE
    start_date date;
    end_date date;
    partition_name text;
BEGIN
    -- Create partitions for current and next 11 months
    FOR i IN 0..11 LOOP
        start_date := date_trunc('month', CURRENT_DATE + (i || ' months')::interval);
        end_date := start_date + interval '1 month' - interval '1 second';
        partition_name := 'audit_logs_' || to_char(start_date, 'YYYY_MM');
        
        EXECUTE format('CREATE TABLE IF NOT EXISTS %I PARTITION OF audit_logs_partitioned
                       FOR VALUES FROM (%L) TO (%L)', 
                       partition_name, start_date, end_date);
    END LOOP;
END $$;

-- Create materialized views for complex queries
CREATE MATERIALIZED VIEW IF NOT EXISTS school_stats_mv AS
SELECT 
    s.id as school_id,
    s.name as school_name,
    s.subdomain,
    s.created_at as school_created_at,
    
    -- User counts
    COALESCE(teacher_counts.total_teachers, 0) as total_teachers,
    COALESCE(teacher_counts.active_teachers, 0) as active_teachers,
    COALESCE(student_counts.total_students, 0) as total_students,
    COALESCE(student_counts.active_students, 0) as active_students,
    
    -- Exam counts
    COALESCE(exam_counts.total_exams, 0) as total_exams,
    COALESCE(exam_counts.published_exams, 0) as published_exams,
    
    -- Registration counts
    COALESCE(reg_counts.pending_registrations, 0) as pending_registrations,
    COALESCE(reg_counts.approved_registrations, 0) as approved_registrations,
    
    -- Activity counts
    COALESCE(activity_counts.recent_logins, 0) as recent_logins,
    COALESCE(activity_counts.recent_submissions, 0) as recent_submissions
    
FROM schools s
LEFT JOIN (
    SELECT 
        school_id,
        COUNT(*) as total_teachers,
        COUNT(*) FILTER (WHERE is_active = true) as active_teachers
    FROM users 
    WHERE role = 'teacher'
    GROUP BY school_id
) teacher_counts ON s.id = teacher_counts.school_id
LEFT JOIN (
    SELECT 
        school_id,
        COUNT(*) as total_students,
        COUNT(*) FILTER (WHERE is_active = true) as active_students
    FROM users 
    WHERE role = 'student'
    GROUP BY school_id
) student_counts ON s.id = student_counts.school_id
LEFT JOIN (
    SELECT 
        school_id,
        COUNT(*) as total_exams,
        COUNT(*) FILTER (WHERE is_published = true) as published_exams
    FROM exams
    GROUP BY school_id
) exam_counts ON s.id = exam_counts.school_id
LEFT JOIN (
    SELECT 
        school_id,
        COUNT(*) FILTER (WHERE status = 'pending') as pending_registrations,
        COUNT(*) FILTER (WHERE status = 'approved') as approved_registrations
    FROM teacher_registrations
    GROUP BY school_id
) reg_counts ON s.id = reg_counts.school_id
LEFT JOIN (
    SELECT 
        la.school_id,
        COUNT(*) FILTER (WHERE la.success = true AND la.created_at > CURRENT_DATE - INTERVAL '7 days') as recent_logins
    FROM login_attempts la
    WHERE la.success = true
    GROUP BY la.school_id
) activity_counts ON s.id = activity_counts.school_id
LEFT JOIN (
    SELECT 
        es.school_id,
        COUNT(*) FILTER (WHERE es.submitted_at > CURRENT_DATE - INTERVAL '7 days') as recent_submissions
    FROM exam_submissions es
    WHERE es.submitted_at IS NOT NULL
    GROUP BY es.school_id
) submission_counts ON s.id = submission_counts.school_id;

-- Create unique index on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_school_stats_mv_school_id 
ON school_stats_mv(school_id);

-- Create function to refresh materialized view
CREATE OR REPLACE FUNCTION refresh_school_stats_mv() RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY school_stats_mv;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-refresh materialized view (optional - use with caution)
-- CREATE OR REPLACE FUNCTION trigger_refresh_school_stats() RETURNS trigger AS $$
-- BEGIN
--     PERFORM refresh_school_stats_mv();
--     RETURN NULL;
-- END;
-- $$ LANGUAGE plpgsql;

-- Create stored procedures for common dashboard queries
CREATE OR REPLACE FUNCTION get_school_dashboard_stats(p_school_id uuid)
RETURNS TABLE (
    total_teachers bigint,
    active_teachers bigint,
    total_students bigint,
    active_students bigint,
    total_exams bigint,
    published_exams bigint,
    pending_registrations bigint,
    approved_registrations bigint,
    recent_logins bigint,
    recent_submissions bigint
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        total_teachers,
        active_teachers,
        total_students,
        active_students,
        total_exams,
        published_exams,
        pending_registrations,
        approved_registrations,
        recent_logins,
        recent_submissions
    FROM school_stats_mv 
    WHERE school_id = p_school_id;
END;
$$ LANGUAGE plpgsql;

-- Create optimized function for teacher registration statistics
CREATE OR REPLACE FUNCTION get_teacher_registration_stats_optimized(p_school_id uuid)
RETURNS TABLE (
    pending_count bigint,
    approved_count bigint,
    rejected_count bigint,
    total_count bigint,
    pending_this_week bigint,
    approved_this_week bigint
) AS $$
BEGIN
    RETURN QUERY
    WITH weekly_stats AS (
        SELECT 
            COUNT(*) FILTER (WHERE status = 'pending' AND created_at > CURRENT_DATE - INTERVAL '7 days') as pending_week,
            COUNT(*) FILTER (WHERE status = 'approved' AND reviewed_at > CURRENT_DATE - INTERVAL '7 days') as approved_week
        FROM teacher_registrations 
        WHERE school_id = p_school_id
    )
    SELECT 
        (SELECT COUNT(*) FILTER (WHERE status = 'pending') FROM teacher_registrations WHERE school_id = p_school_id)::bigint,
        (SELECT COUNT(*) FILTER (WHERE status = 'approved') FROM teacher_registrations WHERE school_id = p_school_id)::bigint,
        (SELECT COUNT(*) FILTER (WHERE status = 'rejected') FROM teacher_registrations WHERE school_id = p_school_id)::bigint,
        (SELECT COUNT(*) FROM teacher_registrations WHERE school_id = p_school_id)::bigint,
        COALESCE((SELECT pending_week FROM weekly_stats), 0)::bigint,
        COALESCE((SELECT approved_week FROM weekly_stats), 0)::bigint;
END;
$$ LANGUAGE plpgsql;

-- Create function for activity feed optimization
CREATE OR REPLACE FUNCTION get_school_activity_feed_optimized(
    p_school_id uuid, 
    p_limit integer DEFAULT 10
)
RETURNS TABLE (
    activity_type text,
    description text,
    actor_name text,
    actor_email text,
    timestamp timestamptz,
    metadata jsonb
) AS $$
BEGIN
    RETURN QUERY
    SELECT * FROM (
        -- Exam activities
        SELECT 
            'exam_created' as activity_type,
            e.title as description,
            u.first_name || ' ' || u.last_name as actor_name,
            u.email as actor_email,
            e.created_at as timestamp,
            jsonb_build_object('exam_id', e.id, 'type', 'exam') as metadata
        FROM exams e
        JOIN users u ON e.created_by = u.id
        WHERE e.school_id = p_school_id
        AND e.created_at > CURRENT_DATE - INTERVAL '30 days'
        
        UNION ALL
        
        -- Exam submissions
        SELECT 
            'exam_submitted' as activity_type,
            'Exam submitted by ' || u.first_name || ' ' || u.last_name as description,
            u.first_name || ' ' || u.last_name as actor_name,
            u.email as actor_email,
            es.submitted_at as timestamp,
            jsonb_build_object('submission_id', es.id, 'exam_id', es.exam_id, 'type', 'submission') as metadata
        FROM exam_submissions es
        JOIN users u ON es.student_id = u.id
        WHERE es.school_id = p_school_id
        AND es.submitted_at IS NOT NULL
        AND es.submitted_at > CURRENT_DATE - INTERVAL '30 days'
        
        UNION ALL
        
        -- Teacher registrations
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
            CASE 
                WHEN tr.status = 'pending' THEN u.first_name || ' ' || u.last_name
                WHEN tr.reviewed_by IS NOT NULL THEN reviewer.first_name || ' ' || reviewer.last_name
                ELSE u.first_name || ' ' || u.last_name
            END as actor_name,
            CASE 
                WHEN tr.status = 'pending' THEN u.email
                WHEN tr.reviewed_by IS NOT NULL THEN reviewer.email
                ELSE u.email
            END as actor_email,
            COALESCE(tr.reviewed_at, tr.created_at) as timestamp,
            jsonb_build_object('registration_id', tr.id, 'status', tr.status, 'type', 'registration') as metadata
        FROM teacher_registrations tr
        JOIN users u ON tr.user_id = u.id
        LEFT JOIN school_admins sa ON tr.reviewed_by = sa.id
        LEFT JOIN users reviewer ON sa.user_id = reviewer.id
        WHERE tr.school_id = p_school_id
        AND tr.created_at > CURRENT_DATE - INTERVAL '30 days'
        
        UNION ALL
        
        -- New users
        SELECT 
            CASE 
                WHEN u.role = 'teacher' THEN 'teacher_joined'
                WHEN u.role = 'student' THEN 'student_joined'
            END as activity_type,
            u.first_name || ' ' || u.last_name || ' joined as ' || u.role as description,
            u.first_name || ' ' || u.last_name as actor_name,
            u.email as actor_email,
            u.created_at as timestamp,
            jsonb_build_object('user_id', u.id, 'role', u.role, 'type', 'user') as metadata
        FROM users u
        WHERE u.school_id = p_school_id
        AND u.created_at > CURRENT_DATE - INTERVAL '30 days'
    ) activities
    ORDER BY timestamp DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Create table for caching frequently accessed data
CREATE TABLE IF NOT EXISTS query_cache (
    cache_key text PRIMARY KEY,
    cache_data jsonb,
    expires_at timestamptz NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_query_cache_expires_at 
ON query_cache(expires_at);

-- Function for cache management
CREATE OR REPLACE FUNCTION cache_query_result(
    p_cache_key text,
    p_cache_data jsonb,
    p_ttl_minutes integer DEFAULT 60
) RETURNS void AS $$
BEGIN
    INSERT INTO query_cache (cache_key, cache_data, expires_at)
    VALUES (p_cache_key, p_cache_data, CURRENT_TIMESTAMP + (p_ttl_minutes || ' minutes')::interval)
    ON CONFLICT (cache_key) 
    DO UPDATE SET 
        cache_data = p_cache_data,
        expires_at = CURRENT_TIMESTAMP + (p_ttl_minutes || 'minutes')::interval;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_cached_query_result(p_cache_key text)
RETURNS jsonb AS $$
DECLARE
    result jsonb;
BEGIN
    SELECT cache_data INTO result
    FROM query_cache 
    WHERE cache_key = p_cache_key 
    AND expires_at > CURRENT_TIMESTAMP;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to clean expired cache entries
CREATE OR REPLACE FUNCTION cleanup_expired_cache() RETURNS integer AS $$
DECLARE
    deleted_count integer;
BEGIN
    DELETE FROM query_cache 
    WHERE expires_at <= CURRENT_TIMESTAMP;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Create scheduled job for cache cleanup (requires pg_cron extension)
-- SELECT cron.schedule('cache-cleanup', '0 */6 * * *', 'SELECT cleanup_expired_cache();');

-- Add comments for documentation
COMMENT ON TABLE school_stats_mv IS 'Materialized view for school statistics optimization';
COMMENT ON TABLE query_cache IS 'Cache table for frequently accessed query results';

-- Verification query
SELECT 
    schemaname, 
    tablename, 
    indexname, 
    indexdef 
FROM pg_indexes 
WHERE schemaname = 'public' 
AND tablename IN (
    'users', 'exams', 'exam_submissions', 'questions', 'teacher_registrations', 
    'audit_logs', 'security_events', 'login_attempts'
)
ORDER BY tablename, indexname;
