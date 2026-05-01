-- Phase 4.1: Audit Trail System
-- Comprehensive audit logging for security and compliance

-- Create audit_logs table for comprehensive tracking
CREATE TABLE IF NOT EXISTS audit_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES users(id) ON DELETE SET NULL,
    school_id uuid REFERENCES schools(id) ON DELETE SET NULL,
    admin_id uuid REFERENCES school_admins(id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id uuid,
    old_values jsonb,
    new_values jsonb,
    ip_address INET,
    user_agent TEXT,
    session_id TEXT,
    success BOOLEAN DEFAULT true,
    error_message TEXT,
    created_at timestamptz NOT NULL DEFAULT now(),
    metadata jsonb DEFAULT '{}'
);

-- Create indexes for audit trail performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_school_id ON audit_logs(school_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_admin_id ON audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_type ON audit_logs(resource_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_school_action ON audit_logs(school_id, action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);

-- Create data_access_logs table for access tracking
CREATE TABLE IF NOT EXISTS data_access_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES users(id) ON DELETE SET NULL,
    school_id uuid REFERENCES schools(id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id uuid,
    access_granted BOOLEAN DEFAULT true,
    ip_address INET,
    user_agent TEXT,
    session_id TEXT,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Create indexes for data access logs
CREATE INDEX IF NOT EXISTS idx_data_access_logs_user_id ON data_access_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_data_access_logs_school_id ON data_access_logs(school_id);
CREATE INDEX IF NOT EXISTS idx_data_access_logs_action ON data_access_logs(action);
CREATE INDEX IF NOT EXISTS idx_data_access_logs_created_at ON data_access_logs(created_at DESC);

-- Create security_events table for security monitoring
CREATE TABLE IF NOT EXISTS security_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    user_id uuid REFERENCES users(id) ON DELETE SET NULL,
    school_id uuid REFERENCES schools(id) ON DELETE SET NULL,
    ip_address INET,
    user_agent TEXT,
    description TEXT NOT NULL,
    details jsonb DEFAULT '{}',
    resolved BOOLEAN DEFAULT false,
    resolved_by uuid REFERENCES users(id) ON DELETE SET NULL,
    resolved_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Create indexes for security events
CREATE INDEX IF NOT EXISTS idx_security_events_type ON security_events(event_type);
CREATE INDEX IF NOT EXISTS idx_security_events_severity ON security_events(severity);
CREATE INDEX IF NOT EXISTS idx_security_events_user_id ON security_events(user_id);
CREATE INDEX IF NOT EXISTS idx_security_events_school_id ON security_events(school_id);
CREATE INDEX IF NOT EXISTS idx_security_events_created_at ON security_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_events_resolved ON security_events(resolved);

-- Create login_attempts table for security monitoring
CREATE TABLE IF NOT EXISTS login_attempts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL,
    ip_address INET,
    user_agent TEXT,
    success BOOLEAN NOT NULL,
    failure_reason VARCHAR(100),
    school_id uuid REFERENCES schools(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Create indexes for login attempts
CREATE INDEX IF NOT EXISTS idx_login_attempts_email ON login_attempts(email);
CREATE INDEX IF NOT EXISTS idx_login_attempts_ip ON login_attempts(ip_address);
CREATE INDEX IF NOT EXISTS idx_login_attempts_success ON login_attempts(success);
CREATE INDEX IF NOT EXISTS idx_login_attempts_created_at ON login_attempts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_attempts_school_id ON login_attempts(school_id);

-- Create function to log audit events
CREATE OR REPLACE FUNCTION log_audit_event(
    p_user_id uuid,
    p_school_id uuid,
    p_admin_id uuid,
    p_action VARCHAR(50),
    p_resource_type VARCHAR(50),
    p_resource_id uuid DEFAULT NULL,
    p_old_values jsonb DEFAULT NULL,
    p_new_values jsonb DEFAULT NULL,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_session_id TEXT DEFAULT NULL,
    p_success BOOLEAN DEFAULT true,
    p_error_message TEXT DEFAULT NULL,
    p_metadata jsonb DEFAULT '{}'
) RETURNS VOID AS $$
BEGIN
    INSERT INTO audit_logs (
        user_id, school_id, admin_id, action, resource_type, resource_id,
        old_values, new_values, ip_address, user_agent, session_id,
        success, error_message, metadata
    ) VALUES (
        p_user_id, p_school_id, p_admin_id, p_action, p_resource_type, p_resource_id,
        p_old_values, p_new_values, p_ip_address, p_user_agent, p_session_id,
        p_success, p_error_message, p_metadata
    );
END;
$$ LANGUAGE plpgsql;

-- Create function to log data access
CREATE OR REPLACE FUNCTION log_data_access(
    p_user_id uuid,
    p_school_id uuid,
    p_action VARCHAR(50),
    p_resource_type VARCHAR(50),
    p_resource_id uuid DEFAULT NULL,
    p_access_granted BOOLEAN DEFAULT true,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_session_id TEXT DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
    INSERT INTO data_access_logs (
        user_id, school_id, action, resource_type, resource_id,
        access_granted, ip_address, user_agent, session_id
    ) VALUES (
        p_user_id, p_school_id, p_action, p_resource_type, p_resource_id,
        p_access_granted, p_ip_address, p_user_agent, p_session_id
    );
END;
$$ LANGUAGE plpgsql;

-- Create function to log security events
CREATE OR REPLACE FUNCTION log_security_event(
    p_event_type VARCHAR(50),
    p_severity VARCHAR(20),
    p_user_id uuid DEFAULT NULL,
    p_school_id uuid DEFAULT NULL,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_description TEXT,
    p_details jsonb DEFAULT '{}'
) RETURNS VOID AS $$
BEGIN
    INSERT INTO security_events (
        event_type, severity, user_id, school_id, ip_address, user_agent,
        description, details
    ) VALUES (
        p_event_type, p_severity, p_user_id, p_school_id, p_ip_address, p_user_agent,
        p_description, p_details
    );
END;
$$ LANGUAGE plpgsql;

-- Create function to log login attempts
CREATE OR REPLACE FUNCTION log_login_attempt(
    p_email VARCHAR(255),
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_success BOOLEAN,
    p_failure_reason VARCHAR(100) DEFAULT NULL,
    p_school_id uuid DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
    INSERT INTO login_attempts (
        email, ip_address, user_agent, success, failure_reason, school_id
    ) VALUES (
        p_email, p_ip_address, p_user_agent, p_success, p_failure_reason, p_school_id
    );
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic audit logging on teacher registrations
CREATE OR REPLACE FUNCTION trigger_teacher_registration_audit() RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        PERFORM log_audit_event(
            NEW.user_id,
            NEW.school_id,
            NULL,
            'CREATE',
            'teacher_registration',
            NEW.id,
            NULL,
            jsonb_build_object(
                'status', NEW.status,
                'registration_data', NEW.registration_data
            ),
            inet_client_addr(),
            current_setting('request.user_agent', true),
            current_setting('request.session_id', true),
            true,
            NULL,
            jsonb_build_object('trigger', 'teacher_registration_insert')
        );
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        PERFORM log_audit_event(
            NEW.user_id,
            NEW.school_id,
            NEW.reviewed_by,
            'UPDATE',
            'teacher_registration',
            NEW.id,
            jsonb_build_object(
                'status', OLD.status,
                'reviewed_by', OLD.reviewed_by,
                'reviewed_at', OLD.reviewed_at,
                'rejection_reason', OLD.rejection_reason
            ),
            jsonb_build_object(
                'status', NEW.status,
                'reviewed_by', NEW.reviewed_by,
                'reviewed_at', NEW.reviewed_at,
                'rejection_reason', NEW.rejection_reason
            ),
            inet_client_addr(),
            current_setting('request.user_agent', true),
            current_setting('request.session_id', true),
            true,
            NULL,
            jsonb_build_object('trigger', 'teacher_registration_update')
        );
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for audit logging
DROP TRIGGER IF EXISTS trigger_teacher_registration_audit ON teacher_registrations;
CREATE TRIGGER trigger_teacher_registration_audit
    AFTER INSERT OR UPDATE ON teacher_registrations
    FOR EACH ROW EXECUTE FUNCTION trigger_teacher_registration_audit();

-- Create view for audit trail summary
CREATE OR REPLACE VIEW audit_trail_summary AS
SELECT 
    al.id,
    al.action,
    al.resource_type,
    al.resource_id,
    al.success,
    al.created_at,
    u.email as user_email,
    u.first_name || ' ' || u.last_name as user_name,
    s.name as school_name,
    s.subdomain,
    admin_user.email as admin_email,
    admin_user.first_name || ' ' || admin_user.last_name as admin_name,
    al.ip_address,
    al.error_message
FROM audit_logs al
LEFT JOIN users u ON al.user_id = u.id
LEFT JOIN schools s ON al.school_id = s.id
LEFT JOIN school_admins sa ON al.admin_id = sa.id
LEFT JOIN users admin_user ON sa.user_id = admin_user.id
ORDER BY al.created_at DESC;

-- Create view for security events summary
CREATE OR REPLACE VIEW security_events_summary AS
SELECT 
    se.id,
    se.event_type,
    se.severity,
    se.description,
    se.resolved,
    se.created_at,
    u.email as user_email,
    u.first_name || ' ' || u.last_name as user_name,
    s.name as school_name,
    s.subdomain,
    se.ip_address,
    se.details
FROM security_events se
LEFT JOIN users u ON se.user_id = u.id
LEFT JOIN schools s ON se.school_id = s.id
ORDER BY se.created_at DESC;

-- Create function to get audit statistics
CREATE OR REPLACE FUNCTION get_audit_statistics(
    p_school_id uuid DEFAULT NULL,
    p_date_from DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
    p_date_to DATE DEFAULT CURRENT_DATE
) RETURNS TABLE (
    total_actions BIGINT,
    successful_actions BIGINT,
    failed_actions BIGINT,
    unique_users BIGINT,
    unique_admins BIGINT,
    top_actions jsonb,
    security_events BIGINT,
    failed_logins BIGINT
) AS $$
BEGIN
    RETURN QUERY
    WITH audit_stats AS (
        SELECT 
            COUNT(*) as total,
            COUNT(*) FILTER (WHERE success = true) as successful,
            COUNT(*) FILTER (WHERE success = false) as failed,
            COUNT(DISTINCT user_id) as users,
            COUNT(DISTINCT admin_id) as admins
        FROM audit_logs 
        WHERE ($1 IS NULL OR school_id = $1)
        AND DATE(created_at) BETWEEN $2 AND $3
    ),
    top_actions_data AS (
        SELECT 
            jsonb_agg(
                jsonb_build_object(
                    'action', action,
                    'count', COUNT(*)
                ) ORDER BY COUNT(*) DESC
            ) as top_actions
        FROM audit_logs 
        WHERE ($1 IS NULL OR school_id = $1)
        AND DATE(created_at) BETWEEN $2 AND $3
        GROUP BY action
        ORDER BY COUNT(*) DESC
        LIMIT 5
    ),
    security_stats AS (
        SELECT COUNT(*) as security_count
        FROM security_events 
        WHERE ($1 IS NULL OR school_id = $1)
        AND DATE(created_at) BETWEEN $2 AND $3
    ),
    login_stats AS (
        SELECT COUNT(*) as failed_login_count
        FROM login_attempts 
        WHERE ($1 IS NULL OR school_id = $1)
        AND success = false
        AND DATE(created_at) BETWEEN $2 AND $3
    )
    SELECT 
        a.total::bigint,
        a.successful::bigint,
        a.failed::bigint,
        a.users::bigint,
        a.admins::bigint,
        COALESCE(ta.top_actions, '[]'::jsonb),
        COALESCE(s.security_count, 0)::bigint,
        COALESCE(l.failed_login_count, 0)::bigint
    FROM audit_stats a
    CROSS JOIN top_actions_data ta
    CROSS JOIN security_stats s
    CROSS JOIN login_stats l;
END;
$$ LANGUAGE plpgsql;

-- Add comments for documentation
COMMENT ON TABLE audit_logs IS 'Comprehensive audit trail for all system actions';
COMMENT ON TABLE data_access_logs IS 'Data access tracking for security monitoring';
COMMENT ON TABLE security_events IS 'Security events and incidents tracking';
COMMENT ON TABLE login_attempts IS 'Login attempt monitoring for security';

-- Verification query
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_name IN ('audit_logs', 'data_access_logs', 'security_events', 'login_attempts')
AND table_schema = 'public'
ORDER BY table_name, ordinal_position;
