// setup-local-postgres.js
// Script to help set up local PostgreSQL for the exam software

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('=== Local PostgreSQL Setup ===\n');

// Check if PostgreSQL is installed and running
function checkPostgreSQL() {
    return new Promise((resolve) => {
        console.log('🔍 Checking PostgreSQL installation...');
        
        // Try to connect to PostgreSQL
        exec('psql --version', (error, stdout, stderr) => {
            if (error) {
                console.log('❌ PostgreSQL is not installed or not in PATH');
                console.log('\n📥 Install PostgreSQL:');
                console.log('1. Download from: https://www.postgresql.org/download/windows/');
                console.log('2. Install with password "postgres" for simplicity');
                console.log('3. Make sure to install the command line tools');
                console.log('4. After installation, restart your computer');
                resolve(false);
            } else {
                console.log('✅ PostgreSQL is installed:', stdout.trim());
                resolve(true);
            }
        });
    });
}

// Check if PostgreSQL service is running
function checkPostgresService() {
    return new Promise((resolve) => {
        console.log('\n🔍 Checking PostgreSQL service...');
        
        exec('pg_isready', (error, stdout, stderr) => {
            if (error) {
                console.log('❌ PostgreSQL service is not running');
                console.log('\n🚀 Start PostgreSQL service:');
                console.log('1. Open Services (services.msc)');
                console.log('2. Find "postgresql-x64-XX" service');
                console.log('3. Right-click and select "Start"');
                console.log('4. Or run: net start postgresql-x64-XX');
                resolve(false);
            } else {
                console.log('✅ PostgreSQL service is running');
                resolve(true);
            }
        });
    });
}

// Create the database
function createDatabase() {
    return new Promise((resolve) => {
        console.log('\n🗄️  Creating exam_db database...');
        
        exec('createdb exam_db', (error, stdout, stderr) => {
            if (error) {
                if (stderr.includes('already exists')) {
                    console.log('✅ Database exam_db already exists');
                    resolve(true);
                } else {
                    console.log('❌ Failed to create database:', error.message);
                    console.log('\n🔧 Try creating manually:');
                    console.log('1. Open psql: psql -U postgres');
                    console.log('2. Run: CREATE DATABASE exam_db;');
                    console.log('3. Type \\q to exit');
                    resolve(false);
                }
            } else {
                console.log('✅ Database exam_db created successfully');
                resolve(true);
            }
        });
    });
}

// Test connection
function testConnection() {
    return new Promise((resolve) => {
        console.log('\n🔗 Testing database connection...');
        
        // Load environment variables
        require('dotenv').config();
        
        const pool = require('./server/db/postgres');
        
        pool.query('SELECT NOW()')
            .then(result => {
                console.log('✅ Database connection successful!');
                console.log('   Time:', result.rows[0].now);
                resolve(true);
            })
            .catch(err => {
                console.log('❌ Connection failed:', err.message);
                console.log('\n🔧 Check your PostgreSQL setup:');
                console.log('1. PostgreSQL service is running');
                console.log('2. User "postgres" exists with password "postgres"');
                console.log('3. Database "exam_db" exists');
                resolve(false);
            })
            .finally(() => {
                pool.end();
            });
    });
}

// Update .env file with correct settings
function updateEnvFile() {
    console.log('\n📝 Updating .env file...');
    
    const envContent = `# Environment Variables for Exam Software

# Database Configuration - Local PostgreSQL
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/exam_db

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRES_IN=7d

# Server Configuration
PORT=5000
NODE_ENV=development

# CORS Configuration (optional)
CLIENT_URL=http://localhost:3000
`;
    
    fs.writeFileSync('.env', envContent);
    console.log('✅ .env file updated with local PostgreSQL settings');
}

// Main setup function
async function setupPostgreSQL() {
    try {
        const pgInstalled = await checkPostgreSQL();
        if (!pgInstalled) {
            console.log('\n❌ Please install PostgreSQL first and run this script again');
            return;
        }
        
        const pgRunning = await checkPostgresService();
        if (!pgRunning) {
            console.log('\n❌ Please start PostgreSQL service and run this script again');
            return;
        }
        
        updateEnvFile();
        await createDatabase();
        const connectionWorks = await testConnection();
        
        if (connectionWorks) {
            console.log('\n🎉 PostgreSQL setup complete!');
            console.log('\n🚀 Now run the migration:');
            console.log('   node setup-database.js');
        } else {
            console.log('\n❌ Setup failed. Please check the errors above.');
        }
        
    } catch (error) {
        console.error('❌ Setup error:', error.message);
    }
}

// Run the setup
setupPostgreSQL();
