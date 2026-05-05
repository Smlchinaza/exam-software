// Migration script for password management features
// Run this script to add password management columns and tables

const pool = require('./db/postgres');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('Starting password management migration...');
    
    // Read the migration SQL file
    const migrationPath = path.join(__dirname, 'migrations', 'add-password-management-columns.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Execute the migration
    await client.query('BEGIN');
    
    console.log('Executing migration SQL...');
    await client.query(migrationSQL);
    
    await client.query('COMMIT');
    
    console.log('✅ Password management migration completed successfully!');
    console.log('\nAdded features:');
    console.log('- Password reset required flag for users');
    console.log('- Password reset tokens and expiration');
    console.log('- First login tracking');
    console.log('- Password change audit trail');
    console.log('- Password reset logs table');
    console.log('- Proper indexes and constraints');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the migration if this file is executed directly
if (require.main === module) {
  runMigration();
}

module.exports = runMigration;
