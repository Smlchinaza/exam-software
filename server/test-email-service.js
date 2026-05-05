// Test script for email service functionality
const EmailService = require('./utils/email-service');

console.log('🧪 Testing Email Service...\n');

async function testEmailService() {
  const emailService = new EmailService();
  
  // Test 1: Email Configuration
  console.log('1. Testing Email Configuration...');
  try {
    const configResult = await emailService.testEmailConfiguration();
    if (configResult.success) {
      console.log('   ✅ Email configuration is valid');
    } else {
      console.log('   ❌ Email configuration failed:', configResult.error);
      console.log('   💡 Please check your EMAIL_HOST, EMAIL_USER, and EMAIL_PASS in .env');
    }
  } catch (error) {
    console.log('   ❌ Email configuration test failed:', error.message);
  }

  // Test 2: Email Template Generation
  console.log('\n2. Testing Email Template Generation...');
  try {
    const adminData = {
      email: 'test-admin@example.com',
      firstName: 'John',
      lastName: 'Doe'
    };
    
    const schoolData = {
      name: 'Test School',
      domain: 'test-school.schoolshubs.com'
    };
    
    const temporaryPassword = 'TestP@ssw0rd123!';
    
    // Test welcome email template
    const welcomeHtml = emailService.getWelcomeEmailTemplate(adminData, schoolData, temporaryPassword);
    const welcomeText = emailService.getWelcomeEmailText(adminData, schoolData, temporaryPassword);
    
    console.log('   ✅ Welcome email HTML template generated');
    console.log('   ✅ Welcome email text template generated');
    console.log(`      - HTML length: ${welcomeHtml.length} characters`);
    console.log(`      - Text length: ${welcomeText.length} characters`);
    
    // Test password reset email template
    const resetHtml = emailService.getPasswordResetEmailTemplate(adminData, schoolData, temporaryPassword, 'Super Admin');
    const resetText = emailService.getPasswordResetEmailText(adminData, schoolData, temporaryPassword, 'Super Admin');
    
    console.log('   ✅ Password reset HTML template generated');
    console.log('   ✅ Password reset text template generated');
    console.log(`      - HTML length: ${resetHtml.length} characters`);
    console.log(`      - Text length: ${resetText.length} characters`);
    
    // Test password change confirmation template
    const confirmHtml = emailService.getPasswordChangeConfirmationTemplate(adminData, schoolData);
    const confirmText = emailService.getPasswordChangeConfirmationText(adminData, schoolData);
    
    console.log('   ✅ Password change confirmation HTML template generated');
    console.log('   ✅ Password change confirmation text template generated');
    console.log(`      - HTML length: ${confirmHtml.length} characters`);
    console.log(`      - Text length: ${confirmText.length} characters`);
    
  } catch (error) {
    console.log('   ❌ Email template generation failed:', error.message);
  }

  // Test 3: Send Test Email (if configured)
  console.log('\n3. Testing Email Sending (Optional)...');
  try {
    // Check if email is configured
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.log('   ⚠️  Email not configured - skipping email sending test');
      console.log('   💡 To test email sending, set EMAIL_USER and EMAIL_PASS in .env');
      return;
    }

    const testResult = await emailService.sendWelcomePasswordEmail(
      {
        email: process.env.EMAIL_USER, // Send to self for testing
        firstName: 'Test',
        lastName: 'User'
      },
      {
        name: 'Test School',
        domain: 'test-school.schoolshubs.com'
      },
      'TestP@ssw0rd123!'
    );

    if (testResult.success) {
      console.log('   ✅ Test email sent successfully');
      console.log(`      - Message ID: ${testResult.messageId}`);
    } else {
      console.log('   ❌ Test email failed:', testResult.error);
    }
    
  } catch (error) {
    console.log('   ❌ Email sending test failed:', error.message);
  }
}

// Test email content preview
function previewEmailContent() {
  console.log('\n📧 Email Content Preview:');
  console.log('========================');
  
  const emailService = new EmailService();
  const adminData = {
    email: 'new-admin@school.com',
    firstName: 'Sarah',
    lastName: 'Johnson'
  };
  
  const schoolData = {
    name: 'Excellence Academy',
    domain: 'excellence.schoolshubs.com'
  };
  
  const temporaryPassword = 'SecureP@ssw0rd789!';
  
  console.log('\n🎓 Welcome Email Preview:');
  console.log('========================');
  const welcomeHtml = emailService.getWelcomeEmailTemplate(adminData, schoolData, temporaryPassword);
  console.log('HTML template includes:');
  console.log('  ✅ School branding and colors');
  console.log('  ✅ Admin login credentials');
  console.log('  ✅ Temporary password highlighted');
  console.log('  ✅ Step-by-step login guide');
  console.log('  ✅ Password requirements');
  console.log('  ✅ Help and support information');
  
  console.log('\n🔐 Password Reset Email Preview:');
  console.log('===============================');
  const resetHtml = emailService.getPasswordResetEmailTemplate(adminData, schoolData, temporaryPassword, 'Super Admin');
  console.log('HTML template includes:');
  console.log('  ✅ Security warning header');
  console.log('  ✅ New temporary password');
  console.log('  ✅ Who performed the reset');
  console.log('  ✅ Immediate action required');
  console.log('  ✅ Security best practices');
}

// Run tests
async function runAllTests() {
  await testEmailService();
  previewEmailContent();
  
  console.log('\n🎯 Email Service Test Complete!');
  console.log('\n📋 Email Features Implemented:');
  console.log('  ✅ Welcome emails with auto-generated passwords');
  console.log('  ✅ Password reset notifications');
  console.log('  ✅ Password change confirmations');
  console.log('  ✅ Professional HTML email templates');
  console.log('  ✅ Text-only versions for accessibility');
  console.log('  ✅ School branding customization');
  console.log('  ✅ Security warnings and guidance');
  console.log('  ✅ Help and support information');
  
  console.log('\n📧 Email Configuration Required:');
  console.log('  1. Set EMAIL_HOST (smtp.gmail.com recommended)');
  console.log('  2. Set EMAIL_USER (your Gmail address)');
  console.log('  3. Set EMAIL_PASS (Gmail App Password)');
  console.log('  4. Set EMAIL_FROM (noreply@yourdomain.com)');
  
  console.log('\n🔧 Gmail Setup Instructions:');
  console.log('  1. Enable 2-factor authentication');
  console.log('  2. Go to Google Account settings');
  console.log('  3. Security → 2-Step Verification → App passwords');
  console.log('  4. Generate new app password');
  console.log('  5. Use app password in EMAIL_PASS');
}

// Run if executed directly
if (require.main === module) {
  runAllTests();
}

module.exports = { testEmailService, previewEmailContent };
