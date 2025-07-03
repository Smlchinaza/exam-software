const express = require("express");
const router = express.Router();
const Exam = require("../models/Exam");
const ExamSubmission = require("../models/ExamSubmission");
const { authenticateJWT, requireRole } = require("../middleware/auth");

// Get all exams
router.get("/", authenticateJWT, async (req, res) => {
  try {
    const exams = await Exam.find()
      .populate("createdBy", "displayName email")
      .populate("questions");
    res.json(exams);
  } catch (error) {
    console.error("Error fetching exams:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get active exams (currently ongoing)
router.get('/active', authenticateJWT, async (req, res) => {
  try {
    const now = new Date();
    // Log all exams and their relevant fields
    const allExams = await Exam.find({});
    console.log('All exams:', allExams.map(e => ({
      _id: e._id,
      title: e.title,
      status: e.status,
      approved: e.approved,
      startTime: e.startTime,
      endTime: e.endTime
    })));
    // Now filter for active exams
    const exams = await Exam.find({
      status: 'active',
      approved: true,
      startTime: { $lte: now },
      endTime: { $gte: now }
    }).populate('createdBy', 'displayName email');
    console.log('Active exams for students:', exams);
    res.json(exams);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add this route after the existing routes
router.get('/upcoming', authenticateJWT, async (req, res) => {
  try {
    const now = new Date();
    const exams = await Exam.find({
      status: 'active',
      approved: true,
      startTime: { $gt: now }
    }).populate('createdBy', 'displayName email');
    res.json(exams);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all unapproved exams (admin only)
router.get('/unapproved', authenticateJWT, requireRole('admin'), async (req, res) => {
  try {
    const exams = await Exam.find({ 
      $or: [
        { approved: false },
        { status: 'pending_approval' }
      ]
    }).populate('createdBy', 'displayName email');
    res.json(exams);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get exams pending approval (admin only)
router.get('/pending-approval', authenticateJWT, requireRole('admin'), async (req, res) => {
  try {
    const exams = await Exam.find({ status: 'pending_approval' })
      .populate('createdBy', 'displayName email')
      .populate('questions', 'question subject marks');
    res.json(exams);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create a new exam
router.post("/", authenticateJWT, requireRole('teacher'), async (req, res) => {
  try {
    const {
      title,
      description,
      duration,
      totalMarks,
      startTime,
      endTime,
      subject,
      instructions,
      questions,
      questionsPerStudent
    } = req.body;

    if (!questionsPerStudent || questionsPerStudent < 1) {
      return res.status(400).json({ message: "questionsPerStudent is required and must be at least 1" });
    }
    if (!questions || questions.length < questionsPerStudent) {
      return res.status(400).json({ message: "Number of questionsPerStudent cannot exceed total questions uploaded" });
    }

    const exam = new Exam({
      title,
      description,
      duration,
      totalMarks,
      startTime,
      endTime,
      subject,
      instructions,
      questions,
      questionsPerStudent,
      createdBy: req.user.user.id
    });

    await exam.save();
    res.status(201).json(exam);
  } catch (error) {
    console.error("Error creating exam:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get a single exam
router.get("/:id", authenticateJWT, async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id)
      .populate("createdBy", "displayName email")
      .populate("questions");
    
    if (!exam) {
      return res.status(404).json({ message: "Exam not found" });
    }
    
    res.json(exam);
  } catch (error) {
    console.error("Error fetching exam:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get exam questions only
router.get("/:id/questions", authenticateJWT, async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id)
      .populate("questions", "question options subject marks explanation")
      .select("questions title subject");
    
    if (!exam) {
      return res.status(404).json({ message: "Exam not found" });
    }
    
    res.json({
      examId: exam._id,
      title: exam.title,
      subject: exam.subject,
      questions: exam.questions
    });
  } catch (error) {
    console.error("Error fetching exam questions:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Update an exam
router.put("/:id", authenticateJWT, requireRole('teacher'), async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id);
    
    if (!exam) {
      return res.status(404).json({ message: "Exam not found" });
    }

    // Check if user is the creator of the exam
    if (exam.createdBy.toString() !== req.user.user.id) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const updatedExam = await Exam.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true }
    );

    res.json(updatedExam);
  } catch (error) {
    console.error("Error updating exam:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Delete an exam
router.delete("/:id", authenticateJWT, requireRole('teacher'), async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id);
    
    if (!exam) {
      return res.status(404).json({ message: "Exam not found" });
    }

    // Check if user is the creator of the exam
    if (exam.createdBy.toString() !== req.user.user.id) {
      return res.status(403).json({ message: "Not authorized" });
    }

    await exam.remove();
    res.json({ message: "Exam deleted" });
  } catch (error) {
    console.error("Error deleting exam:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Submit exam for approval (teacher only)
router.post('/:examId/submit-for-approval', authenticateJWT, requireRole('teacher'), async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.examId);
    if (!exam) return res.status(404).json({ error: 'Exam not found' });
    
    // Check if the teacher owns this exam
    if (exam.createdBy.toString() !== req.user.user.id) {
      return res.status(403).json({ error: 'You can only submit your own exams for approval' });
    }
    
    // Check if exam is in a valid state for submission
    if (exam.status !== 'draft' && exam.status !== 'scheduled') {
      return res.status(400).json({ error: 'Only draft or scheduled exams can be submitted for approval' });
    }
    
    exam.status = 'pending_approval';
    exam.submittedForApprovalAt = new Date();
    await exam.save();
    
    res.json({ message: 'Exam submitted for approval successfully', exam });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Approve exam (admin only)
router.post('/:examId/approve', authenticateJWT, requireRole('admin'), async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.examId);
    if (!exam) return res.status(404).json({ error: 'Exam not found' });
    
    // Always set status to 'active' and approved to true
    exam.status = 'active';
    exam.approved = true;
    exam.approvedAt = new Date();
    exam.approvedBy = req.user.user.id;
    await exam.save();
    
    res.json({ message: 'Exam approved successfully', exam });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Reject exam (admin only)
router.post('/:examId/reject', authenticateJWT, requireRole('admin'), async (req, res) => {
  try {
    const { reason } = req.body;
    const exam = await Exam.findById(req.params.examId);
    if (!exam) return res.status(404).json({ error: 'Exam not found' });
    
    if (exam.status !== 'pending_approval') {
      return res.status(400).json({ error: 'Only exams pending approval can be rejected' });
    }
    
    exam.status = 'draft';
    exam.submittedForApprovalAt = null;
    await exam.save();
    
    res.json({ message: 'Exam rejected successfully', exam });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Disapprove (unapprove) exam (admin only)
router.post('/:examId/disapprove', authenticateJWT, requireRole('admin'), async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.examId);
    if (!exam) return res.status(404).json({ error: 'Exam not found' });
    exam.status = 'draft';
    exam.approved = false;
    exam.approvedAt = null;
    exam.approvedBy = null;
    await exam.save();
    res.json({ message: 'Exam disapproved successfully', exam });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Submit exam
router.post("/:id/submit", authenticateJWT, requireRole('student'), async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id)
      .populate('questions')
      .populate('createdBy', 'displayName email');

    if (!exam) {
      return res.status(404).json({ message: 'Exam not found' });
    }

    // Check if exam is still active
    const now = new Date();
    if (now < new Date(exam.startTime) || now > new Date(exam.endTime)) {
      return res.status(400).json({ message: 'Exam is not currently active' });
    }

    // Calculate score
    let score = 0;
    const answers = req.body.answers;
    exam.questions.forEach(question => {
      if (answers[question._id] === question.correctAnswer.toString()) {
        score += question.marks;
      }
    });

    // Find and update the existing ExamSubmission
    let submission = await ExamSubmission.findOne({ exam: exam._id, student: req.user.user.id });
    if (!submission) {
      return res.status(404).json({ message: 'Exam submission not found. Please start the exam first.' });
    }
    submission.answers = answers;
    submission.score = score;
    submission.submittedAt = new Date();
    await submission.save();

    res.json({
      message: 'Exam submitted successfully',
      score: score,
      totalMarks: exam.totalMarks
    });
  } catch (error) {
    console.error('Error submitting exam:', error);
    res.status(500).json({ message: 'Error submitting exam' });
  }
});

// Assign random questions to student and start exam
router.post('/:id/start', authenticateJWT, requireRole('student'), async (req, res) => {
  try {
    console.log('START /:id/start', { examId: req.params.id, userId: req.user.user.id });
    const exam = await Exam.findById(req.params.id);
    if (!exam) {
      console.error('Exam not found', { examId: req.params.id });
      return res.status(404).json({ message: 'Exam not found' });
    }
    // Check if exam is active
    const now = new Date();
    if (now < new Date(exam.startTime) || now > new Date(exam.endTime)) {
      console.error('Exam not active', { now, startTime: exam.startTime, endTime: exam.endTime });
      return res.status(400).json({ message: 'Exam is not currently active' });
    }
    // Check if submission already exists
    let submission = await ExamSubmission.findOne({ exam: exam._id, student: req.user.user.id });
    if (submission) {
      console.log('Existing submission found', { submissionId: submission._id });
      // Populate assignedQuestions for return
      await submission.populate('assignedQuestions');
      return res.json({ assignedQuestions: submission.assignedQuestions });
    }
    // Randomly select questionsPerStudent from exam.questions
    const shuffled = [...exam.questions].sort(() => 0.5 - Math.random());
    const assignedQuestions = shuffled.slice(0, exam.questionsPerStudent);
    console.log('Assigning questions', { assignedQuestions });
    // Create ExamSubmission with assignedQuestions
    submission = new ExamSubmission({
      exam: exam._id,
      student: req.user.user.id,
      answers: {},
      assignedQuestions,
      score: 0
    });
    await submission.save();
    // Populate assignedQuestions for return
    await submission.populate('assignedQuestions');
    res.json({ assignedQuestions: submission.assignedQuestions });
  } catch (error) {
    console.error('Error starting exam:', error, error.stack);
    res.status(500).json({ message: 'Error starting exam', error: error.message, stack: error.stack });
  }
});

module.exports = router;
