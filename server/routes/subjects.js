const express = require('express');
const router = express.Router();
const Subject = require('../models/Subject');
const User = require('../models/User');
const { authenticateJWT, requireRole } = require('../middleware/auth');

// Create a new subject (admin only)
router.post('/', authenticateJWT, requireRole('admin'), async (req, res) => {
  try {
    const { name, class: subjectClass } = req.body;
    if (!name || !subjectClass) {
      return res.status(400).json({ error: 'Name and class are required' });
    }
    const subject = new Subject({ name, class: subjectClass });
    await subject.save();
    res.status(201).json(subject);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get all subjects (optionally filtered by class)
router.get('/', authenticateJWT, requireRole('admin'), async (req, res) => {
  try {
    const filter = {};
    if (req.query.class) {
      filter.class = req.query.class;
    }
    const subjects = await Subject.find(filter).populate('teachers', 'displayName email firstName lastName');
    res.json(subjects);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get subjects by class (accessible by students and teachers)
router.get('/by-class', authenticateJWT, async (req, res) => {
  try {
    const { class: className } = req.query;
    if (!className) {
      return res.status(400).json({ error: 'Class parameter is required' });
    }
    
    const subjects = await Subject.find({ class: className }).select('name class');
    res.json(subjects);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all subjects assigned to the current teacher
router.get('/my-subjects', requireRole('teacher'), async (req, res) => {
  try {
    const teacherId = req.user.user.id;
    const subjects = await Subject.find({ teachers: teacherId }).select('name class');
    res.json(subjects);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get subject statistics (admin only)
router.get('/stats', authenticateJWT, requireRole('admin'), async (req, res) => {
  try {
    const totalSubjects = await Subject.countDocuments();
    const subjectsWithTeachers = await Subject.countDocuments({ teachers: { $exists: true, $ne: [] } });
    const subjectsWithoutTeachers = totalSubjects - subjectsWithTeachers;
    
    const teacherStats = await Subject.aggregate([
      {
        $lookup: {
          from: 'users',
          localField: 'teachers',
          foreignField: '_id',
          as: 'teacherDetails'
        }
      },
      {
        $group: {
          _id: null,
          totalTeachers: { $sum: { $size: '$teacherDetails' } },
          uniqueTeachers: { $addToSet: '$teacherDetails._id' }
        }
      }
    ]);

    const stats = {
      totalSubjects,
      subjectsWithTeachers,
      subjectsWithoutTeachers,
      totalTeacherAssignments: teacherStats[0]?.totalTeachers || 0,
      uniqueTeachersAssigned: teacherStats[0]?.uniqueTeachers?.length || 0
    };

    res.json(stats);
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