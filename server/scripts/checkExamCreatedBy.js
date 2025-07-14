const mongoose = require('mongoose');
const Exam = require('../models/Exam');
require('dotenv').config();

async function checkExamCreatedBy() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/exam-software');
    console.log('Connected to MongoDB');

    // Find all exams
    const allExams = await Exam.find({});
    console.log(`Total exams found: ${allExams.length}`);

    // Check for exams with null or missing createdBy
    const examsWithNullCreatedBy = allExams.filter(exam => !exam.createdBy);
    console.log(`Exams with null/missing createdBy: ${examsWithNullCreatedBy.length}`);

    if (examsWithNullCreatedBy.length > 0) {
      console.log('\nExams with null createdBy:');
      examsWithNullCreatedBy.forEach(exam => {
        console.log(`- ID: ${exam._id}, Title: ${exam.title}, Subject: ${exam.subject}`);
      });
    }

    // Check for exams with string createdBy
    const examsWithStringCreatedBy = allExams.filter(exam => exam.createdBy && typeof exam.createdBy === 'string');
    console.log(`\nExams with string createdBy: ${examsWithStringCreatedBy.length}`);

    // Check for exams with object createdBy
    const examsWithObjectCreatedBy = allExams.filter(exam => exam.createdBy && typeof exam.createdBy === 'object');
    console.log(`Exams with object createdBy: ${examsWithObjectCreatedBy.length}`);

    // Sample some exams
    if (allExams.length > 0) {
      console.log('\nSample exam data:');
      const sampleExam = allExams[0];
      console.log(`- ID: ${sampleExam._id}`);
      console.log(`- Title: ${sampleExam.title}`);
      console.log(`- createdBy: ${sampleExam.createdBy}`);
      console.log(`- createdBy type: ${typeof sampleExam.createdBy}`);
      if (sampleExam.createdBy && typeof sampleExam.createdBy === 'object') {
        console.log(`- createdBy._id: ${sampleExam.createdBy._id}`);
      }
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

checkExamCreatedBy(); 