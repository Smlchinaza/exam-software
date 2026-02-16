#!/bin/bash
# Database Setup Script for Student Results Migration

echo "=== Student Results Database Setup ==="
echo ""

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "⚠️  .env file not found. Creating from template..."
    cp .env.example .env
    echo "✅ .env file created from template"
    echo ""
    echo "📝 Please edit .env file and set your DATABASE_URL:"
    echo "   Example: DATABASE_URL=postgresql://postgres:password@localhost:5432/exam_db"
    echo ""
    echo "After setting up DATABASE_URL, run this script again."
    exit 1
fi

# Load environment variables
source .env

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL is not set in .env file"
    echo "Please edit .env file and set your DATABASE_URL"
    exit 1
fi

echo "🔗 Database URL: ${DATABASE_URL:0:20}..."
echo ""

# Test database connection
echo "🔍 Testing database connection..."
node -e "
const pool = require('./server/db/postgres');
pool.query('SELECT NOW()')
  .then(result => {
    console.log('✅ Database connection successful!');
    console.log('   Time:', result.rows[0].now);
    pool.end();
  })
  .catch(err => {
    console.error('❌ Database connection failed:', err.message);
    console.log('');
    console.log('Please check:');
    console.log('1. PostgreSQL server is running');
    console.log('2. DATABASE_URL is correct in .env file');
    console.log('3. Database exists and user has permissions');
    process.exit(1);
  });
"

if [ $? -eq 0 ]; then
    echo ""
    echo "🚀 Running student results migration..."
    node server/migrations/run-student-results-migration.js
fi
