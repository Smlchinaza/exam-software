// Test the fixed API
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes('neon.tech') ? { rejectUnauthorized: false } : false
});

async function testFixedAPI() {
  let client;
  
  try {
    client = await pool.connect();
    
    console.log('🧪 Testing fixed API for "default-school"...');
    
    const subdomain = 'default-school';
    
    // Test the exact query from the fixed API
    const schoolRes = await client.query(`
      SELECT id, name, domain, city, state_id, type, is_public, status, created_at
      FROM schools 
      WHERE domain LIKE $1 AND status = 'active' AND is_public = true
      LIMIT 1
    `, [`${subdomain}.%`]);
    
    console.log('School query result:', schoolRes.rows.length, 'rows found');
    
    if (schoolRes.rows.length === 0) {
      console.log('❌ No school found for subdomain:', subdomain);
      
      // Let's find available schools and their subdomains
      const availableSchools = await client.query(`
        SELECT id, name, domain 
        FROM schools 
        WHERE status = 'active' AND is_public = true
        ORDER BY name
      `);
      
      console.log('Available schools:');
      availableSchools.rows.forEach(school => {
        const subdomain = school.domain ? school.domain.split('.')[0] : 'no-domain';
        console.log(`  - ${school.name}: /homepage/${subdomain}`);
      });
      
    } else {
      const school = schoolRes.rows[0];
      console.log('✅ Found school:', school.name);
      console.log('   Domain:', school.domain);
      console.log('   City:', school.city);
      console.log('   State ID:', school.state_id);
      console.log('   Type:', school.type);
      
      // Test homepage query
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
        const homepage = homepageRes.rows[0];
        console.log('✅ Homepage found:');
        console.log('   Title:', homepage.welcome_title);
        console.log('   Students:', homepage.total_students);
        console.log('   Primary Color:', homepage.primary_color);
      } else {
        console.log('⚠️  No homepage found - will use default');
      }
      
      console.log('\n✅ API should now work for:', `/homepage/${subdomain}`);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    if (client) client.release();
    await pool.end();
  }
}

testFixedAPI();
