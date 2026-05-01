// Setup Local PostgreSQL for Phase 1 Development
// This script creates a local PostgreSQL database and runs Phase 1 migrations

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Local PostgreSQL configuration
const localConfig = {
    user: 'postgres',
    host: 'localhost',
    port: 5432,
    password: 'password',
    database: 'postgres' // Connect to default database first
};

async function setupLocalDatabase() {
    console.log('🔧 Setting up Local PostgreSQL for Phase 1 Development');
    console.log('=' .repeat(60));

    const pool = new Pool(localConfig);

    try {
        // Test connection to PostgreSQL server
        console.log('🔍 Testing PostgreSQL connection...');
        await pool.query('SELECT NOW()');
        console.log('✅ PostgreSQL server connection successful');

        // Create exam_platform database if it doesn't exist
        console.log('📦 Creating exam_platform database...');
        await pool.query('CREATE DATABASE exam_platform');
        console.log('✅ Database created successfully');

        // Close connection to default database
        await pool.end();

        // Connect to the new database
        const examPool = new Pool({
            ...localConfig,
            database: 'exam_platform'
        });

        console.log('🔗 Connected to exam_platform database');

        // Run Phase 1 migrations
        await runPhase1Migrations(examPool);

        await examPool.end();
        console.log('\n🎉 Local PostgreSQL setup complete!');

    } catch (error) {
        if (error.code === '42P04') {
            console.log('✅ Database exam_platform already exists');
            
            // Connect to existing database and run migrations
            const examPool = new Pool({
                ...localConfig,
                database: 'exam_platform'
            });

            await runPhase1Migrations(examPool);
            await examPool.end();
        } else {
            console.error('❌ Setup failed:', error.message);
            console.log('\n💡 Troubleshooting:');
            console.log('1. Make sure PostgreSQL is installed and running');
            console.log('2. Check that user "postgres" has password "password"');
            console.log('3. Verify PostgreSQL is running on localhost:5432');
            console.log('4. Try running: psql -U postgres -h localhost');
        }
    }
}

async function runPhase1Migrations(pool) {
    console.log('\n🚀 Running Phase 1 Migrations...');
    
    const migrations = [
        'phase1-schools-subdomain-enhancement.sql',
        'phase1-school-admins-enhancement.sql', 
        'phase1-teacher-registrations.sql',
        'phase1-school-admin-permissions.sql'
    ];

    for (const migrationFile of migrations) {
        console.log(`\n📄 Running ${migrationFile}...`);
        
        try {
            const migrationPath = path.join(__dirname, migrationFile);
            const sql = fs.readFileSync(migrationPath, 'utf8');
            
            await pool.query(sql);
            console.log(`✅ ${migrationFile} completed successfully`);
            
        } catch (error) {
            console.error(`❌ ${migrationFile} failed:`, error.message);
            throw error;
        }
    }

    // Verify the setup
    await verifySetup(pool);
}

async function verifySetup(pool) {
    console.log('\n🔍 Verifying Phase 1 Setup...');
    
    try {
        // Check tables
        const tables = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN ('school_admins', 'teacher_registrations', 'school_admin_permissions')
            ORDER BY table_name
        `);
        
        console.log('\n📋 Tables created:');
        tables.rows.forEach(row => {
            console.log(`  ✅ ${row.table_name}`);
        });

        // Check schools table for subdomain column
        const subdomainCheck = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'schools' 
            AND column_name = 'subdomain'
        `);
        
        if (subdomainCheck.rows.length > 0) {
            console.log('  ✅ schools.subdomain column added');
        }

        // Check views
        const views = await pool.query(`
            SELECT table_name 
            FROM information_schema.views 
            WHERE table_schema = 'public'
            AND table_name IN ('active_school_admins', 'pending_teacher_registrations', 'school_admin_permission_summary')
        `);
        
        console.log('\n📋 Views created:');
        views.rows.forEach(row => {
            console.log(`  ✅ ${row.table_name}`);
        });

        console.log('\n✅ Phase 1 verification complete!');

    } catch (error) {
        console.error('❌ Verification failed:', error.message);
    }
}

// Run the setup
if (require.main === module) {
    setupLocalDatabase().catch(console.error);
}

module.exports = { setupLocalDatabase, runPhase1Migrations };
