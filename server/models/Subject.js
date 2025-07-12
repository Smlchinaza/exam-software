const mongoose = require('mongoose');

const SubjectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  class: {
    type: String,
    required: true,
    trim: true
  },
  teachers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }]
});

// Compound unique index to allow same subject name in different classes
SubjectSchema.index({ name: 1, class: 1 }, { unique: true });

module.exports = mongoose.model('Subject', SubjectSchema); 