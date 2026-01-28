// db/postgres.js
// PostgreSQL connection pool for multi-tenant app

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  max: 20, // max connections in pool
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

// Test connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('PostgreSQL connection failed:', err);
  } else {
    console.log('✓ PostgreSQL connected:', res.rows[0].now);
  }
});

module.exports = pool;
