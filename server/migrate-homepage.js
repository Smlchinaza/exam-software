// Simple migration script for school_homepages table
require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes('neon.tech') ? { rejectUnauthorized: false } : false
});

async function runMigration() {
  let client;
  
  try {
    console.log('🚀 Starting school_homepages migration...');
    
    // Get client from pool
    client = await pool.connect();
    console.log('✅ Database connected successfully');
    
    // Read the migration file
    const migrationPath = path.join(__dirname, 'migrations', 'create-school-homepages-table.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    console.log('📄 Migration file loaded');
    
    // Execute the migration
    console.log('🔨 Creating school_homepages table...');
    await client.query(migrationSQL);
    console.log('✅ school_homepages table created successfully!');
    
    // Verify the table was created
    console.log('🔍 Verifying table creation...');
    const result = await client.query(`
      SELECT table_name, column_name, data_type
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = 'school_homepages'
      ORDER BY ordinal_position
      LIMIT 5
    `);
    
    if (result.rows.length > 0) {
      console.log('✅ school_homepages table verified with columns:');
      result.rows.forEach(row => {
        console.log(`   - ${row.column_name} (${row.data_type})`);
      });
    } else {
      console.log('❌ school_homepages table was not created');
    }
    
    // Check if unique constraint exists
    const constraintCheck = await client.query(`
      SELECT conname, contype
      FROM pg_constraint 
      WHERE conrelid = 'school_homepages'::regclass
      LIMIT 3
    `);
    
    if (constraintCheck.rows.length > 0) {
      console.log('✅ Constraints created:');
      constraintCheck.rows.forEach(row => {
        console.log(`   - ${row.conname} (${row.contype})`);
      });
    }
    
    console.log('🎉 Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Full error:', error);
    throw error;
  } finally {
    if (client) {
      client.release();
    }
    await pool.end();
  }
}

// Run the migration
runMigration()
  .then(() => {
    console.log('✨ Migration process completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Migration process failed:', error.message);
    process.exit(1);
  });
