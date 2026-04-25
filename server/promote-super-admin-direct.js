// promote-super-admin-direct.js
// Direct database promotion to super admin

require('dotenv').config();
const pool = require('./db/postgres');

async function promoteToSuperAdmin() {
  const client = await pool.connect();
  
  try {
    const email = 'samchuks898@gmail.com';
    
    console.log(`🚀 Promoting ${email} to Super Admin...`);
    
    await client.query('BEGIN');

    // 1. Find the user
    const userRes = await client.query(
      `SELECT id, email, first_name, last_name, role, is_active
       FROM users
       WHERE email = $1`,
      [email]
    );

    if (userRes.rows.length === 0) {
      throw new Error('User not found');
    }

    const user = userRes.rows[0];

    if (!user.is_active) {
      throw new Error('User account is disabled');
    }

    // 2. Check if already a super admin
    const existingSuperAdminRes = await client.query(
      `SELECT id FROM super_admins WHERE user_id = $1`,
      [user.id]
    );

    if (existingSuperAdminRes.rows.length > 0) {
      throw new Error('User is already a super admin');
    }

    // 3. Add to super_admins table
    await client.query(
      `INSERT INTO super_admins (user_id, permissions, is_active, created_at, updated_at)
       VALUES ($1, $2, true, NOW(), NOW())`,
      [user.id, JSON.stringify({
        can_approve_schools: true,
        can_manage_admins: true,
        can_view_metrics: true,
        can_manage_system: true
      })]
    );

    // 4. Update user role to super_admin
    await client.query(
      `UPDATE users SET role = 'super_admin', updated_at = NOW() WHERE id = $1`,
      [user.id]
    );

    await client.query('COMMIT');

    console.log('✅ Success! User has been promoted to super admin.');
    console.log('\n👤 User Details:');
    console.log(`   Name: ${user.first_name} ${user.last_name}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Role: super_admin`);
    console.log(`   ID: ${user.id}`);
    
    console.log('\n🔐 Next Steps:');
    console.log('1. Go to http://localhost:3000/super-admin/login');
    console.log('2. Login with your email and existing password');
    console.log('3. You will have access to the Super Admin Dashboard');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    await pool.end();
    process.exit(0);
  }
}

promoteToSuperAdmin();
