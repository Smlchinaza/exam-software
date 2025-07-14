const express = require('express');
const router = express.Router();
const Student = require('../models/students/Student');
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

// Get all students in a class for a subject (automatically includes all students in the class)
router.get('/by-subject', requireRole('teacher'), async (req, res) => {
  try {
    const { subject, class: className } = req.query;
    if (!subject || !className) {
      return res.status(400).json({ message: 'Subject and class are required' });
    }
    // Return all students in the class for the given subject
    // This automatically includes all students in the class, regardless of manual registration
    const students = await Student.find({
      currentClass: className
    }).select('fullName email currentClass admissionNumber');
    res.json(students);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get a specific student
router.get('/:id', async (req, res) => {
  try {
    let student;
    
    // Check if the ID is actually an email (for students accessing their own data)
    const userRole = req.user?.user?.role || req.user?.role;
    const userEmail = req.user?.user?.email || req.user?.email;
    
    if (userRole === 'student' && req.params.id === userEmail) {
      // Student is trying to access their own data by email
      student = await Student.findOne({ email: req.params.id });
      
      // If student not found and user is trying to access their own data, try to create one
      if (!student && req.params.id === userEmail) {
        try {
          // Get user data to create student record
          const User = require('../models/users/User');
          const user = await User.findOne({ email: userEmail });
          
          if (user) {
            student = new Student({
              admissionNumber: `ADM${Date.now()}`,
              fullName: user.displayName || `${user.firstName} ${user.lastName}`,
              email: userEmail,
              currentClass: 'JSS1',
              dateOfBirth: new Date(),
              gender: 'Not specified',
              phone: '',
              address: '',
              parentName: '',
              parentPhone: '',
              emergencyContact: ''
            });
            await student.save();
            console.log('Auto-created student record for:', userEmail);
          }
        } catch (createError) {
          console.error('Error auto-creating student record:', createError);
        }
      }
    } else {
      // Try to find by ID (for teachers/admins or direct ID access)
      student = await Student.findById(req.params.id);
    }
    
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    // Check authorization: students can only access their own data
    // teachers and admins can access any student data
    if (userRole === 'student' && student.email !== userEmail) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    res.json(student);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create a new student
router.post('/', async (req, res) => {
  try {
    // Check if student already exists with this email
    const existingStudent = await Student.findOne({ email: req.body.email });
    if (existingStudent) {
      return res.status(400).json({ message: 'Student with this email already exists' });
    }
    
    const student = new Student(req.body);
    const newStudent = await student.save();
    res.status(201).json(newStudent);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Create student record from user data (for existing users without student records)
router.post('/create-from-user', authenticateJWT, async (req, res) => {
  try {
    const userRole = req.user?.user?.role || req.user?.role;
    const userEmail = req.user?.user?.email || req.user?.email;
    
    if (userRole !== 'student') {
      return res.status(403).json({ message: 'Only students can create student records' });
    }
    
    // Check if student record already exists
    const existingStudent = await Student.findOne({ email: userEmail });
    if (existingStudent) {
      return res.json(existingStudent);
    }
    
    // Create basic student record
    const student = new Student({
      admissionNumber: `ADM${Date.now()}`,
      fullName: req.body.fullName || 'Student',
      email: userEmail,
      currentClass: req.body.currentClass || 'JSS1',
      dateOfBirth: req.body.dateOfBirth || new Date(),
      gender: req.body.gender || 'Not specified',
      phone: req.body.phone || '',
      address: req.body.address || '',
      parentName: req.body.parentName || '',
      parentPhone: req.body.parentPhone || '',
      emergencyContact: req.body.emergencyContact || ''
    });
    
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
    let student;
    
    // Check if the ID is actually an email (for students accessing their own data)
    const userRole = req.user?.user?.role || req.user?.role;
    const userEmail = req.user?.user?.email || req.user?.email;
    
    if (userRole === 'student' && req.params.id === userEmail) {
      // Student is trying to update their own data by email
      student = await Student.findOne({ email: req.params.id });
    } else {
      // Try to find by ID (for teachers/admins or direct ID access)
      student = await Student.findById(req.params.id);
    }
    
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    // Check authorization: students can only update their own data
    // teachers and admins can update any student data
    if (userRole === 'student' && student.email !== userEmail) {
      return res.status(403).json({ message: 'Insufficient permissions' });
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

    // Check authorization: students can only access their own results
    // teachers and admins can access any student results
    const userRole = req.user?.user?.role || req.user?.role;
    const userId = req.user?.user?.id || req.user?.id;
    
    if (userRole === 'student' && student._id.toString() !== userId) {
      return res.status(403).json({ message: 'Insufficient permissions' });
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

    // Check authorization: students can only access their own results
    // teachers and admins can access any student results
    const userRole = req.user?.user?.role || req.user?.role;
    const userId = req.user?.user?.id || req.user?.id;
    
    if (userRole === 'student' && student._id.toString() !== userId) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    res.json(student.results);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router; 