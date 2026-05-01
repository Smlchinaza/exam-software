// Check database for schools and their domains
const { Pool } = require('pg');

// Database connection - adjust these values based on your setup
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'exam_platform'
});

async function checkDatabase() {
  try {
    console.log('🔍 Checking database for schools and domains...\n');

    // Test connection
    await pool.query('SELECT NOW()');
    console.log('✅ Database connection successful');

    // Check schools table structure
    console.log('\n1. Checking schools table structure...');
    const schemaQuery = `
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'schools' 
      ORDER BY ordinal_position
    `;
    const schemaResult = await pool.query(schemaQuery);
    
    console.log('Schools table columns:');
    schemaResult.rows.forEach(col => {
      console.log(`  ${col.column_name}: ${col.data_type} (${col.is_nullable})`);
    });

    // Check for domain column specifically
    const domainColumn = schemaResult.rows.find(col => col.column_name === 'domain');
    if (domainColumn) {
      console.log('✅ Domain column exists');
    } else {
      console.log('❌ Domain column missing from schools table');
    }

    // Check existing schools
    console.log('\n2. Checking existing schools...');
    const schoolsQuery = `
      SELECT id, name, domain, status, is_verified, created_at
      FROM schools 
      ORDER BY created_at DESC 
      LIMIT 10
    `;
    const schoolsResult = await pool.query(schoolsQuery);
    
    console.log(`Found ${schoolsResult.rows.length} recent schools:`);
    schoolsResult.rows.forEach(school => {
      const domainStatus = school.domain ? `✅ ${school.domain}` : '❌ NULL';
      console.log(`  ${school.name}: ${domainStatus} (Status: ${school.status})`);
    });

    // Check schools with NULL domains
    console.log('\n3. Checking schools with NULL domains...');
    const nullDomainQuery = `
      SELECT id, name, status, is_verified, created_at
      FROM schools 
      WHERE domain IS NULL
      ORDER BY created_at DESC
    `;
    const nullDomainResult = await pool.query(nullDomainQuery);
    
    console.log(`Found ${nullDomainResult.rows.length} schools with NULL domains:`);
    nullDomainResult.rows.forEach(school => {
      console.log(`  ${school.name} (Status: ${school.status}, Created: ${school.created_at})`);
    });

    // Check recent registration requests
    console.log('\n4. Checking recent registration requests...');
    const requestsQuery = `
      SELECT srr.id, srr.status, s.name as school_name, s.domain, srr.submitted_at, srr.reviewed_at
      FROM school_registration_requests srr
      JOIN schools s ON srr.school_id = s.id
      ORDER BY srr.submitted_at DESC
      LIMIT 5
    `;
    const requestsResult = await pool.query(requestsQuery);
    
    console.log(`Found ${requestsResult.rows.length} recent registration requests:`);
    requestsResult.rows.forEach(req => {
      const domainStatus = req.domain ? `✅ ${req.domain}` : '❌ NULL';
      console.log(`  ${req.school_name}: ${req.status} - ${domainStatus}`);
      console.log(`    Submitted: ${req.submitted_at}, Reviewed: ${req.reviewed_at || 'Not reviewed'}`);
    });

    // Check audit log for recent approvals
    console.log('\n5. Checking audit log for recent approvals...');
    const auditQuery = `
      SELECT aaa.*, s.name as school_name
      FROM admin_approval_audit aaa
      JOIN schools s ON aaa.school_id = s.id
      WHERE aaa.action = 'approved'
      ORDER BY aaa.performed_at DESC
      LIMIT 5
    `;
    const auditResult = await pool.query(auditQuery);
    
    console.log(`Found ${auditResult.rows.length} recent approvals in audit log:`);
    auditResult.rows.forEach(audit => {
      const data = JSON.parse(audit.additional_data || '{}');
      console.log(`  ${audit.school_name}: Approved by ${audit.performed_by} at ${audit.performed_at}`);
      console.log(`    Domain assigned: ${data.domain_assigned || 'Not recorded'}`);
      console.log(`    Domain generated: ${data.domain_generated || 'Unknown'}`);
    });

  } catch (error) {
    console.error('❌ Database check failed:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Database connection refused. Please check:');
      console.log('   - PostgreSQL is running');
      console.log('   - Connection details are correct');
      console.log('   - Database exists');
    }
  } finally {
    await pool.end();
  }
}

// Run the check
checkDatabase();
