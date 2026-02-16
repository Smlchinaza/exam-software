-- Enhanced Schools Schema
-- This script enhances the schools table with all new features from the registration form
-- and adds proper constraints, indexes, and improvements

-- First, ensure we have all required columns with proper constraints
DO $$
BEGIN
    -- Check and add missing columns with proper types and constraints
    
    -- state_id (should already exist from previous migration)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'schools' AND column_name = 'state_id') THEN
        ALTER TABLE schools 
        ADD COLUMN state_id uuid REFERENCES states(id);
    END IF;
    
    -- address column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'schools' AND column_name = 'address') THEN
        ALTER TABLE schools 
        ADD COLUMN address text;
    END IF;
    
    -- city column with constraint
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'schools' AND column_name = 'city') THEN
        ALTER TABLE schools 
        ADD COLUMN city text;
    END IF;
    
    -- postal_code column with validation
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'schools' AND column_name = 'postal_code') THEN
        ALTER TABLE schools 
        ADD COLUMN postal_code text;
    END IF;
    
    -- phone column with format validation
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'schools' AND column_name = 'phone') THEN
        ALTER TABLE schools 
        ADD COLUMN phone text;
    END IF;
    
    -- type column with enum-like constraint
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'schools' AND column_name = 'type') THEN
        ALTER TABLE schools 
        ADD COLUMN type text DEFAULT 'secondary';
    END IF;
    
    -- is_public column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'schools' AND column_name = 'is_public') THEN
        ALTER TABLE schools 
        ADD COLUMN is_public boolean DEFAULT true;
    END IF;
    
    -- status column with default
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'schools' AND column_name = 'status') THEN
        ALTER TABLE schools 
        ADD COLUMN status text DEFAULT 'active';
    END IF;
    
    -- updated_at column (should already exist)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'schools' AND column_name = 'updated_at') THEN
        ALTER TABLE schools 
        ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
    END IF;
    
    -- Add new columns for enhanced functionality
    
    -- website column (separate from domain for clarity)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'schools' AND column_name = 'website') THEN
        ALTER TABLE schools 
        ADD COLUMN website text;
    END IF;
    
    -- email column for general school contact
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'schools' AND column_name = 'email') THEN
        ALTER TABLE schools 
        ADD COLUMN email text;
    END IF;
    
    -- establishment_year
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'schools' AND column_name = 'establishment_year') THEN
        ALTER TABLE schools 
        ADD COLUMN establishment_year integer;
    END IF;
    
    -- student_capacity
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'schools' AND column_name = 'student_capacity') THEN
        ALTER TABLE schools 
        ADD COLUMN student_capacity integer;
    END IF;
    
    -- description/mission
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'schools' AND column_name = 'description') THEN
        ALTER TABLE schools 
        ADD COLUMN description text;
    END IF;
    
    -- facilities (JSON array)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'schools' AND column_name = 'facilities') THEN
        ALTER TABLE schools 
        ADD COLUMN facilities jsonb;
    END IF;
    
    -- accreditation_status
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'schools' AND column_name = 'accreditation_status') THEN
        ALTER TABLE schools 
        ADD COLUMN accreditation_status text DEFAULT 'pending';
    END IF;
    
    -- is_verified for admin verification
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'schools' AND column_name = 'is_verified') THEN
        ALTER TABLE schools 
        ADD COLUMN is_verified boolean DEFAULT false;
    END IF;
    
END $$;

