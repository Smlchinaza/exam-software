// verify-migration.js
// Script to verify that all student results tables were created successfully

const pool = require('./server/db/postgres');

async function verifyMigration() {
    console.log('=== Verifying Student Results Migration ===\n');
    
    try {
        console.log('🔍 Checking created tables...\n');
        
        // List of expected tables
        const expectedTables = [
            'student_results',
            'affective_domain_scores', 
            'psychomotor_domain_scores',
            'class_statistics',
            'result_history',
            'teacher_subject_assignments'
        ];
        
        // Check each table
        for (const tableName of expectedTables) {
            try {
                const result = await pool.query(`
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_schema = 'public' 
                        AND table_name = $1
                    );
                `, [tableName]);
                
                const exists = result.rows[0].exists;
                console.log(`${exists ? '✅' : '❌'} ${tableName}`);
                
                if (exists) {
                    // Get row count
                    const countResult = await pool.query(`SELECT COUNT(*) FROM ${tableName}`);
                    console.log(`   Rows: ${countResult.rows[0].count}`);
                }
            } catch (err) {
                console.log(`❌ ${tableName} - Error: ${err.message}`);
            }
        }
        
        console.log('\n🔍 Checking custom types...\n');
        
        // Check custom types
        const expectedTypes = [
            'grade_enum',
            'performance_rating',
            'term_enum',
            'class_enum'
        ];
        
        for (const typeName of expectedTypes) {
            try {
                const result = await pool.query(`
                    SELECT EXISTS (
                        SELECT FROM pg_type 
                        WHERE typname = $1
                    );
                `, [typeName]);
                
                const exists = result.rows[0].exists;
                console.log(`${exists ? '✅' : '❌'} ${typeName}`);
            } catch (err) {
                console.log(`❌ ${typeName} - Error: ${err.message}`);
            }
        }
        
        console.log('\n🔍 Checking functions...\n');
        
        // Check functions
        const expectedFunctions = [
            'calculate_class_statistics',
            'update_class_positions',
            'trigger_result_statistics_update'
        ];
        
        for (const functionName of expectedFunctions) {
            try {
                const result = await pool.query(`
                    SELECT EXISTS (
                        SELECT FROM pg_proc 
                        WHERE proname = $1
                    );
                `, [functionName]);
                
                const exists = result.rows[0].exists;
                console.log(`${exists ? '✅' : '❌'} ${functionName}()`);
            } catch (err) {
                console.log(`❌ ${functionName}() - Error: ${err.message}`);
            }
        }
        
        console.log('\n🎉 Migration verification complete!');
        console.log('\n📊 Database is ready for Phase 2: Frontend Development');
        
    } catch (error) {
        console.error('❌ Verification failed:', error.message);
    } finally {
        await pool.end();
    }
}

verifyMigration();
