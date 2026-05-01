// Migration Runner: User Subdomain Field Addition
// Purpose: Add subdomain support to users table for teacher isolation

const fs = require('fs');
const path = require('path');
const pool = require('../db/postgres');

async function runMigration() {
  console.log('🚀 Starting user subdomain migration...');
  
  try {
    // Read the SQL migration file
    const migrationPath = path.join(__dirname, 'add-user-subdomain-field.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📄 Migration file loaded successfully');
    
    // Start transaction
    await pool.query('BEGIN');
    console.log('🔄 Transaction started');
    
    try {
      // Execute migration SQL
      await pool.query(migrationSQL);
      console.log('✅ Migration SQL executed successfully');
      
      // Verify the migration
      const verificationQuery = `
        SELECT column_name, data_type, is_nullable 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'subdomain'
      `;
      
      const result = await pool.query(verificationQuery);
      
      if (result.rows.length > 0) {
        console.log('✅ Subdomain column verified:', result.rows[0]);
      } else {
        throw new Error('Subdomain column was not created');
      }
      
      // Check existing users and their subdomain status
      const userCheckQuery = `
        SELECT 
          COUNT(*) as total_users,
          COUNT(CASE WHEN subdomain IS NOT NULL THEN 1 END) as users_with_subdomain,
          COUNT(CASE WHEN role = 'teacher' THEN 1 END) as total_teachers,
          COUNT(CASE WHEN role = 'teacher' AND subdomain IS NOT NULL THEN 1 END) as teachers_with_subdomain
        FROM users
      `;
      
      const userStats = await pool.query(userCheckQuery);
      console.log('📊 User statistics:', userStats.rows[0]);
      
      // Check schools with domains
      const schoolCheckQuery = `
        SELECT 
          COUNT(*) as total_schools,
          COUNT(CASE WHEN domain IS NOT NULL THEN 1 END) as schools_with_domain
        FROM schools
      `;
      
      const schoolStats = await pool.query(schoolCheckQuery);
      console.log('🏫 School statistics:', schoolStats.rows[0]);
      
      // Commit transaction
      await pool.query('COMMIT');
      console.log('✅ Transaction committed successfully');
      
      console.log('\n🎉 Migration completed successfully!');
      console.log('\nNext steps:');
      console.log('1. Update application code to use the new subdomain field');
      console.log('2. Implement subdomain-based routing in middleware');
      console.log('3. Add subdomain validation in registration/login flows');
      
    } catch (error) {
      // Rollback on error
      await pool.query('ROLLBACK');
      console.error('❌ Migration failed, rolled back:', error);
      throw error;
    }
    
  } catch (error) {
    console.error('❌ Migration error:', error);
    throw error;
  }
}

// Rollback function
async function rollbackMigration() {
  console.log('🔄 Starting rollback of user subdomain migration...');
  
  try {
    await pool.query('BEGIN');
    
    // Drop triggers
    await pool.query('DROP TRIGGER IF EXISTS trigger_update_user_subdomains ON schools');
    await pool.query('DROP FUNCTION IF EXISTS update_user_subdomain_on_school_change()');
    await pool.query('DROP FUNCTION IF EXISTS update_user_subdomains()');
    
    // Drop indexes
    await pool.query('DROP INDEX IF EXISTS idx_users_school_subdomain');
    await pool.query('DROP INDEX IF EXISTS idx_users_subdomain');
    
    // Drop constraint
    await pool.query('ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_users_subdomain_format');
    
    // Drop column
    await pool.query('ALTER TABLE users DROP COLUMN IF EXISTS subdomain');
    
    await pool.query('COMMIT');
    console.log('✅ Rollback completed successfully');
    
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('❌ Rollback failed:', error);
    throw error;
  }
}

// Command line interface
if (require.main === module) {
  const command = process.argv[2];
  
  if (command === 'rollback') {
    rollbackMigration()
      .then(() => process.exit(0))
      .catch((error) => {
        console.error('Rollback failed:', error);
        process.exit(1);
      });
  } else {
    runMigration()
      .then(() => process.exit(0))
      .catch((error) => {
        console.error('Migration failed:', error);
        process.exit(1);
      });
  }
}

module.exports = {
  runMigration,
  rollbackMigration
};
