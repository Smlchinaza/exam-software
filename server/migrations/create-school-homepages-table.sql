-- Migration: Create school_homepages table
-- This table stores custom homepage content for each school

-- Create the school_homepages table
CREATE TABLE IF NOT EXISTS school_homepages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    
    -- Homepage sections
    welcome_title text NOT NULL DEFAULT 'Welcome to Our School',
    welcome_message text NOT NULL DEFAULT 'We are committed to excellence in education',
    mission_statement text,
    vision_statement text,
    
    -- School statistics (displayed on homepage)
    total_students integer DEFAULT 0,
    total_teachers integer DEFAULT 0,
    total_classes integer DEFAULT 0,
    established_year integer,
    
    -- Contact information
    contact_email text,
    contact_phone text,
    address text,
    city text,
    state text,
    postal_code text,
    
    -- Social media links
    website_url text,
    facebook_url text,
    twitter_url text,
    instagram_url text,
    linkedin_url text,
    
    -- School colors and branding
    primary_color text DEFAULT '#1e40af',
    secondary_color text DEFAULT '#64748b',
    accent_color text DEFAULT '#f59e0b',
    
    -- Hero section settings
    hero_image_url text,
    hero_background_color text DEFAULT '#f8fafc',
    show_hero_section boolean DEFAULT true,
    
    -- Features section
    show_features_section boolean DEFAULT true,
    features jsonb DEFAULT '[
        {"title": "Quality Education", "description": "Providing excellent learning experiences", "icon": "book"},
        {"title": "Modern Facilities", "description": "State-of-the-art infrastructure", "icon": "building"},
        {"title": "Experienced Staff", "description": "Dedicated and qualified teachers", "icon": "users"},
        {"title": "Safe Environment", "description": "Secure and nurturing atmosphere", "icon": "shield"}
    ]'::jsonb,
    
    -- News and announcements section
    show_news_section boolean DEFAULT true,
    latest_news jsonb DEFAULT '[]'::jsonb,
    
    -- Gallery section
    show_gallery_section boolean DEFAULT true,
    gallery_images jsonb DEFAULT '[]'::jsonb,
    
    -- Testimonials section
    show_testimonials_section boolean DEFAULT true,
    testimonials jsonb DEFAULT '[]'::jsonb,
    
    -- Footer information
    footer_text text DEFAULT 'Powered by SchoolHubs Platform',
    show_footer boolean DEFAULT true,
    
    -- Metadata
    is_active boolean DEFAULT true,
    is_published boolean DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    created_by uuid REFERENCES users(id),
    updated_by uuid REFERENCES users(id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_school_homepages_school_id ON school_homepages(school_id);
CREATE INDEX IF NOT EXISTS idx_school_homepages_is_active ON school_homepages(is_active);
CREATE INDEX IF NOT EXISTS idx_school_homepages_is_published ON school_homepages(is_published);

-- Create unique constraint to ensure one homepage per school
CREATE UNIQUE INDEX IF NOT EXISTS idx_school_homepages_unique_school ON school_homepages(school_id) WHERE is_active = true;

-- Add trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_school_homepages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_update_school_homepages_updated_at
    BEFORE UPDATE ON school_homepages
    FOR EACH ROW
    EXECUTE FUNCTION update_school_homepages_updated_at();

-- Comments for documentation
COMMENT ON TABLE school_homepages IS 'Stores custom homepage content and settings for each school';
COMMENT ON COLUMN school_homepages.school_id IS 'Reference to the school this homepage belongs to';
COMMENT ON COLUMN school_homepages.welcome_title IS 'Main heading displayed on the homepage';
COMMENT ON COLUMN school_homepages.welcome_message IS 'Welcome message displayed below the title';
COMMENT ON COLUMN school_homepages.mission_statement IS 'School mission statement';
COMMENT ON COLUMN school_homepages.vision_statement IS 'School vision statement';
COMMENT ON COLUMN school_homepages.features IS 'JSON array of features to display on homepage';
COMMENT ON COLUMN school_homepages.latest_news IS 'JSON array of latest news items';
COMMENT ON COLUMN school_homepages.gallery_images IS 'JSON array of gallery image URLs';
COMMENT ON COLUMN school_homepages.testimonials IS 'JSON array of student/parent testimonials';
COMMENT ON COLUMN school_homepages.primary_color IS 'Primary brand color for the school';
COMMENT ON COLUMN school_homepages.secondary_color IS 'Secondary brand color';
COMMENT ON COLUMN school_homepages.accent_color IS 'Accent color for highlights';
COMMENT ON COLUMN school_homepages.is_published IS 'Whether the homepage is publicly visible';
