-- Nigerian States Schema and Data Migration
-- Add states table and enhance schools table for multi-tenant registration

-- Create states table
CREATE TABLE IF NOT EXISTS states (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL UNIQUE,
    code text NOT NULL UNIQUE, -- 2-3 letter state code
    country text NOT NULL DEFAULT 'Nigeria',
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create indexes for states
CREATE INDEX IF NOT EXISTS idx_states_name ON states(name);
CREATE INDEX IF NOT EXISTS idx_states_code ON states(code);
CREATE INDEX IF NOT EXISTS idx_states_active ON states(is_active);

-- Enhance schools table with state and additional information
ALTER TABLE schools 
ADD COLUMN IF NOT EXISTS state_id uuid REFERENCES states(id),
ADD COLUMN IF NOT EXISTS address text,
ADD COLUMN IF NOT EXISTS city text,
ADD COLUMN IF NOT EXISTS postal_code text,
ADD COLUMN IF NOT EXISTS phone text,
ADD COLUMN IF NOT EXISTS type text DEFAULT 'secondary', -- primary, secondary, tertiary
ADD COLUMN IF NOT EXISTS is_public boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS status text DEFAULT 'active', -- active, inactive, suspended
ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Create indexes for enhanced schools table
CREATE INDEX IF NOT EXISTS idx_schools_state ON schools(state_id);
CREATE INDEX IF NOT EXISTS idx_schools_status ON schools(status);
CREATE INDEX IF NOT EXISTS idx_schools_type ON schools(type);

-- Insert Nigerian states
INSERT INTO states (name, code) VALUES 
('Abia', 'AB'),
('Adamawa', 'AD'),
('Akwa Ibom', 'AK'),
('Anambra', 'AN'),
('Bauchi', 'BA'),
('Bayelsa', 'BY'),
('Benue', 'BE'),
('Borno', 'BO'),
('Cross River', 'CR'),
('Delta', 'DT'),
('Ebonyi', 'EB'),
('Edo', 'ED'),
('Ekiti', 'EK'),
('Enugu', 'EN'),
('Federal Capital Territory', 'FC'),
('Gombe', 'GO'),
('Imo', 'IM'),
('Jigawa', 'JI'),
('Kaduna', 'KD'),
('Kano', 'KN'),
('Katsina', 'KT'),
('Kebbi', 'KE'),
('Kogi', 'KO'),
('Kwara', 'KW'),
('Lagos', 'LA'),
('Nasarawa', 'NA'),
('Niger', 'NI'),
('Ogun', 'OG'),
('Ondo', 'ON'),
('Osun', 'OS'),
('Oyo', 'OY'),
('Plateau', 'PL'),
('Rivers', 'RI'),
('Sokoto', 'SO'),
('Taraba', 'TA'),
('Yobe', 'YO'),
('Zamfara', 'ZA')
ON CONFLICT (name) DO NOTHING;

-- Update trigger for states table
CREATE OR REPLACE FUNCTION update_states_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_update_states_updated_at
    BEFORE UPDATE ON states
    FOR EACH ROW
    EXECUTE FUNCTION update_states_updated_at();

-- Update trigger for schools table (if not exists)
CREATE OR REPLACE FUNCTION update_schools_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS trigger_update_schools_updated_at ON schools;
CREATE TRIGGER trigger_update_schools_updated_at
    BEFORE UPDATE ON schools
    FOR EACH ROW
    EXECUTE FUNCTION update_schools_updated_at();
