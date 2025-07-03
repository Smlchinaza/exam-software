const mongoose = require('mongoose');
const Exam = require('./models/Exam');

// Replace with your actual MongoDB connection string if not using the default
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/exam-software';

mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

Exam.find({})
  .then(exams => {
    exams.forEach(e => {
      console.log({
        _id: e._id,
        title: e.title,
        status: e.status,
        approved: e.approved,
        startTime: e.startTime,
        endTime: e.endTime
      });
    });
    process.exit();
  })
  .catch(err => {
    console.error('Error fetching exams:', err);
    process.exit(1);
  }); 