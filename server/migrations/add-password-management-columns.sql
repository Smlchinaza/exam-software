-- Migration: Add Password Management Columns to Users Table
-- This migration adds columns for password reset functionality and forced password changes

-- Add password management columns to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS password_reset_required BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS password_reset_token VARCHAR(255),
ADD COLUMN IF NOT EXISTS password_reset_expires TIMESTAMP,
ADD COLUMN IF NOT EXISTS last_password_change TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS is_first_login BOOLEAN DEFAULT TRUE;

-- Create password reset logs table
CREATE TABLE IF NOT EXISTS password_reset_logs (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reset_by UUID REFERENCES users(id) ON DELETE SET NULL, -- Super admin who performed reset
    reset_type VARCHAR(20) NOT NULL CHECK (reset_type IN ('auto', 'forced', 'self')),
    reset_reason TEXT,
    old_password_hash VARCHAR(255), -- Store previous password hash for audit
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_password_reset_token ON users(password_reset_token) WHERE password_reset_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_password_reset_required ON users(password_reset_required) WHERE password_reset_required = TRUE;
CREATE INDEX IF NOT EXISTS idx_password_reset_logs_user ON password_reset_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_logs_reset_by ON password_reset_logs(reset_by);
CREATE INDEX IF NOT EXISTS idx_password_reset_logs_type ON password_reset_logs(reset_type);

-- Add constraint to ensure password reset token is unique when present
ALTER TABLE users 
ADD CONSTRAINT users_password_reset_token_unique 
EXCLUDE (password_reset_token WITH =) WHERE (password_reset_token IS NOT NULL);

-- Update existing school admins to have password reset required if they were created before this migration
UPDATE users 
SET password_reset_required = TRUE, is_first_login = TRUE
WHERE role = 'admin' 
AND created_at < CURRENT_TIMESTAMP
AND last_password_change IS NULL;

-- Log the migration
INSERT INTO password_reset_logs (user_id, reset_by, reset_type, reset_reason)
SELECT u.id, NULL, 'auto', 'Migration: Set password reset required for existing admins'
FROM users u 
WHERE u.role = 'admin' 
AND u.created_at < CURRENT_TIMESTAMP
AND u.last_password_change IS NULL;

COMMENT ON COLUMN users.password_reset_required IS 'Indicates if user must change password on next login';
COMMENT ON COLUMN users.password_reset_token IS 'Temporary token for password reset verification';
COMMENT ON COLUMN users.password_reset_expires IS 'Expiration time for password reset token';
COMMENT ON COLUMN users.last_password_change IS 'Timestamp of last password change';
COMMENT ON COLUMN users.is_first_login IS 'Indicates if this is the user''s first login';

COMMENT ON TABLE password_reset_logs IS 'Audit trail for all password reset operations';
COMMENT ON COLUMN password_reset_logs.reset_type IS 'Type of reset: auto (migration), forced (admin), self (user)';
COMMENT ON COLUMN password_reset_logs.reset_reason IS 'Reason for password reset';
COMMENT ON COLUMN password_reset_logs.old_password_hash IS 'Previous password hash for audit purposes';
