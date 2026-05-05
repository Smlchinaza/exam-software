// Test database connection and check if password_reset_logs table exists
const pool = require('./db/postgres');

async function testDatabase() {
  try {
    console.log('Testing database connection...');
    
    // Test basic connection
    const result = await pool.query('SELECT NOW()');
    console.log('✅ Database connected successfully');
    console.log('   Time:', result.rows[0].now);
    
    // Check if password_reset_logs table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'password_reset_logs'
      );
    `);
    
    const tableExists = tableCheck.rows[0].exists;
    console.log('password_reset_logs table exists:', tableExists ? '✅ YES' : '❌ NO');
    
    if (tableExists) {
      // Check table structure
      const tableInfo = await pool.query(`
        SELECT column_name, data_type, is_nullable 
        FROM information_schema.columns 
        WHERE table_name = 'password_reset_logs' 
        ORDER BY ordinal_position;
      `);
      
      console.log('\nTable structure:');
      tableInfo.rows.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type} (${col.is_nullable})`);
      });
    }
    
    // Check if password management columns exist in users table
    const userColumns = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name IN ('password_reset_required', 'is_first_login', 'last_password_change')
      ORDER BY column_name;
    `);
    
    console.log('\nPassword management columns in users table:');
    if (userColumns.rows.length > 0) {
      userColumns.rows.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type}`);
      });
    } else {
      console.log('  ❌ No password management columns found');
    }
    
  } catch (error) {
    console.error('❌ Database test failed:', error.message);
  } finally {
    await pool.end();
  }
}

testDatabase();
