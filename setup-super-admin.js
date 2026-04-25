// setup-super-admin.js
// Utility script to set up the first super admin user
// Run this script after creating your first user account

const fetch = require('node-fetch');

async function setupSuperAdmin() {
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const question = (prompt) => {
    return new Promise((resolve) => {
      rl.question(prompt, resolve);
    });
  };

  try {
    console.log('🚀 Super Admin Setup Utility');
    console.log('============================\n');

    // Get user input
    const email = await question('Enter the email of the user to promote to super admin: ');
    let serverUrl = await question('Enter server URL (default: http://localhost:5000): ');
if (!serverUrl) {
  serverUrl = 'http://localhost:5000';
}
// Ensure URL has protocol
if (!serverUrl.startsWith('http://') && !serverUrl.startsWith('https://')) {
  serverUrl = 'http://' + serverUrl;
}

    if (!email) {
      console.log('❌ Email is required');
      rl.close();
      return;
    }

    console.log(`\n📧 Promoting user ${email} to super admin...`);

    // Make the API call
    const response = await fetch(`${serverUrl}/api/auth/promote-super-admin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: email,
        permissions: JSON.stringify({
          can_approve_schools: true,
          can_manage_admins: true,
          can_view_metrics: true,
          can_manage_system: true
        })
      })
    });

    const data = await response.json();

    if (response.ok) {
      console.log('✅ Success! User has been promoted to super admin.');
      console.log('\n👤 User Details:');
      console.log(`   Name: ${data.user.firstName} ${data.user.lastName}`);
      console.log(`   Email: ${data.user.email}`);
      console.log(`   Role: ${data.user.role}`);
      console.log(`   ID: ${data.user.id}`);
      
      console.log('\n🔐 Next Steps:');
      console.log('1. The user can now login at /super-admin/login');
      console.log('2. They will have access to the Super Admin Dashboard');
      console.log('3. They can review and approve school registration requests');
      
    } else {
      console.log('❌ Error:', data.error);
      if (response.status === 404) {
        console.log('💡 Make sure the user exists in the system first');
      } else if (response.status === 409) {
        console.log('💡 This user is already a super admin');
      }
    }

  } catch (error) {
    console.log('❌ Network error:', error.message);
    console.log('💡 Make sure the server is running and accessible');
  } finally {
    rl.close();
  }
}

// Check if this is being run directly
if (require.main === module) {
  setupSuperAdmin();
}

module.exports = setupSuperAdmin;
