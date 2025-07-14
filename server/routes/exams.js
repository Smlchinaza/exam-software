const express = require("express");
const router = express.Router();
const Exam = require("../models/Exam");
const ExamSubmission = require("../models/ExamSubmission");
const Subject = require("../models/Subject");
const { authenticateJWT, requireRole } = require("../middleware/auth");

// Get all exams
router.get("/", authenticateJWT, async (req, res) => {
  try {
    console.log('Fetching all exams for user:', req.user.user.id);
    const exams = await Exam.find()
      .populate("createdBy", "displayName email")
      .populate("questions");
    
    console.log('Total exams found:', exams.length);
    console.log('Exams with createdBy:', exams.filter(e => e.createdBy).length);
    console.log('Exams without createdBy:', exams.filter(e => !e.createdBy).length);
    
    if (exams.length > 0) {
      console.log('Sample exam createdBy:', exams[0].createdBy);
    }
    
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

// Get available exams for a specific student (excluding exams they've already taken)
router.get('/available-for-student', authenticateJWT, requireRole('student'), async (req, res) => {
  try {
    const now = new Date();
    const studentId = req.user.user.id;
    
    // Get all active exams
    const allActiveExams = await Exam.find({
      status: 'active',
      approved: true,
      startTime: { $lte: now },
      endTime: { $gte: now }
    }).populate('createdBy', 'displayName email');
    
    // Get exams the student has already taken
    const takenExams = await ExamSubmission.find({ student: studentId })
      .select('exam')
      .lean();
    
    const takenExamIds = takenExams.map(submission => submission.exam.toString());
    
    // Filter out exams the student has already taken
    const availableExams = allActiveExams.filter(exam => 
      !takenExamIds.includes(exam._id.toString())
    );
    
    console.log('Available exams for student:', availableExams.length, 'out of', allActiveExams.length);
    res.json(availableExams);
  } catch (err) {
    console.error('Error fetching available exams for student:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get completed exams for a specific student
router.get('/completed-for-student', authenticateJWT, requireRole('student'), async (req, res) => {
  try {
    const studentId = req.user.user.id;
    
    // Get all exams the student has taken
    const submissions = await ExamSubmission.find({ student: studentId })
      .populate({
        path: 'exam',
        populate: { path: 'createdBy', select: 'displayName email' }
      })
      .sort({ submittedAt: -1 });
    
    // Filter out submissions where exam might be null (deleted exams)
    const completedExams = submissions.filter(submission => submission.exam);
    
    console.log('Completed exams for student:', completedExams.length);
    res.json(completedExams);
  } catch (err) {
    console.error('Error fetching completed exams for student:', err);
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
      questionsPerStudent,
      class: examClass,
      marksPerQuestion,
      session,
      term
    } = req.body;

    if (!session || typeof session !== 'string' || !session.trim()) {
      return res.status(400).json({ message: 'Session is required for the exam.' });
    }
    if (!term || !['1st Term','2nd Term','3rd Term'].includes(term)) {
      return res.status(400).json({ message: 'A valid term is required for the exam (1st Term, 2nd Term, 3rd Term).' });
    }

    if (!examClass || !['JSS1','JSS2','JSS3','SS1','SS2','SS3'].includes(examClass)) {
      return res.status(400).json({ message: 'A valid class is required for the exam.' });
    }

    // Validate total marks
    if (!totalMarks || totalMarks <= 0) {
      return res.status(400).json({ message: "Total marks must be greater than 0" });
    }

    // Check if teacher is assigned to the subject (by name and class)
    const assignedSubject = await Subject.findOne({
      name: subject,
      class: examClass,
      teachers: req.user.user.id
    });
    if (!assignedSubject) {
      return res.status(403).json({ message: "You are not assigned to this subject and class and cannot create an exam for it." });
    }

    if (!questionsPerStudent || questionsPerStudent < 1) {
      return res.status(400).json({ message: "questionsPerStudent is required and must be at least 1" });
    }
    if (!questions || questions.length < questionsPerStudent) {
      return res.status(400).json({ message: "Number of questionsPerStudent cannot exceed total questions uploaded" });
    }

    // Validate that marks per question calculation is correct
    const calculatedMarksPerQuestion = Math.round((totalMarks / questionsPerStudent) * 100) / 100;
    if (marksPerQuestion && Math.abs(marksPerQuestion - calculatedMarksPerQuestion) > 0.01) {
      return res.status(400).json({ message: "Marks per question calculation is incorrect" });
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
      createdBy: req.user.user.id,
      class: examClass,
      session,
      term
    });

    await exam.save();
    res.status(201).json(exam);
  } catch (error) {
    console.error("Error creating exam:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get released results for students
router.get('/released-results', authenticateJWT, requireRole('student'), async (req, res) => {
  try {
    const { term, session } = req.query;
    console.log('Fetching released results for student:', req.user.user.id);
    console.log('Term:', term, 'Session:', session);
    console.log('User object:', req.user);
    
    const filter = { 
      student: req.user.user.id,
      adminReleased: true 
    };
    
    if (term) filter.term = term;
    if (session) filter.session = session;
    
    console.log('Filter:', filter);
    
    // First, let's check if there are any submissions for this student at all
    const allStudentSubmissions = await ExamSubmission.find({ student: req.user.user.id });
    console.log('All submissions for student:', allStudentSubmissions.length);
    console.log('Sample submission:', allStudentSubmissions[0]);
    
    const submissions = await ExamSubmission.find(filter)
      .populate('exam', 'title subject totalMarks')
      .populate('teacherApprovedBy', 'displayName');
    
    console.log('Found released results:', submissions.length);
    res.json(submissions);
  } catch (error) {
    console.error('Error fetching released results:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ message: 'Error fetching released results' });
  }
});

// Get approved submissions for admin review
router.get('/approved-submissions', authenticateJWT, requireRole('admin'), async (req, res) => {
  try {
    const { term, session } = req.query;
    console.log('Fetching approved submissions for admin');
    console.log('Term:', term, 'Session:', session);
    
    const filter = { teacherApproved: true };
    
    if (term) filter.term = term;
    if (session) filter.session = session;
    
    console.log('Filter:', filter);
    
    const submissions = await ExamSubmission.find(filter)
      .populate('student', 'displayName email currentClass')
      .populate('exam', 'title subject')
      .populate('teacherApprovedBy', 'displayName');
    
    console.log('Found approved submissions:', submissions.length);
    res.json(submissions);
  } catch (error) {
    console.error('Error fetching approved submissions:', error);
    res.status(500).json({ message: 'Error fetching approved submissions' });
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

    // Calculate score using marks per question (total marks divided by questions per student)
    let score = 0;
    const answers = req.body.answers;
    const marksPerQuestion = exam.totalMarks / exam.questionsPerStudent;
    
    // Get the student's assigned questions from their submission
    const submission = await ExamSubmission.findOne({ exam: exam._id, student: req.user.user.id });
    if (!submission) {
      return res.status(404).json({ message: 'Exam submission not found. Please start the exam first.' });
    }
    
    // Calculate score based on assigned questions
    submission.assignedQuestions.forEach(questionId => {
      const question = exam.questions.find(q => q._id.toString() === questionId.toString());
      if (question && answers[questionId] === question.correctAnswer.toString()) {
        score += marksPerQuestion;
      }
    });

    // Update the existing ExamSubmission
    submission.answers = answers;
    submission.score = score;
    submission.submittedAt = new Date();
    
    // Add term and session information (you might want to get this from the exam or request body)
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;
    
    // Determine term based on month (you can adjust this logic)
    let term;
    if (currentMonth >= 9 && currentMonth <= 12) {
      term = '1st';
    } else if (currentMonth >= 1 && currentMonth <= 4) {
      term = '2nd';
    } else {
      term = '3rd';
    }
    
    submission.term = term;
    submission.session = `${currentYear}/${currentYear + 1}`;
    
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
      score: 0,
      session: exam.session, // add session from exam
      term: exam.term        // add term from exam
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

// Teacher approve exam submission
router.post('/:examId/submissions/:submissionId/approve', authenticateJWT, requireRole('teacher'), async (req, res) => {
  try {
    const { comments } = req.body;
    const submission = await ExamSubmission.findById(req.params.submissionId)
      .populate('exam')
      .populate('student', 'displayName email');
    
    if (!submission) {
      return res.status(404).json({ message: 'Submission not found' });
    }
    
    // Check if the teacher owns the exam
    if (submission.exam.createdBy.toString() !== req.user.user.id) {
      return res.status(403).json({ message: 'You can only approve submissions for your own exams' });
    }
    
    submission.teacherApproved = true;
    submission.teacherApprovedAt = new Date();
    submission.teacherApprovedBy = req.user.user.id;
    submission.teacherComments = comments || '';
    
    await submission.save();
    
    res.json({ 
      message: 'Submission approved successfully',
      submission: {
        id: submission._id,
        studentName: submission.student.displayName,
        score: submission.score,
        teacherApproved: submission.teacherApproved,
        teacherApprovedAt: submission.teacherApprovedAt
      }
    });
  } catch (error) {
    console.error('Error approving submission:', error);
    res.status(500).json({ message: 'Error approving submission' });
  }
});

// Teacher reject exam submission
router.post('/:examId/submissions/:submissionId/reject', authenticateJWT, requireRole('teacher'), async (req, res) => {
  try {
    const { comments } = req.body;
    const submission = await ExamSubmission.findById(req.params.submissionId)
      .populate('exam')
      .populate('student', 'displayName email');
    
    if (!submission) {
      return res.status(404).json({ message: 'Submission not found' });
    }
    
    // Check if the teacher owns the exam
    if (submission.exam.createdBy.toString() !== req.user.user.id) {
      return res.status(403).json({ message: 'You can only reject submissions for your own exams' });
    }
    
    submission.teacherApproved = false;
    submission.teacherApprovedAt = new Date();
    submission.teacherApprovedBy = req.user.user.id;
    submission.teacherComments = comments || '';
    
    await submission.save();
    
    res.json({ 
      message: 'Submission rejected successfully',
      submission: {
        id: submission._id,
        studentName: submission.student.displayName,
        score: submission.score,
        teacherApproved: submission.teacherApproved,
        teacherApprovedAt: submission.teacherApprovedAt
      }
    });
  } catch (error) {
    console.error('Error rejecting submission:', error);
    res.status(500).json({ message: 'Error rejecting submission' });
  }
});

// Admin release results for a term and session
router.post('/release-results', authenticateJWT, requireRole('admin'), async (req, res) => {
  try {
    const { term, session } = req.body;
    
    if (!term || !session) {
      return res.status(400).json({ message: 'Term and session are required' });
    }
    
    // Find all approved submissions for the specified term and session
    const submissions = await ExamSubmission.find({
      term,
      session,
      teacherApproved: true,
      adminReleased: false
    }).populate('student', 'displayName email');
    
    if (submissions.length === 0) {
      return res.status(404).json({ message: 'No approved submissions found for the specified term and session' });
    }
    
    // Release all approved submissions
    const updatePromises = submissions.map(submission => {
      submission.adminReleased = true;
      submission.adminReleasedAt = new Date();
      submission.adminReleasedBy = req.user.user.id;
      return submission.save();
    });
    
    await Promise.all(updatePromises);
    
    res.json({ 
      message: `Results released successfully for ${term} term, ${session} session`,
      releasedCount: submissions.length
    });
  } catch (error) {
    console.error('Error releasing results:', error);
    res.status(500).json({ message: 'Error releasing results' });
  }
});

// Get pending submissions for teacher approval
router.get('/:examId/pending-submissions', authenticateJWT, requireRole('teacher'), async (req, res) => {
  try {
    console.log('Fetching pending submissions for exam:', req.params.examId);
    console.log('User ID:', req.user.user.id);
    
    const exam = await Exam.findById(req.params.examId);
    if (!exam) {
      console.log('Exam not found');
      return res.status(404).json({ message: 'Exam not found' });
    }
    
    console.log('Exam found:', exam.title, 'Created by:', exam.createdBy);
    
    // Check if the teacher owns the exam
    if (exam.createdBy.toString() !== req.user.user.id) {
      console.log('Teacher not authorized for this exam');
      return res.status(403).json({ message: 'You can only view submissions for your own exams' });
    }
    
    const submissions = await ExamSubmission.find({
      exam: exam._id,
      $or: [
        { teacherApproved: { $exists: false } },
        { teacherApproved: null }
      ]
    }).populate('student', 'displayName email currentClass');
    
    console.log('Found submissions:', submissions.length);
    res.json(submissions);
  } catch (error) {
    console.error('Error fetching pending submissions:', error);
    res.status(500).json({ message: 'Error fetching pending submissions' });
  }
});

module.exports = router;
