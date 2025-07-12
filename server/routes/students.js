const express = require('express');
const router = express.Router();
const Student = require('../models/Student');
const { authenticateJWT, requireRole } = require('../middleware/auth');

// Apply authentication middleware to all routes
router.use(authenticateJWT);

// Get all students
router.get('/', async (req, res) => {
  try {
    const students = await Student.find();
    res.json(students);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get a specific student
router.get('/:id', async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
    res.json(student);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create a new student
router.post('/', async (req, res) => {
  const student = new Student(req.body);
  try {
    const newStudent = await student.save();
    res.status(201).json(newStudent);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update a student
router.put('/:id', requireRole('admin'), async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
    // Only allow admin to update currentClass
    if ('currentClass' in req.body) {
      student.currentClass = req.body.currentClass;
    }
    // Optionally, update other fields if needed
    const updatedStudent = await student.save();
    res.json(updatedStudent);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete a student
router.delete('/:id', async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
    await student.remove();
    res.json({ message: 'Student deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Register subjects for a student
router.post('/:id/subjects', async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    const { subjects } = req.body;
    student.registeredSubjects = subjects;
    const updatedStudent = await student.save();
    res.json(updatedStudent);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Add results for a student
router.post('/:id/results', async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    const { term, session, subjects, summary } = req.body;
    student.results.push({ term, session, subjects, summary });
    const updatedStudent = await student.save();
    res.json(updatedStudent);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Get results for a specific term and session
router.get('/:id/results/:term/:session', async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    const result = student.results.find(
      r => r.term === req.params.term && r.session === req.params.session
    );

    if (!result) {
      return res.status(404).json({ message: 'Results not found' });
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all results for a student
router.get('/:id/results', async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
    res.json(student.results);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all students registered for a subject and class
router.get('/by-subject', requireRole('teacher'), async (req, res) => {
  try {
    const { subject, class: className } = req.query;
    if (!subject || !className) {
      return res.status(400).json({ message: 'Subject and class are required' });
    }
    const students = await Student.find({
      registeredSubjects: subject,
      currentClass: className
    }).select('fullName email currentClass admissionNumber');
    res.json(students);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router; 