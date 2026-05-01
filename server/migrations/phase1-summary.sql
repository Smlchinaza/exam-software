-- Phase 1 Database Schema Summary: School Admin Subdomain Isolation
-- This file contains all Phase 1 SQL migrations in a single file for easier execution

-- ========================================
-- 1. Schools Subdomain Enhancement
-- ========================================

-- Add subdomain column to schools table if it doesn't exist
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'schools' AND column_name = 'subdomain'
    ) THEN
        ALTER TABLE schools ADD COLUMN subdomain text UNIQUE;
        CREATE INDEX IF NOT EXISTS idx_schools_subdomain ON schools(subdomain);
        COMMENT ON COLUMN schools.subdomain IS 'Unique subdomain for school isolation';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'schools' AND column_name = 'is_active'
    ) THEN
        ALTER TABLE schools ADD COLUMN is_active boolean DEFAULT true;
        CREATE INDEX IF NOT EXISTS idx_schools_is_active ON schools(is_active);
        COMMENT ON COLUMN schools.is_active IS 'Whether the school is active and accessible';
    END IF;
END $$;

-- Add unique constraint for subdomain
ALTER TABLE schools ADD CONSTRAINT IF NOT EXISTS unique_schools_subdomain UNIQUE (subdomain);

-- ========================================
-- 2. School Admins Table Enhancement
-- ========================================

