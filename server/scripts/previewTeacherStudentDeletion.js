const mongoose = require('mongoose');
const User = require('../models/users/User');
const Student = require('../models/students/Student');
const Exam = require('../models/Exam');
const ExamSubmission = require('../models/ExamSubmission');
const Question = require('../models/Question');
const Subject = require('../models/Subject');

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/exam-software');
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

const previewTeacherStudentDeletion = async () => {
  try {
    console.log('🔍 PREVIEW: What will be deleted when removing teacher and student accounts...\n');

    // Step 1: Find all teacher and student users
    const teacherStudentUsers = await User.find({
      role: { $in: ['teacher', 'student'] }
    });
    
    console.log(`📋 Found ${teacherStudentUsers.length} teacher/student users:`);
    teacherStudentUsers.forEach(user => {
      console.log(`   - ${user.email} (${user.role}) - ${user.firstName} ${user.lastName}`);
    });

    if (teacherStudentUsers.length === 0) {
      console.log('✅ No teacher or student accounts found to delete.');
      return;
    }

    const teacherIds = teacherStudentUsers
      .filter(u => u.role === 'teacher')
      .map(u => u._id);
    
    const studentIds = teacherStudentUsers
      .filter(u => u.role === 'student')
      .map(u => u._id);

    // Step 2: Check Exam Submissions
    const examSubmissions = await ExamSubmission.find({
      student: { $in: studentIds }
    });
    
    console.log(`\n📝 Exam Submissions to be deleted: ${examSubmissions.length}`);
    if (examSubmissions.length > 0) {
      console.log('   This will remove all exam results and submissions from students.');
    }

    // Step 3: Check Questions created by teachers
    let questionsByTeachers = [];
    if (teacherIds.length > 0) {
      questionsByTeachers = await Question.find({
        createdBy: { $in: teacherIds }
      });
      
      console.log(`\n❓ Questions to be deleted: ${questionsByTeachers.length}`);
      if (questionsByTeachers.length > 0) {
        console.log('   This will remove all questions created by teachers.');
      }
    }

    // Step 4: Check Exams created by teachers
    let examsByTeachers = [];
    if (teacherIds.length > 0) {
      examsByTeachers = await Exam.find({
        createdBy: { $in: teacherIds }
      });
      
      console.log(`\n📊 Exams to be deleted: ${examsByTeachers.length}`);
      if (examsByTeachers.length > 0) {
        console.log('   This will remove all exams created by teachers.');
      }
    }

    // Step 5: Check Subjects with teacher references
    const subjectsWithTeachers = await Subject.find({
      teachers: { $in: teacherIds }
    });
    
    console.log(`\n📚 Subjects to be updated: ${subjectsWithTeachers.length}`);
    if (subjectsWithTeachers.length > 0) {
      console.log('   Teacher references will be removed from these subjects:');
      subjectsWithTeachers.forEach(subject => {
        console.log(`   - ${subject.name} (${subject.class})`);
      });
    }

    // Step 6: Check Exams approved by teachers
    const examsApprovedByTeachers = await Exam.find({
      approvedBy: { $in: teacherIds }
    });
    
    console.log(`\n✅ Exams with approval references to be updated: ${examsApprovedByTeachers.length}`);
    if (examsApprovedByTeachers.length > 0) {
      console.log('   Approval references will be removed from these exams:');
      examsApprovedByTeachers.forEach(exam => {
        console.log(`   - ${exam.title} (${exam.subject})`);
      });
    }

    // Step 7: Check Student records
    const studentEmails = teacherStudentUsers
      .filter(u => u.role === 'student')
      .map(u => u.email);
    
    let studentRecords = [];
    if (studentEmails.length > 0) {
      studentRecords = await Student.find({
        email: { $in: studentEmails }
      });
      
      console.log(`\n👨‍🎓 Student records to be deleted: ${studentRecords.length}`);
      if (studentRecords.length > 0) {
        console.log('   This will remove detailed student information and academic records.');
      }
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 DELETION SUMMARY');
    console.log('='.repeat(60));
    console.log(`👥 User accounts: ${teacherStudentUsers.length}`);
    console.log(`📝 Exam submissions: ${examSubmissions.length}`);
    console.log(`❓ Questions: ${questionsByTeachers.length}`);
    console.log(`📊 Exams: ${examsByTeachers.length}`);
    console.log(`📚 Subjects to update: ${subjectsWithTeachers.length}`);
    console.log(`✅ Exams to update (approval): ${examsApprovedByTeachers.length}`);
    console.log(`👨‍🎓 Student records: ${studentRecords.length}`);
    console.log('='.repeat(60));

    const totalItems = teacherStudentUsers.length + examSubmissions.length + 
                      questionsByTeachers.length + examsByTeachers.length + 
                      studentRecords.length;

    console.log(`\n⚠️  WARNING: This will permanently delete ${totalItems} items from your database!`);
    console.log('💡 To proceed with deletion, run: node scripts/deleteTeacherStudentAccounts.js');
    console.log('💡 To cancel, simply don\'t run the deletion script.');

  } catch (error) {
    console.error('Error during preview:', error);
    throw error;
  }
};

const main = async () => {
  try {
    await connectDB();
    await previewTeacherStudentDeletion();
    console.log('\nPreview completed successfully.');
  } catch (error) {
    console.error('Preview failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Database connection closed.');
    process.exit(0);
  }
};

// Run the script
main(); 