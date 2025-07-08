const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  admissionNumber: {
    type: String,
    required: true,
    unique: true,
  },
  fullName: {
    type: String,
    required: true,
  },
  dateOfBirth: {
    type: Date,
    required: true,
  },
  gender: {
    type: String,
    enum: ['Male', 'Female'],
    required: true,
  },
  currentClass: {
    type: String,
    enum: ['JSS1', 'JSS2', 'JSS3', 'SS1', 'SS2', 'SS3'],
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  phone: {
    type: String,
    required: true,
  },
  address: {
    type: String,
    required: true,
  },
  parentName: {
    type: String,
    required: true,
  },
  parentPhone: {
    type: String,
    required: true,
  },
  emergencyContact: {
    type: String,
    required: true,
  },
  registeredSubjects: [{
    type: String,
    enum: [
      'Mathematics', 'English', 'Physics', 'Chemistry', 'Biology',
      'Economics', 'Government', 'Literature', 'History', 'Geography',
      'Agricultural Science', 'Computer Science', 'French', 'Yoruba',
      'Christian Religious Studies', 'Islamic Religious Studies'
    ]
  }],
  results: [{
    term: {
      type: String,
      enum: ['First Term', 'Second Term', 'Third Term'],
      required: true
    },
    session: {
      type: String,
      required: true
    },
    subjects: [{
      name: {
        type: String,
        required: true
      },
      score: {
        type: Number,
        required: true
      },
      grade: {
        type: String,
        required: true
      },
      position: {
        type: String,
        required: true
      },
      total: {
        type: Number,
        required: true
      }
    }],
    summary: {
      totalScore: {
        type: Number,
        required: true
      },
      average: {
        type: Number,
        required: true
      },
      position: {
        type: String,
        required: true
      },
      totalStudents: {
        type: Number,
        required: true
      },
      remarks: {
        type: String,
        required: true
      }
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  }
});

// Update the updatedAt timestamp before saving
studentSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Student', studentSchema); 