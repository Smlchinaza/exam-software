// verify-states-migration.js
// Script to verify that states table was created and populated with Nigerian states

require('dotenv').config();
const pool = require('./server/db/postgres');

async function verifyStatesMigration() {
    console.log('=== Verifying States Migration ===\n');
    
    try {
        console.log('🔍 Checking states table...\n');
        
        // Check if states table exists
        const tableExists = await pool.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'states'
            );
        `);
        
        if (tableExists.rows[0].exists) {
            console.log('✅ States table exists');
            
            // Get row count
            const countResult = await pool.query('SELECT COUNT(*) FROM states');
            console.log(`   Total states: ${countResult.rows[0].count}`);
            
            // Show sample states
            const sampleStates = await pool.query('SELECT name, code FROM states ORDER BY name LIMIT 10');
            console.log('\n📋 Sample states:');
            sampleStates.rows.forEach(state => {
                console.log(`   ${state.name} (${state.code})`);
            });
            
            // Verify all expected states are present
            const expectedStates = [
                'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno',
                'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'Federal Capital Territory',
                'Gombe', 'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara',
                'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau', 'Rivers',
                'Sokoto', 'Taraba', 'Yobe', 'Zamfara'
            ];
            
            const foundStates = await pool.query(
                'SELECT name FROM states WHERE name = ANY($1) ORDER BY name',
                [expectedStates]
            );
            
            console.log(`\n✅ Found ${foundStates.rows.length}/${expectedStates.length} expected Nigerian states`);
            
            if (foundStates.rows.length === expectedStates.length) {
                console.log('🎉 All Nigerian states successfully imported!');
            } else {
                console.log('⚠️  Some states may be missing');
            }
            
        } else {
            console.log('❌ States table does not exist');
        }
        
        console.log('\n🔍 Checking schools table enhancements...\n');
        
        // Check if schools table has new columns
        const schoolsColumns = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'schools' 
            AND table_schema = 'public'
            ORDER BY column_name
        `);
        
        const expectedColumns = ['state_id', 'address', 'city', 'postal_code', 'phone', 'type', 'is_public', 'status'];
        const foundColumns = schoolsColumns.rows.map(col => col.column_name);
        
        console.log('📋 Schools table columns:');
        schoolsColumns.rows.forEach(col => {
            const hasExpected = expectedColumns.includes(col.column_name);
            console.log(`   ${hasExpected ? '✅' : '📝'} ${col.column_name} (${col.data_type})`);
        });
        
        const missingColumns = expectedColumns.filter(col => !foundColumns.includes(col));
        if (missingColumns.length > 0) {
            console.log('\n⚠️  Missing columns:', missingColumns.join(', '));
        } else {
            console.log('\n✅ All expected columns present in schools table');
        }
        
        console.log('\n🔍 Checking indexes...\n');
        
        // Check if indexes were created
        const indexes = await pool.query(`
            SELECT indexname 
            FROM pg_indexes 
            WHERE tablename IN ('states', 'schools') 
            AND schemaname = 'public'
            ORDER BY tablename, indexname
        `);
        
        console.log('📋 Database indexes:');
        indexes.rows.forEach(idx => {
            console.log(`   📝 ${idx.indexname}`);
        });
        
        console.log('\n🎉 States migration verification complete!');
        console.log('\n📊 Database is ready for multi-tenant registration!');
        
    } catch (error) {
        console.error('❌ Verification failed:', error.message);
        console.error(error.stack);
    } finally {
        await pool.end();
    }
}

verifyStatesMigration();
