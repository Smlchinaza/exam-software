// Check the actual structure of the schools table
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes('neon.tech') ? { rejectUnauthorized: false } : false
});

async function checkSchoolsStructure() {
  let client;
  
  try {
    client = await pool.connect();
    
    console.log('🔍 Checking schools table structure...');
    
    const columns = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = 'schools'
      ORDER BY ordinal_position
    `);
    
    console.log('Schools table columns:');
    columns.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} (${col.is_nullable})`);
    });
    
    // Also check if there's a state_id column
    const stateIdCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = 'schools' 
        AND column_name = 'state_id'
    `);
    
    console.log('\nState-related columns:');
    if (stateIdCheck.rows.length > 0) {
      console.log('✅ Found state_id column');
    } else {
      console.log('❌ No state_id column found');
      
      // Check for any state-related columns
      const stateColumns = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'schools' 
          AND column_name LIKE '%state%'
      `);
      
      if (stateColumns.rows.length > 0) {
        console.log('Found state-related columns:', stateColumns.rows.map(r => r.column_name));
      } else {
        console.log('No state-related columns found');
      }
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    if (client) client.release();
    await pool.end();
  }
}

checkSchoolsStructure();
