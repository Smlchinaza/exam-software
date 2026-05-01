-- Migration: Create Notifications Table for School Approval System
-- Purpose: Handle teacher registration notifications and approval workflow

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    user_id uuid REFERENCES users(id) ON DELETE CASCADE,
    type text NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    data jsonb,
    is_read boolean NOT NULL DEFAULT false,
    is_actioned boolean NOT NULL DEFAULT false,
    action_taken_by uuid REFERENCES users(id) ON DELETE SET NULL,
    action_taken_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Add indexes for notifications
CREATE INDEX IF NOT EXISTS idx_notifications_school ON notifications(school_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_school_unread ON notifications(school_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- Create notification types enum
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1
        FROM pg_type
        WHERE typname = 'notification_type'
    ) THEN 
        CREATE TYPE notification_type AS ENUM (
            'teacher_registration',
            'student_enrollment',
            'exam_created',
            'exam_submission',
            'system_announcement',
            'school_update',
            'user_approval',
            'password_reset'
        );
    END IF;
END $$;

-- Add constraint for notification type
ALTER TABLE notifications 
ADD CONSTRAINT chk_notifications_type 
CHECK (type IN ('teacher_registration', 'student_enrollment', 'exam_created', 'exam_submission', 'system_announcement', 'school_update', 'user_approval', 'password_reset'));

-- Create function to create teacher registration notification
CREATE OR REPLACE FUNCTION create_teacher_registration_notification(
    school_uuid uuid,
    user_uuid uuid,
    teacher_name text,
    teacher_email text,
    subjects jsonb,
    department text,
    experience text
)
RETURNS uuid AS $$
DECLARE
    notification_id uuid;
BEGIN
    INSERT INTO notifications (
        school_id, 
        user_id, 
        type, 
        title, 
        message, 
        data
    ) VALUES (
        school_uuid,
        user_uuid,
        'teacher_registration',
        'New Teacher Registration',
        format('%s has registered as a teacher', teacher_name),
        jsonb_build_object(
            'userId', user_uuid,
            'userEmail', teacher_email,
            'teacherName', teacher_name,
            'subjects', subjects,
            'department', department,
            'experience', experience,
            'registeredAt', now()
        )
    ) RETURNING id INTO notification_id;
    
    RETURN notification_id;
END;
$$ LANGUAGE plpgsql;

-- Create function to mark notification as read and actioned
CREATE OR REPLACE FUNCTION action_notification(
    notification_uuid uuid,
    action_by_uuid uuid,
    action_type text DEFAULT 'approved'
)
RETURNS boolean AS $$
BEGIN
    UPDATE notifications 
    SET 
        is_read = true,
        is_actioned = true,
        action_taken_by = action_by_uuid,
        action_taken_at = NOW(),
        updated_at = NOW(),
        data = jsonb_set(
            jsonb_set(data, '{actionType}', to_jsonb(action_type)),
            '{actionedAt}', 
            to_jsonb(NOW())
        )
    WHERE id = notification_uuid;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Create view for unread notifications by school
CREATE OR REPLACE VIEW school_unread_notifications AS
SELECT 
    n.id,
    n.school_id,
    n.user_id,
    n.type,
    n.title,
    n.message,
    n.data,
    n.created_at,
    u.first_name || ' ' || u.last_name as user_name,
    u.email as user_email
FROM notifications n
LEFT JOIN users u ON n.user_id = u.id
WHERE n.is_read = false
ORDER BY n.created_at DESC;

-- Create view for teacher registration notifications
CREATE OR REPLACE VIEW teacher_registration_notifications AS
SELECT 
    n.id,
    n.school_id,
    n.user_id,
    n.title,
    n.message,
    n.data,
    n.created_at,
    n.is_read,
    n.is_actioned,
    u.first_name || ' ' || u.last_name as teacher_name,
    u.email as teacher_email,
    s.name as school_name
FROM notifications n
LEFT JOIN users u ON n.user_id = u.id
LEFT JOIN schools s ON n.school_id = s.id
WHERE n.type = 'teacher_registration'
ORDER BY n.created_at DESC;

-- Create function to get notification statistics by school
CREATE OR REPLACE FUNCTION get_school_notification_stats(school_uuid uuid)
RETURNS TABLE(
    total_notifications bigint,
    unread_count bigint,
    teacher_registrations bigint,
    actioned_count bigint
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_notifications,
        COUNT(CASE WHEN is_read = false THEN 1 END) as unread_count,
        COUNT(CASE WHEN type = 'teacher_registration' THEN 1 END) as teacher_registrations,
        COUNT(CASE WHEN is_actioned = true THEN 1 END) as actioned_count
    FROM notifications
    WHERE school_id = school_uuid;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_notifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_update_notifications_updated_at ON notifications;

-- Create trigger
CREATE TRIGGER trigger_update_notifications_updated_at
BEFORE UPDATE ON notifications
FOR EACH ROW
EXECUTE FUNCTION update_notifications_updated_at();

-- Add comments for documentation
COMMENT ON TABLE notifications IS 'Multi-tenant notifications system for school management';
COMMENT ON COLUMN notifications.school_id IS 'School that owns this notification';
COMMENT ON COLUMN notifications.user_id IS 'User who triggered this notification (if applicable)';
COMMENT ON COLUMN notifications.type IS 'Type of notification: teacher_registration, exam_created, etc.';
COMMENT ON COLUMN notifications.data IS 'JSON data containing notification-specific details';
COMMENT ON COLUMN notifications.is_actioned IS 'Whether this notification has been processed/approved';
COMMENT ON COLUMN notifications.action_taken_by IS 'Admin who processed this notification';

-- Verification queries
SELECT 'notifications table structure' as info, column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'notifications' 
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- Test the functions (optional - uncomment for testing)
/*
-- Test teacher registration notification
SELECT create_teacher_registration_notification(
    (SELECT id FROM schools LIMIT 1),
    (SELECT id FROM users WHERE role = 'teacher' LIMIT 1),
    'Test Teacher',
    'teacher@test.com',
    '["Math", "Science"]'::jsonb,
    'Science Department',
    '5 years'
);

-- Test notification statistics
SELECT * FROM get_school_notification_stats((SELECT id FROM schools LIMIT 1));

-- Test notification action
SELECT action_notification(
    (SELECT id FROM notifications WHERE type = 'teacher_registration' LIMIT 1),
    (SELECT id FROM users WHERE role = 'admin' LIMIT 1),
    'approved'
);
*/
