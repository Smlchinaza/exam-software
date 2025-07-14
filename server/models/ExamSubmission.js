const mongoose = require("mongoose");

const examSubmissionSchema = new mongoose.Schema({
  exam: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Exam",
    required: true
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  answers: {
    type: Map,
    of: String,
    required: true
  },
  score: {
    type: Number,
    required: true,
    default: 0
  },
  submittedAt: {
    type: Date,
    required: true,
    default: Date.now
  },
  timeSpent: Number, // in minutes
  assignedQuestions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question',
    required: true
  }],
  // Teacher approval status
  teacherApproved: {
    type: Boolean,
    default: false
  },
  teacherApprovedAt: {
    type: Date
  },
  teacherApprovedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  teacherComments: {
    type: String,
    trim: true
  },
  // Admin release status
  adminReleased: {
    type: Boolean,
    default: false
  },
  adminReleasedAt: {
    type: Date
  },
  adminReleasedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  // Term and session for organization
  term: {
    type: String,
    enum: ['1st', '2nd', '3rd'],
    required: true
  },
  session: {
    type: String,
    required: true
  }
}, {
  timestamps: true
});

// Prevent multiple submissions from the same student
examSubmissionSchema.index({ exam: 1, student: 1 }, { unique: true });

const ExamSubmission = mongoose.model("ExamSubmission", examSubmissionSchema);

module.exports = ExamSubmission;
