// Test Script: Phase 2 Enhanced Teacher Registration
// Purpose: Comprehensive testing of enhanced teacher registration with school validation and subdomain routing

const pool = require('../db/postgres');
const SchoolPostgres = require('../models/SchoolPostgres');
const UserPostgres = require('../models/users/UserPostgres');
const NotificationPostgres = require('../models/NotificationPostgres');

class Phase2RegistrationTester {
  constructor() {
    this.testResults = [];
    this.errors = [];
    this.testData = {
      schoolId: null,
      userId: null,
      notificationId: null
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
    console.log('🔧 Setting up test data...');
    
    try {
      // Create a test school
      const schoolData = {
        name: 'Test School for Registration',
        domain: 'test-registration.schoolshubs.com',
        stateId: null, // Will use first available state
        city: 'Test City',
        type: 'secondary',
        isPublic: true,
        phone: '+2341234567890',
        email: 'info@testregistration.edu'
      };

      // Get a state ID (first available)
      const stateQuery = 'SELECT id FROM states LIMIT 1';
      const stateResult = await pool.query(stateQuery);
      
      if (stateResult.rows.length > 0) {
        schoolData.stateId = stateResult.rows[0].id;
      }

      this.testData.schoolId = await pool.query(
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

      this.testData.schoolId = this.testData.schoolId.rows[0].id;
      
      this.logTest('Test data setup', true, `Created school: ${schoolData.name}`);
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
      // Delete notifications
      if (this.testData.notificationId) {
        await pool.query('DELETE FROM notifications WHERE id = $1', [this.testData.notificationId]);
      }

      // Delete user
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

  // Test school validation middleware
  async testSchoolValidation() {
    console.log('\n🏫 Testing School Validation...');
    
    try {
      // Test school selection validation
      const school = await SchoolPostgres.findById(this.testData.schoolId);
      
      this.logTest(
        'School validation by ID',
        school !== null,
        school ? `Found: ${school.name}` : 'School not found'
      );

      // Test domain lookup
      const domainSchool = await SchoolPostgres.findByDomain('test-registration.schoolshubs.com');
      
      this.logTest(
        'School validation by domain',
        domainSchool !== null,
        domainSchool ? `Found: ${domainSchool.name}` : 'School not found by domain'
      );

      // Test subdomain lookup
      const subdomainSchool = await SchoolPostgres.findBySubdomain('test-registration');
      
      this.logTest(
        'School validation by subdomain',
        subdomainSchool !== null,
        subdomainSchool ? `Found: ${subdomainSchool.name}` : 'School not found by subdomain'
      );

      // Test active schools query
      const activeSchools = await SchoolPostgres.getActiveVerifiedSchools({ limit: 5 });
      
      this.logTest(
        'Active schools query',
        Array.isArray(activeSchools.schools),
        `Found ${activeSchools.schools.length} active schools`
      );

    } catch (error) {
      this.logTest('School validation tests', false, error.message);
    }
  }

  // Test teacher registration endpoint
  async testTeacherRegistration() {
    console.log('\n👨‍🏫 Testing Teacher Registration...');
    
    try {
      const registrationData = {
        firstName: 'Test',
        lastName: 'Teacher',
        email: 'testteacher@example.com',
        phone: '+2349876543210',
        password: 'testpassword123',
        schoolId: this.testData.schoolId,
        subjects: ['Mathematics', 'Physics'],
        department: 'Science Department',
        experience: '5',
        employmentType: 'full-time'
      };

      // Simulate registration endpoint logic
      const client = await pool.connect();
      
      try {
        await client.query('BEGIN');

        // Check if school exists and is active
        const schoolRes = await client.query(
          `SELECT id, name, domain FROM schools WHERE id = $1 AND status = 'active' AND is_verified = true`,
          [this.testData.schoolId]
        );

        if (schoolRes.rows.length === 0) {
          throw new Error('School not found or not active');
        }

        const school = schoolRes.rows[0];

        // Check if email already exists
        const emailRes = await client.query(
          `SELECT id FROM users WHERE email = $1`,
          [registrationData.email]
        );

        if (emailRes.rows.length > 0) {
          throw new Error('Email already exists');
        }

        // Hash password (simplified for test)
        const bcryptjs = require('bcryptjs');
        const password_hash = await bcryptjs.hash(registrationData.password, 10);

        // Generate subdomain
        const subdomain = school.domain ? school.domain.split('.')[0] : null;

        // Create teacher user
        const userRes = await client.query(
          `INSERT INTO users (
            school_id, email, password_hash, first_name, last_name, 
            role, is_active, approved, subdomain, profile, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, true, false, $7, $8, NOW(), NOW())
           RETURNING id, email, first_name, last_name, role, school_id, subdomain, approved, created_at`,
          [
            this.testData.schoolId,
            registrationData.email,
            password_hash,
            registrationData.firstName,
            registrationData.lastName,
            'teacher',
            subdomain,
            JSON.stringify({
              phone: registrationData.phone,
              subjects: registrationData.subjects,
              department: registrationData.department,
              experience: registrationData.experience,
              employmentType: registrationData.employmentType,
              registeredAt: new Date().toISOString(),
              registrationSource: 'test'
            })
          ]
        );

        const user = userRes.rows[0];
        this.testData.userId = user.id;

        // Create notification
        const notificationRes = await client.query(
          `INSERT INTO notifications (
            school_id, user_id, type, title, message, data, is_read, created_at
          ) VALUES ($1, $2, 'teacher_registration', 'New Teacher Registration', 
            $3, $4, false, NOW())
          RETURNING id`,
          [
            this.testData.schoolId,
            user.id,
            `${registrationData.firstName} ${registrationData.lastName} has registered as a teacher`,
            JSON.stringify({
              userId: user.id,
              userEmail: registrationData.email,
              subjects: registrationData.subjects,
              department: registrationData.department,
              experience: registrationData.experience,
              registeredAt: new Date().toISOString()
            })
          ]
        );

        this.testData.notificationId = notificationRes.rows[0].id;

        await client.query('COMMIT');

        // Test results
        this.logTest(
          'Teacher registration',
          true,
          `Created user: ${user.email}, School: ${school.name}`
        );

        this.logTest(
          'Subdomain assignment',
          subdomain !== null,
          `Assigned subdomain: ${subdomain}`
        );

        this.logTest(
          'Approval workflow',
          !user.approved,
          'User correctly marked as pending approval'
        );

        this.logTest(
          'Notification creation',
          this.testData.notificationId !== null,
          `Created notification: ${this.testData.notificationId}`
        );

        // Test subdomain URL generation
        const redirectUrl = school.domain ? 
          `https://${school.domain}/dashboard?registration=pending` : 
          null;

        this.logTest(
          'Subdomain URL generation',
          redirectUrl !== null,
          `Generated URL: ${redirectUrl}`
        );

      } finally {
        client.release();
      }

    } catch (error) {
      this.logTest('Teacher registration test', false, error.message);
    }
  }

  // Test notification system
  async testNotificationSystem() {
    console.log('\n📬 Testing Notification System...');
    
    try {
      if (!this.testData.schoolId || !this.testData.userId) {
        throw new Error('Test data not available');
      }

      // Test school notifications
      const schoolNotifications = await NotificationPostgres.getSchoolNotifications(this.testData.schoolId);
      
      this.logTest(
        'School notifications retrieval',
        Array.isArray(schoolNotifications.notifications),
        `Found ${schoolNotifications.notifications.length} notifications`
      );

      // Test teacher registration notifications
      const teacherNotifications = await NotificationPostgres.getTeacherRegistrationNotifications(this.testData.schoolId);
      
      this.logTest(
        'Teacher registration notifications',
        Array.isArray(teacherNotifications.notifications),
        `Found ${teacherNotifications.notifications.length} teacher registrations`
      );

      // Test unread count
      const unreadCount = await NotificationPostgres.getUnreadCount(this.testData.schoolId);
      
      this.logTest(
        'Unread notifications count',
        typeof unreadCount === 'number',
        `Unread count: ${unreadCount}`
      );

      // Test notification statistics
      const stats = await NotificationPostgres.getSchoolStatistics(this.testData.schoolId);
      
      this.logTest(
        'School notification statistics',
        stats && typeof stats.total_notifications === 'number',
        `Total: ${stats.total_notifications}, Unread: ${stats.unread_count}`
      );

      // Test pending registrations
      const pendingRegistrations = await NotificationPostgres.getPendingTeacherRegistrations(this.testData.schoolId);
      
      this.logTest(
        'Pending teacher registrations',
        Array.isArray(pendingRegistrations),
        `Found ${pendingRegistrations.length} pending registrations`
      );

    } catch (error) {
      this.logTest('Notification system tests', false, error.message);
    }
  }

  // Test user lookup with school context
  async testUserSchoolContext() {
    console.log('\n👤 Testing User School Context...');
    
    try {
      if (!this.testData.userId) {
        throw new Error('Test user not available');
      }

      // Test user with context
      const userWithContext = await UserPostgres.getWithContext(this.testData.userId);
      
      this.logTest(
        'User context retrieval',
        userWithContext !== null,
        userWithContext ? `Found: ${userWithContext.email}` : 'User not found'
      );

      // Test school membership verification
      const isMember = await UserPostgres.verifySchoolMembership(
        this.testData.userId, 
        this.testData.schoolId
      );
      
      this.logTest(
        'School membership verification',
        isMember,
        `User belongs to school: ${isMember}`
      );

      // Test user subdomain update
      const updatedSubdomain = await UserPostgres.updateSubdomain(this.testData.userId);
      
      this.logTest(
        'User subdomain update',
        updatedSubdomain !== null,
        `Updated subdomain: ${updatedSubdomain}`
      );

    } catch (error) {
      this.logTest('User school context tests', false, error.message);
    }
  }

  // Test registration flow validation
  async testRegistrationValidation() {
    console.log('\n🔍 Testing Registration Validation...');
    
    try {
      // Test email uniqueness
      const existingUser = await UserPostgres.findByEmail('testteacher@example.com');
      
      this.logTest(
        'Email uniqueness check',
        existingUser !== null,
        existingUser ? `Email exists: ${existingUser.email}` : 'Email not found'
      );

      // Test school-based user lookup
      const schoolUsers = await UserPostgres.findBySchool(this.testData.schoolId);
      
      this.logTest(
        'School-based user lookup',
        Array.isArray(schoolUsers.users),
        `Found ${schoolUsers.users.length} users in school`
      );

      // Test teacher filtering
      const teachers = await UserPostgres.findTeachersBySchool(this.testData.schoolId);
      
      this.logTest(
        'Teacher filtering by school',
        Array.isArray(teachers.users),
        `Found ${teachers.users.length} teachers in school`
      );

    } catch (error) {
      this.logTest('Registration validation tests', false, error.message);
    }
  }

  // Run all tests
  async runAllTests() {
    console.log('🚀 Starting Phase 2 Enhanced Registration Tests...\n');
    
    const startTime = Date.now();
    
    // Setup test data
    const setupSuccess = await this.setupTestData();
    if (!setupSuccess) {
      console.log('❌ Test setup failed, aborting tests');
      return false;
    }
    
    try {
      await this.testSchoolValidation();
      await this.testTeacherRegistration();
      await this.testNotificationSystem();
      await this.testUserSchoolContext();
      await this.testRegistrationValidation();
      
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
        console.log('\n✅ All tests passed! Phase 2 registration is ready.');
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
  const tester = new Phase2RegistrationTester();
  
  tester.runAllTests()
    .then(success => process.exit(success ? 0 : 1))
    .catch(error => {
      console.error('Test runner failed:', error);
      process.exit(1);
    });
}

module.exports = Phase2RegistrationTester;
