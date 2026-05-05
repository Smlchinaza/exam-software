// Test script to verify password reset functionality
const EmailService = require('./utils/email-service');
const { PasswordGenerator, PasswordValidator } = require('./utils/password-generator');

console.log('Testing password reset components...\n');

// Test 1: Email Service
try {
  console.log('1. Testing EmailService...');
  const emailService = new EmailService();
  console.log('✅ EmailService constructor works');
  
  // Test configuration
  console.log('✅ EmailService imported successfully');
} catch (error) {
  console.log('❌ EmailService failed:', error.message);
}

// Test 2: Password Generator
try {
  console.log('\n2. Testing PasswordGenerator...');
  const password = PasswordGenerator.generateSecurePassword(12);
  console.log('✅ Generated password:', password);
  console.log('   Length:', password.length);
  
  // Test password validation
  const validation = PasswordValidator.validateStrength(password);
  console.log('Password validation:', validation.isValid ? '✅ PASS' : '❌ FAIL');
  if (!validation.isValid) {
    console.log('   Issues:', validation.feedback);
  }
} catch (error) {
  console.log('❌ PasswordGenerator failed:', error.message);
}

console.log('\nTest completed!');
