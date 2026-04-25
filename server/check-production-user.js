// check-production-user.js
// Check if the user exists in production database

require('dotenv').config();
const pool = require('./db/postgres');

async function checkUser() {
  try {
    const email = 'samchuks898@gmail.com';
    
    console.log(`🔍 Checking user: ${email}`);
    
    // Find the user
    const result = await pool.query(
      `SELECT id, email, role, is_active, first_name, last_name
       FROM users
       WHERE email = $1`,
      [email]
    );

    if (result.rows.length === 0) {
      console.log('❌ User not found in database');
      return;
    }

    const user = result.rows[0];
    console.log('✅ User found:', {
      id: user.id,
      email: user.email,
      role: user.role,
      isActive: user.is_active,
      name: `${user.first_name} ${user.last_name}`
    });

    // Check super admin table
    const superAdminResult = await pool.query(
      `SELECT id, is_active FROM super_admins WHERE user_id = $1`,
      [user.id]
    );

    console.log('🔐 Super admin records:', superAdminResult.rows);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

checkUser();
