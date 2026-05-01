-- Migration: Performance Optimization Indexes for Multi-Tenant Architecture
-- Purpose: Create optimized indexes for school-based queries and subdomain routing

-- Users table indexes
-- Primary lookup indexes
CREATE INDEX IF NOT EXISTS idx_users_email_school ON users(email, school_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_users_school_role_active ON users(school_id, role, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_users_subdomain_active ON users(subdomain) WHERE subdomain IS NOT NULL AND is_active = true;

-- Authentication and session indexes
CREATE INDEX IF NOT EXISTS idx_users_auth_lookup ON users(email, password_hash, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_users_school_email_lookup ON users(school_id, email) WHERE is_active = true;

-- Teacher-specific indexes
CREATE INDEX IF NOT EXISTS idx_users_teachers_school ON users(school_id) WHERE role = 'teacher' AND is_active = true;
CREATE INDEX IF NOT EXISTS idx_users_teachers_approved ON users(school_id, approved) WHERE role = 'teacher' AND is_active = true;

-- Student-specific indexes
CREATE INDEX IF NOT EXISTS idx_users_students_school ON users(school_id) WHERE role = 'student' AND is_active = true;

-- Schools table indexes
-- Domain and subdomain lookup indexes
CREATE INDEX IF NOT EXISTS idx_schools_domain_lookup ON schools(domain) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_schools_subdomain_lookup ON schools(domain) WHERE status = 'active' AND is_verified = true;

-- Registration and search indexes
CREATE INDEX IF NOT EXISTS idx_schools_registration_ready ON schools(state_id, status, is_verified) 
WHERE status = 'active' AND is_verified = true AND is_public = true;

-- State-based lookup indexes
CREATE INDEX IF NOT EXISTS idx_schools_state_active ON schools(state_id, status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_schools_state_city ON schools(state_id, city) WHERE status = 'active';

-- Exams table indexes
-- School-based exam indexes
CREATE INDEX IF NOT EXISTS idx_exams_school_created ON exams(school_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_exams_school_published ON exams(school_id, is_published, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_exams_school_creator ON exams(school_id, created_by) WHERE is_published = true;

-- Exam lookup indexes
CREATE INDEX IF NOT EXISTS idx_exams_active_school ON exams(school_id) WHERE is_published = true;
CREATE INDEX IF NOT EXISTS idx_exams_teacher_lookup ON exams(created_by, school_id) WHERE is_published = true;

-- Questions table indexes
-- School and exam-based question indexes
CREATE INDEX IF NOT EXISTS idx_questions_school_exam ON questions(school_id, exam_id);
CREATE INDEX IF NOT EXISTS idx_questions_school_type ON questions(school_id, type);
CREATE INDEX IF NOT EXISTS idx_questions_exam_created ON questions(exam_id, created_at DESC);

-- Question options indexes
CREATE INDEX IF NOT EXISTS idx_qopts_exam_question ON question_options(exam_id, question_id);
CREATE INDEX IF NOT EXISTS idx_qopts_school_exam ON question_options(school_id, exam_id);

-- Exam submissions indexes
-- Student and school-based submission indexes
CREATE INDEX IF NOT EXISTS idx_submissions_school_student ON exam_submissions(school_id, student_id);
CREATE INDEX IF NOT EXISTS idx_submissions_student_exam ON exam_submissions(student_id, exam_id);
CREATE INDEX IF NOT EXISTS idx_submissions_school_date ON exam_submissions(school_id, submitted_at DESC);

-- Grading and scoring indexes
CREATE INDEX IF NOT EXISTS idx_submissions_ungraded ON exam_submissions(school_id) 
WHERE submitted_at IS NOT NULL AND total_score IS NULL;
CREATE INDEX IF NOT EXISTS idx_submissions_graded ON exam_submissions(school_id, graded_by) 
WHERE graded_by IS NOT NULL;

-- Exam answers indexes
CREATE INDEX IF NOT EXISTS idx_answers_submission_question ON exam_answers(submission_id, question_id);
CREATE INDEX IF NOT EXISTS idx_answers_school_question ON exam_answers(school_id, question_id);
CREATE INDEX IF NOT EXISTS idx_answers_graded_by ON exam_answers(graded_by) WHERE graded_by IS NOT NULL;

-- Subjects table indexes
CREATE INDEX IF NOT EXISTS idx_subjects_school_name ON subjects(school_id, name);
CREATE INDEX IF NOT EXISTS idx_subjects_school_code ON subjects(school_id, code) WHERE code IS NOT NULL;

-- File storage indexes (additional performance indexes)
CREATE INDEX IF NOT EXISTS idx_file_storage_school_type_date ON file_storage(school_id, file_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_file_storage_school_uploader ON file_storage(school_id, uploaded_by);
CREATE INDEX IF NOT EXISTS idx_file_storage_active_school ON file_storage(school_id) WHERE is_active = true;

-- File size and type indexes for analytics
CREATE INDEX IF NOT EXISTS idx_file_storage_size_stats ON file_storage(school_id, file_size, file_type) 
WHERE is_active = true;

-- Composite indexes for common query patterns
-- Teacher dashboard queries
CREATE INDEX IF NOT EXISTS idx_users_teacher_dashboard ON users(school_id, role, created_at DESC) 
WHERE role = 'teacher' AND is_active = true;

-- Student performance queries
CREATE INDEX IF NOT EXISTS idx_submissions_student_performance ON exam_submissions(student_id, exam_id, total_score) 
WHERE total_score IS NOT NULL;

-- School admin queries
CREATE INDEX IF NOT EXISTS idx_users_school_admin ON users(school_id, is_active, approved, role) 
WHERE is_active = true;

-- Exam management queries
CREATE INDEX IF NOT EXISTS idx_exams_school_management ON exams(school_id, is_published, created_at DESC, created_by);

-- Full-text search indexes
-- School name search
CREATE INDEX IF NOT EXISTS idx_schools_name_fts ON schools USING gin(to_tsvector('english', name)) 
WHERE status = 'active' AND is_verified = true;

-- School combined search (name + city + description)
CREATE INDEX IF NOT EXISTS idx_schools_combined_fts ON schools USING gin(
  to_tsvector('english', name || ' ' || COALESCE(city, '') || ' ' || COALESCE(description, ''))
) WHERE status = 'active' AND is_verified = true;

-- User name search (for admin panels)
CREATE INDEX IF NOT EXISTS idx_users_name_fts ON users USING gin(
  to_tsvector('english', first_name || ' ' || last_name)
) WHERE is_active = true;

-- Partial indexes for better performance on large datasets
-- Active teachers only
CREATE INDEX IF NOT EXISTS idx_users_active_teachers ON users(school_id, email, approved) 
WHERE role = 'teacher' AND is_active = true;

-- Published exams only
CREATE INDEX IF NOT EXISTS idx_exams_published_only ON exams(school_id, title, created_at DESC) 
WHERE is_published = true;

-- Recent submissions only
CREATE INDEX IF NOT EXISTS idx_submissions_recent ON exam_submissions(school_id, submitted_at DESC) 
WHERE submitted_at > NOW() - INTERVAL '90 days';

-- Active files only
CREATE INDEX IF NOT EXISTS idx_files_active_recent ON file_storage(school_id, created_at DESC) 
WHERE is_active = true AND created_at > NOW() - INTERVAL '180 days';

-- Create index usage statistics view
CREATE OR REPLACE VIEW index_usage_stats AS
SELECT 
    schemaname,
    tablename,
    indexname,
    num_rows,
    table_size,
    index_size,
    unique,
    idx_scan as index_scans,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes 
JOIN pg_class ON pg_class.oid = indexrelid
JOIN pg_size_pretty(pg_relation_size(indexrelid)) as index_size ON true
JOIN pg_size_pretty(pg_relation_size(pg_class.oid)) as table_size ON true
ORDER BY idx_scan DESC;

-- Create missing index suggestions view
CREATE OR REPLACE VIEW missing_index_suggestions AS
SELECT 
    schemaname,
    tablename,
    attname,
    n_distinct,
    correlation
FROM pg_stats 
WHERE schemaname = 'public'
    AND tablename IN ('users', 'schools', 'exams', 'exam_submissions', 'file_storage')
    AND n_distinct > 100
ORDER BY n_distinct DESC;

-- Create function to analyze index performance
CREATE OR REPLACE FUNCTION analyze_index_performance()
RETURNS TABLE(
    index_name text,
    table_name text,
    usage_count bigint,
    size_mb numeric,
    efficiency_score numeric
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        i.indexname,
        i.tablename,
        i.idx_scan,
        pg_relation_size(i.indexrelid::regclass) / 1024.0 / 1024.0 as size_mb,
        CASE 
            WHEN i.idx_scan = 0 THEN 0
            ELSE (i.idx_scan::numeric / (pg_relation_size(i.indexrelid::regclass) / 1024.0 / 1024.0))
        END as efficiency_score
    FROM pg_stat_user_indexes i
    WHERE i.schemaname = 'public'
    ORDER BY efficiency_score DESC;
END;
$$ LANGUAGE plpgsql;

-- Create function to suggest index optimizations
CREATE OR REPLACE FUNCTION suggest_index_optimizations()
RETURNS TABLE(
    suggestion text,
    priority text,
    estimated_impact text
) AS $$
BEGIN
    RETURN QUERY
    -- Unused indexes
    SELECT 
        'Consider dropping unused index: ' || i.indexname || ' on ' || i.tablename as suggestion,
        'LOW' as priority,
        'Frees ' || pg_size_pretty(pg_relation_size(i.indexrelid::regclass)) || ' of storage' as estimated_impact
    FROM pg_stat_user_indexes i
    WHERE i.idx_scan = 0 
        AND i.schemaname = 'public'
        AND NOT i.indexname LIKE '%_pkey'
    
    UNION ALL
    
    -- Heavily used tables without specific indexes
    SELECT 
        'Consider adding index on ' || t.tablename || ' for frequently accessed columns' as suggestion,
        'MEDIUM' as priority,
        'May improve query performance for common operations' as estimated_impact
    FROM pg_stat_user_tables t
    WHERE t.schemaname = 'public'
        AND t.seq_scan > 1000
        AND t.tablename IN ('users', 'exams', 'exam_submissions');
END;
$$ LANGUAGE plpgsql;

-- Create maintenance function for index optimization
CREATE OR REPLACE FUNCTION optimize_indexes()
RETURNS void AS $$
BEGIN
    -- Update table statistics
    ANALYZE users;
    ANALYZE schools;
    ANALYZE exams;
    ANALYZE exam_submissions;
    ANALYZE file_storage;
    
    -- Reindex fragmented indexes if needed
    REINDEX INDEX CONCURRENTLY idx_users_email_school;
    REINDEX INDEX CONCURRENTLY idx_schools_domain_lookup;
    REINDEX INDEX CONCURRENTLY idx_exams_school_published;
    
    RAISE NOTICE 'Index optimization completed';
END;
$$ LANGUAGE plpgsql;

-- Verification queries
SELECT 'Users table indexes' as table_info, indexname, idx_scan as usage_count
FROM pg_stat_user_indexes 
WHERE tablename = 'users' AND schemaname = 'public'
ORDER BY idx_scan DESC;

SELECT 'Schools table indexes' as table_info, indexname, idx_scan as usage_count
FROM pg_stat_user_indexes 
WHERE tablename = 'schools' AND schemaname = 'public'
ORDER BY idx_scan DESC;

SELECT 'Exams table indexes' as table_info, indexname, idx_scan as usage_count
FROM pg_stat_user_indexes 
WHERE tablename = 'exams' AND schemaname = 'public'
ORDER BY idx_scan DESC;

-- Index size analysis
SELECT 
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid::regclass)) as index_size,
    idx_scan as usage_count
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
    AND tablename IN ('users', 'schools', 'exams', 'exam_submissions', 'file_storage')
ORDER BY pg_relation_size(indexrelid::regclass) DESC;
