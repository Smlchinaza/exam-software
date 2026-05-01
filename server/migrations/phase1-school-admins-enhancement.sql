-- Phase 1.1: School Admins Table Enhancement
-- This migration enhances the school_admins table to support subdomain isolation

-- First, create the school_admins table if it doesn't exist
CREATE TABLE IF NOT EXISTS school_admins (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    mongo_id text UNIQUE,
    user_id uuid REFERENCES users(id) ON DELETE CASCADE,
    school_id uuid REFERENCES schools(id) ON DELETE CASCADE,
    permissions jsonb DEFAULT '{}',
    is_active boolean DEFAULT true,
    last_login timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (user_id, school_id)
);

-- Add school-specific admin fields if table already exists but missing columns
DO $$ BEGIN
    -- Add school_id column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'school_admins' 
        AND column_name = 'school_id'
    ) THEN
        ALTER TABLE school_admins 
        ADD COLUMN school_id uuid REFERENCES schools(id) ON DELETE CASCADE;
    END IF;

    -- Add permissions column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'school_admins' 
        AND column_name = 'permissions'
    ) THEN
        ALTER TABLE school_admins 
        ADD COLUMN permissions jsonb DEFAULT '{}';
    END IF;

    -- Add is_active column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'school_admins' 
        AND column_name = 'is_active'
    ) THEN
        ALTER TABLE school_admins 
        ADD COLUMN is_active boolean DEFAULT true;
    END IF;

    -- Add last_login column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'school_admins' 
        AND column_name = 'last_login'
    ) THEN
        ALTER TABLE school_admins 
        ADD COLUMN last_login timestamptz;
    END IF;

    -- Add created_at column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'school_admins' 
        AND column_name = 'created_at'
    ) THEN
        ALTER TABLE school_admins 
        ADD COLUMN created_at timestamptz NOT NULL DEFAULT now();
    END IF;

    -- Add updated_at column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'school_admins' 
        AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE school_admins 
        ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
    END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_school_admins_school_id ON school_admins(school_id);
CREATE INDEX IF NOT EXISTS idx_school_admins_user_id ON school_admins(user_id);
CREATE INDEX IF NOT EXISTS idx_school_admins_is_active ON school_admins(is_active);
CREATE INDEX IF NOT EXISTS idx_school_admins_school_active ON school_admins(school_id, is_active);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_school_admins_updated_at() RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS trigger_update_school_admins_updated_at ON school_admins;
CREATE TRIGGER trigger_update_school_admins_updated_at 
    BEFORE UPDATE ON school_admins 
    FOR EACH ROW EXECUTE FUNCTION update_school_admins_updated_at();

-- Add comments for documentation
COMMENT ON TABLE school_admins IS 'School administrators with subdomain-based isolation and permissions';
COMMENT ON COLUMN school_admins.school_id IS 'Foreign key to schools table for multi-tenant isolation';
COMMENT ON COLUMN school_admins.permissions IS 'JSON object containing granular permissions for the admin';
COMMENT ON COLUMN school_admins.is_active IS 'Whether the admin account is active';
COMMENT ON COLUMN school_admins.last_login IS 'Timestamp of last login activity';

-- Create a view for active school admins
CREATE OR REPLACE VIEW active_school_admins AS
SELECT 
    sa.id,
    sa.user_id,
    sa.school_id,
    sa.permissions,
    sa.last_login,
    sa.created_at,
    u.email,
    u.first_name,
    u.last_name,
    s.name as school_name,
    s.subdomain
FROM school_admins sa
JOIN users u ON sa.user_id = u.id
JOIN schools s ON sa.school_id = s.id
WHERE sa.is_active = true
AND u.is_active = true
AND s.status = 'active';

COMMENT ON VIEW active_school_admins IS 'View of active school admins with user and school details';

-- Verification query
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'school_admins' 
AND table_schema = 'public'
ORDER BY ordinal_position;
