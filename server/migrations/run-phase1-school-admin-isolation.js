// Phase 1 Migration Runner: School Admin Subdomain Isolation
// This script runs all Phase 1 database migrations in the correct order

const fs = require('fs');
const path = require('path');
const pool = require('../db/postgres');

async function runMigration(filePath, description) {
    console.log(`\n🔄 Running: ${description}`);
    console.log(`📁 File: ${path.basename(filePath)}`);
    
    try {
        const sql = fs.readFileSync(filePath, 'utf8');
        await pool.query(sql);
        console.log(`✅ Completed: ${description}`);
        return true;
    } catch (error) {
        console.error(`❌ Failed: ${description}`);
        console.error('Error:', error.message);
        return false;
    }
}

async function runAllPhase1Migrations() {
    console.log('🚀 Starting Phase 1: School Admin Subdomain Isolation Database Migrations');
    console.log('=' .repeat(80));

    const migrations = [
        {
            file: 'phase1-schools-subdomain-enhancement.sql',
            description: 'Schools Subdomain Enhancement'
        },
        {
            file: 'phase1-school-admins-enhancement.sql',
            description: 'School Admins Table Enhancement'
        },
        {
            file: 'phase1-teacher-registrations.sql',
            description: 'Teacher Registration Approval System'
        },
        {
            file: 'phase1-school-admin-permissions.sql',
            description: 'School Admin Permissions Schema'
        }
    ];

    const migrationsDir = __dirname;
    let successCount = 0;
    let failureCount = 0;

    for (const migration of migrations) {
        const filePath = path.join(migrationsDir, migration.file);
        
        // Check if file exists
        if (!fs.existsSync(filePath)) {
            console.error(`❌ Migration file not found: ${migration.file}`);
            failureCount++;
            continue;
        }

        const success = await runMigration(filePath, migration.description);
        if (success) {
            successCount++;
        } else {
            failureCount++;
        }
    }

    console.log('\n' + '=' .repeat(80));
    console.log('📊 Migration Summary:');
    console.log(`✅ Successful: ${successCount}`);
    console.log(`❌ Failed: ${failureCount}`);
    console.log(`📈 Total: ${successCount + failureCount}`);

    if (failureCount === 0) {
        console.log('\n🎉 All Phase 1 migrations completed successfully!');
        console.log('🔒 School admin subdomain isolation is now ready.');
    } else {
        console.log('\n⚠️  Some migrations failed. Please check the errors above.');
        process.exit(1);
    }
}

async function verifyMigration() {
    console.log('\n🔍 Verifying Phase 1 Migration Results...');
    
    try {
        // Check school_admins table
        const adminsResult = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'school_admins' 
            AND table_schema = 'public'
            ORDER BY ordinal_position
        `);
        console.log('\n📋 school_admins table columns:');
        adminsResult.rows.forEach(row => {
            console.log(`  - ${row.column_name}: ${row.data_type}`);
        });

        // Check teacher_registrations table
        const registrationsResult = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'teacher_registrations' 
            AND table_schema = 'public'
            ORDER BY ordinal_position
        `);
        console.log('\n📋 teacher_registrations table columns:');
        registrationsResult.rows.forEach(row => {
            console.log(`  - ${row.column_name}: ${row.data_type}`);
        });

        // Check school_admin_permissions table
        const permissionsResult = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'school_admin_permissions' 
            AND table_schema = 'public'
            ORDER BY ordinal_position
        `);
        console.log('\n📋 school_admin_permissions table columns:');
        permissionsResult.rows.forEach(row => {
            console.log(`  - ${row.column_name}: ${row.data_type}`);
        });

        // Check schools table for subdomain
        const schoolsSubdomainResult = await pool.query(`
            SELECT column_name, data_type, is_nullable 
            FROM information_schema.columns 
            WHERE table_name = 'schools' 
            AND column_name = 'subdomain'
            AND table_schema = 'public'
        `);
        if (schoolsSubdomainResult.rows.length > 0) {
            console.log('\n✅ schools table has subdomain column:');
            console.log(`  - subdomain: ${schoolsSubdomainResult.rows[0].data_type}`);
        }

        // Check views
        const viewsResult = await pool.query(`
            SELECT table_name 
            FROM information_schema.views 
            WHERE table_schema = 'public'
            AND table_name IN ('active_school_admins', 'pending_teacher_registrations', 'school_admin_permission_summary')
        `);
        console.log('\n📋 Views created:');
        viewsResult.rows.forEach(row => {
            console.log(`  - ${row.table_name}`);
        });

        // Check functions
        const functionsResult = await pool.query(`
            SELECT routine_name 
            FROM information_schema.routines 
            WHERE routine_schema = 'public'
            AND routine_name LIKE '%school_admin%' 
            OR routine_name LIKE '%teacher_registration%'
            OR routine_name LIKE '%subdomain%'
        `);
        console.log('\n📋 Functions created:');
        functionsResult.rows.forEach(row => {
            console.log(`  - ${row.routine_name}`);
        });

        console.log('\n✅ Migration verification completed!');
        
    } catch (error) {
        console.error('❌ Verification failed:', error.message);
    }
}

// Main execution
async function main() {
    try {
        await runAllPhase1Migrations();
        await verifyMigration();
        
        console.log('\n🎯 Phase 1 Database Migration Complete!');
        console.log('📝 Next Steps:');
        console.log('  1. Review the migration results above');
        console.log('  2. Update application code to use new schema');
        console.log('  3. Implement Phase 2: Backend API Development');
        console.log('  4. Test the new functionality');
        
    } catch (error) {
        console.error('💥 Migration failed:', error);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

// Run the migration
if (require.main === module) {
    main().catch(console.error);
}

module.exports = { runAllPhase1Migrations, verifyMigration };
