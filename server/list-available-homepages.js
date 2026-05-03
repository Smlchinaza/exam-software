// List all available school homepages
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes('neon.tech') ? { rejectUnauthorized: false } : false
});

async function listAvailableHomepages() {
  let client;
  
  try {
    client = await pool.connect();
    
    console.log('🏫 Available School Homepages:');
    console.log('================================');
    
    const schools = await client.query(`
      SELECT id, name, domain, city, type, is_public, status
      FROM schools 
      WHERE status = 'active' AND is_public = true
      ORDER BY name
    `);
    
    if (schools.rows.length === 0) {
      console.log('❌ No active public schools found');
      return;
    }
    
    schools.rows.forEach((school, index) => {
      const subdomain = school.domain ? school.domain.split('.')[0] : 'no-domain';
      console.log(`${index + 1}. ${school.name}`);
      console.log(`   📍 ${school.city || 'Location not specified'}`);
      console.log(`   🌐 /homepage/${subdomain}`);
      console.log(`   🏷️  ${school.type} school`);
      console.log('');
    });
    
    console.log(`\n✅ Found ${schools.rows.length} schools with available homepages`);
    console.log('\nTry accessing these URLs in your browser:');
    schools.rows.forEach(school => {
      const subdomain = school.domain ? school.domain.split('.')[0] : 'no-domain';
      console.log(`   http://localhost:3000/homepage/${subdomain}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (client) client.release();
    await pool.end();
  }
}

listAvailableHomepages();
