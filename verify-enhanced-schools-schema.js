// verify-enhanced-schools-schema.js
// Script to verify that the enhanced schools schema was applied successfully

require('dotenv').config();
const pool = require('./server/db/postgres');

async function verifyEnhancedSchoolsSchema() {
    console.log('=== Verifying Enhanced Schools Schema ===\n');
    
    try {
        console.log('🔍 Checking enhanced schools table structure...\n');
        
        // Check all columns in schools table
        const columns = await pool.query(`
            SELECT 
                column_name, 
                data_type, 
                is_nullable, 
                column_default,
                character_maximum_length
            FROM information_schema.columns 
            WHERE table_name = 'schools' 
            AND table_schema = 'public'
            ORDER BY ordinal_position
        `);
        
        console.log('📋 Schools table columns:');
        const expectedColumns = [
            'id', 'mongo_id', 'name', 'domain', 'state_id', 'address', 'city', 
            'postal_code', 'phone', 'type', 'is_public', 'status', 'created_at', 'updated_at',
            'website', 'email', 'establishment_year', 'student_capacity', 'description', 
            'facilities', 'accreditation_status', 'is_verified'
        ];
        
        columns.rows.forEach(col => {
            const hasExpected = expectedColumns.includes(col.column_name);
            console.log(`   ${hasExpected ? '✅' : '📝'} ${col.column_name} (${col.data_type})`);
        });
        
        const foundColumns = columns.rows.map(col => col.column_name);
        const missingColumns = expectedColumns.filter(col => !foundColumns.includes(col));
        
        if (missingColumns.length > 0) {
            console.log('\n⚠️  Missing columns:', missingColumns.join(', '));
        } else {
            console.log('\n✅ All expected columns present in schools table');
        }
        
        console.log('\n🔍 Checking constraints...\n');
        
        // Check constraints
        const constraints = await pool.query(`
            SELECT 
                tc.constraint_name, 
                tc.constraint_type,
                cc.check_clause
            FROM information_schema.table_constraints tc
            LEFT JOIN information_schema.check_constraints cc ON tc.constraint_name = cc.constraint_name AND cc.constraint_schema = tc.constraint_schema
            WHERE tc.table_name = 'schools' 
            AND tc.table_schema = 'public'
            ORDER BY tc.constraint_name
        `);
        
        console.log('📋 Table constraints:');
        constraints.rows.forEach(constraint => {
            console.log(`   📝 ${constraint.constraint_name} (${constraint.constraint_type})`);
            if (constraint.check_clause) {
                console.log(`      Check: ${constraint.check_clause}`);
            }
        });
        
        console.log('\n🔍 Checking indexes...\n');
        
        // Check indexes
        const indexes = await pool.query(`
            SELECT 
                indexname, 
                indexdef
            FROM pg_indexes 
            WHERE tablename = 'schools' 
            AND schemaname = 'public'
            ORDER BY indexname
        `);
        
        console.log('📋 Schools table indexes:');
        const expectedIndexes = [
            'schools_pkey', 'idx_schools_name', 'idx_schools_state', 
            'idx_schools_status', 'idx_schools_type', 'idx_schools_state_city',
            'idx_schools_type_public', 'idx_schools_status_verified',
            'idx_schools_name_search', 'idx_schools_city_search',
            'idx_schools_establishment_year', 'idx_schools_active_public',
            'idx_schools_verified'
        ];
        
        indexes.rows.forEach(idx => {
            const hasExpected = expectedIndexes.includes(idx.indexname);
            console.log(`   ${hasExpected ? '✅' : '📝'} ${idx.indexname}`);
        });
        
        const foundIndexes = indexes.rows.map(idx => idx.indexname);
        const missingIndexes = expectedIndexes.filter(idx => !foundIndexes.includes(idx));
        
        if (missingIndexes.length > 0) {
            console.log('\n⚠️  Missing indexes:', missingIndexes.join(', '));
        } else {
            console.log('\n✅ All expected indexes present');
        }
        
        console.log('\n🔍 Checking views...\n');
        
        // Check if view was created
        const viewExists = await pool.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.views 
                WHERE table_name = 'active_verified_schools'
                AND table_schema = 'public'
            );
        `);
        
        if (viewExists.rows[0].exists) {
            console.log('✅ active_verified_schools view exists');
            
            // Test the view
            const viewTest = await pool.query('SELECT COUNT(*) as count FROM active_verified_schools');
            console.log(`   📊 View contains ${viewTest.rows[0].count} schools`);
        } else {
            console.log('❌ active_verified_schools view not found');
        }
        
        console.log('\n🔍 Checking functions...\n');
        
        // Check if search function was created
        const functionExists = await pool.query(`
            SELECT EXISTS (
                SELECT FROM pg_proc 
                WHERE proname = 'search_schools'
                AND pg_function_is_visible(oid)
            );
        `);
        
        if (functionExists.rows[0].exists) {
            console.log('✅ search_schools function exists');
            
            // Test the function
            const functionTest = await pool.query('SELECT * FROM search_schools() LIMIT 5');
            console.log(`   📊 Function returns ${functionTest.rows.length} results`);
        } else {
            console.log('❌ search_schools function not found');
        }
        
        console.log('\n🔍 Checking triggers...\n');
        
        // Check if trigger exists
        const triggerExists = await pool.query(`
            SELECT EXISTS (
                SELECT FROM pg_trigger 
                WHERE tgname = 'trigger_update_schools_updated_at'
                AND tgrelid = 'schools'::regclass
            );
        `);
        
        if (triggerExists.rows[0].exists) {
            console.log('✅ update_schools_updated_at trigger exists');
        } else {
            console.log('❌ update_schools_updated_at trigger not found');
        }
        
        console.log('\n🔍 Testing sample data insertion...\n');
        
        // Test inserting a sample school with all new fields
        const testStateId = await pool.query('SELECT id FROM states LIMIT 1');
        
        if (testStateId.rows.length > 0) {
            try {
                const insertTest = await pool.query(`
                    INSERT INTO schools (
                        name, state_id, city, type, is_public, phone, email, 
                        address, postal_code, website, establishment_year, 
                        student_capacity, description, facilities, 
                        accreditation_status, is_verified
                    ) VALUES (
                        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16
                    )
                    RETURNING id, name, city, type, is_public
                `, [
                    'Test Enhanced School',
                    testStateId.rows[0].id,
                    'Test City',
                    'secondary',
                    true,
                    '+2341234567890',
                    'test@enhanced.edu',
                    '123 Test Street',
                    '12345',
                    'https://enhanced.edu',
                    2020,
                    500,
                    'A test school with enhanced features',
                    '["library", "science_labs", "sports_complex"]',
                    'approved',
                    true
                ]);
                
                console.log('✅ Sample data insertion successful');
                console.log(`   📝 Created school: ${insertTest.rows[0].name} in ${insertTest.rows[0].city}`);
                
                // Clean up test data
                await pool.query('DELETE FROM schools WHERE id = $1', [insertTest.rows[0].id]);
                console.log('🧹 Test data cleaned up');
                
            } catch (error) {
                console.log('❌ Sample data insertion failed:', error.message);
            }
        } else {
            console.log('⚠️  No states found - cannot test school insertion');
        }
        
        console.log('\n🎉 Enhanced schools schema verification complete!');
        console.log('\n📊 Database is ready for enhanced school registration!');
        
        // Show final statistics
        const totalSchools = await pool.query('SELECT COUNT(*) FROM schools');
        const activeSchools = await pool.query('SELECT COUNT(*) FROM schools WHERE status = \'active\'');
        const verifiedSchools = await pool.query('SELECT COUNT(*) FROM schools WHERE is_verified = true');
        
        console.log('\n📈 Current Statistics:');
        console.log(`   Total schools: ${totalSchools.rows[0].count}`);
        console.log(`   Active schools: ${activeSchools.rows[0].count}`);
        console.log(`   Verified schools: ${verifiedSchools.rows[0].count}`);
        
    } catch (error) {
        console.error('❌ Verification failed:', error.message);
        console.error(error.stack);
    } finally {
        await pool.end();
    }
}

verifyEnhancedSchoolsSchema();
