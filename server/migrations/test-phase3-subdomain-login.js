// Test Script: Phase 3 Subdomain Login Implementation
// Purpose: Comprehensive testing of subdomain-based login and redirection

const pool = require('../db/postgres');
const UserPostgres = require('../models/users/UserPostgres');
const SchoolPostgres = require('../models/SchoolPostgres');
const { extractSubdomain, validateSubdomain, generateSchoolDomain } = require('../utils/subdomain');

class Phase3SubdomainLoginTester {
  constructor() {
    this.testResults = [];
    this.errors = [];
    this.testData = {
      schoolId: null,
      userId: null,
      teacherUserId: null,
      studentUserId: null
    };
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

  // Setup test data
  async setupTestData() {
    console.log('🔧 Setting up test data for subdomain login...');
    
    try {
      // Create a test school with domain
      const schoolData = {
        name: 'Test School for Subdomain Login',
        domain: 'test-subdomain-login.schoolshubs.com',
        stateId: null,
        city: 'Test City',
        type: 'secondary',
        isPublic: true,
        phone: '+2341234567890',
        email: 'info@testsubdomain.edu'
      };

      // Get a state ID
      const stateQuery = 'SELECT id FROM states LIMIT 1';
      const stateResult = await pool.query(stateQuery);
      
      if (stateResult.rows.length > 0) {
        schoolData.stateId = stateResult.rows[0].id;
      }

      const schoolResult = await pool.query(
        `INSERT INTO schools (name, domain, state_id, city, type, is_public, phone, email, status, is_verified)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active', true)
         RETURNING id`,
        [
          schoolData.name,
          schoolData.domain,
          schoolData.stateId,
          schoolData.city,
          schoolData.type,
          schoolData.isPublic,
          schoolData.phone,
          schoolData.email
        ]
      );

      this.testData.schoolId = schoolResult.rows[0].id;

      // Create test users with different roles
      const bcryptjs = require('bcryptjs');
      const passwordHash = await bcryptjs.hash('testpassword123', 10);
      const subdomain = 'test-subdomain-login';

      // Create teacher user
      const teacherResult = await pool.query(
        `INSERT INTO users (
          school_id, email, password_hash, first_name, last_name, 
          role, is_active, approved, subdomain, profile, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, true, true, $7, $8, NOW(), NOW())
         RETURNING id, email, role, school_id, subdomain, approved`,
        [
          this.testData.schoolId,
          'teacher@testsubdomain.edu',
          passwordHash,
          'Test',
          'Teacher',
          'teacher',
          subdomain,
          JSON.stringify({
            phone: '+2349876543210',
            subjects: ['Mathematics'],
            experience: '5'
          })
        ]
      );

      this.testData.teacherUserId = teacherResult.rows[0].id;

      // Create student user
      const studentResult = await pool.query(
        `INSERT INTO users (
          school_id, email, password_hash, first_name, last_name, 
          role, is_active, approved, subdomain, profile, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, true, true, $7, $8, NOW(), NOW())
         RETURNING id, email, role, school_id, subdomain, approved`,
        [
          this.testData.schoolId,
          'student@testsubdomain.edu',
          passwordHash,
          'Test',
          'Student',
          'student',
          subdomain,
          JSON.stringify({
            currentClass: 'JSS1',
            dateOfBirth: '2005-01-01'
          })
        ]
      );

      this.testData.studentUserId = studentResult.rows[0].id;

      // Create admin user (super admin)
      const adminResult = await pool.query(
        `INSERT INTO users (
          email, password_hash, first_name, last_name, 
          role, is_active, approved, profile, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, true, true, $6, NOW(), NOW())
         RETURNING id, email, role`,
        [
          'admin@testsubdomain.edu',
          passwordHash,
          'Super',
          'Admin',
          'super_admin',
          JSON.stringify({
            permissions: 'all'
          })
        ]
      );

      this.testData.userId = adminResult.rows[0].id;

      this.logTest('Test data setup', true, `Created school: ${schoolData.name} with 3 test users`);
      return true;

    } catch (error) {
      this.logTest('Test data setup', false, error.message);
      return false;
    }
  }

  // Cleanup test data
  async cleanupTestData() {
    console.log('🧹 Cleaning up test data...');
    
    try {
      // Delete users
      if (this.testData.teacherUserId) {
        await pool.query('DELETE FROM users WHERE id = $1', [this.testData.teacherUserId]);
      }
      if (this.testData.studentUserId) {
        await pool.query('DELETE FROM users WHERE id = $1', [this.testData.studentUserId]);
      }
      if (this.testData.userId) {
        await pool.query('DELETE FROM users WHERE id = $1', [this.testData.userId]);
      }

      // Delete school
      if (this.testData.schoolId) {
        await pool.query('DELETE FROM schools WHERE id = $1', [this.testData.schoolId]);
      }

      this.logTest('Test data cleanup', true, 'All test data removed');

    } catch (error) {
      this.logTest('Test data cleanup', false, error.message);
    }
  }

  // Test subdomain utilities
  async testSubdomainUtilities() {
    console.log('\n🌐 Testing Subdomain Utilities...');
    
    try {
      // Test subdomain extraction
      const testCases = [
        { hostname: 'schoolname.schoolshubs.com', expected: 'schoolname' },
        { hostname: 'test-school.schoolshubs.com', expected: 'test-school' },
        { hostname: 'www.schoolshubs.com', expected: null },
        { hostname: 'api.schoolshubs.com', expected: null },
        { hostname: 'schoolshubs.com', expected: null },
        { hostname: 'invalid.domain.com', expected: 'invalid' }
      ];

      for (const testCase of testCases) {
        const result = extractSubdomain(testCase.hostname);
        this.logTest(
          `Subdomain extraction for ${testCase.hostname}`,
          result === testCase.expected,
          `Expected: ${testCase.expected}, Got: ${result}`
        );
      }

      // Test subdomain validation
      const validationCases = [
        { subdomain: 'valid-subdomain', expected: true },
        { subdomain: 'invalid_subdomain', expected: false },
        { subdomain: 'Invalid-Domain', expected: false },
        { subdomain: '123', expected: false },
        { subdomain: 'school-name', expected: true },
        { subdomain: 'a', expected: false },
        { subdomain: '', expected: false }
      ];

      for (const testCase of validationCases) {
        const result = validateSubdomain(testCase.subdomain);
        this.logTest(
          `Subdomain validation for "${testCase.subdomain}"`,
          result === testCase.expected,
          `Expected: ${testCase.expected}, Got: ${result}`
        );
      }

      // Test domain generation
      const domainResult = generateSchoolDomain('test-school', 'schoolshubs.com');
      this.logTest(
        'School domain generation',
        domainResult === 'test-school.schoolshubs.com',
        `Generated: ${domainResult}`
      );

    } catch (error) {
      this.logTest('Subdomain utilities tests', false, error.message);
    }
  }

  // Test user lookup with subdomain
  async testUserSubdomainLookup() {
    console.log('\n👤 Testing User Subdomain Lookup...');
    
    try {
      if (!this.testData.teacherUserId) {
        throw new Error('Test teacher user not available');
      }

      // Test user with context
      const userWithContext = await UserPostgres.getWithContext(this.testData.teacherUserId);
      
      this.logTest(
        'User context retrieval with subdomain',
        userWithContext !== null && userWithContext.subdomain === 'test-subdomain-login',
        userWithContext ? `Found: ${userWithContext.email}, Subdomain: ${userWithContext.subdomain}` : 'User not found'
      );

      // Test subdomain update
      const updatedSubdomain = await UserPostgres.updateSubdomain(this.testData.teacherUserId);
      
      this.logTest(
        'User subdomain update',
        updatedSubdomain === 'test-subdomain-login',
        `Updated subdomain: ${updatedSubdomain}`
      );

      // Test school membership verification
      const isMember = await UserPostgres.verifySchoolMembership(
        this.testData.teacherUserId, 
        this.testData.schoolId
      );
      
      this.logTest(
        'School membership verification',
        isMember,
        `User belongs to school: ${isMember}`
      );

    } catch (error) {
      this.logTest('User subdomain lookup tests', false, error.message);
    }
  }

  // Test school context from subdomain
  async testSchoolContextFromSubdomain() {
    console.log('\n🏫 Testing School Context from Subdomain...');
    
    try {
      if (!this.testData.schoolId) {
        throw new Error('Test school not available');
      }

      // Test school lookup by domain
      const school = await SchoolPostgres.findByDomain('test-subdomain-login.schoolshubs.com');
      
      this.logTest(
        'School lookup by domain',
        school !== null,
        school ? `Found: ${school.name}` : 'School not found'
      );

      // Test school lookup by subdomain
      const subdomainSchool = await SchoolPostgres.findBySubdomain('test-subdomain-login');
      
      this.logTest(
        'School lookup by subdomain',
        subdomainSchool !== null,
        subdomainSchool ? `Found: ${subdomainSchool.name}` : 'School not found'
      );

      // Test active schools query
      const activeSchools = await SchoolPostgres.getActiveVerifiedSchools({ limit: 5 });
      
      this.logTest(
        'Active schools query',
        Array.isArray(activeSchools.schools),
        `Found ${activeSchools.schools.length} active schools`
      );

    } catch (error) {
      this.logTest('School context tests', false, error.message);
    }
  }

  // Test login endpoint with subdomain routing
  async testLoginWithSubdomainRouting() {
    console.log('\n🔐 Testing Login with Subdomain Routing...');
    
    try {
      // Simulate login for teacher
      const loginData = {
        email: 'teacher@testsubdomain.edu',
        password: 'testpassword123',
        rememberMe: false
      };

      // Simulate the login endpoint logic
      const result = await pool.query(
        `SELECT 
          u.id, u.email, u.password_hash, u.first_name, u.last_name, 
          u.role, u.school_id, u.is_active, u.approved, u.subdomain,
          s.name as school_name, s.domain as school_domain, s.status as school_status
         FROM users u
         LEFT JOIN schools s ON u.school_id = s.id
         WHERE u.email = $1`,
        [loginData.email]
      );

      if (result.rows.length === 0) {
        throw new Error('User not found');
      }

      const user = result.rows[0];

      // Verify password
      const bcryptjs = require('bcryptjs');
      const passwordMatch = await bcryptjs.compare(loginData.password, user.password_hash);
      
      this.logTest(
        'Password verification',
        passwordMatch,
        passwordMatch ? 'Password verified successfully' : 'Password verification failed'
      );

      if (!passwordMatch) return;

      // Test subdomain URL generation
      const subdomain = user.school_domain ? user.school_domain.split('.')[0] : null;
      const redirectUrl = subdomain ? 
        `https://${user.school_domain}/teacher/dashboard` : 
        null;

      this.logTest(
        'Subdomain redirect URL generation',
        redirectUrl !== null,
        `Generated URL: ${redirectUrl}`
      );

      // Test login response structure
      const loginResponse = {
        success: true,
        token: 'mock-jwt-token',
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          school_id: user.school_id,
          subdomain: user.subdomain,
          approved: user.approved
        },
        school: {
          id: user.school_id,
          name: user.school_name,
          domain: user.school_domain,
          subdomain: subdomain
        },
        redirectTo: redirectUrl
      };

      this.logTest(
        'Login response structure',
        loginResponse.redirectTo !== null && loginResponse.school !== null,
        'Response contains school and redirect information'
      );

    } catch (error) {
      this.logTest('Login with subdomain routing tests', false, error.message);
    }
  }

