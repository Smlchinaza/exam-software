// run-super-admin-schema.js
// Node.js script to run the super admin schema using the existing database connection

const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

const pool = require('./db/postgres');

async function runSchema() {
  try {
    console.log('🚀 Running Super Admin Schema...');
    
    // Read the schema file
    const schemaPath = path.join(__dirname, 'sql', 'super-admin-schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    console.log('📁 Schema file loaded successfully');
    
    // Connect to database and run schema
    await pool.query(schema);
    
    console.log('✅ Super Admin schema executed successfully!');
    console.log('\n📊 Tables created:');
    console.log('   • super_admins');
    console.log('   • school_registration_requests');
    console.log('   • admin_approval_audit');
    console.log('   • school_metrics');
    console.log('\n🔧 Functions created:');
    console.log('   • create_registration_request()');
    console.log('   • approve_registration_request()');
    console.log('   • reject_registration_request()');
    console.log('\n🎉 Super Admin database setup complete!');
    
  } catch (error) {
    console.error('❌ Error running schema:', error.message);
    console.error('\n💡 Possible solutions:');
    console.log('   • Check if tables already exist (ignore if they do)');
    console.log('   • Verify database connection in .env file');
    console.log('   • Make sure PostgreSQL is running');
  } finally {
    // Close the pool
    await pool.end();
    process.exit(0);
  }
}

// Run the schema
runSchema();
