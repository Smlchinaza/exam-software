const mongoose = require("mongoose");

const questionSchema = new mongoose.Schema({
  question: {
    type: String,
    required: true,
  },
  subject: {
    type: String,
    required: true,
  },
  term: {
    type: String,
    required: true,
    enum: ['1st Term', '2nd Term', '3rd Term']
  },
  class: {
    type: String,
    required: true,
    enum: ['JSS1', 'JSS2', 'JSS3', 'SS1', 'SS2', 'SS3']
  },
  options: [{
    type: String,
    required: true,
  }],
  correctAnswer: {
    type: Number,
    required: true,
    min: 0,
    max: 3,
  },
  explanation: {
    type: String,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  marks: {
    type: Number,
    default: 1
  },
}, {
  timestamps: true
});

// Update the updatedAt timestamp before saving
questionSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const Question = mongoose.model("Question", questionSchema);

module.exports = Question;
