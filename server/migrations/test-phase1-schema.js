// Test Script: Phase 1 Database Schema Validation
// Purpose: Comprehensive testing of user-school associations and subdomain isolation

const pool = require('../db/postgres');
const UserPostgres = require('../models/users/UserPostgres');
const SchoolPostgres = require('../models/SchoolPostgres');
const FileStoragePostgres = require('../models/FileStoragePostgres');

class SchemaTester {
  constructor() {
    this.testResults = [];
    this.errors = [];
  }

  // Log test result
  logTest(testName, passed, details = '') {
    const result = {
      test: testName,
      passed,
      details,
      timestamp: new Date().toISOString()
    };
    
    this.testResults.push(result);
    
    if (passed) {
      console.log(`✅ ${testName}: ${details}`);
    } else {
      console.log(`❌ ${testName}: ${details}`);
      this.errors.push(result);
    }
  }

  // Test user table schema
  async testUserSchema() {
    console.log('\n🧪 Testing User Table Schema...');
    
    try {
      // Check if subdomain column exists
      const subdomainCheck = await pool.query(`
        SELECT column_name, data_type, is_nullable, character_maximum_length
        FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'subdomain'
      `);
      
      this.logTest(
        'Subdomain column exists',
        subdomainCheck.rows.length > 0,
        subdomainCheck.rows.length > 0 ? 
          `Type: ${subdomainCheck.rows[0].data_type}, Nullable: ${subdomainCheck.rows[0].is_nullable}` :
          'Column not found'
      );

      // Check subdomain constraint
      const constraintCheck = await pool.query(`
        SELECT constraint_name, check_clause
        FROM information_schema.check_constraints
        WHERE constraint_name = 'chk_users_subdomain_format'
      `);
      
      this.logTest(
        'Subdomain format constraint exists',
        constraintCheck.rows.length > 0,
        constraintCheck.rows.length > 0 ? 'Format validation constraint present' : 'Constraint missing'
      );

      // Check indexes
      const indexCheck = await pool.query(`
        SELECT indexname, indexdef
        FROM pg_indexes 
        WHERE tablename = 'users' AND indexname LIKE '%subdomain%'
      `);
      
      this.logTest(
        'Subdomain indexes exist',
        indexCheck.rows.length >= 2,
        `Found ${indexCheck.rows.length} subdomain-related indexes`
      );

      // Test user model methods
      const testUser = await UserPostgres.findById('00000000-0000-0000-0000-000000000000');
      this.logTest(
        'UserPostgres.findById works',
        true,
        testUser === null ? 'Correctly returns null for non-existent user' : 'Method executes without error'
      );

    } catch (error) {
      this.logTest('User schema tests', false, error.message);
    }
  }

  // Test school table schema
  async testSchoolSchema() {
    console.log('\n🏫 Testing School Table Schema...');
    
    try {
      // Test school lookup methods
      const testSchool = await SchoolPostgres.findById('00000000-0000-0000-0000-000000000000');
      this.logTest(
        'SchoolPostgres.findById works',
        true,
        testSchool === null ? 'Correctly returns null for non-existent school' : 'Method executes without error'
      );

      // Test domain lookup
      const domainTest = await SchoolPostgres.findByDomain('nonexistent.test');
      this.logTest(
        'SchoolPostgres.findByDomain works',
        true,
        domainTest === null ? 'Correctly returns null for non-existent domain' : 'Method executes without error'
      );

      // Test subdomain lookup
      const subdomainTest = await SchoolPostgres.findBySubdomain('nonexistent');
      this.logTest(
        'SchoolPostgres.findBySubdomain works',
        true,
        subdomainTest === null ? 'Correctly returns null for non-existent subdomain' : 'Method executes without error'
      );

      // Test active schools query
      const activeSchools = await SchoolPostgres.getActiveVerifiedSchools({ limit: 5 });
      this.logTest(
        'Get active verified schools works',
        Array.isArray(activeSchools.schools),
        `Returned ${activeSchools.schools.length} schools`
      );

    } catch (error) {
      this.logTest('School schema tests', false, error.message);
    }
  }

  // Test file storage schema
  async testFileStorageSchema() {
    console.log('\n📁 Testing File Storage Schema...');
    
    try {
      // Check file_storage table exists
      const tableCheck = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' AND table_name = 'file_storage'
        )
      `);
      
      this.logTest(
        'File storage table exists',
        tableCheck.rows[0].exists,
        tableCheck.rows[0].exists ? 'Table created successfully' : 'Table missing'
      );

      // Check file_directories table exists
      const dirTableCheck = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' AND table_name = 'file_directories'
        )
      `);
      
      this.logTest(
        'File directories table exists',
        dirTableCheck.rows[0].exists,
        dirTableCheck.rows[0].exists ? 'Table created successfully' : 'Table missing'
      );

      // Test file storage methods
      const fileTest = await FileStoragePostgres.findById('00000000-0000-0000-0000-000000000000');
      this.logTest(
        'FileStoragePostgres.findById works',
        true,
        fileTest === null ? 'Correctly returns null for non-existent file' : 'Method executes without error'
      );

      // Test file path generation
      const testPath = FileStoragePostgres.generateFilePath(
        'test-school-id', 
        'exam', 
        'test.pdf'
      );
      const expectedPath = 'uploads/school-test-school-id/exam/test.pdf';
      
