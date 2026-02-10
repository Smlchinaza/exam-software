const dotenv = require('dotenv');
dotenv.config();

console.log('=== PostgreSQL Connection Diagnostic ===');
console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);

if (process.env.DATABASE_URL) {
  // Hide sensitive credentials in logs
  const maskedUrl = process.env.DATABASE_URL
    .replace(/\/\/([^:]+):([^@]+)@/, '//****:****@')
    .replace(/password=([^&]+)/, 'password=****');
  console.log('DATABASE_URL (masked):', maskedUrl);
} else {
  console.log('ERROR: DATABASE_URL is not set in environment variables');
  process.exit(1);
}

const { Pool } = require('pg');

// Test connection with detailed error reporting
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 5000, // 5 second timeout for testing
  idleTimeoutMillis: 10000,
  max: 1, // Use single connection for testing
});

console.log('\nTesting PostgreSQL connection...');

async function testConnection() {
  try {
    const client = await pool.connect();
    console.log('✓ Successfully connected to PostgreSQL');
    
    const result = await client.query('SELECT version(), NOW()');
    console.log('✓ Query executed successfully');
    console.log('PostgreSQL version:', result.rows[0].version);
    console.log('Server time:', result.rows[0].now);
    
    client.release();
    await pool.end();
    console.log('✓ Connection closed successfully');
    process.exit(0);
  } catch (error) {
    console.error('✗ PostgreSQL connection failed:');
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('\nPossible causes:');
      console.error('- PostgreSQL server is not running');
      console.error('- Wrong host or port in DATABASE_URL');
      console.error('- Firewall blocking connection');
    } else if (error.code === 'ETIMEDOUT') {
      console.error('\nPossible causes:');
      console.error('- Network connectivity issues');
      console.error('- PostgreSQL server is overloaded');
      console.error('- Connection timeout too low');
    } else if (error.code === '28P01') {
      console.error('\nPossible causes:');
      console.error('- Invalid username or password');
      console.error('- Database user does not have permission');
    }
    
    await pool.end();
    process.exit(1);
  }
}

testConnection();