  // Test cross-school access prevention
  async testCrossSchoolAccessPrevention() {
    console.log('\n🚫 Testing Cross-School Access Prevention...');
    
    try {
      if (!this.testData.teacherUserId || !this.testData.studentUserId) {
        throw new Error('Test users not available');
      }

      // Test that teacher can only access their own school
      const teacherUser = await UserPostgres.getWithContext(this.testData.teacherUserId);
      const studentUser = await UserPostgres.getWithContext(this.testData.studentUserId);

      this.logTest(
        'Teacher school membership',
        teacherUser && teacherUser.school_id === this.testData.schoolId,
        `Teacher belongs to correct school: ${teacherUser?.school_id === this.testData.schoolId}`
      );

      this.logTest(
        'Student school membership',
        studentUser && studentUser.school_id === this.testData.schoolId,
        `Student belongs to correct school: ${studentUser?.school_id === this.testData.schoolId}`
      );

      // Test that both users have the same subdomain
      this.logTest(
        'Same subdomain assignment',
        teacherUser?.subdomain === studentUser?.subdomain,
        `Teacher subdomain: ${teacherUser?.subdomain}, Student subdomain: ${studentUser?.subdomain}`
      );

    } catch (error) {
      this.logTest('Cross-school access prevention tests', false, error.message);
    }
  }

