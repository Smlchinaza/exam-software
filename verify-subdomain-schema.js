/**
 * Verify subdomain implementation schema
 * Checks if domain column exists and has proper indexing
 */

const pool = require('./server/db/postgres');

async function verifySubdomainSchema() {
  console.log('🔍 Verifying subdomain schema implementation...\n');

  try {
    // Check if domain column exists in schools table
    console.log('1. Checking domain column in schools table...');
    const domainCheck = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'schools' AND column_name = 'domain'
    `);

    if (domainCheck.rows.length > 0) {
      console.log('✅ Domain column exists:');
      console.log(`   Type: ${domainCheck.rows[0].data_type}`);
      console.log(`   Nullable: ${domainCheck.rows[0].is_nullable}`);
      console.log(`   Default: ${domainCheck.rows[0].column_default || 'None'}`);
    } else {
      console.log('❌ Domain column does not exist');
      console.log('   Adding domain column...');
      await pool.query('ALTER TABLE schools ADD COLUMN domain text UNIQUE');
      console.log('✅ Domain column added successfully');
    }

    // Check if domain index exists
    console.log('\n2. Checking domain index...');
    const indexCheck = await pool.query(`
      SELECT indexname, indexdef 
      FROM pg_indexes 
      WHERE tablename = 'schools' AND indexname LIKE '%domain%'
    `);

    if (indexCheck.rows.length > 0) {
      console.log('✅ Domain index exists:');
      indexCheck.rows.forEach(idx => {
        console.log(`   ${idx.indexname}`);
      });
    } else {
      console.log('❌ Domain index does not exist');
      console.log('   Creating domain index...');
      await pool.query('CREATE INDEX idx_schools_domain ON schools(domain)');
      console.log('✅ Domain index created successfully');
    }

    // Test subdomain generation function
    console.log('\n3. Testing subdomain generation...');
    const testCases = [
      'Spectra Group of Schools',
      'St. Mary\'s Academy',
      '101 School Drive',
      'Royal Academy',
      'International School of Technology'
    ];

    const generateSubdomainSlug = (schoolName) => {
      return schoolName
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .slice(0, 50);
    };

    testCases.forEach(testCase => {
      const subdomain = generateSubdomainSlug(testCase);
      console.log(`   "${testCase}" -> "${subdomain}.schoolshubs.com"`);
    });

    // Check existing schools for domain values
    console.log('\n4. Checking existing schools for domain values...');
    const schoolsCheck = await pool.query(`
      SELECT id, name, domain, created_at 
      FROM schools 
      ORDER BY created_at DESC 
      LIMIT 5
    `);

    if (schoolsCheck.rows.length > 0) {
      console.log('✅ Found existing schools:');
      schoolsCheck.rows.forEach(school => {
        console.log(`   ${school.name}: ${school.domain || 'No domain set'}`);
      });
    } else {
      console.log('ℹ️  No schools found in database');
    }

    console.log('\n🎉 Subdomain schema verification completed successfully!');
    
  } catch (error) {
    console.error('❌ Schema verification failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run verification
verifySubdomainSchema();
