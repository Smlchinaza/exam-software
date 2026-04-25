-- Super Admin Schema
-- This script creates the necessary tables for super admin functionality

-- Add super_admin role to user_role enum
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'user_role'
) THEN CREATE TYPE user_role AS ENUM ('admin', 'teacher', 'student', 'super_admin');
END IF;
END $$;

-- super_admins table for extended permissions and tracking
CREATE TABLE IF NOT EXISTS super_admins (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    permissions jsonb DEFAULT '{}',
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (user_id)
);

-- school_registration_requests table for tracking registration requests
CREATE TABLE IF NOT EXISTS school_registration_requests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    requester_name text NOT NULL,
    requester_email text NOT NULL,
    requester_phone text,
    proposed_admin_email text NOT NULL,
    proposed_admin_first_name text,
    proposed_admin_last_name text,
    supporting_documents jsonb DEFAULT '[]',
    additional_message text,
    status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'under_review')),
    submitted_at timestamptz NOT NULL DEFAULT now(),
    reviewed_at timestamptz,
    reviewed_by uuid REFERENCES users(id),
    approval_notes text,
    rejection_reason text,
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- admin_approval_audit table for tracking all approval actions
CREATE TABLE IF NOT EXISTS admin_approval_audit (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    action text NOT NULL CHECK (action IN ('approved', 'rejected', 'suspended', 'reactivated', 'modified')),
    performed_by uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    performed_at timestamptz NOT NULL DEFAULT now(),
    reason text,
    previous_status text,
    new_status text,
    additional_data jsonb DEFAULT '{}',
    ip_address inet,
    user_agent text
);

