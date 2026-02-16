// migrations/run-student-results-migration.js
// Node.js script to run the student results database migration

const pool = require('../db/postgres');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  console.log('Starting Phase 1: Student Results Database Migration...');
  
  try {
    // Read the SQL schema file
    const schemaPath = path.join(__dirname, '../sql/student-results-schema.sql');
    const schemaSQL = fs.readFileSync(schemaPath, 'utf8');
    
    console.log('Executing schema extensions...');
    
    // Execute the schema migration
    await pool.query(schemaSQL);
    
    console.log('✓ Phase 1 migration completed successfully!');
    console.log('');
    console.log('Created tables:');
    console.log('  - student_results');
    console.log('  - affective_domain_scores'); 
    console.log('  - psychomotor_domain_scores');
    console.log('  - class_statistics');
    console.log('  - result_history');
    console.log('  - teacher_subject_assignments');
    console.log('');
    console.log('Created functions:');
    console.log('  - calculate_class_statistics()');
    console.log('  - update_class_positions()');
    console.log('  - trigger_result_statistics_update()');
    console.log('');
    console.log('Created indexes and triggers for automatic calculations');
    
  } catch (error) {
    console.error('✗ Migration failed:', error.message);
    console.error('Please check the error above and fix any issues.');
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the migration if this file is executed directly
if (require.main === module) {
  runMigration();
}

module.exports = runMigration;
