const express = require("express");
const jwt = require("jsonwebtoken");
const User = require("../models/users/User");
const Student = require('../models/students/Student');
const { authenticateJWT } = require('../middleware/auth');
const { check } = require('express-validator');
const validate = require('../middleware/validate');
const bcrypt = require('bcryptjs');
const pool = require('../db/postgres');

const router = express.Router();

// @route   POST api/auth/register
// @desc    Register a user
// @access  Public
router.post('/register', async (req, res) => {
  try {
    console.log('Registration request received:', { 
      email: req.body.email,
      role: req.body.role 
    });

    const {
      email,
      password,
      role,
      displayName,
      firstName,
      lastName,
      rememberMe
    } = req.body;

    // Validate required fields
    if (!email || !password || !role || !displayName || !firstName || !lastName) {
      console.log('Missing required fields');
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.log('Invalid email format:', email);
      return res.status(400).json({ message: 'Invalid email format' });
    }

    // Validate password strength
    if (password.length < 6) {
      console.log('Password too short');
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }

    // Check if user already exists
    let user = await User.findOne({ email });
    if (user) {
      console.log('User already exists:', email);
      return res.status(400).json({ message: 'User already exists' });
    }

    // Create new user
    user = new User({
      email,
      password,
      role,
      displayName,
      firstName,
      lastName,
      approved: role === 'teacher' ? false : true // Teachers require approval, others are auto-approved
    });

    // Assign plain password; pre-save hook will hash it
    user.password = password;
    await user.save();

    if (role === 'student') {
      const { currentClass, dateOfBirth, gender, phone, address, parentName, parentPhone, emergencyContact } = req.body;
      if (!currentClass || !dateOfBirth || !gender || !phone || !address || !parentName || !parentPhone || !emergencyContact) {
        return res.status(400).json({ message: 'All student fields are required' });
      }
      
      try {
        const student = new Student({
          admissionNumber: `ADM${Date.now()}`,
          fullName: displayName,
          dateOfBirth,
          gender,
          currentClass,
          email,
          phone,
          address,
          parentName,
          parentPhone,
          emergencyContact
        });
        await student.save();
        console.log('Student record created successfully:', { email, studentId: student._id });
      } catch (studentError) {
        console.error('Error creating student record:', studentError);
        // Don't fail the entire registration if student record creation fails
        // The user can still log in and access basic functionality
      }
    }

    // Create JWT token
    const payload = {
      user: {
        id: user.id,
        role: user.role,
        email: user.email
      }
    };

    const token = jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Return user data (excluding password)
    const userData = {
      id: user.id,
      email: user.email,
      role: user.role,
      displayName: user.displayName,
      firstName: user.firstName,
      lastName: user.lastName
    };

    console.log('Registration successful:', { 
      userId: user.id, 
      role: user.role 
    });

    res.json({
      token,
      user: userData,
      rememberMe
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

// @route   POST api/auth/login
// @desc    Login user with password change requirement check
// @access  Public
router.post('/login', async (req, res) => {
  try {
    console.log('Login request received:', { 
      email: req.body.email,
      rememberMe: req.body.rememberMe 
    });

    const { email, password, rememberMe } = req.body;

    // Validate required fields
    if (!email || !password) {
      console.log('Missing required fields');
      return res.status(400).json({ 
        message: 'Email and password are required' 
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.log('Invalid email format:', email);
      return res.status(400).json({ 
        message: 'Invalid email format' 
      });
    }

    // Try to find user in PostgreSQL first (new system)
    let pgUser = null;
    try {
      const userRes = await pool.query(
        `SELECT id, email, password_hash, role, first_name, last_name, is_active, 
                password_reset_required, is_first_login, school_id
         FROM users WHERE email = $1`,
        [email]
      );
      
      if (userRes.rows.length > 0) {
        pgUser = userRes.rows[0];
      }
    } catch (pgError) {
      console.log('PostgreSQL user lookup failed, trying MongoDB:', pgError.message);
    }

    // If not found in PostgreSQL, try MongoDB (legacy)
    let user = null;
    if (!pgUser) {
      user = await User.findOne({ email });
      if (!user) {
        console.log('User not found:', email);
        return res.status(400).json({ 
          message: 'Invalid credentials' 
        });
      }

      // If teacher and not approved, deny login
      if (user.role === 'teacher' && !user.approved) {
        return res.status(403).json({ message: 'Your registration is pending admin approval.' });
      }

      // Verify password (MongoDB)
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        console.log('Invalid password for user:', email);
        return res.status(400).json({ 
          message: 'Invalid credentials' 
        });
      }

      // Create JWT token for MongoDB user
      const payload = {
        user: {
          id: user.id,
          role: user.role,
          email: user.email
        }
      };

      const token = jwt.sign(
        payload,
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      // Return user data (excluding password)
      const userData = {
        id: user.id,
        email: user.email,
        role: user.role,
        displayName: user.displayName,
        firstName: user.firstName,
        lastName: user.lastName,
        passwordChangeRequired: false,
        isFirstLogin: false
      };

      console.log('MongoDB login successful:', { 
        userId: user.id, 
        role: user.role 
      });

      return res.json({
        token,
        user: userData,
        rememberMe
      });
    }

    // PostgreSQL user authentication
    if (!pgUser.is_active) {
      return res.status(403).json({ message: 'Account is deactivated' });
    }

    // Verify password (PostgreSQL)
    const isMatch = await bcrypt.compare(password, pgUser.password_hash);
    if (!isMatch) {
      console.log('Invalid password for user:', email);
      return res.status(400).json({ 
        message: 'Invalid credentials' 
      });
    }

    // Create JWT token for PostgreSQL user
    const payload = {
      id: pgUser.id,
      email: pgUser.email,
      role: pgUser.role,
      school_id: pgUser.school_id
    };

    const token = jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Return user data with password change requirements
    const userData = {
      id: pgUser.id,
      email: pgUser.email,
      role: pgUser.role,
      firstName: pgUser.first_name,
      lastName: pgUser.last_name,
      schoolId: pgUser.school_id,
      passwordChangeRequired: pgUser.password_reset_required,
      isFirstLogin: pgUser.is_first_login
    };

    console.log('PostgreSQL login successful:', { 
      userId: pgUser.id, 
      role: pgUser.role,
      passwordChangeRequired: pgUser.password_reset_required,
      isFirstLogin: pgUser.is_first_login
    });

    // If password change is required, include special flag
    const response = {
      token,
      user: userData,
      rememberMe
    };

    if (pgUser.password_reset_required || pgUser.is_first_login) {
      response.requirePasswordChange = true;
      response.message = pgUser.is_first_login 
        ? 'First-time login: Please change your password' 
        : 'Password change required: Please set a new password';
    }

    res.json(response);
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// @route   GET api/auth/user
// @desc    Get user data
// @access  Private
router.get('/user', authenticateJWT, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (err) {
    console.error('Get user error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Logout
router.post('/logout', authenticateJWT, async (req, res) => {
  try {
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Error in logout:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST api/auth/check-user
// @desc    Check if user exists
// @access  Public
router.post('/check-user', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    res.json({ exists: !!user });
  } catch (err) {
    console.error('Check user error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
