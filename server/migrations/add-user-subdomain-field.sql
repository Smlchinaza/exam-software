-- Migration: Add subdomain field to users table
-- Purpose: Support teacher subdomain isolation for multi-tenant architecture

-- Add subdomain column to users table
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'subdomain'
    ) THEN
        ALTER TABLE users 
        ADD COLUMN subdomain text;
        
        -- Add comment for documentation
        COMMENT ON COLUMN users.subdomain IS 'Subdomain for the user''s school (e.g., schoolname from schoolname.schoolshubs.com)';
    END IF;
END $$;

-- Add validation constraint for subdomain format
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.check_constraints 
        WHERE constraint_name = 'chk_users_subdomain_format'
    ) THEN
        ALTER TABLE users 
        ADD CONSTRAINT chk_users_subdomain_format 
        CHECK (
            subdomain IS NULL 
            OR (subdomain ~ '^[a-z0-9-]+$' AND length(subdomain) >= 3 AND length(subdomain) <= 63)
        );
    END IF;
END $$;

-- Add index for subdomain lookups
CREATE INDEX IF NOT EXISTS idx_users_subdomain ON users(subdomain) WHERE subdomain IS NOT NULL;

-- Add composite index for school + subdomain lookups
CREATE INDEX IF NOT EXISTS idx_users_school_subdomain ON users(school_id, subdomain) WHERE subdomain IS NOT NULL;

-- Create function to update user subdomains based on school domain
CREATE OR REPLACE FUNCTION update_user_subdomains()
RETURNS void AS $$
BEGIN
    -- Update user subdomains based on their school's domain
    UPDATE users 
    SET subdomain = split_part(s.domain, '.', 1)
    FROM schools s 
    WHERE users.school_id = s.id 
    AND s.domain IS NOT NULL 
    AND users.subdomain IS NULL;
    
    RAISE NOTICE 'User subdomains updated based on school domains';
END;
$$ LANGUAGE plpgsql;

-- Run the function to populate existing data
SELECT update_user_subdomains();

-- Create trigger to automatically update subdomain when school domain changes
CREATE OR REPLACE FUNCTION update_user_subdomain_on_school_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Update subdomain for all users in this school when domain changes
    IF NEW.domain IS DISTINCT FROM OLD.domain THEN
        UPDATE users 
        SET subdomain = split_part(NEW.domain, '.', 1)
        WHERE users.school_id = NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for schools table
DROP TRIGGER IF EXISTS trigger_update_user_subdomains ON schools;
CREATE TRIGGER trigger_update_user_subdomains
AFTER UPDATE ON schools
FOR EACH ROW
EXECUTE FUNCTION update_user_subdomain_on_school_change();

-- Verification query
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default,
    character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'users' 
    AND table_schema = 'public' 
    AND column_name = 'subdomain';

-- Sample data verification (optional)
-- SELECT id, email, role, school_id, subdomain 
-- FROM users 
-- WHERE role = 'teacher' 
-- LIMIT 5;