      this.logTest(
        'File path generation works',
        testPath === expectedPath,
        `Generated: ${testPath}`
      );

    } catch (error) {
      this.logTest('File storage schema tests', false, error.message);
    }
  }

  // Test performance indexes
  async testPerformanceIndexes() {
    console.log('\n⚡ Testing Performance Indexes...');
    
    try {
      // Check critical indexes exist
      const criticalIndexes = [
        'idx_users_email_school',
        'idx_users_subdomain_active',
        'idx_schools_domain_lookup',
        'idx_exams_school_published',
        'idx_file_storage_school_type_date'
      ];

      for (const indexName of criticalIndexes) {
        const indexCheck = await pool.query(`
          SELECT EXISTS (
            SELECT FROM pg_indexes 
            WHERE indexname = $1
          )
        `, [indexName]);

        this.logTest(
          `Index ${indexName} exists`,
          indexCheck.rows[0].exists,
          indexCheck.rows[0].exists ? 'Index created' : 'Index missing'
        );
      }

      // Test index usage statistics
      const indexStats = await pool.query(`
        SELECT indexname, idx_scan as usage_count
        FROM pg_stat_user_indexes
        WHERE schemaname = 'public'
        ORDER BY idx_scan DESC
        LIMIT 5
      `);

      this.logTest(
        'Index usage statistics available',
        indexStats.rows.length > 0,
        `Found stats for ${indexStats.rows.length} indexes`
      );

    } catch (error) {
      this.logTest('Performance indexes tests', false, error.message);
    }
  }

  // Test data integrity
  async testDataIntegrity() {
    console.log('\n🔒 Testing Data Integrity...');
    
    try {
      // Test foreign key constraints
      const fkCheck = await pool.query(`
        SELECT 
            tc.table_name, 
            tc.constraint_name, 
            tc.constraint_type,
            kcu.column_name,
            ccu.table_name AS foreign_table_name,
            ccu.column_name AS foreign_column_name 
        FROM information_schema.table_constraints AS tc 
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY' 
          AND tc.table_schema = 'public'
          AND tc.table_name IN ('users', 'file_storage', 'exams')
      `);

      this.logTest(
        'Foreign key constraints exist',
        fkCheck.rows.length > 0,
        `Found ${fkCheck.rows.length} foreign key constraints`
      );

      // Test check constraints
      const checkCheck = await pool.query(`
        SELECT constraint_name, check_clause
        FROM information_schema.check_constraints
        WHERE constraint_schema = 'public'
      `);

      this.logTest(
        'Check constraints exist',
        checkCheck.rows.length > 0,
        `Found ${checkCheck.rows.length} check constraints`
      );

    } catch (error) {
      this.logTest('Data integrity tests', false, error.message);
    }
  }

  // Test subdomain functionality
  async testSubdomainFunctionality() {
    console.log('\n🌐 Testing Subdomain Functionality...');
    
    try {
      // Test subdomain extraction function
      const extractionTest = await pool.query(`
        SELECT split_part('test-school.schoolshubs.com', '.', 1) as subdomain
      `);

      this.logTest(
        'Subdomain extraction works',
        extractionTest.rows[0].subdomain === 'test-school',
        `Extracted: ${extractionTest.rows[0].subdomain}`
      );

      // Test subdomain validation function
      const validationTests = [
        { input: 'valid-subdomain', expected: true },
        { input: 'invalid_subdomain', expected: false },
        { input: 'Invalid-Domain', expected: false },
        { input: '123', expected: false }
      ];

      for (const test of validationTests) {
        const validationResult = await pool.query(`
          SELECT $1 ~ '^[a-z0-9-]+$' AND length($1) >= 3 AND length($1) <= 63 as is_valid
        `, [test.input]);

        this.logTest(
          `Subdomain validation for "${test.input}"`,
          validationResult.rows[0].is_valid === test.expected,
          `Expected: ${test.expected}, Got: ${validationResult.rows[0].is_valid}`
        );
      }

    } catch (error) {
      this.logTest('Subdomain functionality tests', false, error.message);
    }
  }

  // Run all tests
  async runAllTests() {
    console.log('🚀 Starting Phase 1 Database Schema Tests...\n');
    
    const startTime = Date.now();
    
    await this.testUserSchema();
    await this.testSchoolSchema();
    await this.testFileStorageSchema();
    await this.testPerformanceIndexes();
    await this.testDataIntegrity();
    await this.testSubdomainFunctionality();
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    // Summary
    console.log('\n📊 Test Summary:');
    console.log(`Total tests: ${this.testResults.length}`);
    console.log(`Passed: ${this.testResults.filter(r => r.passed).length}`);
    console.log(`Failed: ${this.errors.length}`);
    console.log(`Duration: ${duration}ms`);
    
    if (this.errors.length > 0) {
      console.log('\n❌ Failed Tests:');
      this.errors.forEach(error => {
        console.log(`  - ${error.test}: ${error.details}`);
      });
      return false;
    } else {
      console.log('\n✅ All tests passed! Phase 1 schema is ready.');
      return true;
    }
  }
}

// Command line interface
if (require.main === module) {
  const tester = new SchemaTester();
  
  tester.runAllTests()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Test runner failed:', error);
      process.exit(1);
    });
}

module.exports = SchemaTester;
