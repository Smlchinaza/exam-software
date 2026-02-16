// setup-database.js
// Node.js script to check environment and run migration

const fs = require('fs');
const path = require('path');

console.log('=== Student Results Database Setup ===\n');

// Check if .env file exists
if (!fs.existsSync('.env')) {
    console.log('⚠️  .env file not found. Creating from template...');
    fs.copyFileSync('.env.example', '.env');
    console.log('✅ .env file created from template\n');
    console.log('📝 Please edit .env file and set your DATABASE_URL:');
    console.log('   Example: DATABASE_URL=postgresql://postgres:password@localhost:5432/exam_db\n');
    console.log('After setting up DATABASE_URL, run this script again.');
    process.exit(1);
}

// Load environment variables from .env file
require('dotenv').config();

// Check if DATABASE_URL is set
if (!process.env.DATABASE_URL) {
    console.log('❌ DATABASE_URL is not set in .env file');
    console.log('Please edit .env file and set your DATABASE_URL');
    process.exit(1);
}

console.log('🔗 Database URL: ' + process.env.DATABASE_URL.substring(0, 50) + '...\n');

// Test database connection
console.log('🔍 Testing database connection...');
const pool = require('./server/db/postgres');

pool.query('SELECT NOW()')
    .then(result => {
        console.log('✅ Database connection successful!');
        console.log('   Time:', result.rows[0].now);
        console.log('\n🚀 Running student results migration...\n');
        
        // Run the migration
        const runMigration = require('./server/migrations/run-student-results-migration');
        return runMigration();
    })
    .catch(err => {
        console.error('❌ Database connection failed:', err.message);
        console.log('\nPlease check:');
        console.log('1. PostgreSQL server is running');
        console.log('2. DATABASE_URL is correct in .env file');
        console.log('3. Database exists and user has permissions');
        process.exit(1);
    })
    .finally(() => {
        pool.end();
    });