-- Create school_admins table if it doesn't exist
CREATE TABLE IF NOT EXISTS school_admins (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES users(id) ON DELETE CASCADE,
    school_id uuid REFERENCES schools(id) ON DELETE CASCADE,
    permissions jsonb DEFAULT '{}',
    is_active boolean DEFAULT true,
    last_login timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (user_id, school_id)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_school_admins_school_id ON school_admins(school_id);
CREATE INDEX IF NOT EXISTS idx_school_admins_user_id ON school_admins(user_id);
CREATE INDEX IF NOT EXISTS idx_school_admins_is_active ON school_admins(is_active);
CREATE INDEX IF NOT EXISTS idx_school_admins_school_active ON school_admins(school_id, is_active);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_school_admins_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS trigger_update_school_admins_updated_at ON school_admins;
CREATE TRIGGER trigger_update_school_admins_updated_at 
    BEFORE UPDATE ON school_admins FOR EACH ROW EXECUTE FUNCTION update_school_admins_updated_at();

-- ========================================
-- 3. Teacher Registration Approval System
-- ========================================

-- Create teacher_registrations table
CREATE TABLE IF NOT EXISTS teacher_registrations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES users(id) ON DELETE CASCADE,
    school_id uuid REFERENCES schools(id) ON DELETE CASCADE,
    registration_data jsonb,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    reviewed_by uuid REFERENCES school_admins(id) ON DELETE SET NULL,
    reviewed_at timestamptz,
    rejection_reason TEXT,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (user_id, school_id)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_teacher_registrations_school_id ON teacher_registrations(school_id);
CREATE INDEX IF NOT EXISTS idx_teacher_registrations_status ON teacher_registrations(status);
CREATE INDEX IF NOT EXISTS idx_teacher_registrations_user_id ON teacher_registrations(user_id);
CREATE INDEX IF NOT EXISTS idx_teacher_registrations_school_status ON teacher_registrations(school_id, status);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_teacher_registrations_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS trigger_update_teacher_registrations_updated_at ON teacher_registrations;
CREATE TRIGGER trigger_update_teacher_registrations_updated_at 
    BEFORE UPDATE ON teacher_registrations FOR EACH ROW EXECUTE FUNCTION update_teacher_registrations_updated_at();

-- ========================================
-- 4. School Admin Permissions Schema
-- ========================================

-- Create school_admin_permissions table
CREATE TABLE IF NOT EXISTS school_admin_permissions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id uuid REFERENCES school_admins(id) ON DELETE CASCADE,
    permission_type VARCHAR(50) NOT NULL CHECK (permission_type IN ('teachers', 'students', 'exams', 'analytics', 'settings')),
    access_level VARCHAR(20) NOT NULL CHECK (access_level IN ('none', 'read', 'write', 'full')),
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (admin_id, permission_type)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_school_admin_permissions_admin_id ON school_admin_permissions(admin_id);
CREATE INDEX IF NOT EXISTS idx_school_admin_permissions_type ON school_admin_permissions(permission_type);
CREATE INDEX IF NOT EXISTS idx_school_admin_permissions_admin_type ON school_admin_permissions(admin_id, permission_type);

-- ========================================
-- 5. Views and Functions
-- ========================================

-- View for active school admins
CREATE OR REPLACE VIEW active_school_admins AS
SELECT 
    sa.id, sa.user_id, sa.school_id, sa.permissions, sa.last_login, sa.created_at,
    u.email, u.first_name, u.last_name,
    s.name as school_name, s.subdomain
FROM school_admins sa
JOIN users u ON sa.user_id = u.id
JOIN schools s ON sa.school_id = s.id
WHERE sa.is_active = true AND u.is_active = true AND s.status = 'active';

-- View for pending teacher registrations
CREATE OR REPLACE VIEW pending_teacher_registrations AS
SELECT 
    tr.id, tr.user_id, tr.school_id, tr.registration_data, tr.created_at,
    u.email, u.first_name, u.last_name, u.phone,
    s.name as school_name, s.subdomain as school_subdomain
FROM teacher_registrations tr
JOIN users u ON tr.user_id = u.id
JOIN schools s ON tr.school_id = s.id
WHERE tr.status = 'pending'
ORDER BY tr.created_at DESC;

-- Function to check admin permission
CREATE OR REPLACE FUNCTION check_school_admin_permission(
    p_admin_id uuid,
    p_permission_type VARCHAR(50),
    p_required_access_level VARCHAR(20) DEFAULT 'read'
) RETURNS BOOLEAN AS $$
DECLARE
    current_access_level VARCHAR(20);
    access_levels VARCHAR(20)[] := ARRAY['none', 'read', 'write', 'full'];
    current_index INTEGER;
    required_index INTEGER;
BEGIN
    SELECT access_level INTO current_access_level
    FROM school_admin_permissions 
    WHERE admin_id = p_admin_id AND permission_type = p_permission_type;
    
    IF current_access_level IS NULL THEN
        current_access_level := 'none';
    END IF;
    
    current_index := array_position(access_levels, current_access_level);
    required_index := array_position(access_levels, p_required_access_level);
    
    RETURN current_index >= COALESCE(required_index, 1);
END;
$$ LANGUAGE plpgsql;

-- Function to set default permissions for new admin
CREATE OR REPLACE FUNCTION set_default_school_admin_permissions(p_admin_id uuid) RETURNS VOID AS $$
BEGIN
    INSERT INTO school_admin_permissions (admin_id, permission_type, access_level) VALUES
        (p_admin_id, 'teachers', 'write'),
        (p_admin_id, 'students', 'write'),
        (p_admin_id, 'exams', 'write'),
        (p_admin_id, 'analytics', 'read'),
        (p_admin_id, 'settings', 'read')
    ON CONFLICT (admin_id, permission_type) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- Trigger to set default permissions
CREATE OR REPLACE FUNCTION trigger_set_default_admin_permissions() RETURNS TRIGGER AS $$
BEGIN PERFORM set_default_school_admin_permissions(NEW.id); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_default_admin_permissions ON school_admins;
CREATE TRIGGER trigger_set_default_admin_permissions
    AFTER INSERT ON school_admins FOR EACH ROW EXECUTE FUNCTION trigger_set_default_admin_permissions();

-- ========================================
-- 6. Verification Queries
-- ========================================

-- Verify tables were created
DO $$
DECLARE
    table_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name IN ('school_admins', 'teacher_registrations', 'school_admin_permissions');
    
    IF table_count = 3 THEN
        RAISE NOTICE '✅ All Phase 1 tables created successfully';
    ELSE
        RAISE NOTICE '⚠️  Some tables may be missing';
    END IF;
END $$;

-- Verify columns
DO $$
DECLARE
    subdomain_exists BOOLEAN;
BEGIN
    SELECT EXISTS(
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'schools' AND column_name = 'subdomain'
    ) INTO subdomain_exists;
    
    IF subdomain_exists THEN
        RAISE NOTICE '✅ schools.subdomain column added';
    ELSE
        RAISE NOTICE '⚠️  schools.subdomain column may be missing';
    END IF;
END $$;

-- Show table structure
SELECT 
    'Table: ' || table_name as info,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name IN ('school_admins', 'teacher_registrations', 'school_admin_permissions', 'schools')
AND column_name IN ('id', 'user_id', 'school_id', 'subdomain', 'permissions', 'status', 'permission_type', 'access_level')
ORDER BY table_name, ordinal_position;
