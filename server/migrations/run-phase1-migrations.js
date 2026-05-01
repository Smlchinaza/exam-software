// Phase 1 Migration Runner
// Executes all database schema changes for teacher subdomain isolation

const fs = require('fs');
const path = require('path');
const pool = require('../db/postgres');
const SchemaTester = require('./test-phase1-schema');

class Phase1MigrationRunner {
  constructor() {
    this.migrations = [
      {
        name: 'User Subdomain Field Addition',
        file: 'add-user-subdomain-field.sql',
        description: 'Add subdomain field to users table with validation and indexes'
      },
      {
        name: 'File Storage School Isolation',
        file: 'add-file-storage-school-isolation.sql',
        description: 'Add school-based isolation to file storage tables'
      },
      {
        name: 'Performance Optimization Indexes',
        file: 'performance-optimization-indexes.sql',
        description: 'Create optimized indexes for multi-tenant queries'
      }
    ];
  }

  // Read and execute SQL migration file
  async executeMigration(migration) {
    console.log(`\n🔄 Executing: ${migration.name}`);
    console.log(`📝 ${migration.description}`);
    
    try {
      const migrationPath = path.join(__dirname, migration.file);
      
      if (!fs.existsSync(migrationPath)) {
        throw new Error(`Migration file not found: ${migration.file}`);
      }
      
      const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
      
      // Start transaction
      await pool.query('BEGIN');
      
      try {
        // Execute migration
        await pool.query(migrationSQL);
        
        // Commit transaction
        await pool.query('COMMIT');
        
        console.log(`✅ ${migration.name} completed successfully`);
        return true;
        
      } catch (error) {
        // Rollback on error
        await pool.query('ROLLBACK');
        throw error;
      }
      
    } catch (error) {
      console.error(`❌ ${migration.name} failed:`, error.message);
      return false;
    }
  }