-- school_metrics table for tracking school performance metrics
CREATE TABLE IF NOT EXISTS school_metrics (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    metric_type text NOT NULL CHECK (metric_type IN ('enrollment', 'exams', 'performance', 'usage', 'activity')),
    metric_value numeric NOT NULL,
    metric_date date NOT NULL,
    additional_data jsonb DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_super_admins_user_id ON super_admins(user_id);
CREATE INDEX IF NOT EXISTS idx_super_admins_active ON super_admins(is_active);

CREATE INDEX IF NOT EXISTS idx_registration_requests_school_id ON school_registration_requests(school_id);
CREATE INDEX IF NOT EXISTS idx_registration_requests_status ON school_registration_requests(status);
CREATE INDEX IF NOT EXISTS idx_registration_requests_submitted_at ON school_registration_requests(submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_registration_requests_reviewed_by ON school_registration_requests(reviewed_by);

CREATE INDEX IF NOT EXISTS idx_approval_audit_school_id ON admin_approval_audit(school_id);
CREATE INDEX IF NOT EXISTS idx_approval_audit_performed_by ON admin_approval_audit(performed_by);
CREATE INDEX IF NOT EXISTS idx_approval_audit_action ON admin_approval_audit(action);
CREATE INDEX IF NOT EXISTS idx_approval_audit_performed_at ON admin_approval_audit(performed_at DESC);

CREATE INDEX IF NOT EXISTS idx_school_metrics_school_id ON school_metrics(school_id);
CREATE INDEX IF NOT EXISTS idx_school_metrics_type_date ON school_metrics(metric_type, metric_date DESC);
CREATE INDEX IF NOT EXISTS idx_school_metrics_date ON school_metrics(metric_date DESC);

-- Create trigger functions for updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to tables with updated_at columns
DROP TRIGGER IF EXISTS trigger_super_admins_updated_at ON super_admins;
CREATE TRIGGER trigger_super_admins_updated_at
    BEFORE UPDATE ON super_admins
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_registration_requests_updated_at ON school_registration_requests;
CREATE TRIGGER trigger_registration_requests_updated_at
    BEFORE UPDATE ON school_registration_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_school_metrics_updated_at ON school_metrics;
CREATE TRIGGER trigger_school_metrics_updated_at
    BEFORE UPDATE ON school_metrics
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE super_admins IS 'Extended permissions and tracking for super admin users';
COMMENT ON COLUMN super_admins.permissions IS 'JSON object containing specific permissions and access levels';
COMMENT ON COLUMN super_admins.is_active IS 'Whether this super admin account is currently active';

COMMENT ON TABLE school_registration_requests IS 'Tracks school registration requests and approval workflow';
COMMENT ON COLUMN school_registration_requests.status IS 'Current status: pending, approved, rejected, under_review';
COMMENT ON COLUMN school_registration_requests.supporting_documents IS 'JSON array of uploaded document URLs';
COMMENT ON COLUMN school_registration_requests.proposed_admin_email IS 'Email for the admin account to be created upon approval';

COMMENT ON TABLE admin_approval_audit IS 'Audit trail for all administrative approval actions';
COMMENT ON COLUMN admin_approval_audit.action IS 'Type of action performed: approved, rejected, suspended, reactivated, modified';
COMMENT ON COLUMN admin_approval_audit.ip_address IS 'IP address from which the action was performed';
COMMENT ON COLUMN admin_approval_audit.user_agent IS 'Browser/client user agent string';

COMMENT ON TABLE school_metrics IS 'Performance and usage metrics for schools';
COMMENT ON COLUMN school_metrics.metric_type IS 'Type of metric: enrollment, exams, performance, usage, activity';
COMMENT ON COLUMN school_metrics.additional_data IS 'JSON object with additional metric-specific data';

-- Create views for common queries
CREATE OR REPLACE VIEW pending_registrations AS
SELECT 
    srr.id,
    srr.school_id,
    s.name as school_name,
    srr.requester_name,
    srr.requester_email,
    srr.requester_phone,
    srr.proposed_admin_email,
    srr.proposed_admin_first_name,
    srr.proposed_admin_last_name,
    srr.additional_message,
    srr.supporting_documents,
    srr.submitted_at,
    s.status as school_status,
    s.type as school_type,
    s.city,
    st.name as state_name,
    st.code as state_code
FROM school_registration_requests srr
JOIN schools s ON srr.school_id = s.id
JOIN states st ON s.state_id = st.id
WHERE srr.status = 'pending'
ORDER BY srr.submitted_at DESC;

COMMENT ON VIEW pending_registrations IS 'View of pending school registration requests for admin review';

CREATE OR REPLACE VIEW super_admin_activity AS
SELECT 
    aaa.id,
    aaa.school_id,
    s.name as school_name,
    aaa.action,
    u.first_name || ' ' || u.last_name as performed_by_name,
    u.email as performed_by_email,
    aaa.performed_at,
    aaa.reason,
    aaa.previous_status,
    aaa.new_status,
    aaa.ip_address
FROM admin_approval_audit aaa
JOIN schools s ON aaa.school_id = s.id
JOIN users u ON aaa.performed_by = u.id
ORDER BY aaa.performed_at DESC;

COMMENT ON VIEW super_admin_activity IS 'View of all super admin approval actions for audit purposes';

-- Function to create a new school registration request
CREATE OR REPLACE FUNCTION create_registration_request(
    p_school_id uuid,
    p_requester_name text,
    p_requester_email text,
    p_requester_phone text,
    p_proposed_admin_email text,
    p_proposed_admin_first_name text,
    p_proposed_admin_last_name text,
    p_supporting_documents jsonb,
    p_additional_message text
)
RETURNS uuid AS $$
DECLARE
    request_id uuid;
BEGIN
    INSERT INTO school_registration_requests (
        school_id,
        requester_name,
        requester_email,
        requester_phone,
        proposed_admin_email,
        proposed_admin_first_name,
        proposed_admin_last_name,
        supporting_documents,
        additional_message
    ) VALUES (
        p_school_id,
        p_requester_name,
        p_requester_email,
        p_requester_phone,
        p_proposed_admin_email,
        p_proposed_admin_first_name,
        p_proposed_admin_last_name,
        p_supporting_documents,
        p_additional_message
    ) RETURNING id INTO request_id;
    
    RETURN request_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION create_registration_request IS 'Creates a new school registration request and returns the request ID';

-- Function to approve a registration request
CREATE OR REPLACE FUNCTION approve_registration_request(
    p_request_id uuid,
    p_reviewed_by uuid,
    p_approval_notes text
)
RETURNS boolean AS $$
DECLARE
    school_record RECORD;
    request_record RECORD;
BEGIN
    -- Get the request details
    SELECT * INTO request_record 
    FROM school_registration_requests 
    WHERE id = p_request_id AND status = 'pending';
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Request not found or not in pending status';
    END IF;
    
    -- Get school details
    SELECT * INTO school_record 
    FROM schools 
    WHERE id = request_record.school_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'School not found';
    END IF;
    
    -- Update school status to active
    UPDATE schools 
    SET status = 'active',
        is_verified = true,
        updated_at = NOW()
    WHERE id = request_record.school_id;
    
    -- Update request status
    UPDATE school_registration_requests 
    SET status = 'approved',
        reviewed_at = NOW(),
        reviewed_by = p_reviewed_by,
        approval_notes = p_approval_notes,
        updated_at = NOW()
    WHERE id = p_request_id;
    
    -- Create audit record
    INSERT INTO admin_approval_audit (
        school_id,
        action,
        performed_by,
        reason,
        previous_status,
        new_status,
        additional_data
    ) VALUES (
        request_record.school_id,
        'approved',
        p_reviewed_by,
        p_approval_notes,
        'pending',
        'active',
        jsonb_build_object('request_id', p_request_id)
    );
    
    RETURN true;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION approve_registration_request IS 'Approves a registration request and updates school status';

-- Function to reject a registration request
CREATE OR REPLACE FUNCTION reject_registration_request(
    p_request_id uuid,
    p_reviewed_by uuid,
    p_rejection_reason text
)
RETURNS boolean AS $$
DECLARE
    request_record RECORD;
BEGIN
    -- Get the request details
    SELECT * INTO request_record 
    FROM school_registration_requests 
    WHERE id = p_request_id AND status = 'pending';
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Request not found or not in pending status';
    END IF;
    
    -- Update school status to rejected
    UPDATE schools 
    SET status = 'rejected',
        updated_at = NOW()
    WHERE id = request_record.school_id;
    
    -- Update request status
    UPDATE school_registration_requests 
    SET status = 'rejected',
        reviewed_at = NOW(),
        reviewed_by = p_reviewed_by,
        rejection_reason = p_rejection_reason,
        updated_at = NOW()
    WHERE id = p_request_id;
    
    -- Create audit record
    INSERT INTO admin_approval_audit (
        school_id,
        action,
        performed_by,
        reason,
        previous_status,
        new_status,
        additional_data
    ) VALUES (
        request_record.school_id,
        'rejected',
        p_reviewed_by,
        p_rejection_reason,
        'pending',
        'rejected',
        jsonb_build_object('request_id', p_request_id)
    );
    
    RETURN true;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION reject_registration_request IS 'Rejects a registration request and updates school status';

-- Verification queries
SELECT 'super_admins table created' as status,
       COUNT(*) as count
FROM super_admins;

SELECT 'school_registration_requests table created' as status,
       COUNT(*) as count
FROM school_registration_requests;

SELECT 'admin_approval_audit table created' as status,
       COUNT(*) as count
FROM admin_approval_audit;

SELECT 'school_metrics table created' as status,
       COUNT(*) as count
FROM school_metrics;
