// Email service for password management notifications
const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: process.env.EMAIL_PORT || 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
  }

  /**
   * Send welcome email with auto-generated password to new school admin
   */
  async sendWelcomePasswordEmail(adminData, schoolData, temporaryPassword) {
    const subject = `Welcome to ${schoolData.name} - Your Admin Account Details`;
    
    const html = this.getWelcomeEmailTemplate(adminData, schoolData, temporaryPassword);
    const text = this.getWelcomeEmailText(adminData, schoolData, temporaryPassword);

    try {
      const info = await this.transporter.sendMail({
        from: `"${schoolData.name}" <${process.env.EMAIL_FROM || 'noreply@schoolshubs.com'}>`,
        to: adminData.email,
        subject,
        text,
        html
      });

      console.log('Welcome password email sent:', info.messageId);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('Failed to send welcome password email:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send password reset notification email
   */
  async sendPasswordResetEmail(adminData, schoolData, newPassword, resetBy) {
    const subject = `Your ${schoolData.name} Admin Password Has Been Reset`;
    
    const html = this.getPasswordResetEmailTemplate(adminData, schoolData, newPassword, resetBy);
    const text = this.getPasswordResetEmailText(adminData, schoolData, newPassword, resetBy);

    try {
      const info = await this.transporter.sendMail({
        from: `"${schoolData.name}" <${process.env.EMAIL_FROM || 'noreply@schoolshubs.com'}>`,
        to: adminData.email,
        subject,
        text,
        html
      });

      console.log('Password reset email sent:', info.messageId);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('Failed to send password reset email:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send password change confirmation email
   */
  async sendPasswordChangeConfirmation(adminData, schoolData) {
    const subject = `Your ${schoolData.name} Admin Password Has Been Changed`;
    
    const html = this.getPasswordChangeConfirmationTemplate(adminData, schoolData);
    const text = this.getPasswordChangeConfirmationText(adminData, schoolData);

    try {
      const info = await this.transporter.sendMail({
        from: `"${schoolData.name}" <${process.env.EMAIL_FROM || 'noreply@schoolshubs.com'}>`,
        to: adminData.email,
        subject,
        text,
        html
      });

      console.log('Password change confirmation sent:', info.messageId);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('Failed to send password change confirmation:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Generate HTML template for welcome email with password
   */
  getWelcomeEmailTemplate(adminData, schoolData, temporaryPassword) {
    const loginUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to ${schoolData.name}</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #1e40af; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f8f9fa; padding: 30px; border: 1px solid #dee2e6; border-top: none; }
        .password-box { background: #fff3cd; border: 1px solid #ffeaa7; padding: 20px; margin: 20px 0; border-radius: 5px; }
        .password { font-family: monospace; font-size: 18px; font-weight: bold; color: #d63031; background: #fff; padding: 10px; border-radius: 3px; }
        .button { display: inline-block; background: #28a745; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .steps { background: #e7f3ff; padding: 20px; margin: 20px 0; border-radius: 5px; }
        .steps h3 { color: #1e40af; margin-top: 0; }
        .steps ol { margin: 10px 0; padding-left: 20px; }
        .footer { background: #6c757d; color: white; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; font-size: 14px; }
        .warning { color: #856404; background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 15px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎓 Welcome to ${schoolData.name}</h1>
            <p>Your School Administrator Account is Ready!</p>
        </div>
        
        <div class="content">
            <h2>Hello ${adminData.firstName || 'Administrator'},</h2>
            
            <p>Congratulations! Your school administrator account for <strong>${schoolData.name}</strong> has been successfully created.</p>
            
            <div class="warning">
                <strong>⚠️ Important Security Notice:</strong> For your security, we have generated a temporary password. You will be required to change it when you first log in.
            </div>
            
            <h3>🔐 Your Login Credentials</h3>
            <div class="password-box">
                <p><strong>Email:</strong> ${adminData.email}</p>
                <p><strong>Temporary Password:</strong></p>
                <div class="password">${temporaryPassword}</div>
                <p><small>This password will expire after your first login.</small></p>
            </div>
            
            <div class="steps">
                <h3>📋 Next Steps:</h3>
                <ol>
                    <li><strong>Log In:</strong> Use the button below or visit ${loginUrl}</li>
                    <li><strong>Change Password:</strong> You'll be prompted to set a new secure password</li>
                    <li><strong>Complete Setup:</strong> Configure your school settings and add users</li>
                </ol>
            </div>
            
            <div style="text-align: center;">
                <a href="${loginUrl}/login" class="button">🚀 Log In to Your Account</a>
            </div>
            
            <h3>🔒 Password Requirements</h3>
            <p>When setting your new password, please ensure it:</p>
            <ul>
                <li>Is at least 8 characters long</li>
                <li>Contains both uppercase and lowercase letters</li>
                <li>Includes at least one number</li>
                <li>Contains at least one special character (!@#$%^&*)</li>
                <li>Is not a common password or personal information</li>
            </ul>
            
            <h3>💡 Need Help?</h3>
            <p>If you have any questions or encounter issues:</p>
            <ul>
                <li>Check our help documentation at ${loginUrl}/help</li>
                <li>Contact support at support@schoolshubs.com</li>
                <li>Reply to this email for assistance</li>
            </ul>
            
            <p><strong>Welcome aboard!</strong> We're excited to have you as part of the ${schoolData.name} team.</p>
        </div>
        
        <div class="footer">
            <p>© ${new Date().getFullYear()} ${schoolData.name}. All rights reserved.</p>
            <p>This is an automated message. Please do not reply to this email unless you need assistance.</p>
        </div>
    </div>
</body>
</html>`;
  }

  /**
   * Generate text version for welcome email
   */
  getWelcomeEmailText(adminData, schoolData, temporaryPassword) {
    const loginUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    
    return `
Welcome to ${schoolData.name}!

Hello ${adminData.firstName || 'Administrator'},

Congratulations! Your school administrator account for ${schoolData.name} has been successfully created.

IMPORTANT SECURITY NOTICE:
For your security, we have generated a temporary password. You will be required to change it when you first log in.

YOUR LOGIN CREDENTIALS:
Email: ${adminData.email}
Temporary Password: ${temporaryPassword}
This password will expire after your first login.

NEXT STEPS:
1. Log In: Visit ${loginUrl}/login
2. Change Password: You'll be prompted to set a new secure password
3. Complete Setup: Configure your school settings and add users

PASSWORD REQUIREMENTS:
When setting your new password, please ensure it:
- Is at least 8 characters long
- Contains both uppercase and lowercase letters
- Includes at least one number
- Contains at least one special character (!@#$%^&*)
- Is not a common password or personal information

NEED HELP?
If you have any questions or encounter issues:
- Check our help documentation at ${loginUrl}/help
- Contact support at support@schoolshubs.com
- Reply to this email for assistance

Welcome aboard! We're excited to have you as part of the ${schoolData.name} team.

© ${new Date().getFullYear()} ${schoolData.name}. All rights reserved.
This is an automated message. Please do not reply to this email unless you need assistance.
`;
  }

  /**
   * Generate HTML template for password reset email
   */
  getPasswordResetEmailTemplate(adminData, schoolData, newPassword, resetBy) {
    const loginUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Password Reset - ${schoolData.name}</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #dc3545; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f8f9fa; padding: 30px; border: 1px solid #dee2e6; border-top: none; }
        .password-box { background: #fff3cd; border: 1px solid #ffeaa7; padding: 20px; margin: 20px 0; border-radius: 5px; }
        .password { font-family: monospace; font-size: 18px; font-weight: bold; color: #d63031; background: #fff; padding: 10px; border-radius: 3px; }
        .button { display: inline-block; background: #dc3545; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .warning { color: #856404; background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 15px 0; }
        .footer { background: #6c757d; color: white; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔐 Password Reset Notification</h1>
            <p>${schoolData.name} Administrator Account</p>
        </div>
        
        <div class="content">
            <h2>Hello ${adminData.firstName || 'Administrator'},</h2>
            
            <p>Your administrator account password for <strong>${schoolData.name}</strong> has been reset by <strong>${resetBy}</strong>.</p>
            
            <div class="warning">
                <strong>⚠️ Security Action Required:</strong> For your security, you must change this temporary password when you next log in.
            </div>
            
            <h3>🔐 Your New Temporary Password</h3>
            <div class="password-box">
                <p><strong>Email:</strong> ${adminData.email}</p>
                <p><strong>Temporary Password:</strong></p>
                <div class="password">${newPassword}</div>
                <p><small>This password will expire after your first login.</small></p>
            </div>
            
            <div style="text-align: center;">
                <a href="${loginUrl}/login" class="button">🚀 Log In and Change Password</a>
            </div>
            
            <h3>📋 Important Information</h3>
            <ul>
                <li>This password reset was performed by a system administrator</li>
                <li>You must change this password on your next login</li>
                <li>Your previous password will no longer work</li>
                <li>If you did not request this change, please contact support immediately</li>
            </ul>
            
            <h3>🔒 Password Requirements</h3>
            <p>When setting your new password, please ensure it:</p>
            <ul>
                <li>Is at least 8 characters long</li>
                <li>Contains both uppercase and lowercase letters</li>
                <li>Includes at least one number</li>
                <li>Contains at least one special character (!@#$%^&*)</li>
                <li>Is not a common password or personal information</li>
            </ul>
            
            <h3>💡 Need Help?</h3>
            <p>If you have any questions or did not request this change:</p>
            <ul>
                <li>Contact your system administrator immediately</li>
                <li>Email support at support@schoolshubs.com</li>
                <li>Call our support hotline for urgent assistance</li>
            </ul>
        </div>
        
        <div class="footer">
            <p>© ${new Date().getFullYear()} ${schoolData.name}. All rights reserved.</p>
            <p>This is an automated message. Please do not reply to this email unless you need assistance.</p>
        </div>
    </div>
</body>
</html>`;
  }

  /**
   * Generate text version for password reset email
   */
  getPasswordResetEmailText(adminData, schoolData, newPassword, resetBy) {
    const loginUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    
    return `
Password Reset Notification - ${schoolData.name}

Hello ${adminData.firstName || 'Administrator'},

Your administrator account password for ${schoolData.name} has been reset by ${resetBy}.

SECURITY ACTION REQUIRED:
For your security, you must change this temporary password when you next log in.

YOUR NEW TEMPORARY PASSWORD:
Email: ${adminData.email}
Temporary Password: ${newPassword}
This password will expire after your first login.

Log in here: ${loginUrl}/login

IMPORTANT INFORMATION:
- This password reset was performed by a system administrator
- You must change this password on your next login
- Your previous password will no longer work
- If you did not request this change, please contact support immediately

PASSWORD REQUIREMENTS:
When setting your new password, please ensure it:
- Is at least 8 characters long
- Contains both uppercase and lowercase letters
- Includes at least one number
- Contains at least one special character (!@#$%^&*)
- Is not a common password or personal information

NEED HELP?
If you have any questions or did not request this change:
- Contact your system administrator immediately
- Email support at support@schoolshubs.com
- Call our support hotline for urgent assistance

© ${new Date().getFullYear()} ${schoolData.name}. All rights reserved.
This is an automated message. Please do not reply to this email unless you need assistance.
`;
  }

  /**
   * Generate HTML template for password change confirmation
   */
  getPasswordChangeConfirmationTemplate(adminData, schoolData) {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Password Changed - ${schoolData.name}</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #28a745; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f8f9fa; padding: 30px; border: 1px solid #dee2e6; border-top: none; }
        .success-box { background: #d4edda; border: 1px solid #c3e6cb; padding: 20px; margin: 20px 0; border-radius: 5px; }
        .footer { background: #6c757d; color: white; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>✅ Password Successfully Changed</h1>
            <p>${schoolData.name} Administrator Account</p>
        </div>
        
        <div class="content">
            <h2>Hello ${adminData.firstName || 'Administrator'},</h2>
            
            <div class="success-box">
                <h3>🎉 Confirmation Successful</h3>
                <p>Your password for <strong>${schoolData.name}</strong> has been successfully changed.</p>
                <p>Your account is now secure with your new password.</p>
            </div>
            
            <h3>📋 What Happened</h3>
            <ul>
                <li>Your password was changed on ${new Date().toLocaleString()}</li>
                <li>Your account security has been updated</li>
                <li>This change has been logged for security purposes</li>
                <li>You can now use your new password to access your account</li>
            </ul>
            
            <h3>🔒 Security Tips</h3>
            <ul>
                <li>Never share your password with anyone</li>
                <li>Use a unique password for this account</li>
                <li>Consider using a password manager</li>
                <li>Enable two-factor authentication if available</li>
            </ul>
            
            <h3>❓ Didn't Make This Change?</h3>
            <p>If you did not change your password, please:</p>
            <ul>
                <li>Contact your system administrator immediately</li>
                <li>Check your account for any suspicious activity</li>
                <li>Review your recent login history</li>
            </ul>
            
            <h3>💡 Need Help?</h3>
            <p>If you have any questions or concerns:</p>
            <ul>
                <li>Contact your system administrator</li>
                <li>Email support at support@schoolshubs.com</li>
                <li>Visit our help center for assistance</li>
            </ul>
        </div>
        
        <div class="footer">
            <p>© ${new Date().getFullYear()} ${schoolData.name}. All rights reserved.</p>
            <p>This is an automated message. Please do not reply to this email unless you need assistance.</p>
        </div>
    </div>
</body>
</html>`;
  }

  /**
   * Generate text version for password change confirmation
   */
  getPasswordChangeConfirmationText(adminData, schoolData) {
    return `
Password Successfully Changed - ${schoolData.name}

Hello ${adminData.firstName || 'Administrator'},

CONFIRMATION SUCCESSFUL
Your password for ${schoolData.name} has been successfully changed.
Your account is now secure with your new password.

WHAT HAPPENED:
- Your password was changed on ${new Date().toLocaleString()}
- Your account security has been updated
- This change has been logged for security purposes
- You can now use your new password to access your account

SECURITY TIPS:
- Never share your password with anyone
- Use a unique password for this account
- Consider using a password manager
- Enable two-factor authentication if available

DIDN'T MAKE THIS CHANGE?
If you did not change your password, please:
- Contact your system administrator immediately
- Check your account for any suspicious activity
- Review your recent login history

NEED HELP?
If you have any questions or concerns:
- Contact your system administrator
- Email support at support@schoolshubs.com
- Visit our help center for assistance

© ${new Date().getFullYear()} ${schoolData.name}. All rights reserved.
This is an automated message. Please do not reply to this email unless you need assistance.
`;
  }

  /**
   * Test email configuration
   */
  async testEmailConfiguration() {
    try {
      await this.transporter.verify();
      console.log('✅ Email service configuration is valid');
      return { success: true };
    } catch (error) {
      console.error('❌ Email service configuration failed:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = EmailService;
