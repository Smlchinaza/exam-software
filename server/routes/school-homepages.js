// routes/school-homepages.js
// API endpoints for school homepage management

const express = require('express');
const router = express.Router();
const pool = require('../db/postgres');
const { authenticateJWT } = require('../middleware/auth');
const { enforceMultiTenant } = require('../middleware/tenantScoping');

/**
 * GET /api/school-homepages/public/:subdomain
 * Public endpoint - Get school homepage data by subdomain
 * This endpoint is accessible without authentication for public viewing
 */
router.get('/public/:subdomain', async (req, res) => {
  try {
    const { subdomain } = req.params;

    if (!subdomain) {
      return res.status(400).json({ error: 'Subdomain is required' });
    }

    // Find school by subdomain
    const schoolRes = await pool.query(
      `SELECT id, name, domain, city, state, type, is_public, status, created_at
       FROM schools 
       WHERE domain LIKE $1 AND status = 'active' AND is_public = true
       LIMIT 1`,
      [`${subdomain}.%`]
    );

    if (schoolRes.rows.length === 0) {
      return res.status(404).json({ error: 'School not found or not publicly accessible' });
    }

    const school = schoolRes.rows[0];

    // Get homepage data for this school
    const homepageRes = await pool.query(
      `SELECT 
         welcome_title, welcome_message, mission_statement, vision_statement,
         total_students, total_teachers, total_classes, established_year,
         contact_email, contact_phone, address, city as homepage_city, state as homepage_state, postal_code,
         website_url, facebook_url, twitter_url, instagram_url, linkedin_url,
         primary_color, secondary_color, accent_color,
         hero_image_url, hero_background_color, show_hero_section,
         show_features_section, features,
         show_news_section, latest_news,
         show_gallery_section, gallery_images,
         show_testimonials_section, testimonials,
         footer_text, show_footer,
         is_published, updated_at
       FROM school_homepages 
       WHERE school_id = $1 AND is_active = true AND is_published = true
       LIMIT 1`,
      [school.id]
    );

    // If no custom homepage exists, create default data
    let homepageData;
    if (homepageRes.rows.length === 0) {
      homepageData = createDefaultHomepageData(school);
    } else {
      homepageData = homepageRes.rows[0];
    }

    // Combine school and homepage data
    const response = {
      school: {
        id: school.id,
        name: school.name,
        domain: school.domain,
        subdomain: subdomain,
        city: school.city,
        state: school.state,
        type: school.type,
        established_year: homepageData.established_year || new Date().getFullYear()
      },
      homepage: homepageData,
      meta: {
        last_updated: homepageData.updated_at || school.created_at,
        is_custom: homepageRes.rows.length > 0
      }
    };

    res.json(response);
  } catch (err) {
    console.error('Error fetching school homepage:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/school-homepages/current
 * Get current school's homepage data (authenticated users only)
 */
router.get('/current', authenticateJWT, enforceMultiTenant, async (req, res) => {
  try {
    const { schoolId, role } = req.tenant;

    if (!schoolId) {
      return res.status(400).json({ error: 'No school associated with user' });
    }

    // Get school information
    const schoolRes = await pool.query(
      `SELECT id, name, domain, city, state, type, is_public, status, created_at
       FROM schools 
       WHERE id = $1
       LIMIT 1`,
      [schoolId]
    );

    if (schoolRes.rows.length === 0) {
      return res.status(404).json({ error: 'School not found' });
    }

    const school = schoolRes.rows[0];

    // Get homepage data
    const homepageRes = await pool.query(
      `SELECT *, updated_at
       FROM school_homepages 
       WHERE school_id = $1 AND is_active = true
       LIMIT 1`,
      [schoolId]
    );

    let homepageData;
    if (homepageRes.rows.length === 0) {
      homepageData = createDefaultHomepageData(school);
    } else {
      homepageData = homepageRes.rows[0];
    }

    res.json({
      school,
      homepage: homepageData,
      meta: {
        last_updated: homepageData.updated_at || school.created_at,
        is_custom: homepageRes.rows.length > 0,
        can_edit: role === 'admin' || role === 'teacher'
      }
    });
  } catch (err) {
    console.error('Error fetching current school homepage:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/school-homepages
 * Create or update school homepage (admin/teacher only)
 */
router.post('/', authenticateJWT, enforceMultiTenant, async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { schoolId, role } = req.tenant;
    const userId = req.user.id;

    // Only admins and teachers can manage homepage
    if (!['admin', 'teacher'].includes(role)) {
      return res.status(403).json({ error: 'Admin or teacher access required' });
    }

    const {
      welcome_title,
      welcome_message,
      mission_statement,
      vision_statement,
      total_students,
      total_teachers,
      total_classes,
      established_year,
      contact_email,
      contact_phone,
      address,
      city,
      state,
      postal_code,
      website_url,
      facebook_url,
      twitter_url,
      instagram_url,
      linkedin_url,
      primary_color,
      secondary_color,
      accent_color,
      hero_image_url,
      hero_background_color,
      show_hero_section,
      show_features_section,
      features,
      show_news_section,
      latest_news,
      show_gallery_section,
      gallery_images,
      show_testimonials_section,
      testimonials,
      footer_text,
      show_footer,
      is_published
    } = req.body;

    await client.query('BEGIN');

    // Check if homepage already exists
    const existingRes = await client.query(
      `SELECT id FROM school_homepages WHERE school_id = $1 AND is_active = true`,
      [schoolId]
    );

    let homepageData;
    
    if (existingRes.rows.length > 0) {
      // Update existing homepage
      const updateRes = await client.query(
        `UPDATE school_homepages SET
           welcome_title = COALESCE($1, welcome_title),
           welcome_message = COALESCE($2, welcome_message),
           mission_statement = COALESCE($3, mission_statement),
           vision_statement = COALESCE($4, vision_statement),
           total_students = COALESCE($5, total_students),
           total_teachers = COALESCE($6, total_teachers),
           total_classes = COALESCE($7, total_classes),
           established_year = COALESCE($8, established_year),
           contact_email = COALESCE($9, contact_email),
           contact_phone = COALESCE($10, contact_phone),
           address = COALESCE($11, address),
           city = COALESCE($12, city),
           state = COALESCE($13, state),
           postal_code = COALESCE($14, postal_code),
           website_url = COALESCE($15, website_url),
           facebook_url = COALESCE($16, facebook_url),
           twitter_url = COALESCE($17, twitter_url),
           instagram_url = COALESCE($18, instagram_url),
           linkedin_url = COALESCE($19, linkedin_url),
           primary_color = COALESCE($20, primary_color),
           secondary_color = COALESCE($21, secondary_color),
           accent_color = COALESCE($22, accent_color),
           hero_image_url = COALESCE($23, hero_image_url),
           hero_background_color = COALESCE($24, hero_background_color),
           show_hero_section = COALESCE($25, show_hero_section),
           show_features_section = COALESCE($26, show_features_section),
           features = COALESCE($27, features),
           show_news_section = COALESCE($28, show_news_section),
           latest_news = COALESCE($29, latest_news),
           show_gallery_section = COALESCE($30, show_gallery_section),
           gallery_images = COALESCE($31, gallery_images),
           show_testimonials_section = COALESCE($32, show_testimonials_section),
           testimonials = COALESCE($33, testimonials),
           footer_text = COALESCE($34, footer_text),
           show_footer = COALESCE($35, show_footer),
           is_published = COALESCE($36, is_published),
           updated_by = $37,
           updated_at = NOW()
         WHERE school_id = $38 AND is_active = true
         RETURNING *`,
        [
          welcome_title, welcome_message, mission_statement, vision_statement,
          total_students, total_teachers, total_classes, established_year,
          contact_email, contact_phone, address, city, state, postal_code,
          website_url, facebook_url, twitter_url, instagram_url, linkedin_url,
          primary_color, secondary_color, accent_color,
          hero_image_url, hero_background_color, show_hero_section,
          show_features_section, features, show_news_section, latest_news,
          show_gallery_section, gallery_images, show_testimonials_section,
          testimonials, footer_text, show_footer, is_published,
          userId, schoolId
        ]
      );
      
      homepageData = updateRes.rows[0];
    } else {
      // Create new homepage
      const insertRes = await client.query(
        `INSERT INTO school_homepages (
           school_id, welcome_title, welcome_message, mission_statement, vision_statement,
           total_students, total_teachers, total_classes, established_year,
           contact_email, contact_phone, address, city, state, postal_code,
           website_url, facebook_url, twitter_url, instagram_url, linkedin_url,
           primary_color, secondary_color, accent_color,
           hero_image_url, hero_background_color, show_hero_section,
           show_features_section, features, show_news_section, latest_news,
           show_gallery_section, gallery_images, show_testimonials_section,
           testimonials, footer_text, show_footer, is_published,
           created_by, updated_by
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38)
         RETURNING *`,
        [
          schoolId, welcome_title, welcome_message, mission_statement, vision_statement,
          total_students, total_teachers, total_classes, established_year,
          contact_email, contact_phone, address, city, state, postal_code,
          website_url, facebook_url, twitter_url, instagram_url, linkedin_url,
          primary_color, secondary_color, accent_color,
          hero_image_url, hero_background_color, show_hero_section,
          show_features_section, features, show_news_section, latest_news,
          show_gallery_section, gallery_images, show_testimonials_section,
          testimonials, footer_text, show_footer, is_published,
          userId, userId
        ]
      );
      
      homepageData = insertRes.rows[0];
    }

    await client.query('COMMIT');

    res.json({
      message: existingRes.rows.length > 0 ? 'Homepage updated successfully' : 'Homepage created successfully',
      homepage: homepageData
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error saving school homepage:', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

/**
 * Helper function to create default homepage data
 */
function createDefaultHomepageData(school) {
  return {
    welcome_title: `Welcome to ${school.name}`,
    welcome_message: 'We are committed to providing quality education and nurturing our students to reach their full potential.',
    mission_statement: 'To create a learning environment that fosters academic excellence, character development, and lifelong learning.',
    vision_statement: 'To be a leading educational institution that prepares students for success in a rapidly changing world.',
    total_students: 0,
    total_teachers: 0,
    total_classes: 0,
    established_year: new Date().getFullYear(),
    contact_email: null,
    contact_phone: null,
    address: null,
    city: school.city || null,
    state: school.state || null,
    postal_code: null,
    website_url: null,
    facebook_url: null,
    twitter_url: null,
    instagram_url: null,
    linkedin_url: null,
    primary_color: '#1e40af',
    secondary_color: '#64748b',
    accent_color: '#f59e0b',
    hero_image_url: null,
    hero_background_color: '#f8fafc',
    show_hero_section: true,
    show_features_section: true,
    features: [
      { title: 'Quality Education', description: 'Providing excellent learning experiences', icon: 'book' },
      { title: 'Modern Facilities', description: 'State-of-the-art infrastructure', icon: 'building' },
      { title: 'Experienced Staff', description: 'Dedicated and qualified teachers', icon: 'users' },
      { title: 'Safe Environment', description: 'Secure and nurturing atmosphere', icon: 'shield' }
    ],
    show_news_section: true,
    latest_news: [],
    show_gallery_section: true,
    gallery_images: [],
    show_testimonials_section: true,
    testimonials: [],
    footer_text: 'Powered by SchoolHubs Platform',
    show_footer: true,
    is_published: true,
    updated_at: new Date().toISOString()
  };
}

module.exports = router;
