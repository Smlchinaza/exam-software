// Test Script: Phase 4 Data Isolation Implementation
// Purpose: Comprehensive testing of tenant scoping and complete data isolation

const pool = require('../db/postgres');
const UserPostgres = require('../models/users/UserPostgres');
const SchoolPostgres = require('../models/SchoolPostgres');
const FileStoragePostgres = require('../models/FileStoragePostgres');

class Phase4DataIsolationTester {
  constructor() {
    this.testResults = [];
    this.errors = [];
    this.testData = {
      school1Id: null,
      school2Id: null,
      teacher1Id: null,
      teacher2Id: null,
      student1Id: null,
      student2Id: null,
      exam1Id: null,
      exam2Id: null,
      submission1Id: null,
      submission2Id: null,
      file1Id: null,
      file2Id: null
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

  // Setup test data with two schools
  async setupTestData() {
    console.log('🔧 Setting up test data for data isolation...');
    
    try {
      const bcryptjs = require('bcryptjs');
      const passwordHash = await bcryptjs.hash('testpassword123', 10);

      // Create two test schools
      const school1Result = await pool.query(
        `INSERT INTO schools (name, domain, state_id, city, type, is_public, phone, email, status, is_verified)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active', true)
         RETURNING id`,
        [
          'Test School Alpha',
          'test-alpha.schoolshubs.com',
          null, // Will use first available state
          'Test City Alpha',
          'secondary',
          true,
          '+2341234567890',
          'info@testalpha.edu'
        ]
      );

      const school2Result = await pool.query(
        `INSERT INTO schools (name, domain, state_id, city, type, is_public, phone, email, status, is_verified)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active', true)
         RETURNING id`,
        [
          'Test School Beta',
          'test-beta.schoolshubs.com',
          null, // Will use first available state
          'Test City Beta',
          'secondary',
          true,
          '+2349876543210',
          'info@testbeta.edu'
        ]
      );

      this.testData.school1Id = school1Result.rows[0].id;
      this.testData.school2Id = school2Result.rows[0].id;

      // Create teachers for each school
      const teacher1Result = await pool.query(
        `INSERT INTO users (
          school_id, email, password_hash, first_name, last_name, 
          role, is_active, approved, subdomain, profile, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, true, true, $7, $8, NOW(), NOW())
         RETURNING id, email, role, school_id, subdomain, approved`,
        [
          this.testData.school1Id,
          'teacher1@testalpha.edu',
          passwordHash,
          'Teacher',
          'Alpha',
          'Alpha',
          'teacher1@testalpha.edu',
          'teacher',
          true,
          'test-alpha',
          JSON.stringify({
            phone: '+2341111111111',
            subjects: ['Mathematics', 'Physics'],
            experience: '5'
          })
        ]
      );

      const teacher2Result = await pool.query(
        `INSERT INTO users (
          school_id, email, password_hash, first_name, last_name, 
          role, is_active, approved, subdomain, profile, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, true, true, $7, $8, NOW(), NOW())
         RETURNING id, email, role, school_id, subdomain, approved`,
        [
          this.testData.school2Id,
          'teacher2@testbeta.edu',
          passwordHash,
          'Teacher',
          'Beta',
          'Beta',
          'teacher2@testbeta.edu',
          'teacher',
          true,
          'test-beta',
          JSON.stringify({
            phone: '+2342222222222',
            subjects: ['Chemistry', 'Biology'],
            experience: '3'
          })
        ]
      );

      // Create students for each school
      const student1Result = await pool.query(
        `INSERT INTO users (
          school_id, email, password_hash, first_name, last_name, 
          role, is_active, approved, subdomain, profile, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, true, true, $7, $8, NOW(), NOW())
         RETURNING id, email, role, school_id, subdomain, approved`,
        [
          this.testData.school1Id,
          'student1@testalpha.edu',
          passwordHash,
          'Student',
          'Alpha',
          'student1@testalpha.edu',
          'student',
          true,
          'test-alpha',
          JSON.stringify({
            currentClass: 'JSS1',
            dateOfBirth: '2005-01-01'
          })
        ]
      );

      const student2Result = await pool.query(
        `INSERT INTO users (
          school_id, email, password_hash, first_name, last_name, 
          role, is_active, approved, subdomain, profile, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, true, true, $7, $8, NOW(), NOW())
         RETURNING id, email, role, school_id, subdomain, approved`,
        [
          this.testData.school2Id,
          'student2@testbeta.edu',
          passwordHash,
          'Student',
          'Beta',
          'student2@testbeta.edu',
          'student',
          true,
          'test-beta',
          JSON.stringify({
            currentClass: 'JSS2',
            dateOfBirth: '2004-01-01'
          })
        ]
      );

      this.testData.teacher1Id = teacher1Result.rows[0].id;
      this.testData.teacher2Id = teacher2Result.rows[0].id;
      this.testData.student1Id = student1Result.rows[0].id;
      this.testData.student2Id = student2Result.rows[0].id;

      // Create exams for each school
      const exam1Result = await pool.query(
        `INSERT INTO exams (school_id, created_by, title, description, duration_minutes, is_published, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
         RETURNING id, title`,
        [
          this.testData.school1Id,
          this.testData.teacher1Id,
          'Mathematics Exam Alpha',
          'Comprehensive mathematics assessment',
          60,
          true
        ]
      );

      const exam2Result = await pool.query(
        `INSERT INTO exams (school_id, created_by, title, description, duration_minutes, is_published, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
         RETURNING id, title`,
        [
          this.testData.school2Id,
          this.testData.teacher2Id,
          'Science Exam Beta',
          'Comprehensive science assessment',
          45,
          true
        ]
      );

      this.testData.exam1Id = exam1Result.rows[0].id;
      this.testData.exam2Id = exam2Result.rows[0].id;

      // Create submissions for each school
      const submission1Result = await pool.query(
        `INSERT INTO exam_submissions (exam_id, school_id, student_id, started_at, submitted_at, total_score, created_at, updated_at)
         VALUES ($1, $2, $3, NOW(), NOW(), 0, NOW(), NOW())
         RETURNING id`,
        [
          this.testData.exam1Id,
          this.testData.school1Id,
          this.testData.student1Id
        ]
      );

      const submission2Result = await pool.query(
        `INSERT INTO exam_submissions (exam_id, school_id, student_id, started_at, submitted_at, total_score, created_at, updated_at)
         VALUES ($1, $2, $3, NOW(), NOW(), 0, NOW(), NOW())
         RETURNING id`,
        [
          this.testData.exam2Id,
          this.testData.school2Id,
          this.testData.student2Id
        ]
      );

      this.testData.submission1Id = submission1Result.rows[0].id;
      this.testData.submission2Id = submission2Result.rows[0].id;

      // Create files for each school
      const file1Result = await FileStoragePostgres.create({
        schoolId: this.testData.school1Id,
        fileName: 'math-alpha-document.pdf',
        originalName: 'Mathematics Study Guide.pdf',
        filePath: 'uploads/school-' + this.testData.school1Id + '/materials/math-alpha-document.pdf',
        fileSize: 1024000,
        mimeType: 'application/pdf',
        fileType: 'material',
        uploadedBy: this.testData.teacher1Id,
        metadata: {
          description: 'Mathematics study guide for School Alpha',
          subject: 'Mathematics'
        }
      });

      const file2Result = await FileStoragePostgres.create({
        schoolId: this.testData.school2Id,
        fileName: 'science-beta-document.pdf',
        originalName: 'Science Study Guide.pdf',
        filePath: 'uploads/school-' + this.testData.school2Id + '/materials/science-beta-document.pdf',
        fileSize: 2048000,
        mimeType: 'application/pdf',
        fileType: 'material',
        uploadedBy: this.testData.teacher2Id,
        metadata: {
          description: 'Science study guide for School Beta',
          subject: 'Science'
        }
      });

      this.testData.file1Id = file1Result.id;
      this.testData.file2Id = file2Result.id;

      this.logTest('Test data setup', true, `Created 2 schools with users, exams, submissions, and files`);

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
      // Delete files
      if (this.testData.file1Id) {
        await FileStoragePostgres.delete(this.testData.file1Id);
      }
      if (this.testData.file2Id) {
        await FileStoragePostgres.delete(this.testData.file2Id);
      }

      // Delete submissions
      if (this.testData.submission1Id) {
        await pool.query('DELETE FROM exam_submissions WHERE id = $1', [this.testData.submission1Id]);
      }
      if (this.testData.submission2Id) {
        await pool.query('DELETE FROM exam_submissions WHERE id = $1', [this.testData.submission2Id]);
      }

      // Delete exams
      if (this.testData.exam1Id) {
        await pool.query('DELETE FROM exams WHERE id = $1', [this.testData.exam1Id]);
      }
      if (this.testData.exam2Id) {
        await pool.query('DELETE FROM exams WHERE id = $1', [this.testData.exam2Id]);
      }

      // Delete users
      if (this.testData.teacher1Id) {
        await pool.query('DELETE FROM users WHERE id = $1', [this.testData.teacher1Id]);
      }
      if (this.testData.teacher2Id) {
        await pool.query('DELETE FROM users WHERE id = $1', [this.testData.teacher2Id]);
      }
      if (this.testData.student1Id) {
        await pool.query('DELETE FROM users WHERE id = $1', [this.testData.student1Id]);
      }
      if (this.testData.student2Id) {
        await pool.query('DELETE FROM users WHERE id = $1', [this.testData.student2Id]);
      }

      // Delete schools
      if (this.testData.school1Id) {
        await pool.query('DELETE FROM schools WHERE id = $1', [this.testData.school1Id]);
      }
      if (this.testData.school2Id) {
        await pool.query('DELETE FROM schools WHERE id = $1', [this.testData.school2Id]);
      }

      this.logTest('Test data cleanup', true, 'All test data removed');

    } catch (error) {
      this.logTest('Test data cleanup', false, error.message);
    }
  }

  // Test tenant scoping middleware functionality
  async testTenantScopingMiddleware() {
    console.log('\n🏗️ Testing Tenant Scoping Middleware...');
    
    try {
      // Test user lookup with school context
      const teacher1User = await UserPostgres.getWithContext(this.testData.teacher1Id);
      
      this.logTest(
        'Teacher1 user context retrieval',
        teacher1User !== null && teacher1User.school_id === this.testData.school1Id,
        `Teacher1 belongs to correct school: ${teacher1User?.school_id === this.testData.school1Id}`
      );

      const student1User = await UserPostgres.getWithContext(this.testData.student1Id);
      
      this.logTest(
        'Student1 user context retrieval',
        student1User !== null && student1User.school_id === this.testData.school1Id,
        `Student1 belongs to correct school: ${student1User?.school_id === this.testData.school1Id}`
      );

      // Test school membership verification
      const teacher1Member = await UserPostgres.verifySchoolMembership(
        this.testData.teacher1Id, 
        this.testData.school1Id
      );
      
      this.logTest(
        'Teacher1 school membership verification',
        teacher1Member,
        `Teacher1 is member of school: ${teacher1Member}`
      );

      // Test cross-school membership prevention
      const teacher1MemberWrongSchool = await UserPostgres.verifySchoolMembership(
        this.testData.teacher1Id, 
        this.testData.school2Id
      );
      
      this.logTest(
        'Teacher1 cross-school membership prevention',
        !teacher1MemberWrongSchool,
        `Teacher1 correctly rejected from wrong school: ${!teacher1MemberWrongSchool}`
      );

    } catch (error) {
      this.logTest('Tenant scoping middleware tests', false, error.message);
    }
  }

  // Test data isolation between schools
  async testDataIsolation() {
    console.log('\n🔒 Testing Data Isolation...');
    
    try {
      // Test exam isolation
      const school1Exams = await pool.query(
        'SELECT id, title FROM exams WHERE school_id = $1',
        [this.testData.school1Id]
      );

      this.logTest(
        'School 1 exam isolation',
        school1Exams.rows.length === 1 && school1Exams.rows[0].title === 'Mathematics Exam Alpha',
        `School 1 has 1 exam: ${school1Exams.rows.length}`
      );

      const school2Exams = await pool.query(
        'SELECT id, title FROM exams WHERE school_id = $1',
        [this.testData.school2Id]
      );

      this.logTest(
        'School 2 exam isolation',
        school2Exams.rows.length === 1 && school2Exams.rows[0].title === 'Science Exam Beta',
        `School 2 has 1 exam: ${school2Exams.rows.length}`
      );

      // Verify no cross-school exam access
      const crossSchoolExam1 = await pool.query(
        'SELECT id FROM exams WHERE id = $1 AND school_id = $2',
        [this.testData.exam1Id, this.testData.school2Id]
      );

      this.logTest(
        'Cross-school exam prevention (Exam 1 -> School 2)',
        crossSchoolExam1.rows.length === 0,
        'Exam 1 correctly not accessible from School 2'
      );

      // Test submission isolation
      const school1Submissions = await pool.query(
        'SELECT id FROM exam_submissions WHERE school_id = $1',
        [this.testData.school1Id]
      );

      this.logTest(
        'School 1 submission isolation',
        school1Submissions.rows.length === 1 && school1Submissions.rows[0].id === this.testData.submission1Id,
        `School 1 has 1 submission: ${school1Submissions.rows.length}`
      );

      // Test file storage isolation
      const school1Files = await FileStoragePostgres.findBySchool(this.testData.school1Id);
      
      this.logTest(
        'School 1 file storage isolation',
        school1Files.files.length === 1 && school1Files.files[0].file_name === 'math-alpha-document.pdf',
        `School 1 has 1 file: ${school1Files.files.length}`
      );

      const school2Files = await FileStoragePostgres.findBySchool(this.testData.school2Id);
      
      this.logTest(
        'School 2 file storage isolation',
        school2Files.files.length === 1 && school2Files.files[0].file_name === 'science-beta-document.pdf',
        `School 2 has 1 file: ${school2Files.files.length}`
      );

    } catch (error) {
      this.logTest('Data isolation tests', false, error.message);
    }
  }

  // Test automatic school ID injection
  async testSchoolIdInjection() {
    console.log('\n💉 Testing Automatic School ID Injection...');
    
    try {
      // Simulate middleware injection for queries
      const mockRequest = {
        tenant: {
          schoolId: this.testData.school1Id,
          userId: this.testData.teacher1Id,
          role: 'teacher'
        },
        query: {},
        body: {}
      };

      const injectSchoolId = require('../middleware/tenantScoping').injectSchoolId;

      // Test query injection
      injectSchoolId(mockRequest, {}, () => {
        this.logTest(
          'Query school ID injection',
          mockRequest.query.school_id === this.testData.school1Id,
          `Query school_id injected: ${mockRequest.query.school_id}`
        );
      });

      // Test body injection for POST
      const mockPostRequest = {
        tenant: {
          schoolId: this.testData.school1Id,
          userId: this.testData.teacher1Id,
          role: 'teacher'
        },
        query: {},
        body: {
          title: 'Test Exam',
          description: 'Test Description'
        }
      };

      injectSchoolId(mockPostRequest, {}, () => {
        this.logTest(
          'POST body school ID injection',
          mockPostRequest.body.school_id === this.testData.school1Id,
          `Body school_id injected: ${mockPostRequest.body.school_id}`
        );
      });

      // Test mismatched school ID prevention
      const mockWrongRequest = {
        tenant: {
          schoolId: this.testData.school1Id,
          userId: this.testData.teacher1Id,
          role: 'teacher'
        },
        query: {},
        body: {
          title: 'Test Exam',
          schoolId: this.testData.school2Id // Wrong school ID
        }
      };

      let injectionBlocked = false;
      try {
        injectSchoolId(mockWrongRequest, {}, () => {
          injectionBlocked = false;
        });
      } catch (error) {
        injectionBlocked = true;
      }

      this.logTest(
        'Wrong school ID prevention',
        injectionBlocked,
        'Correctly prevented injection of wrong school ID'
      );

    } catch (error) {
      this.logTest('School ID injection tests', false, error.message);
    }
  }

  // Test cross-access prevention
  async testCrossAccessPrevention() {
    console.log('\n🚫 Testing Cross-Access Prevention...');
    
    try {
      const preventCrossSchoolAccess = require('../middleware/tenantScoping').preventCrossSchoolAccess;

      // Test valid access (same school)
      const validRequest = {
        tenant: {
          schoolId: this.testData.school1Id,
          userId: this.testData.teacher1Id,
          role: 'teacher',
          isSuperAdmin: false
        },
        query: {
          school_id: this.testData.school1Id
        }
      };

      let accessGranted = false;
      try {
        preventCrossSchoolAccess(validRequest, {}, () => {
          accessGranted = true;
        });
      } catch (error) {
        accessGranted = false;
      }

      this.logTest(
        'Valid same-school access',
        accessGranted,
        'Same school access correctly granted'
      );

      // Test invalid access (different school)
      const invalidRequest = {
        tenant: {
          schoolId: this.testData.school1Id,
          userId: this.testData.teacher1Id,
          role: 'teacher',
          isSuperAdmin: false
        },
        query: {
          school_id: this.testData.school2Id
        }
      };

      let accessBlocked = false;
      try {
        preventCrossSchoolAccess(invalidRequest, {}, () => {
          accessBlocked = false;
        });
      } catch (error) {
        accessBlocked = true;
      }

      this.logTest(
        'Invalid cross-school access prevention',
        accessBlocked,
        'Cross-school access correctly blocked'
      );

      // Test super admin bypass
      const superAdminRequest = {
        tenant: {
          schoolId: this.testData.school1Id,
          userId: this.testData.teacher1Id,
          role: 'teacher',
          isSuperAdmin: true
        },
        query: {
          school_id: this.testData.school2Id
        }
      };

      let adminBypass = false;
      try {
        preventCrossSchoolAccess(superAdminRequest, {}, () => {
          adminBypass = true;
        });
      } catch (error) {
        adminBypass = false;
      }

      this.logTest(
        'Super admin cross-school access bypass',
        adminBypass,
        'Super admin correctly bypassed cross-school restrictions'
      );

    } catch (error) {
      this.logTest('Cross-access prevention tests', false, error.message);
    }
  }

  // Test resource access validation
  async testResourceAccessValidation() {
    console.log('\n🔐 Testing Resource Access Validation...');
    
    try {
      const validateTenantResourceAccess = require('../middleware/tenantScoping').validateTenantResourceAccess;

      // Test exam resource validation
      const examRequest = {
        tenant: {
          schoolId: this.testData.school1Id,
          userId: this.testData.teacher1Id,
          role: 'teacher',
          isSuperAdmin: false
        }
      };

      let examAccessGranted = false;
      try {
        await validateTenantResourceAccess(examRequest, this.testData.exam1Id, 'exam')(null, null, () => {
          examAccessGranted = true;
        });
      } catch (error) {
        examAccessGranted = false;
      }

      this.logTest(
        'Exam resource access validation (valid)',
        examAccessGranted,
        'Teacher can access own school exam'
      );

      // Test invalid exam access
      let invalidExamAccess = false;
      try {
        await validateTenantResourceAccess(examRequest, this.testData.exam2Id, 'exam')(null, null, () => {
          invalidExamAccess = true;
        });
      } catch (error) {
        invalidExamAccess = false;
      }

      this.logTest(
        'Exam resource access validation (invalid)',
        invalidExamAccess,
        'Teacher cannot access other school exam'
      );

      // Test submission resource validation
      const submissionRequest = {
        tenant: {
          schoolId: this.testData.school1Id,
          userId: this.testData.student1Id,
          role: 'student',
          isSuperAdmin: false
        }
      };

      let submissionAccessGranted = false;
      try {
        await validateTenantResourceAccess(submissionRequest, this.testData.submission1Id, 'submission')(null, null, () => {
          submissionAccessGranted = true;
        });
      } catch (error) {
        submissionAccessGranted = false;
      }

      this.logTest(
        'Submission resource access validation (valid)',
        submissionAccessGranted,
        'Student can access own submission'
      );

    } catch (error) {
      this.logTest('Resource access validation tests', false, error.message);
    }
  }

  // Test file storage isolation
  async testFileStorageIsolation() {
    console.log('\n📁 Testing File Storage Isolation...');
    
    try {
      // Test file access validation
      const file1 = await FileStoragePostgres.findById(this.testData.file1Id);
      
      this.logTest(
        'File 1 retrieval',
        file1 !== null && file1.school_id === this.testData.school1Id,
        `File 1 belongs to correct school: ${file1?.school_id === this.testData.school1Id}`
      );

      // Test file access validation
      const validateAccess = await FileStoragePostgres.validateAccess(
        this.testData.teacher1Id,
        this.testData.file1Id
      );

      this.logTest(
        'File access validation',
        validateAccess,
        `Teacher can access own school file: ${validateAccess}`
      );

      // Test cross-school file access prevention
      const crossAccessPrevented = !await FileStoragePostgres.validateAccess(
        this.testData.teacher2Id,
        this.testData.file1Id
      );

      this.logTest(
        'Cross-school file access prevention',
        crossAccessPrevented,
        `Teacher cannot access other school file: ${crossAccessPrevented}`
      );

      // Test file statistics per school
      const school1Stats = await FileStoragePostgres.getSchoolStats(this.testData.school1Id);
      
      this.logTest(
        'School 1 file statistics',
        school1Stats.total_files === 1,
        `School 1 has ${school1Stats.total_files} files`
      );

      const school2Stats = await FileStoragePostgres.getSchoolStats(this.testData.school2Id);
      
      this.logTest(
        'School 2 file statistics',
        school2Stats.total_files === 1,
        `School 2 has ${school2Stats.total_files} files`
      );

    } catch (error) {
      this.logTest('File storage isolation tests', false, error.message);
    }
  }

  // Test tenant-aware query builder
  async testTenantQueryBuilder() {
    console.log('\n🔧 Testing Tenant-Aware Query Builder...');
    
    try {
      const { buildTenantQuery } = require('../middleware/tenantScoping');

      // Test basic tenant query building
      const baseQuery = 'SELECT * FROM exams WHERE 1=1';
      const { query, values } = buildTenantQuery(baseQuery, this.testData.school1Id, {
        is_published: true
      });

      this.logTest(
        'Tenant query builder',
        query.includes('school_id = $1') && values.length === 2,
        `Query built correctly: ${query}`
      );

      // Test complex tenant query building
      const { query: complexQuery, values: complexValues } = buildTenantQuery(
        'SELECT * FROM exams WHERE 1=1',
        this.testData.school1Id,
        {
          is_published: true,
          created_by: this.testData.teacher1Id
        }
      );

      this.logTest(
        'Complex tenant query builder',
        complexQuery.includes('school_id = $1') && complexValues.length === 3,
        `Complex query built correctly: ${complexQuery}`
      );

    } catch (error) {
      this.logTest('Tenant query builder tests', false, error.message);
    }
  }

  // Run all tests
  async runAllTests() {
    console.log('🚀 Starting Phase 4 Data Isolation Tests...\n');
    
    const startTime = Date.now();
    
    // Setup test data
    const setupSuccess = await this.setupTestData();
    if (!setupSuccess) {
      console.log('❌ Test setup failed, aborting tests');
      return false;
    }
    
    try {
      await this.testTenantScopingMiddleware();
      await this.testDataIsolation();
      await this.testSchoolIdInjection();
      await this.testCrossAccessPrevention();
      await this.testResourceAccessValidation();
      await this.testFileStorageIsolation();
      await this.testTenantQueryBuilder();
      
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
        console.log('\n✅ All tests passed! Phase 4 data isolation is ready.');
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
  const tester = new Phase4DataIsolationTester();
  
  tester.runAllTests()
    .then(success => process.exit(success ? 0 : 1))
    .catch(error => {
      console.error('Test runner failed:', error);
      process.exit(1);
    });
}

module.exports = Phase4DataIsolationTester;
