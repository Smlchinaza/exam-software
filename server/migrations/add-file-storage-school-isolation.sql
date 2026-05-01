-- Migration: Add School Isolation to File Storage Tables
-- Purpose: Ensure all file-related tables have proper school-based isolation

-- Create file_storage table if it doesn't exist
CREATE TABLE IF NOT EXISTS file_storage (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    mongo_id text,
    school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    file_name text NOT NULL,
    original_name text NOT NULL,
    file_path text NOT NULL,
    file_size bigint,
    mime_type text,
    file_type text NOT NULL, -- 'exam', 'submission', 'profile', 'material'
    uploaded_by uuid REFERENCES users(id) ON DELETE SET NULL,
    metadata jsonb,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Add indexes for file storage
CREATE INDEX IF NOT EXISTS idx_file_storage_school ON file_storage(school_id);
CREATE INDEX IF NOT EXISTS idx_file_storage_school_type ON file_storage(school_id, file_type);
CREATE INDEX IF NOT EXISTS idx_file_storage_uploaded_by ON file_storage(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_file_storage_created_at ON file_storage(created_at DESC);

-- Ensure existing tables have school_id if they don't already
-- Check and add school_id to exam_submissions if missing
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'exam_submissions' 
        AND column_name = 'school_id'
    ) THEN
        ALTER TABLE exam_submissions 
        ADD COLUMN school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE;
        
        -- Add index
        CREATE INDEX IF NOT EXISTS idx_exam_submissions_school ON exam_submissions(school_id);
        
        RAISE NOTICE 'Added school_id to exam_submissions table';
    END IF;
END $$;

-- Check and add school_id to exam_answers if missing
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'exam_answers' 
        AND column_name = 'school_id'
    ) THEN
        ALTER TABLE exam_answers 
        ADD COLUMN school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE;
        
        -- Add index
        CREATE INDEX IF NOT EXISTS idx_exam_answers_school ON exam_answers(school_id);
        
        RAISE NOTICE 'Added school_id to exam_answers table';
    END IF;
END $$;

-- Check and add school_id to questions if missing
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'questions' 
        AND column_name = 'school_id'
    ) THEN
        ALTER TABLE questions 
        ADD COLUMN school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE;
        
        -- Add index
        CREATE INDEX IF NOT EXISTS idx_questions_school ON questions(school_id);
        
        RAISE NOTICE 'Added school_id to questions table';
    END IF;
END $$;

-- Check and add school_id to question_options if missing
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'question_options' 
        AND column_name = 'school_id'
    ) THEN
        ALTER TABLE question_options 
        ADD COLUMN school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE;
        
        -- Add index
        CREATE INDEX IF NOT EXISTS idx_question_options_school ON question_options(school_id);
        
        RAISE NOTICE 'Added school_id to question_options table';
    END IF;
END $$;

-- Check and add school_id to subjects if missing
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'subjects' 
        AND column_name = 'school_id'
    ) THEN
        ALTER TABLE subjects 
        ADD COLUMN school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE;
        
        -- Add index
        CREATE INDEX IF NOT EXISTS idx_subjects_school ON subjects(school_id);
        
        RAISE NOTICE 'Added school_id to subjects table';
    END IF;
END $$;

-- Create file storage directories structure
-- This is a helper table to track directory structure per school
CREATE TABLE IF NOT EXISTS file_directories (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    directory_path text NOT NULL,
    directory_type text NOT NULL, -- 'exams', 'submissions', 'profiles', 'materials'
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (school_id, directory_path, directory_type)
);

CREATE INDEX IF NOT EXISTS idx_file_directories_school ON file_directories(school_id);
CREATE INDEX IF NOT EXISTS idx_file_directories_type ON file_directories(directory_type);

-- Create function to initialize school file directories
CREATE OR REPLACE FUNCTION initialize_school_file_dirs(school_uuid uuid)
RETURNS void AS $$
BEGIN
    INSERT INTO file_directories (school_id, directory_path, directory_type)
    VALUES 
        (school_uuid, 'exams', 'exams'),
        (school_uuid, 'submissions', 'submissions'),
        (school_uuid, 'profiles', 'profiles'),
        (school_uuid, 'materials', 'materials')
    ON CONFLICT (school_id, directory_path, directory_type) DO NOTHING;
    
    RAISE NOTICE 'File directories initialized for school %', school_uuid;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-initialize directories when school is created
CREATE OR REPLACE FUNCTION auto_init_file_dirs()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM initialize_school_file_dirs(NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_auto_init_file_dirs ON schools;

-- Create trigger
CREATE TRIGGER trigger_auto_init_file_dirs
AFTER INSERT ON schools
FOR EACH ROW
EXECUTE FUNCTION auto_init_file_dirs();

-- Create function to generate school-specific file path
CREATE OR REPLACE FUNCTION generate_file_path(
    school_uuid uuid,
    file_type text,
    file_name text
)
RETURNS text AS $$
BEGIN
    RETURN format('uploads/school-%s/%s/%s', school_uuid, file_type, file_name);
END;
$$ LANGUAGE plpgsql;

-- Create function to validate file access (security check)
CREATE OR REPLACE FUNCTION validate_file_access(
    user_uuid uuid,
    file_uuid uuid
)
RETURNS boolean AS $$
DECLARE
    file_school_id uuid;
    user_school_id uuid;
BEGIN
    -- Get file's school_id
    SELECT school_id INTO file_school_id
    FROM file_storage
    WHERE id = file_uuid AND is_active = true;
    
    -- Get user's school_id
    SELECT school_id INTO user_school_id
    FROM users
    WHERE id = user_uuid AND is_active = true;
    
    -- Return true if user belongs to the same school as the file
    RETURN file_school_id = user_school_id;
END;
$$ LANGUAGE plpgsql;

-- Initialize directories for existing schools
DO $$
DECLARE
    school_record RECORD;
BEGIN
    FOR school_record IN SELECT id FROM schools LOOP
        PERFORM initialize_school_file_dirs(school_record.id);
    END LOOP;
    
    RAISE NOTICE 'File directories initialized for all existing schools';
END $$;

-- Create view for school file statistics
CREATE OR REPLACE VIEW school_file_stats AS
SELECT 
    s.id as school_id,
    s.name as school_name,
    COUNT(fs.id) as total_files,
    COUNT(CASE WHEN fs.file_type = 'exam' THEN 1 END) as exam_files,
    COUNT(CASE WHEN fs.file_type = 'submission' THEN 1 END) as submission_files,
    COUNT(CASE WHEN fs.file_type = 'profile' THEN 1 END) as profile_files,
    COUNT(CASE WHEN fs.file_type = 'material' THEN 1 END) as material_files,
    COALESCE(SUM(fs.file_size), 0) as total_storage_used
FROM schools s
LEFT JOIN file_storage fs ON s.id = fs.school_id AND fs.is_active = true
GROUP BY s.id, s.name;

COMMENT ON VIEW school_file_stats IS 'File storage statistics per school';

-- Verification queries
SELECT 'file_storage' as table_name, column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'file_storage' 
    AND table_schema = 'public'
ORDER BY ordinal_position;

SELECT 'file_directories' as table_name, column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'file_directories' 
    AND table_schema = 'public'
ORDER BY ordinal_position;
