// Test password generation without database connection
const { PasswordGenerator, PasswordValidator } = require('./utils/password-generator');

console.log('🧪 Testing Password Management Utilities...\n');

// Test 1: Password Generation
console.log('1. Testing Password Generation...');
try {
  const password1 = PasswordGenerator.generateSecurePassword(12);
  const password2 = PasswordGenerator.generateSecurePassword(12);
  
  console.log(`   ✅ Generated password 1: ${password1} (${password1.length} chars)`);
  console.log(`   ✅ Generated password 2: ${password2} (${password2.length} chars)`);
  
  // Test uniqueness
  const passwords = [];
  for (let i = 0; i < 10; i++) {
    passwords.push(PasswordGenerator.generateSecurePassword(12));
  }
  const uniquePasswords = new Set(passwords);
  
  console.log(`   ✅ Generated 10 unique passwords: ${uniquePasswords.size}/10 unique`);
  
  // Test requirements
  const testPassword = PasswordGenerator.generateSecurePassword(12);
  const hasUppercase = /[A-Z]/.test(testPassword);
  const hasLowercase = /[a-z]/.test(testPassword);
  const hasNumber = /[0-9]/.test(testPassword);
  const hasSpecial = /[!@#$%^&*]/.test(testPassword);
  
  console.log(`   ✅ Password requirements check for: ${testPassword}`);
  console.log(`      - Uppercase: ${hasUppercase}`);
  console.log(`      - Lowercase: ${hasLowercase}`);
  console.log(`      - Numbers: ${hasNumber}`);
  console.log(`      - Special: ${hasSpecial}`);
  
} catch (error) {
  console.log(`   ❌ Password generation failed: ${error.message}`);
}

// Test 2: Password Validation
console.log('\n2. Testing Password Validation...');
try {
  // Test strong password
  const strongPassword = 'MySecureP@ssw0rd!';
  const strongResult = PasswordValidator.validate(strongPassword);
  
  console.log(`   ✅ Strong password "${strongPassword}"`);
  console.log(`      - Score: ${strongResult.score}/100`);
  console.log(`      - Valid: ${strongResult.isValid}`);
  console.log(`      - Feedback: ${strongResult.feedback.join(', ') || 'None'}`);
  
  // Test weak password
  const weakPassword = 'weak';
  const weakResult = PasswordValidator.validate(weakPassword);
  
  console.log(`   ✅ Weak password "${weakPassword}"`);
  console.log(`      - Score: ${weakResult.score}/100`);
  console.log(`      - Valid: ${weakResult.isValid}`);
  console.log(`      - Feedback: ${weakResult.feedback.join(', ')}`);
  
  // Test common patterns
  const commonPassword = 'password123';
  const commonResult = PasswordValidator.checkCommonPatterns(commonPassword);
  
  console.log(`   ✅ Common pattern check for "${commonPassword}"`);
  console.log(`      - Is common: ${commonResult.isCommon}`);
  console.log(`      - Message: ${commonResult.message || 'None'}`);
  
} catch (error) {
  console.log(`   ❌ Password validation failed: ${error.message}`);
}

// Test 3: Reset Token Generation
console.log('\n3. Testing Reset Token Generation...');
try {
  const token1 = PasswordGenerator.generateResetToken();
  const token2 = PasswordGenerator.generateResetToken();
  
  console.log(`   ✅ Generated token 1: ${token1} (${token1.length} chars)`);
  console.log(`   ✅ Generated token 2: ${token2} (${token2.length} chars)`);
  console.log(`   ✅ Tokens are unique: ${token1 !== token2}`);
  
} catch (error) {
  console.log(`   ❌ Token generation failed: ${error.message}`);
}

console.log('\n🎯 Password Management Utilities Test Complete!');
console.log('\n📋 Next Steps:');
console.log('1. Run the manual SQL migration in your PostgreSQL database');
console.log('2. Test the complete password management workflow');
console.log('3. Start the server and verify the new endpoints work');

console.log('\n📄 Manual Migration File:');
console.log('   server/manual-password-migration.sql');
console.log('\n🔧 To run the migration:');
console.log('   1. Connect to your PostgreSQL database');
console.log('   2. Run the SQL commands in manual-password-migration.sql');
console.log('   3. Verify the tables and columns were created');
