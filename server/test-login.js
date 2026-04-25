// test-login.js
// Test the login credentials directly

require('dotenv').config();
const pool = require('./db/postgres');
const bcryptjs = require('bcryptjs');

async function testLogin() {
  try {
    const email = 'samchuks898@gmail.com';
    const password = 'PeacemakerAdmin';
    
    console.log(`🔐 Testing login for ${email}...`);
    
    // Find the user
    const result = await pool.query(
      `SELECT id, email, password_hash, first_name, last_name, role, school_id, is_active
       FROM users
       WHERE email = $1`,
      [email]
    );

    if (result.rows.length === 0) {
      console.log('❌ User not found');
      return;
    }

    const user = result.rows[0];
    console.log('✅ User found:', user.email, 'Role:', user.role);

    // Check if user is active
    if (!user.is_active) {
      console.log('❌ User account is disabled');
      return;
    }

    // Verify password
    const passwordMatch = await bcryptjs.compare(password, user.password_hash);
    if (!passwordMatch) {
      console.log('❌ Password does not match');
      return;
    }

    console.log('✅ Password matches!');

    // Check if user is a super admin
    let isSuperAdmin = user.role === 'super_admin';
    if (!isSuperAdmin) {
      const superAdminCheck = await pool.query(
        `SELECT id FROM super_admins WHERE user_id = $1 AND is_active = true`,
        [user.id]
      );
      isSuperAdmin = superAdminCheck.rows.length > 0;
    }

    console.log('✅ Super Admin status:', isSuperAdmin);

    if (!isSuperAdmin) {
      console.log('❌ User is not a super admin');
      return;
    }

    console.log('🎉 Login test successful! User can access Super Admin dashboard');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

testLogin();
