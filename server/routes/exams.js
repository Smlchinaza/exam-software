const express = require("express");
const Exam = require("../models/Exam");
const ExamSubmission = require("../models/ExamSubmission");
const auth = require("../middleware/auth");

const router = express.Router();

// Get all exams
router.get("/", auth, async (req, res) => {
  try {
    const exams = await Exam.find()
      .populate("createdBy", "displayName email")
      .sort({ createdAt: -1 });
    res.json(exams);
  } catch (error) {
    console.error("Error fetching exams:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Create a new exam
router.post("/", auth, async (req, res) => {
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
      questions
    } = req.body;

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
      createdBy: req.user.user.id
    });

    await exam.save();
    res.status(201).json(exam);
  } catch (error) {
    console.error("Error creating exam:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get active exams (currently ongoing)
router.get('/active', auth, async (req, res) => {
  try {
    const now = new Date();
    // Find exams that are currently active
    const activeExams = await Exam.find({
      startTime: { $lte: now },
      endTime: { $gte: now }
    })
    .populate('createdBy', 'displayName email')
    .populate('questions');

    // Optionally, fetch submissions for these exams
    const examIds = activeExams.map(exam => exam._id);
    const submissions = await ExamSubmission.find({ exam: { $in: examIds } })
      .populate('student', 'firstName lastName displayName email');

    // Attach submissions to their respective exams
    const examsWithSubmissions = activeExams.map(exam => {
      const examSubs = submissions.filter(sub => sub.exam.toString() === exam._id.toString());
      return {
        ...exam.toObject(),
        submissions: examSubs
      };
    });

    res.json(examsWithSubmissions);
  } catch (error) {
    console.error('Error fetching active exams:', error);
    res.status(500).json({ message: 'Error fetching active exams' });
  }
});

// Add this route after the existing routes
router.get('/upcoming', auth, async (req, res) => {
  try {
    const now = new Date();
    const upcomingExams = await Exam.find({
      endTime: { $gt: now }
    })
    .sort({ startTime: 1 })
    .populate('createdBy', 'displayName email')
    .populate('questions');

    res.json(upcomingExams);
  } catch (error) {
    console.error('Error fetching upcoming exams:', error);
    res.status(500).json({ message: 'Error fetching upcoming exams' });
  }
});

// Get a single exam
router.get("/:id", auth, async (req, res) => {
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
router.get("/:id/questions", auth, async (req, res) => {
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
router.put("/:id", auth, async (req, res) => {
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
router.delete("/:id", auth, async (req, res) => {
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

// Submit exam
router.post("/:id/submit", auth, async (req, res) => {
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

    // Save submission
    const submission = new ExamSubmission({
      exam: exam._id,
      student: req.user.user.id,
      answers: answers,
      score: score,
      submittedAt: new Date()
    });

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

module.exports = router;