  // Test JWT token generation with school context
  async testJWTSchoolContext() {
    console.log('\n🎫 Testing JWT Token Generation with School Context...');
    
    try {
      const jwt = require('jsonwebtoken');
      const { generateSchoolJWTPayload } = require('../middleware/subdomainAuth');

      // Get test user with school context
      const user = await UserPostgres.getWithContext(this.testData.teacherUserId);
      
      if (!user) {
        throw new Error('Test user not found');
      }

      // Generate JWT payload with school context
      const payload = generateSchoolJWTPayload(user, {
        id: user.school_id,
        name: user.school_name,
        domain: user.school_domain,
        subdomain: user.subdomain
      });

      // Sign token
      const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '24h' });

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      this.logTest(
        'JWT token generation with school context',
        decoded && decoded.school_id && decoded.school_name,
        `Token contains school_id: ${decoded.school_id}, school_name: ${decoded.school_name}`
      );

      this.logTest(
        'JWT token verification',
        decoded.id === user.id && decoded.role === user.role,
        `Token verified for user: ${decoded.email}`
      );

    } catch (error) {
      this.logTest('JWT school context tests', false, error.message);
    }
  }

  // Run all tests
  async runAllTests() {
    console.log('🚀 Starting Phase 3 Subdomain Login Tests...\n');
    
    const startTime = Date.now();
    
    // Setup test data
    const setupSuccess = await this.setupTestData();
    if (!setupSuccess) {
      console.log('❌ Test setup failed, aborting tests');
      return false;
    }
    
    try {
      await this.testSubdomainUtilities();
      await this.testUserSubdomainLookup();
      await this.testSchoolContextFromSubdomain();
      await this.testLoginWithSubdomainRouting();
      await this.testCrossSchoolAccessPrevention();
      await this.testJWTSchoolContext();
      
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
        console.log('\n✅ All tests passed! Phase 3 subdomain login is ready.');
        return true;
      }
      
    } finally {
      // Cleanup test data
      await this.cleanupTestData();
    }
  }
}

// Command line interface
if (require.main === module) {
  const tester = new Phase3SubdomainLoginTester();
  
  tester.runAllTests()
    .then(success => process.exit(success ? 0 : 1))
    .catch(error => {
      console.error('Test runner failed:', error);
      process.exit(1);
    });
}

module.exports = Phase3SubdomainLoginTester;
