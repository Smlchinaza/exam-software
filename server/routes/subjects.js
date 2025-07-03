const express = require('express');
const router = express.Router();
const Subject = require('../models/Subject');
const User = require('../models/User');
const { authenticateJWT, requireRole } = require('../middleware/auth');

// Create a new subject (admin only)
router.post('/', authenticateJWT, requireRole('admin'), async (req, res) => {
  try {
    const { name } = req.body;
    const subject = new Subject({ name });
    await subject.save();
    res.status(201).json(subject);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get all subjects
router.get('/', authenticateJWT, requireRole('admin'), async (req, res) => {
  try {
    const subjects = await Subject.find().populate('teachers', 'displayName email');
    res.json(subjects);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Assign teachers to a subject (admin only)
router.post('/:subjectId/assign', authenticateJWT, requireRole('admin'), async (req, res) => {
  try {
    const { teacherIds } = req.body; // Array of teacher user IDs
    const subject = await Subject.findById(req.params.subjectId);
    if (!subject) return res.status(404).json({ error: 'Subject not found' });
    subject.teachers = teacherIds;
    await subject.save();
    res.json(subject);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Remove teachers from a subject (admin only)
router.post('/:subjectId/unassign', authenticateJWT, requireRole('admin'), async (req, res) => {
  try {
    const { teacherIds } = req.body; // Array of teacher user IDs to remove (if empty, remove all)
    const subject = await Subject.findById(req.params.subjectId);
    if (!subject) return res.status(404).json({ error: 'Subject not found' });
    
    if (teacherIds && teacherIds.length > 0) {
      // Remove specific teachers
      subject.teachers = subject.teachers.filter(teacherId => !teacherIds.includes(teacherId.toString()));
    } else {
      // Remove all teachers
      subject.teachers = [];
    }
    
    await subject.save();
    res.json(subject);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Delete a subject (admin only)
router.delete('/:subjectId', authenticateJWT, requireRole('admin'), async (req, res) => {
  try {
    const subject = await Subject.findById(req.params.subjectId);
    if (!subject) return res.status(404).json({ error: 'Subject not found' });
    
    await Subject.findByIdAndDelete(req.params.subjectId);
    res.json({ message: 'Subject deleted successfully' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router; 