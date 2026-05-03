// Debug script to investigate the homepage API 500 error
require('dotenv').config();
const { Pool } = require('pg');

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes('neon.tech') ? { rejectUnauthorized: false } : false
});

async function debugHomepageAPI() {
  let client;
  
  try {
    console.log('🔍 Debugging homepage API issue...');
    
    // Get client from pool
    client = await pool.connect();
    console.log('✅ Database connected');
    
    // 1. Check if school_homepages table exists
    console.log('\n📋 Checking school_homepages table...');
    const tableExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'school_homepages'
      )
    `);
    console.log('school_homepages table exists:', tableExists.rows[0].exists);
    
    if (!tableExists.rows[0].exists) {
      console.log('❌ school_homepages table does not exist - need to run migration');
      return;
    }
    
    // 2. Check schools table and find default-school
    console.log('\n🏫 Checking schools table...');
    const schoolsQuery = await client.query(`
      SELECT id, name, domain, status 
      FROM schools 
      WHERE status = 'active'
      ORDER BY created_at DESC
      LIMIT 5
    `);
    console.log('Found', schoolsQuery.rows.length, 'active schools:');
    schoolsQuery.rows.forEach(school => {
      console.log(`  - ${school.name} (${school.domain || 'no domain'})`);
    });
    
    // 3. Test the exact query used in the API
    console.log('\n🧪 Testing API query for "default-school"...');
    const subdomain = 'default-school';
    
    // First, try to find school by subdomain
    const schoolRes = await client.query(`
      SELECT id, name, domain, city, state, type, is_public, status, created_at
      FROM schools 
      WHERE domain LIKE $1 AND status = 'active' AND is_public = true
      LIMIT 1
    `, [`${subdomain}.%`]);
    
    console.log('School query result:', schoolRes.rows.length, 'rows found');
    if (schoolRes.rows.length > 0) {
      const school = schoolRes.rows[0];
      console.log('Found school:', school.name, 'domain:', school.domain);
      
      // Now test homepage query
      const homepageRes = await client.query(`
        SELECT 
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
        LIMIT 1
      `, [school.id]);
      
      console.log('Homepage query result:', homepageRes.rows.length, 'rows found');
      if (homepageRes.rows.length > 0) {
        console.log('Homepage title:', homepageRes.rows[0].welcome_title);
      } else {
        console.log('No homepage found for this school - this might be the issue');
      }
    } else {
      console.log('❌ No school found for subdomain:', subdomain);
      
      // Let's try to find any school and create a test homepage
      const anySchool = await client.query(`
        SELECT id, name, domain FROM schools WHERE status = 'active' LIMIT 1
      `);
      
      if (anySchool.rows.length > 0) {
        const school = anySchool.rows[0];
        console.log('Creating test homepage for school:', school.name);
        
        // Create homepage
        await client.query(`
          INSERT INTO school_homepages (
            school_id, welcome_title, welcome_message, mission_statement, vision_statement,
            total_students, total_teachers, total_classes, established_year,
            primary_color, secondary_color, accent_color,
            show_hero_section, show_features_section, show_news_section, 
            show_gallery_section, show_testimonials_section, show_footer,
            is_published, created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, NOW(), NOW()
          )
          ON CONFLICT (school_id) WHERE is_active = true 
          DO UPDATE SET
            welcome_title = EXCLUDED.welcome_title,
            updated_at = NOW()
        `, [
          school.id,
          `Welcome to ${school.name}`,
          'We are committed to providing quality education.',
          'To create a learning environment that fosters excellence.',
          'To be a leading educational institution.',
          100, 20, 8, 2020,
          '#1e40af', '#64748b', '#f59e0b',
          true, true, true, true, true, true,
          true
        ]);
        
        console.log('✅ Test homepage created');
        
        // Update domain to include subdomain
        const subdomainName = school.name.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-');
        await client.query(`
          UPDATE schools 
          SET domain = $1 
          WHERE id = $2
        `, [`${subdomainName}.schoolshubs.com`, school.id]);
        
        console.log(`✅ Updated school domain to: ${subdomainName}.schoolshubs.com`);
        console.log(`🌐 Try accessing: /homepage/${subdomainName}`);
      }
    }
    
    console.log('\n✅ Debug completed');
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
    console.error('Full error:', error);
  } finally {
    if (client) {
      client.release();
    }
    await pool.end();
  }
}

// Run the debug
debugHomepageAPI()
  .then(() => {
    console.log('\n✨ Debug process completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Debug process failed:', error.message);
    process.exit(1);
  });
