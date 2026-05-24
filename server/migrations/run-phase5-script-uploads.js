const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '..', '.env') });
const fs = require('fs');
const pool = require('../db/postgres');

const migration = {
  name: 'Script Uploads Table',
  file: 'phase5-script-uploads.sql',
  description: 'Create script_uploads table for teacher and school-admin upload review workflow'
};

async function createMigrationTracking() {
  const query = `
    CREATE TABLE IF NOT EXISTS migration_history (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      migration_name text NOT NULL,
      migration_file text NOT NULL,
      executed_at timestamptz NOT NULL DEFAULT now(),
      success boolean NOT NULL,
      error_message text,
      execution_time_ms integer,
      UNIQUE (migration_name)
    );

    CREATE INDEX IF NOT EXISTS idx_migration_history_name ON migration_history (migration_name);
    CREATE INDEX IF NOT EXISTS idx_migration_history_executed ON migration_history (executed_at DESC);
  `;

  await pool.query(query);
}

async function isMigrationExecuted(name) {
  const result = await pool.query(
    'SELECT success, executed_at FROM migration_history WHERE migration_name = $1',
    [name]
  );
  return result.rows[0] || null;
}

async function recordMigration(success, errorMessage = null, executionTimeMs = 0) {
  await pool.query(
    `INSERT INTO migration_history (migration_name, migration_file, success, error_message, execution_time_ms)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (migration_name) DO UPDATE SET
       success = EXCLUDED.success,
       error_message = EXCLUDED.error_message,
       execution_time_ms = EXCLUDED.execution_time_ms,
       executed_at = NOW()`,
    [migration.name, migration.file, success, errorMessage, executionTimeMs]
  );
}

async function executeMigration(force = false) {
  await createMigrationTracking();

  if (!force) {
    const executed = await isMigrationExecuted(migration.name);
    if (executed && executed.success) {
      console.log(`⏭️  Skipping ${migration.name} (already executed at ${executed.executed_at})`);
      return true;
    }
  }

  const migrationPath = path.join(__dirname, migration.file);
  if (!fs.existsSync(migrationPath)) {
    throw new Error(`Migration file not found: ${migration.file}`);
  }

  const sql = fs.readFileSync(migrationPath, 'utf8');
  console.log(`
🔄 Executing migration: ${migration.name}`);
  console.log(`📝 Description: ${migration.description}`);

  const start = Date.now();

  try {
    await pool.query('BEGIN');
    await pool.query(sql);
    await pool.query('COMMIT');
    const duration = Date.now() - start;
    await recordMigration(true, null, duration);
    console.log(`✅ Migration applied successfully in ${duration}ms`);
    return true;
  } catch (error) {
    await pool.query('ROLLBACK');
    const duration = Date.now() - start;
    console.error(`❌ Migration failed: ${error.message}`);
    await recordMigration(false, error.message, duration);
    return false;
  }
}

async function getStatus() {
  await createMigrationTracking();
  const result = await pool.query(
    `SELECT migration_name, migration_file, success, executed_at, execution_time_ms, error_message
     FROM migration_history
     WHERE migration_name = $1`,
    [migration.name]
  );

  if (result.rows.length === 0) {
    console.log('No migration history found for', migration.name);
    return;
  }

  const row = result.rows[0];
  console.log(`Migration: ${row.migration_name}`);
  console.log(`File: ${row.migration_file}`);
  console.log(`Status: ${row.success ? '✅ Success' : '❌ Failed'}`);
  console.log(`Executed At: ${row.executed_at}`);
  console.log(`Duration: ${row.execution_time_ms || 'N/A'}ms`);
  if (row.error_message) {
    console.log(`Error: ${row.error_message}`);
  }
}

if (require.main === module) {
  const command = process.argv[2];
  const force = process.argv.includes('--force');

  switch (command) {
    case 'run':
      executeMigration(force)
        .then(success => process.exit(success ? 0 : 1))
        .catch(err => {
          console.error('Migration execution error:', err);
          process.exit(1);
        });
      break;
    case 'status':
      getStatus()
        .then(() => process.exit(0))
        .catch(err => {
          console.error('Status check error:', err);
          process.exit(1);
        });
      break;
    default:
      console.log('Usage: node run-phase5-script-uploads.js run [--force]');
      console.log('       node run-phase5-script-uploads.js status');
      process.exit(1);
  }
}