-- Add proper constraints
DO $$
BEGIN
    -- Add CHECK constraints for type column
    IF NOT EXISTS (SELECT 1 FROM information_schema.check_constraints WHERE constraint_name = 'chk_schools_type') THEN
        ALTER TABLE schools 
        ADD CONSTRAINT chk_schools_type 
        CHECK (type IN ('primary', 'secondary', 'tertiary', 'vocational', 'technical'));
    END IF;
    
    -- Add CHECK constraints for status column
    IF NOT EXISTS (SELECT 1 FROM information_schema.check_constraints WHERE constraint_name = 'chk_schools_status') THEN
        ALTER TABLE schools 
        ADD CONSTRAINT chk_schools_status 
        CHECK (status IN ('active', 'inactive', 'suspended', 'pending'));
    END IF;
    
    -- Add CHECK constraints for accreditation_status
    IF NOT EXISTS (SELECT 1 FROM information_schema.check_constraints WHERE constraint_name = 'chk_schools_accreditation') THEN
        ALTER TABLE schools 
        ADD CONSTRAINT chk_schools_accreditation 
        CHECK (accreditation_status IN ('pending', 'approved', 'rejected', 'expired'));
    END IF;
    
    -- Add CHECK constraint for establishment_year
    IF NOT EXISTS (SELECT 1 FROM information_schema.check_constraints WHERE constraint_name = 'chk_schools_establishment_year') THEN
        ALTER TABLE schools 
        ADD CONSTRAINT chk_schools_establishment_year 
        CHECK (establishment_year IS NULL OR (establishment_year >= 1800 AND establishment_year <= EXTRACT(YEAR FROM NOW())));
    END IF;
    
    -- Add CHECK constraint for student_capacity
    IF NOT EXISTS (SELECT 1 FROM information_schema.check_constraints WHERE constraint_name = 'chk_schools_capacity') THEN
        ALTER TABLE schools 
        ADD CONSTRAINT chk_schools_capacity 
        CHECK (student_capacity IS NULL OR student_capacity > 0);
    END IF;
    
END $$;

-- Create enhanced indexes for better performance
CREATE INDEX IF NOT EXISTS idx_schools_state_city ON schools(state_id, city);
CREATE INDEX IF NOT EXISTS idx_schools_type_public ON schools(type, is_public);
CREATE INDEX IF NOT EXISTS idx_schools_status_verified ON schools(status, is_verified);
CREATE INDEX IF NOT EXISTS idx_schools_name_search ON schools USING gin(to_tsvector('english', name));
CREATE INDEX IF NOT EXISTS idx_schools_city_search ON schools USING gin(to_tsvector('english', city));
CREATE INDEX IF NOT EXISTS idx_schools_establishment_year ON schools(establishment_year DESC);

-- Add partial indexes for common queries
CREATE INDEX IF NOT EXISTS idx_schools_active_public ON schools(state_id) WHERE status = 'active' AND is_public = true;
CREATE INDEX IF NOT EXISTS idx_schools_verified ON schools(state_id) WHERE is_verified = true;

-- Create or update trigger function for updated_at
CREATE OR REPLACE FUNCTION update_schools_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_update_schools_updated_at ON schools;

-- Create trigger
CREATE TRIGGER trigger_update_schools_updated_at
    BEFORE UPDATE ON schools
    FOR EACH ROW
    EXECUTE FUNCTION update_schools_updated_at();

-- Add comments for documentation
COMMENT ON TABLE schools IS 'Multi-tenant schools table with enhanced location and metadata support';
COMMENT ON COLUMN schools.state_id IS 'Foreign key to states table for Nigerian state organization';
COMMENT ON COLUMN schools.address IS 'Full physical address of the school';
COMMENT ON COLUMN schools.city IS 'City where the school is located';
COMMENT ON COLUMN schools.postal_code IS 'Postal code for mailing purposes';
COMMENT ON COLUMN schools.phone IS 'Primary contact phone number';
COMMENT ON COLUMN schools.type IS 'School type: primary, secondary, tertiary, vocational, technical';
COMMENT ON COLUMN schools.is_public IS 'True for public schools, false for private schools';
COMMENT ON COLUMN schools.status IS 'School status: active, inactive, suspended, pending';
COMMENT ON COLUMN schools.website IS 'School website URL (separate from domain)';
COMMENT ON COLUMN schools.email IS 'General school contact email';
COMMENT ON COLUMN schools.establishment_year IS 'Year the school was established';
COMMENT ON COLUMN schools.student_capacity IS 'Maximum student capacity';
COMMENT ON COLUMN schools.description IS 'School description, mission, or vision statement';
COMMENT ON COLUMN schools.facilities IS 'JSON array of available facilities (library, labs, sports, etc.)';
COMMENT ON COLUMN schools.accreditation_status IS 'Accreditation status: pending, approved, rejected, expired';
COMMENT ON COLUMN schools.is_verified IS 'Admin verification status for quality control';

