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
      difficulty,
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
      difficulty,
      instructions,
      questions,
      createdBy: req.user.id
    });

    await exam.save();
    res.status(201).json(exam);
  } catch (error) {
    console.error("Error creating exam:", error);
    res.status(500).json({ message: "Server error" });
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

// Update an exam
router.put("/:id", auth, async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id);
    
    if (!exam) {
      return res.status(404).json({ message: "Exam not found" });
    }

    // Check if user is the creator of the exam
    if (exam.createdBy.toString() !== req.user.id) {
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
    if (exam.createdBy.toString() !== req.user.id) {
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
      student: req.user._id,
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

module.exports = router;
