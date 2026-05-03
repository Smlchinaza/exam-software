// Script to run the school_homepages table migration
const fs = require('fs');
const path = require('path');
const pool = require('./db/postgres');

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('Starting school_homepages migration...');
    
    // Read the migration file
    const migrationPath = path.join(__dirname, 'migrations', 'create-school-homepages-table.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Execute the migration
    await client.query(migrationSQL);
    
    console.log('✅ School_homepages table migration completed successfully!');
    
    // Verify the table was created
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name = 'school_homepages'
    `);
    
    if (result.rows.length > 0) {
      console.log('✅ school_homepages table verified to exist');
    } else {
      console.log('❌ school_homepages table was not created');
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the migration
runMigration()
  .then(() => {
    console.log('Migration process completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration process failed:', error);
    process.exit(1);
  });
