// database-setup-helper.js
// Helper script to diagnose and fix database connection issues

const fs = require('fs');
const path = require('path');

console.log('=== Database Connection Helper ===\n');

// Check current .env configuration
require('dotenv').config();

console.log('Current DATABASE_URL configuration:');
console.log('🔗', process.env.DATABASE_URL || 'Not set');
console.log();

// Parse DATABASE_URL to show components
if (process.env.DATABASE_URL) {
    try {
        const url = new URL(process.env.DATABASE_URL);
        console.log('Database connection details:');
        console.log('📍 Host:', url.hostname);
        console.log('👤 User:', url.username);
        console.log('🔌 Port:', url.port);
        console.log('🗄️  Database:', url.pathname.substring(1));
        console.log('🔐 Password:', url.password ? '***' : 'Not set');
        console.log();
        
        console.log('🔧 Common PostgreSQL setups:');
        console.log();
        console.log('1. Local PostgreSQL (default):');
        console.log('   postgresql://postgres:your_password@localhost:5432/exam_db');
        console.log();
        console.log('2. ElephantSQL (cloud):');
        console.log('   postgresql://user:password@host.db.elephantsql.com:5432/dbname');
        console.log();
        console.log('3. Railway (cloud):');
        console.log('   postgresql://postgres:password@containers-us-west-1.railway.app:5432/railway');
        console.log();
        console.log('4. Supabase (cloud):');
        console.log('   postgresql://postgres:password@db.project.supabase.co:5432/postgres');
        console.log();
        
        console.log('📝 To update your DATABASE_URL:');
        console.log('1. Edit the .env file in this directory');
        console.log('2. Replace the DATABASE_URL line with your correct connection string');
        console.log('3. Save the file and run: node setup-database.js');
        console.log();
        
        console.log('🚀 Quick setup options:');
        console.log();
        console.log('A) Use ElephantSQL (free, easy setup):');
        console.log('   1. Go to https://www.elephantsql.com/');
        console.log('   2. Create a free account and database');
        console.log('   3. Copy the connection string');
        console.log('   4. Update your .env file');
        console.log();
        console.log('B) Use Supabase (free, modern):');
        console.log('   1. Go to https://supabase.com/');
        console.log('   2. Create a new project');
        console.log('   3. Go to Settings > Database');
        console.log('   4. Copy the connection string');
        console.log('   5. Update your .env file');
        console.log();
        console.log('C) Install local PostgreSQL:');
        console.log('   1. Install PostgreSQL on your machine');
        console.log('   2. Start the PostgreSQL service');
        console.log('   3. Create a database: createdb exam_db');
        console.log('   4. Update .env with your PostgreSQL credentials');
        
    } catch (err) {
        console.log('❌ Invalid DATABASE_URL format');
        console.log('Please check your DATABASE_URL in .env file');
    }
} else {
    console.log('❌ DATABASE_URL not set');
    console.log('Please edit .env file and set DATABASE_URL');
}
