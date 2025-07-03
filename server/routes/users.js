const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { authenticateJWT, requireRole } = require('../middleware/auth');

// Get user profile
router.get('/profile', authenticateJWT, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password -resetPasswordToken -resetPasswordExpires');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update user profile
router.put('/profile', authenticateJWT, async (req, res) => {
  try {
    const { displayName } = req.body;
    
    if (!displayName) {
      return res.status(400).json({ message: 'Display name is required' });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.displayName = displayName;
    user.updatedAt = Date.now();
    await user.save();

    const updatedUser = await User.findById(req.user.id).select('-password -resetPasswordToken -resetPasswordExpires');
    res.json(updatedUser);
  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update password
router.put('/password', authenticateJWT, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current password and new password are required' });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Verify current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    // Update password
    user.password = newPassword;
    user.updatedAt = Date.now();
    await user.save();

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Error updating password:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all users with role 'student'
router.get('/students-emails', async (req, res) => {
  try {
    const students = await User.find({ role: 'student' }).select('email displayName');
    res.json(students);
  } catch (error) {
    console.error('Error fetching student users:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all teachers
router.get('/', authenticateJWT, requireRole('admin'), async (req, res) => {
  try {
    if (req.query.role === 'teacher') {
      const teachers = await User.find({ role: 'teacher' }).select('email displayName');
      return res.json(teachers);
    }
    // ... existing code for other users ...
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router; 