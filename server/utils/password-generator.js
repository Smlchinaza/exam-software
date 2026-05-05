const crypto = require('crypto');
const bcrypt = require('bcryptjs');

/**
 * Utility functions for secure password generation and validation
 */

class PasswordGenerator {
  /**
   * Generate a cryptographically secure random password
   * @param {number} length - Password length (default 12)
   * @returns {string} Generated password
   */
  static generateSecurePassword(length = 12) {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    // Remove ambiguous characters: 0, O, l, I
    const safeCharset = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*';
    
    let password = '';
    const bytes = crypto.randomBytes(length);
    
    for (let i = 0; i < length; i++) {
      const index = bytes[i] % safeCharset.length;
      password += safeCharset[index];
    }
    
    // Ensure password meets requirements
    return this.ensurePasswordRequirements(password, length);
  }

  /**
   * Ensure password meets minimum security requirements
   * @param {string} password - Password to check and enhance if needed
   * @param {number} minLength - Minimum length requirement
   * @returns {string} Password meeting requirements
   */
  static ensurePasswordRequirements(password, minLength = 8) {
    let result = password;
    
    // Ensure minimum length
    while (result.length < minLength) {
      result += this.getRandomChar('all');
    }
    
    // Ensure at least one uppercase letter
    if (!/[A-Z]/.test(result)) {
      result = result.slice(0, -1) + this.getRandomChar('uppercase');
    }
    
    // Ensure at least one lowercase letter
    if (!/[a-z]/.test(result)) {
      result = result.slice(0, -1) + this.getRandomChar('lowercase');
    }
    
    // Ensure at least one number
    if (!/[0-9]/.test(result)) {
      result = result.slice(0, -1) + this.getRandomChar('number');
    }
    
    // Ensure at least one special character
    if (!/[!@#$%^&*]/.test(result)) {
      result = result.slice(0, -1) + this.getRandomChar('special');
    }
    
    // Shuffle the password to avoid predictable patterns
    return this.shuffleString(result);
  }

  /**
   * Get a random character from specified character set
   * @param {string} type - Type of character set ('uppercase', 'lowercase', 'number', 'special', 'all')
   * @returns {string} Random character
   */
  static getRandomChar(type) {
    const charsets = {
      uppercase: 'ABCDEFGHJKLMNPQRSTUVWXYZ',
      lowercase: 'abcdefghijkmnopqrstuvwxyz',
      number: '23456789',
      special: '!@#$%^&*',
      all: 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*'
    };
    
    const charset = charsets[type] || charsets.all;
    const index = crypto.randomBytes(1)[0] % charset.length;
    return charset[index];
  }

  /**
   * Shuffle string characters randomly
   * @param {string} str - String to shuffle
   * @returns {string} Shuffled string
   */
  static shuffleString(str) {
    const arr = str.split('');
    for (let i = arr.length - 1; i > 0; i--) {
      const j = crypto.randomBytes(1)[0] % (i + 1);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr.join('');
  }

  /**
   * Generate password reset token
   * @returns {string} Secure reset token
   */
  static generateResetToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Hash password using bcrypt
   * @param {string} password - Plain text password
   * @returns {Promise<string>} Hashed password
   */
  static async hashPassword(password) {
    const saltRounds = 12;
    return await bcrypt.hash(password, saltRounds);
  }

  /**
   * Verify password against hash
   * @param {string} password - Plain text password
   * @param {string} hash - Hashed password
   * @returns {Promise<boolean>} True if password matches
   */
  static async verifyPassword(password, hash) {
    return await bcrypt.compare(password, hash);
  }
}

/**
 * Password validation utilities
 */
class PasswordValidator {
  /**
   * Validate password strength
   * @param {string} password - Password to validate
   * @returns {Object} Validation result with score and feedback
   */
  static validateStrength(password) {
    const result = {
      isValid: true,
      score: 0,
      feedback: [],
      requirements: {
        minLength: password.length >= 8,
        hasUppercase: /[A-Z]/.test(password),
        hasLowercase: /[a-z]/.test(password),
        hasNumber: /[0-9]/.test(password),
        hasSpecialChar: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
      }
    };

    // Check minimum length
    if (password.length < 8) {
      result.isValid = false;
      result.feedback.push('Password must be at least 8 characters long');
    } else {
      result.score += 20;
    }

    // Check for uppercase letter
    if (!result.requirements.hasUppercase) {
      result.isValid = false;
      result.feedback.push('Password must contain at least one uppercase letter');
    } else {
      result.score += 20;
    }

    // Check for lowercase letter
    if (!result.requirements.hasLowercase) {
      result.isValid = false;
      result.feedback.push('Password must contain at least one lowercase letter');
    } else {
      result.score += 20;
    }

    // Check for number
    if (!result.requirements.hasNumber) {
      result.isValid = false;
      result.feedback.push('Password must contain at least one number');
    } else {
      result.score += 20;
    }

    // Check for special character
    if (!result.requirements.hasSpecialChar) {
      result.isValid = false;
      result.feedback.push('Password must contain at least one special character');
    } else {
      result.score += 20;
    }

    // Additional scoring for length
    if (password.length >= 12) {
      result.score += 10;
    }
    if (password.length >= 16) {
      result.score += 10;
    }

    return result;
  }

  /**
   * Check if password matches common patterns (weak passwords)
   * @param {string} password - Password to check
   * @returns {Object} Check result
   */
  static checkCommonPatterns(password) {
    const commonPatterns = [
      /^password/i,
      /^123456/,
      /^qwerty/i,
      /^admin/i,
      /^letmein/i,
      /^welcome/i,
      /^(.)\1+$/, // Repeated characters
      /^(123|abc|qwe)/i // Common sequences
    ];

    const isCommon = commonPatterns.some(pattern => pattern.test(password));
    
    return {
      isCommon,
      message: isCommon ? 'Password is too common and easily guessable' : null
    };
  }

  /**
   * Comprehensive password validation
   * @param {string} password - Password to validate
   * @param {string} email - User email (to check if password contains email)
   * @param {string} firstName - User first name (to check if password contains name)
   * @returns {Object} Complete validation result
   */
  static validate(password, email = '', firstName = '') {
    const strengthResult = this.validateStrength(password);
    const commonPatternResult = this.checkCommonPatterns(password);
    
    const result = {
      ...strengthResult,
      warnings: []
    };

    // Check for personal information
    if (email && password.toLowerCase().includes(email.split('@')[0].toLowerCase())) {
      result.warnings.push('Password should not contain your email address');
    }

    if (firstName && password.toLowerCase().includes(firstName.toLowerCase())) {
      result.warnings.push('Password should not contain your name');
    }

    // Check common patterns
    if (commonPatternResult.isCommon) {
      result.isValid = false;
      result.feedback.push(commonPatternResult.message);
    }

    return result;
  }
}

module.exports = {
  PasswordGenerator,
  PasswordValidator
};
