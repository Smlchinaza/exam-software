-- Migration: Add approved field to users table
-- Purpose: Support teacher approval workflow for multi-tenant architecture

-- Add approved column to users table
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'approved'
    ) THEN
        ALTER TABLE users 
        ADD COLUMN approved boolean DEFAULT false;
        
        -- Add comment for documentation
        COMMENT ON COLUMN users.approved IS 'Whether the user (especially teachers) has been approved by school administration';
    END IF;
END $$;

-- Add index for approved lookups
CREATE INDEX IF NOT EXISTS idx_users_approved ON users(approved) WHERE approved = false;

-- Add composite index for school + role + approved lookups
CREATE INDEX IF NOT EXISTS idx_users_school_role_approved ON users(school_id, role, approved);

-- Set existing teachers as approved by default (for backward compatibility)
UPDATE users 
SET approved = true 
WHERE role = 'teacher' AND approved IS NULL;

-- Set existing admins and students as approved by default
UPDATE users 
SET approved = true 
WHERE role IN ('admin', 'student') AND approved IS NULL;

-- Verification query
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
    AND table_schema = 'public' 
    AND column_name = 'approved';
