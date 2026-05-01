-- Phase 1.4: Schools Subdomain Enhancement
-- This migration ensures the schools table has proper subdomain support

-- Add subdomain column to schools table if it doesn't exist
DO $$ BEGIN
    -- Add subdomain column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'schools' 
        AND column_name = 'subdomain'
    ) THEN
        ALTER TABLE schools 
        ADD COLUMN subdomain text UNIQUE;
        
        -- Create index for subdomain
        CREATE INDEX IF NOT EXISTS idx_schools_subdomain ON schools(subdomain);
        
        -- Add comment
        COMMENT ON COLUMN schools.subdomain IS 'Unique subdomain for school isolation (e.g., schoolname.examplatform.com)';
    END IF;

    -- Add is_active column if it doesn't exist (for school status)
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'schools' 
        AND column_name = 'is_active'
    ) THEN
        ALTER TABLE schools 
        ADD COLUMN is_active boolean DEFAULT true;
        
        -- Create index for is_active
        CREATE INDEX IF NOT EXISTS idx_schools_is_active ON schools(is_active);
        
        -- Add comment
        COMMENT ON COLUMN schools.is_active IS 'Whether the school is active and accessible';
    END IF;
END $$;

-- Create unique constraint for subdomain if it doesn't exist
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE table_name = 'schools' 
        AND constraint_name = 'unique_schools_subdomain'
        AND constraint_type = 'UNIQUE'
    ) THEN
        ALTER TABLE schools 
        ADD CONSTRAINT unique_schools_subdomain UNIQUE (subdomain);
    END IF;
END $$;

-- Create function to generate unique subdomain from school name
CREATE OR REPLACE FUNCTION generate_school_subdomain(
    p_school_name text,
    p_school_id uuid DEFAULT NULL
) RETURNS text AS $$
DECLARE
    base_subdomain text;
    counter integer := 1;
    candidate_subdomain text;
BEGIN
    -- Generate base subdomain (lowercase, alphanumeric, no spaces)
    base_subdomain := lower(regexp_replace(p_school_name, '[^a-zA-Z0-9]', '', 'g'));
    
    -- If base is empty or too short, use generic prefix
    IF length(base_subdomain) < 3 THEN
        base_subdomain := 'school' || extract(epoch from now())::text;
    END IF;
    
    -- Truncate if too long
    IF length(base_subdomain) > 20 THEN
        base_subdomain := substring(base_subdomain, 1, 20);
    END IF;
    
    -- Start with base subdomain
    candidate_subdomain := base_subdomain;
    
    -- Check for uniqueness and add counter if needed
    WHILE EXISTS (SELECT 1 FROM schools WHERE subdomain = candidate_subdomain AND (p_school_id IS NULL OR id != p_school_id)) LOOP
        candidate_subdomain := base_subdomain || counter;
        counter := counter + 1;
        
        -- Prevent infinite loop
        IF counter > 1000 THEN
            RAISE EXCEPTION 'Unable to generate unique subdomain for school: %', p_school_name;
        END IF;
    END LOOP;
    
    RETURN candidate_subdomain;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION generate_school_subdomain IS 'Generate a unique subdomain from school name';

-- Create trigger to automatically generate subdomain for new schools
CREATE OR REPLACE FUNCTION trigger_generate_school_subdomain() RETURNS TRIGGER AS $$
BEGIN
    -- Only generate subdomain if it's not provided
    IF NEW.subdomain IS NULL OR NEW.subdomain = '' THEN
        NEW.subdomain := generate_school_subdomain(NEW.name, NEW.id);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_generate_school_subdomain ON schools;
CREATE TRIGGER trigger_generate_school_subdomain
    BEFORE INSERT ON schools
    FOR EACH ROW
    EXECUTE FUNCTION trigger_generate_school_subdomain();

-- Create function to update subdomain when school name changes
CREATE OR REPLACE FUNCTION update_school_subdomain_on_name_change() RETURNS TRIGGER AS $$
BEGIN
    -- Only update subdomain if it was auto-generated (no custom subdomain set)
    IF OLD.subdomain = generate_school_subdomain(OLD.name, OLD.id) THEN
        NEW.subdomain := generate_school_subdomain(NEW.name, NEW.id);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_school_subdomain ON schools;
CREATE TRIGGER trigger_update_school_subdomain
    BEFORE UPDATE ON schools
    FOR EACH ROW
    WHEN (OLD.name IS DISTINCT FROM NEW.name)
    EXECUTE FUNCTION update_school_subdomain_on_name_change();

-- Create view for schools with subdomain information
CREATE OR REPLACE VIEW schools_with_subdomain AS
SELECT 
    s.id,
    s.name,
    s.subdomain,
    s.domain,
    s.is_active,
    s.status,
    s.state_id,
    s.city,
    s.type,
    s.is_public,
    s.is_verified,
    s.phone,
    s.email,
    s.website,
    s.description,
    s.establishment_year,
    s.student_capacity,
    s.created_at,
    s.updated_at,
    st.name as state_name,
    st.code as state_code,
    -- Construct full domain
    CASE 
        WHEN s.subdomain IS NOT NULL AND s.subdomain != '' THEN
            s.subdomain || '.examplatform.com'
        WHEN s.domain IS NOT NULL AND s.domain != '' THEN
            s.domain
        ELSE
            NULL
    END as full_domain
FROM schools s
LEFT JOIN states st ON s.state_id = st.id
WHERE s.is_active = true;

COMMENT ON VIEW schools_with_subdomain IS 'View of schools with subdomain and full domain information';

-- Create function to validate subdomain format
CREATE OR REPLACE FUNCTION validate_subdomain_format(
    p_subdomain text
) RETURNS BOOLEAN AS $$
BEGIN
    -- Subdomain should be:
    -- - 3-50 characters long
    -- - Only lowercase letters, numbers, and hyphens
    -- - Cannot start or end with hyphen
    -- - No consecutive hyphens
    
    IF p_subdomain IS NULL THEN
        RETURN FALSE;
    END IF;
    
    IF length(p_subdomain) < 3 OR length(p_subdomain) > 50 THEN
        RETURN FALSE;
    END IF;
    
    IF p_subdomain !~ '^[a-z0-9]([a-z0-9-]*[a-z0-9])?$' THEN
        RETURN FALSE;
    END IF;
    
    IF p_subdomain ~ '--' THEN
        RETURN FALSE;
    END IF;
    
    -- Check for reserved subdomains
    IF p_subdomain IN ('www', 'mail', 'ftp', 'admin', 'api', 'test', 'staging', 'dev', 'localhost') THEN
        RETURN FALSE;
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION validate_subdomain_format IS 'Validate subdomain format according to best practices';

-- Create trigger to validate subdomain format
CREATE OR REPLACE FUNCTION trigger_validate_subdomain() RETURNS TRIGGER AS $$
BEGIN
    IF NEW.subdomain IS NOT NULL AND NOT validate_subdomain_format(NEW.subdomain) THEN
        RAISE EXCEPTION 'Invalid subdomain format: %', NEW.subdomain;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_validate_subdomain ON schools;
CREATE TRIGGER trigger_validate_subdomain
    BEFORE INSERT OR UPDATE ON schools
    FOR EACH ROW
    EXECUTE FUNCTION trigger_validate_subdomain();

-- Verification query
SELECT column_name, data_type, is_nullable, column_default, character_maximum_length
FROM information_schema.columns
WHERE table_name = 'schools' 
AND table_schema = 'public'
AND column_name IN ('subdomain', 'is_active')
ORDER BY ordinal_position;