  // Create migration tracking table
  async createMigrationTracking() {
    console.log('📋 Setting up migration tracking...');
    
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
      
      CREATE INDEX IF NOT EXISTS idx_migration_history_name ON migration_history(migration_name);
      CREATE INDEX IF NOT EXISTS idx_migration_history_executed ON migration_history(executed_at DESC);
    `;
    
    await pool.query(query);
    console.log('✅ Migration tracking table ready');
  }

  // Check if migration was already executed
  async isMigrationExecuted(migrationName) {
    const query = `
      SELECT success, executed_at 
      FROM migration_history 
      WHERE migration_name = $1
    `;
    
    const result = await pool.query(query, [migrationName]);
    return result.rows[0] || null;
  }

  // Record migration execution
  async recordMigration(migration, success, errorMessage = null, executionTime = 0) {
    const query = `
      INSERT INTO migration_history (
        migration_name, migration_file, success, error_message, execution_time_ms
      ) VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (migration_name) DO UPDATE SET
        success = EXCLUDED.success,
        error_message = EXCLUDED.error_message,
        execution_time_ms = EXCLUDED.execution_time_ms,
        executed_at = NOW()
    `;
    
    await pool.query(query, [
      migration.name,
      migration.file,
      success,
      errorMessage,
      executionTime
    ]);
  }

  // Get migration history
  async getMigrationHistory() {
    const query = `
      SELECT migration_name, success, executed_at, execution_time_ms, error_message
      FROM migration_history
      ORDER BY executed_at DESC
    `;
    
    const result = await pool.query(query);
    return result.rows;
  }

  // Run all Phase 1 migrations
  async runAllMigrations(options = {}) {
    const { force = false, test = false } = options;
    
    console.log('🚀 Starting Phase 1 Database Migrations');
    console.log(`📅 Started at: ${new Date().toISOString()}`);
    
    const startTime = Date.now();
    let successCount = 0;
    let failureCount = 0;
    
    try {
      // Setup migration tracking
      await this.createMigrationTracking();
      
      // Check existing migrations
      const history = await this.getMigrationHistory();
      if (history.length > 0) {
        console.log(`\n📚 Found ${history.length} previous migrations:`);
        history.forEach(record => {
          const status = record.success ? '✅' : '❌';
          console.log(`  ${status} ${record.migration_name} (${record.executed_at})`);
        });
      }
      
      // Execute each migration
      for (const migration of this.migrations) {
        // Check if already executed (unless forced)
        if (!force) {
          const executed = await this.isMigrationExecuted(migration.name);
          if (executed && executed.success) {
            console.log(`⏭️  Skipping ${migration.name} (already executed)`);
            successCount++;
            continue;
          }
        }
        
        // Execute migration
        const migrationStart = Date.now();
        const success = await this.executeMigration(migration);
        const migrationTime = Date.now() - migrationStart;
        
        // Record execution
        await this.recordMigration(
          migration,
          success,
          success ? null : 'Migration execution failed',
          migrationTime
        );
        
        if (success) {
          successCount++;
        } else {
          failureCount++;
          if (!force) {
            console.log('🛑 Stopping migration due to failure. Use --force to continue.');
            break;
          }
        }
      }
      
      const totalTime = Date.now() - startTime;
      
      // Summary
      console.log('\n📊 Migration Summary:');
      console.log(`✅ Successful: ${successCount}`);
      console.log(`❌ Failed: ${failureCount}`);
      console.log(`⏱️  Total time: ${totalTime}ms`);
      
      // Run tests if requested
      if (test && successCount === this.migrations.length) {
        console.log('\n🧪 Running schema validation tests...');
        const tester = new SchemaTester();
        const testsPassed = await tester.runAllTests();
        
        if (!testsPassed) {
          console.log('⚠️  Schema tests failed, but migrations completed');
        }
      }
      
      return failureCount === 0;
      
    } catch (error) {
      console.error('💥 Migration runner failed:', error);
      return false;
    }
  }

  // Rollback all Phase 1 migrations
  async rollbackAll() {
    console.log('🔄 Rolling back Phase 1 migrations...');
    
    // Reverse order for rollback
    const reversedMigrations = [...this.migrations].reverse();
    
    for (const migration of reversedMigrations) {
      console.log(`\n🔄 Rolling back: ${migration.name}`);
      
      try {
        await pool.query('BEGIN');
        
        // Drop indexes and constraints in reverse order
        if (migration.file === 'performance-optimization-indexes.sql') {
          // Drop performance indexes
          await pool.query('DROP INDEX IF EXISTS idx_users_email_school');
          await pool.query('DROP INDEX IF EXISTS idx_users_subdomain_active');
          await pool.query('DROP INDEX IF EXISTS idx_schools_domain_lookup');
          await pool.query('DROP INDEX IF EXISTS idx_exams_school_published');
          await pool.query('DROP INDEX IF EXISTS idx_file_storage_school_type_date');
        }
        
        if (migration.file === 'add-file-storage-school-isolation.sql') {
          // Drop file storage tables
          await pool.query('DROP TABLE IF EXISTS file_storage CASCADE');
          await pool.query('DROP TABLE IF EXISTS file_directories CASCADE');
        }
        
        if (migration.file === 'add-user-subdomain-field.sql') {
          // Drop user subdomain field
          await pool.query('ALTER TABLE users DROP COLUMN IF EXISTS subdomain');
        }
        
        await pool.query('COMMIT');
        console.log(`✅ ${migration.name} rolled back`);
        
      } catch (error) {
        await pool.query('ROLLBACK');
        console.error(`❌ ${migration.name} rollback failed:`, error.message);
      }
    }
    
    console.log('\n✅ Rollback completed');
  }

  // Get migration status
  async getStatus() {
    console.log('📊 Migration Status:');
    
    const history = await this.getMigrationHistory();
    
    if (history.length === 0) {
      console.log('No migrations have been executed');
      return;
    }
    
    console.log('\nMigration History:');
    history.forEach(record => {
      const status = record.success ? '✅' : '❌';
      const time = record.execution_time_ms ? `${record.execution_time_ms}ms` : 'N/A';
      console.log(`  ${status} ${record.migration_name} (${record.executed_at}) - ${time}`);
      if (record.error_message) {
        console.log(`    Error: ${record.error_message}`);
      }
    });
    
    const successCount = history.filter(r => r.success).length;
    const failureCount = history.filter(r => !r.success).length;
    
    console.log(`\nSummary: ${successCount} successful, ${failureCount} failed`);
  }
}

// Command line interface
if (require.main === module) {
  const runner = new Phase1MigrationRunner();
  const command = process.argv[2];
  const options = {
    force: process.argv.includes('--force'),
    test: process.argv.includes('--test')
  };
  
  switch (command) {
    case 'run':
      runner.runAllMigrations(options)
        .then(success => process.exit(success ? 0 : 1))
        .catch(error => {
          console.error('Migration failed:', error);
          process.exit(1);
        });
      break;
      
    case 'rollback':
      runner.rollbackAll()
        .then(() => process.exit(0))
        .catch(error => {
          console.error('Rollback failed:', error);
          process.exit(1);
        });
      break;
      
    case 'status':
      runner.getStatus()
        .then(() => process.exit(0))
        .catch(error => {
          console.error('Status check failed:', error);
          process.exit(1);
        });
      break;
      
    case 'test':
      const tester = new SchemaTester();
      tester.runAllTests()
        .then(success => process.exit(success ? 0 : 1))
        .catch(error => {
          console.error('Tests failed:', error);
          process.exit(1);
        });
      break;
      
    default:
      console.log('Usage:');
      console.log('  node run-phase1-migrations.js run [--force] [--test]');
      console.log('  node run-phase1-migrations.js rollback');
      console.log('  node run-phase1-migrations.js status');
      console.log('  node run-phase1-migrations.js test');
      process.exit(1);
  }
}

module.exports = Phase1MigrationRunner;
