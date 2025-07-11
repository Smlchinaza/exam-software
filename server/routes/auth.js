const express = require("express");
const jwt = require("jsonwebtoken");
const User = require("../models/users/User");
const { authenticateJWT } = require('../middleware/auth');
const { check } = require('express-validator');
const validate = require('../middleware/validate');
const bcrypt = require('bcryptjs');

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
      lastName
    });

    // Assign plain password; pre-save hook will hash it
    user.password = password;
    // Debug log
    console.log('Password before save:', user.password);
    await user.save();
    // After saving user
    const savedUser = await User.findOne({ email });
    console.log('Password after save:', savedUser.password);

    // Create JWT token
    const payload = {
      user: {
        id: user.id,
        role: user.role
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
// @desc    Login user
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

    // Find user
    const user = await User.findOne({ email });
    console.log('User found:', user);
    if (!user) {
      console.log('User not found:', email);
      return res.status(400).json({ 
        message: 'Invalid credentials' 
      });
    }

    // Verify password
    console.log('Comparing passwords:', password, user.password);
    const isMatch = await bcrypt.compare(password, user.password);
    console.log('Password match result:', isMatch);
    if (!isMatch) {
      console.log('Invalid password for user:', email);
      return res.status(400).json({ 
        message: 'Invalid credentials' 
      });
    }

    // Create JWT token
    const payload = {
      user: {
        id: user.id,
        role: user.role
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

    console.log('Login successful:', { 
      userId: user.id, 
      role: user.role 
    });

    res.json({
      token,
      user: userData,
      rememberMe
    });
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
