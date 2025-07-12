const mongoose = require("mongoose");

const examSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  duration: {
    type: Number,
    required: true,
    min: 1
  },
  totalMarks: {
    type: Number,
    required: true,
    min: 0
  },
  startTime: {
    type: Date,
    required: true
  },
  endTime: {
    type: Date,
    required: true
  },
  subject: {
    type: String,
    required: true
  },
  instructions: {
    type: String,
    required: true
  },
  questions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question',
    required: true
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['draft', 'scheduled', 'pending_approval', 'active', 'completed', 'cancelled'],
    default: 'draft'
  },
  questionsPerStudent: {
    type: Number,
    required: true,
    min: 1
  },
  submittedForApprovalAt: {
    type: Date,
    default: null
  },
  approvedAt: {
    type: Date,
    default: null
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  approved: {
    type: Boolean,
    default: false
  },
  class: {
    type: String,
    required: true,
    enum: ['JSS1', 'JSS2', 'JSS3', 'SS1', 'SS2', 'SS3']
  }
}, {
  timestamps: true
});

// Validate that endTime is after startTime
examSchema.pre('save', function(next) {
  if (this.endTime <= this.startTime) {
    next(new Error('End time must be after start time'));
  }
  next();
});

// Calculate total marks before saving
examSchema.pre('save', async function(next) {
  if (this.isModified('questions')) {
    const Question = mongoose.model('Question');
    const questions = await Question.find({ _id: { $in: this.questions } });
    this.totalMarks = questions.reduce((total, q) => total + (q.marks || 0), 0);
  }
  next();
});

const Exam = mongoose.model('Exam', examSchema);

module.exports = Exam;