-- Create a view for active, verified public schools (useful for teacher registration)
CREATE OR REPLACE VIEW active_verified_schools AS
SELECT 
    s.id,
    s.name,
    s.domain,
    s.state_id,
    st.name as state_name,
    st.code as state_code,
    s.city,
    s.type,
    s.is_public,
    s.phone,
    s.email,
    s.establishment_year,
    s.description,
    s.created_at
FROM schools s
JOIN states st ON s.state_id = st.id
WHERE s.status = 'active' 
  AND s.is_verified = true 
  AND s.is_public = true
ORDER BY s.name;

COMMENT ON VIEW active_verified_schools IS 'View of active, verified public schools for registration purposes';

-- Create a function to search schools with full-text search
CREATE OR REPLACE FUNCTION search_schools(
    search_query text DEFAULT NULL,
    state_filter uuid DEFAULT NULL,
    type_filter text DEFAULT NULL,
    public_only boolean DEFAULT true,
    limit_count integer DEFAULT 50,
    offset_count integer DEFAULT 0
)
RETURNS TABLE (
    id uuid,
    name text,
    domain text,
    state_id uuid,
    state_name text,
    state_code text,
    city text,
    type text,
    is_public boolean,
    phone text,
    email text,
    establishment_year integer,
    description text,
    created_at timestamptz
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id,
        s.name,
        s.domain,
        s.state_id,
        st.name as state_name,
        st.code as state_code,
        s.city,
        s.type,
        s.is_public,
        s.phone,
        s.email,
        s.establishment_year,
        s.description,
        s.created_at
    FROM schools s
    JOIN states st ON s.state_id = st.id
    WHERE 
        s.status = 'active'
        AND s.is_verified = true
        AND (public_only IS NULL OR s.is_public = public_only)
        AND (state_filter IS NULL OR s.state_id = state_filter)
        AND (type_filter IS NULL OR s.type = type_filter)
        AND (
            search_query IS NULL 
            OR to_tsvector('english', s.name || ' ' || COALESCE(s.city, '') || ' ' || COALESCE(s.description, '')) 
               @@ plainto_tsquery('english', search_query)
        )
    ORDER BY 
        CASE 
            WHEN search_query IS NOT NULL THEN ts_rank(to_tsvector('english', s.name || ' ' || COALESCE(s.city, '') || ' ' || COALESCE(s.description, '')), plainto_tsquery('english', search_query))
            ELSE 0
        END DESC,
        s.name ASC
    LIMIT limit_count
    OFFSET offset_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION search_schools IS 'Advanced school search with full-text search and filtering';

-- Sample data for testing (optional - uncomment if needed)
/*
INSERT INTO schools (name, state_id, city, type, is_public, phone, email, description, establishment_year, student_capacity, facilities) VALUES
('Lagos Federal Government College', (SELECT id FROM states WHERE code = 'LA'), 'Lagos', 'secondary', true, '+2341234567890', 'info@lagosfgc.edu', 'Premier federal secondary school in Lagos', 1965, 1500, '["library", "science_labs", "sports_complex", "computer_lab"]'),
('Abuja British School', (SELECT id FROM states WHERE code = 'FC'), 'Abuja', 'secondary', false, '+2349876543210', 'admin@abujabritish.edu', 'International curriculum school in Abuja', 1998, 800, '["library", "science_labs", "swimming_pool", "music_room"]'),
('Kano Technical College', (SELECT id FROM states WHERE code = 'KN'), 'Kano', 'vocational', true, '+2341122334455', 'info@kanotech.edu', 'Technical and vocational education center', 1985, 2000, '["workshops", "computer_labs", "technical_labs"]');
*/

-- Verification query
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'schools' 
    AND table_schema = 'public'
ORDER BY ordinal_position;
