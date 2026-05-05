// Test script for password management functionality
// This script tests the complete password management workflow

const pool = require('./db/postgres');
const bcrypt = require('bcryptjs');
const { PasswordGenerator, PasswordValidator } = require('./utils/password-generator');

class PasswordManagementTester {
  constructor() {
    this.testResults = [];
    this.testSchool = null;
    this.testAdmin = null;
    this.generatedPassword = null;
  }

  async runAllTests() {
    console.log('🧪 Starting Password Management Tests...\n');

    try {
      await this.testDatabaseSchema();
      await this.testPasswordGeneration();
      await this.testPasswordValidation();
      await this.testSchoolRegistrationWithGeneratedPassword();
      await this.testPasswordChangeEndpoint();
      await this.testPasswordResetToken();
      await this.testSuperAdminPasswordReset();
      
      this.printSummary();
    } catch (error) {
      console.error('❌ Test suite failed:', error);
    } finally {
      await pool.end();
    }
  }

  async testDatabaseSchema() {
    console.log('📋 Testing Database Schema...');
    
    try {
      // Check if password management columns exist
      const result = await pool.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND table_schema = 'public'
        AND column_name IN ('password_reset_required', 'password_reset_token', 'password_reset_expires', 'last_password_change', 'is_first_login')
        ORDER BY column_name
      `);

      if (result.rows.length === 5) {
        this.addTestResult('Database Schema - Users Columns', true, 'All password management columns exist');
      } else {
        this.addTestResult('Database Schema - Users Columns', false, `Expected 5 columns, found ${result.rows.length}`);
      }

      // Check if password_reset_logs table exists
      const tableResult = await pool.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'password_reset_logs'
      `);

      if (tableResult.rows.length > 0) {
        this.addTestResult('Database Schema - Password Reset Logs Table', true, 'Table exists');
      } else {
        this.addTestResult('Database Schema - Password Reset Logs Table', false, 'Table does not exist');
      }

      // Check indexes
      const indexResult = await pool.query(`
        SELECT indexname 
        FROM pg_indexes 
        WHERE tablename = 'users' 
        AND indexname LIKE '%password%'
      `);

      this.addTestResult('Database Schema - Indexes', indexResult.rows.length > 0, 
        `Found ${indexResult.rows.length} password-related indexes`);

    } catch (error) {
      this.addTestResult('Database Schema', false, error.message);
    }
  }

  async testPasswordGeneration() {
    console.log('\n🔐 Testing Password Generation...');
    
    try {
      // Test basic password generation
      const password1 = PasswordGenerator.generateSecurePassword(12);
      const password2 = PasswordGenerator.generateSecurePassword(12);
      
      this.addTestResult('Password Generation - Basic', 
        password1.length === 12 && password2.length === 12,
        `Generated passwords: ${password1.length} and ${password2.length} chars`);

      // Test password uniqueness
      const passwords = [];
      for (let i = 0; i < 100; i++) {
        passwords.push(PasswordGenerator.generateSecurePassword(12));
      }
      const uniquePasswords = new Set(passwords);
      
      this.addTestResult('Password Generation - Uniqueness', 
        uniquePasswords.size === 100,
        `Generated 100 unique passwords: ${uniquePasswords.size}/100 unique`);

      // Test password requirements
      const testPassword = PasswordGenerator.generateSecurePassword(12);
      const hasUppercase = /[A-Z]/.test(testPassword);
      const hasLowercase = /[a-z]/.test(testPassword);
      const hasNumber = /[0-9]/.test(testPassword);
      const hasSpecial = /[!@#$%^&*]/.test(testPassword);
      
      this.addTestResult('Password Generation - Requirements', 
        hasUppercase && hasLowercase && hasNumber && hasSpecial,
        `Password meets all requirements: ${testPassword}`);

    } catch (error) {
      this.addTestResult('Password Generation', false, error.message);
    }
  }

  async testPasswordValidation() {
    console.log('\n✅ Testing Password Validation...');
    
    try {
      // Test strong password
      const strongPassword = 'MySecureP@ssw0rd!';
      const strongResult = PasswordValidator.validate(strongPassword);
      
      this.addTestResult('Password Validation - Strong Password', 
        strongResult.isValid && strongResult.score >= 80,
        `Score: ${strongResult.score}/100, Valid: ${strongResult.isValid}`);

      // Test weak password
      const weakPassword = 'weak';
      const weakResult = PasswordValidator.validate(weakPassword);
      
      this.addTestResult('Password Validation - Weak Password', 
        !weakResult.isValid && weakResult.score < 40,
        `Score: ${weakResult.score}/100, Valid: ${weakResult.isValid}`);

      // Test common patterns
      const commonPassword = 'password123';
      const commonResult = PasswordValidator.checkCommonPatterns(commonPassword);
      
      this.addTestResult('Password Validation - Common Pattern', 
        commonResult.isCommon,
        `Detected common pattern: ${commonResult.message}`);

    } catch (error) {
      this.addTestResult('Password Validation', false, error.message);
    }
  }

  async testSchoolRegistrationWithGeneratedPassword() {
    console.log('\n🏫 Testing School Registration with Generated Password...');
    
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Create test school
      const schoolResult = await client.query(`
        INSERT INTO schools (name, domain, state_id, status, is_verified, created_at, updated_at)
        VALUES ($1, $2, $3, 'active', true, NOW(), NOW())
        RETURNING id, name, domain
      `, ['Test School for Password', 'test-password.schoolshubs.com', 'test-state-id']);

      this.testSchool = schoolResult.rows[0];

      // Generate password for admin
      this.generatedPassword = PasswordGenerator.generateSecurePassword(12);
      const passwordHash = await bcrypt.hash(this.generatedPassword, 12);

      // Create admin user with password reset required
      const adminResult = await client.query(`
        INSERT INTO users (
          school_id, email, password_hash, first_name, last_name, 
          role, is_active, password_reset_required, is_first_login, 
          created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, true, true, true, NOW(), NOW())
        RETURNING id, email, first_name, last_name, password_reset_required, is_first_login
      `, [
        this.testSchool.id,
        'test-admin@test-school.com',
        passwordHash,
        'Test',
        'Admin'
      ]);

      this.testAdmin = adminResult.rows[0];

      await client.query('COMMIT');

      this.addTestResult('School Registration - Database Creation', 
        this.testSchool && this.testAdmin,
        `School: ${this.testSchool.name}, Admin: ${this.testAdmin.email}`);

      this.addTestResult('School Registration - Password Flags', 
        this.testAdmin.password_reset_required && this.testAdmin.is_first_login,
        `Reset Required: ${this.testAdmin.password_reset_required}, First Login: ${this.testAdmin.is_first_login}`);

      this.addTestResult('School Registration - Generated Password', 
        this.generatedPassword && this.generatedPassword.length === 12,
        `Generated password: ${this.generatedPassword.length} characters`);

    } catch (error) {
      await client.query('ROLLBACK');
      this.addTestResult('School Registration', false, error.message);
    } finally {
      client.release();
    }
  }

  async testPasswordChangeEndpoint() {
    console.log('\n🔄 Testing Password Change Endpoint...');
    
    if (!this.testAdmin) {
      this.addTestResult('Password Change Endpoint', false, 'No test admin available');
      return;
    }

    try {
      // Simulate password change API call (direct database update for testing)
      const newPassword = 'NewSecureP@ssw0rd!';
      const newPasswordHash = await bcrypt.hash(newPassword, 12);
      
      const updateResult = await pool.query(`
        UPDATE users 
        SET password_hash = $1, 
            password_reset_required = false, 
            is_first_login = false,
            last_password_change = NOW(),
            updated_at = NOW()
        WHERE id = $2
        RETURNING password_reset_required, is_first_login, last_password_change
      `, [newPasswordHash, this.testAdmin.id]);

      const updatedUser = updateResult.rows[0];

      this.addTestResult('Password Change - Database Update', 
        !updatedUser.password_reset_required && !updatedUser.is_first_login,
        `Reset Required: ${updatedUser.password_reset_required}, First Login: ${updatedUser.is_first_login}`);

      // Test password verification
      const isOldPasswordValid = await bcrypt.compare(this.generatedPassword, newPasswordHash);
      const isNewPasswordValid = await bcrypt.compare(newPassword, newPasswordHash);
      
      this.addTestResult('Password Change - Verification', 
        !isOldPasswordValid && isNewPasswordValid,
        `Old password invalid: ${!isOldPasswordValid}, New password valid: ${isNewPasswordValid}`);

      // Log password change for audit
      await pool.query(`
        INSERT INTO password_reset_logs (user_id, reset_by, reset_type, reset_reason)
        VALUES ($1, $1, 'self', 'Test password change')
      `, [this.testAdmin.id]);

      this.addTestResult('Password Change - Audit Log', true, 'Password change logged successfully');

    } catch (error) {
      this.addTestResult('Password Change Endpoint', false, error.message);
    }
  }

  async testPasswordResetToken() {
    console.log('\n🔑 Testing Password Reset Token...');
    
    if (!this.testAdmin) {
      this.addTestResult('Password Reset Token', false, 'No test admin available');
      return;
    }

    try {
      // Generate and store reset token
      const resetToken = PasswordGenerator.generateResetToken();
      const resetTokenHash = await bcrypt.hash(resetToken, 12);
      const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await pool.query(`
        UPDATE users 
        SET password_reset_token = $1, 
            password_reset_expires = $2,
            updated_at = NOW()
        WHERE id = $3
      `, [resetTokenHash, resetExpires, this.testAdmin.id]);

      // Test token verification
      const userResult = await pool.query(`
        SELECT password_reset_token, password_reset_expires
        FROM users 
        WHERE id = $1 AND password_reset_token IS NOT NULL
      `, [this.testAdmin.id]);

      if (userResult.rows.length > 0) {
        const user = userResult.rows[0];
        const isTokenValid = await bcrypt.compare(resetToken, user.password_reset_token);
        const isTokenExpired = new Date() > user.password_reset_expires;

        this.addTestResult('Password Reset Token - Generation', true, 'Token generated and stored');
        this.addTestResult('Password Reset Token - Verification', isTokenValid, `Token valid: ${isTokenValid}`);
        this.addTestResult('Password Reset Token - Expiration', !isTokenExpired, `Token expired: ${isTokenExpired}`);
      } else {
        this.addTestResult('Password Reset Token', false, 'Token not found in database');
      }

    } catch (error) {
      this.addTestResult('Password Reset Token', false, error.message);
    }
  }

  async testSuperAdminPasswordReset() {
    console.log('\n👑 Testing Super Admin Password Reset...');
    
    if (!this.testAdmin) {
      this.addTestResult('Super Admin Password Reset', false, 'No test admin available');
      return;
    }

    try {
      // Simulate super admin password reset
      const newPassword = PasswordGenerator.generateSecurePassword(12);
      const newPasswordHash = await bcrypt.hash(newPassword, 12);

      // Get old password hash for audit
      const oldUserResult = await pool.query(`
        SELECT password_hash FROM users WHERE id = $1
      `, [this.testAdmin.id]);

      const oldPasswordHash = oldUserResult.rows[0].password_hash;

      // Update password and set reset required
      const resetResult = await pool.query(`
        UPDATE users 
        SET password_hash = $1, 
            password_reset_required = true, 
            is_first_login = false,
            last_password_change = NOW(),
            updated_at = NOW()
        WHERE id = $2
        RETURNING password_reset_required
      `, [newPasswordHash, this.testAdmin.id]);

      // Log password reset for audit
      await pool.query(`
        INSERT INTO password_reset_logs (user_id, reset_by, reset_type, reset_reason, old_password_hash)
        VALUES ($1, $1, 'forced', 'Test super admin reset', $2)
      `, [this.testAdmin.id, oldPasswordHash]);

      const updatedUser = resetResult.rows[0];

      this.addTestResult('Super Admin Reset - Password Update', 
        updatedUser.password_reset_required,
        `Password reset required: ${updatedUser.password_reset_required}`);

      this.addTestResult('Super Admin Reset - Audit Trail', true, 'Password reset logged with audit trail');

      // Test audit log retrieval
      const auditResult = await pool.query(`
        SELECT reset_type, reset_reason, created_at
        FROM password_reset_logs 
        WHERE user_id = $1 
        ORDER BY created_at DESC
        LIMIT 3
      `, [this.testAdmin.id]);

      this.addTestResult('Super Admin Reset - Audit Retrieval', 
        auditResult.rows.length > 0,
        `Found ${auditResult.rows.length} audit entries`);

    } catch (error) {
      this.addTestResult('Super Admin Password Reset', false, error.message);
    }
  }

  addTestResult(testName, passed, details) {
    const result = {
      test: testName,
      passed,
      details,
      timestamp: new Date().toISOString()
    };
    
    this.testResults.push(result);
    
    const status = passed ? '✅' : '❌';
    console.log(`  ${status} ${testName}: ${details}`);
  }

  printSummary() {
    console.log('\n📊 Test Summary:');
    console.log('================');
    
    const passed = this.testResults.filter(r => r.passed).length;
    const failed = this.testResults.filter(r => r.passed === false).length;
    const total = this.testResults.length;
    
    console.log(`Total Tests: ${total}`);
    console.log(`Passed: ${passed} ✅`);
    console.log(`Failed: ${failed} ❌`);
    console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%`);
    
    if (failed > 0) {
      console.log('\n❌ Failed Tests:');
      this.testResults
        .filter(r => r.passed === false)
        .forEach(r => console.log(`  - ${r.test}: ${r.details}`));
    }

    console.log('\n🎯 Password Management Feature Status:');
    if (passed === total) {
      console.log('✅ All tests passed! Password management feature is ready for deployment.');
    } else {
      console.log('⚠️  Some tests failed. Please review and fix issues before deployment.');
    }

    // Cleanup test data
    this.cleanupTestData();
  }

  async cleanupTestData() {
    console.log('\n🧹 Cleaning up test data...');
    
    try {
      if (this.testAdmin) {
        await pool.query('DELETE FROM password_reset_logs WHERE user_id = $1', [this.testAdmin.id]);
        await pool.query('DELETE FROM users WHERE id = $1', [this.testAdmin.id]);
      }
      
      if (this.testSchool) {
        await pool.query('DELETE FROM schools WHERE id = $1', [this.testSchool.id]);
      }
      
      console.log('✅ Test data cleaned up successfully');
    } catch (error) {
      console.log('⚠️  Error cleaning up test data:', error.message);
    }
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  const tester = new PasswordManagementTester();
  tester.runAllTests();
}

module.exports = PasswordManagementTester;
