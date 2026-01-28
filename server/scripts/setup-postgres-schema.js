#!/usr/bin/env node
"use strict";
// setup-postgres-schema.js
// Apply schema to Postgres database

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function main() {
  const pgUrl = process.argv[2] || process.env.DATABASE_URL;
  if (!pgUrl) {
    console.error('Usage: node setup-postgres-schema.js <postgres_url>');
    process.exit(1);
  }

  const client = new Client({ connectionString: pgUrl });
  await client.connect();

  try {
    const schemaFile = path.join(__dirname, '..', 'sql', 'schema-postgres.sql');
    const schema = fs.readFileSync(schemaFile, 'utf8');
    console.log('Applying schema...');
    await client.query(schema);
    console.log('✓ Schema applied successfully.');
  } catch (err) {
    console.error('Error applying schema:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
