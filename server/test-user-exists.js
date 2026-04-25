// test-user-exists.js
// Check if a user exists and create a test user if needed

require('dotenv').config();
const pool = require('./db/postgres');
const bcryptjs = require('bcryptjs');

async function testUserExists() {
  try {
    const email = 'samchuks898@gmail.com';
    
    console.log(`🔍 Checking if user ${email} exists...`);
    
    // Check if user exists
    const userRes = await pool.query(
      `SELECT id, email, first_name, last_name, role FROM users WHERE email = $1`,
      [email]
    );

    if (userRes.rows.length > 0) {
      const user = userRes.rows[0];
      console.log('✅ User found:');
      console.log(`   ID: ${user.id}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Name: ${user.first_name} ${user.last_name}`);
      console.log(`   Role: ${user.role}`);
      
      // Check if already super admin
      const superAdminRes = await pool.query(
        `SELECT id FROM super_admins WHERE user_id = $1`,
        [user.id]
      );
      
      if (superAdminRes.rows.length > 0) {
        console.log('⚠️  User is already a super admin!');
      } else {
        console.log('📝 User can be promoted to super admin');
      }
    } else {
      console.log('❌ User not found');
      console.log('\n💡 Creating test user...');
      
      // Create a test user
      const passwordHash = await bcryptjs.hash('password123', 10);
      
      const newUserRes = await pool.query(
        `INSERT INTO users (email, password_hash, first_name, last_name, role, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, true, NOW(), NOW())
         RETURNING id, email, first_name, last_name, role`,
        [email, passwordHash, 'Test', 'User', 'admin']
      );
      
      const newUser = newUserRes.rows[0];
      console.log('✅ Test user created:');
      console.log(`   ID: ${newUser.id}`);
      console.log(`   Email: ${newUser.email}`);
      console.log(`   Password: password123`);
      console.log(`   Role: ${newUser.role}`);
      console.log('\n📝 User can now be promoted to super admin');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

testUserExists();
