-- Phase 1.3: School Admin Permissions Schema
-- This migration creates the school_admin_permissions table for granular control

-- Create permissions table for granular control
CREATE TABLE IF NOT EXISTS school_admin_permissions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id uuid REFERENCES school_admins(id) ON DELETE CASCADE,
    permission_type VARCHAR(50) NOT NULL CHECK (permission_type IN ('teachers', 'students', 'exams', 'analytics', 'settings')),
    access_level VARCHAR(20) NOT NULL CHECK (access_level IN ('none', 'read', 'write', 'full')),
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (admin_id, permission_type)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_school_admin_permissions_admin_id ON school_admin_permissions(admin_id);
CREATE INDEX IF NOT EXISTS idx_school_admin_permissions_type ON school_admin_permissions(permission_type);
CREATE INDEX IF NOT EXISTS idx_school_admin_permissions_level ON school_admin_permissions(access_level);
CREATE INDEX IF NOT EXISTS idx_school_admin_permissions_admin_type ON school_admin_permissions(admin_id, permission_type);

-- Add comments for documentation
COMMENT ON TABLE school_admin_permissions IS 'Granular permissions for school administrators';
COMMENT ON COLUMN school_admin_permissions.admin_id IS 'Foreign key to school_admins table';
COMMENT ON COLUMN school_admin_permissions.permission_type IS 'Type of resource: teachers, students, exams, analytics, settings';
COMMENT ON COLUMN school_admin_permissions.access_level IS 'Access level: none, read, write, full';

-- Create view for school admin permissions with details
CREATE OR REPLACE VIEW school_admin_permissions_details AS
SELECT 
    sap.id,
    sap.admin_id,
    sap.permission_type,
    sap.access_level,
    sap.created_at,
    sa.user_id,
    sa.school_id,
    u.email as admin_email,
    u.first_name as admin_first_name,
    u.last_name as admin_last_name,
    s.name as school_name,
    s.subdomain as school_subdomain
FROM school_admin_permissions sap
JOIN school_admins sa ON sap.admin_id = sa.id
JOIN users u ON sa.user_id = u.id
JOIN schools s ON sa.school_id = s.id
WHERE sa.is_active = true;

COMMENT ON VIEW school_admin_permissions_details IS 'Detailed view of school admin permissions with user and school information';

-- Create function to get admin permissions
CREATE OR REPLACE FUNCTION get_school_admin_permissions(
    p_admin_id uuid
) RETURNS TABLE (
    permission_type VARCHAR(50),
    access_level VARCHAR(20)
) AS $$
BEGIN
    RETURN QUERY
    SELECT permission_type, access_level
    FROM school_admin_permissions 
    WHERE admin_id = p_admin_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_school_admin_permissions IS 'Get all permissions for a specific school admin';

-- Create function to check if admin has specific permission
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
    -- Get current access level
    SELECT access_level INTO current_access_level
    FROM school_admin_permissions 
    WHERE admin_id = p_admin_id AND permission_type = p_permission_type;
    
    -- If no permission found, default to 'none'
    IF current_access_level IS NULL THEN
        current_access_level := 'none';
    END IF;
    
    -- Get indices for comparison
    current_index := array_position(access_levels, current_access_level);
    required_index := array_position(access_levels, p_required_access_level);
    
    -- Return true if current access level is greater than or equal to required
    RETURN current_index >= COALESCE(required_index, 1);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION check_school_admin_permission IS 'Check if a school admin has a specific permission level';

-- Create function to set default permissions for new admin
CREATE OR REPLACE FUNCTION set_default_school_admin_permissions(
    p_admin_id uuid
) RETURNS VOID AS $$
BEGIN
    -- Insert default permissions
    INSERT INTO school_admin_permissions (admin_id, permission_type, access_level) VALUES
        (p_admin_id, 'teachers', 'write'),
        (p_admin_id, 'students', 'write'),
        (p_admin_id, 'exams', 'write'),
        (p_admin_id, 'analytics', 'read'),
        (p_admin_id, 'settings', 'read')
    ON CONFLICT (admin_id, permission_type) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION set_default_school_admin_permissions IS 'Set default permissions for a new school admin';

-- Create trigger to automatically set default permissions for new school admins
CREATE OR REPLACE FUNCTION trigger_set_default_admin_permissions() RETURNS TRIGGER AS $$
BEGIN
    PERFORM set_default_school_admin_permissions(NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_default_admin_permissions ON school_admins;
CREATE TRIGGER trigger_set_default_admin_permissions
    AFTER INSERT ON school_admins
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_default_admin_permissions();

-- Create function to update admin permission
CREATE OR REPLACE FUNCTION update_school_admin_permission(
    p_admin_id uuid,
    p_permission_type VARCHAR(50),
    p_access_level VARCHAR(20)
) RETURNS BOOLEAN AS $$
BEGIN
    -- Update or insert permission
    INSERT INTO school_admin_permissions (admin_id, permission_type, access_level)
    VALUES (p_admin_id, p_permission_type, p_access_level)
    ON CONFLICT (admin_id, permission_type) 
    DO UPDATE SET access_level = p_access_level;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_school_admin_permission IS 'Update or create a permission for a school admin';

-- Create view for admin permission summary
CREATE OR REPLACE VIEW school_admin_permission_summary AS
SELECT 
    sa.id as admin_id,
    sa.user_id,
    sa.school_id,
    u.email as admin_email,
    u.first_name as admin_first_name,
    u.last_name as admin_last_name,
    s.name as school_name,
    s.subdomain as school_subdomain,
    COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'permission_type', sap.permission_type,
                'access_level', sap.access_level
            ) ORDER BY sap.permission_type
        ) FILTER (WHERE sap.permission_type IS NOT NULL),
        '[]'::jsonb
    ) as permissions
FROM school_admins sa
JOIN users u ON sa.user_id = u.id
JOIN schools s ON sa.school_id = s.id
LEFT JOIN school_admin_permissions sap ON sa.id = sap.admin_id
WHERE sa.is_active = true
GROUP BY sa.id, u.email, u.first_name, u.last_name, s.name, s.subdomain;

COMMENT ON VIEW school_admin_permission_summary IS 'Summary view of school admin permissions in JSON format';

-- Verification query
SELECT column_name, data_type, is_nullable, column_default, character_maximum_length
FROM information_schema.columns
WHERE table_name = 'school_admin_permissions' 
AND table_schema = 'public'
ORDER BY ordinal_position;
