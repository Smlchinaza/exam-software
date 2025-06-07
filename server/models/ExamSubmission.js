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
}, {
  timestamps: true
});

// Prevent multiple submissions from the same student
examSubmissionSchema.index({ exam: 1, student: 1 }, { unique: true });

const ExamSubmission = mongoose.model("ExamSubmission", examSubmissionSchema);

module.exports = ExamSubmission;
