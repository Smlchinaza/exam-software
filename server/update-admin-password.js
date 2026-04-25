// update-admin-password.js
// Update password for super admin account

require('dotenv').config();
const pool = require('./db/postgres');
const bcryptjs = require('bcryptjs');

async function updateAdminPassword() {
  try {
    const email = 'samchuks898@gmail.com';
    const newPassword = 'PeacemakerAdmin';
    
    console.log(`🔐 Updating password for ${email}...`);
    
    // Hash the new password
    const passwordHash = await bcryptjs.hash(newPassword, 10);
    
    // Update the password in the database
    const result = await pool.query(
      `UPDATE users 
       SET password_hash = $1, updated_at = NOW()
       WHERE email = $2
       RETURNING id, email, first_name, last_name, role`,
      [passwordHash, email]
    );

    if (result.rows.length === 0) {
      console.log('❌ User not found');
      return;
    }

    const user = result.rows[0];
    
    console.log('✅ Password updated successfully!');
    console.log('\n👤 User Details:');
    console.log(`   ID: ${user.id}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Name: ${user.first_name} ${user.last_name}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   New Password: ${newPassword}`);
    
    console.log('\n🔐 Login Credentials:');
    console.log(`   URL: http://localhost:3000/super-admin/login`);
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${newPassword}`);
    
  } catch (error) {
    console.error('❌ Error updating password:', error.message);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

updateAdminPassword();
