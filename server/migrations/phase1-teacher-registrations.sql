-- Phase 1.2: Teacher Registration Approval System
-- This migration creates the teacher_registrations table for approval workflow

-- Create teacher registrations table for approval workflow
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

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_teacher_registrations_school_id ON teacher_registrations(school_id);
CREATE INDEX IF NOT EXISTS idx_teacher_registrations_status ON teacher_registrations(status);
CREATE INDEX IF NOT EXISTS idx_teacher_registrations_user_id ON teacher_registrations(user_id);
CREATE INDEX IF NOT EXISTS idx_teacher_registrations_school_status ON teacher_registrations(school_id, status);
CREATE INDEX IF NOT EXISTS idx_teacher_registrations_reviewed_by ON teacher_registrations(reviewed_by);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_teacher_registrations_updated_at() RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS trigger_update_teacher_registrations_updated_at ON teacher_registrations;
CREATE TRIGGER trigger_update_teacher_registrations_updated_at 
    BEFORE UPDATE ON teacher_registrations 
    FOR EACH ROW EXECUTE FUNCTION update_teacher_registrations_updated_at();

-- Add comments for documentation
COMMENT ON TABLE teacher_registrations IS 'Teacher registration approval workflow system';
COMMENT ON COLUMN teacher_registrations.user_id IS 'Foreign key to users table - teacher being registered';
COMMENT ON COLUMN teacher_registrations.school_id IS 'Foreign key to schools table - school where teacher wants to work';
COMMENT ON COLUMN teacher_registrations.registration_data IS 'JSON data containing registration details and documents';
COMMENT ON COLUMN teacher_registrations.status IS 'Registration status: pending, approved, rejected';
COMMENT ON COLUMN teacher_registrations.reviewed_by IS 'School admin who reviewed this registration';
COMMENT ON COLUMN teacher_registrations.reviewed_at IS 'Timestamp when registration was reviewed';
COMMENT ON COLUMN teacher_registrations.rejection_reason IS 'Reason for rejection if applicable';

-- Create view for pending teacher registrations
CREATE OR REPLACE VIEW pending_teacher_registrations AS
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
    s.name as school_name,
    s.subdomain as school_subdomain
FROM teacher_registrations tr
JOIN users u ON tr.user_id = u.id
JOIN schools s ON tr.school_id = s.id
WHERE tr.status = 'pending'
ORDER BY tr.created_at DESC;

COMMENT ON VIEW pending_teacher_registrations IS 'View of pending teacher registrations with user and school details';

-- Create view for approved teacher registrations
CREATE OR REPLACE VIEW approved_teacher_registrations AS
SELECT 
    tr.id,
    tr.user_id,
    tr.school_id,
    tr.reviewed_by,
    tr.reviewed_at,
    tr.created_at,
    u.email,
    u.first_name,
    u.last_name,
    u.phone,
    s.name as school_name,
    s.subdomain as school_subdomain,
    sa.email as reviewed_by_email
FROM teacher_registrations tr
JOIN users u ON tr.user_id = u.id
JOIN schools s ON tr.school_id = s.id
LEFT JOIN school_admins sa ON tr.reviewed_by = sa.id
LEFT JOIN users admin_user ON sa.user_id = admin_user.id
WHERE tr.status = 'approved'
ORDER BY tr.reviewed_at DESC;

COMMENT ON VIEW approved_teacher_registrations IS 'View of approved teacher registrations with reviewer details';

-- Create function to get registration statistics for a school
CREATE OR REPLACE FUNCTION get_teacher_registration_stats(
    p_school_id uuid
) RETURNS TABLE (
    pending_count bigint,
    approved_count bigint,
    rejected_count bigint,
    total_count bigint
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) FILTER (WHERE status = 'pending')::bigint as pending_count,
        COUNT(*) FILTER (WHERE status = 'approved')::bigint as approved_count,
        COUNT(*) FILTER (WHERE status = 'rejected')::bigint as rejected_count,
        COUNT(*)::bigint as total_count
    FROM teacher_registrations 
    WHERE school_id = p_school_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_teacher_registration_stats IS 'Get teacher registration statistics for a specific school';

-- Verification query
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'teacher_registrations' 
AND table_schema = 'public'
ORDER BY ordinal_position;
