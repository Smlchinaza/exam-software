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

const deleteTeacherStudentAccounts = async () => {
  try {
    console.log('Starting deletion of teacher and student accounts...\n');

    // Step 1: Find all teacher and student users
    const teacherStudentUsers = await User.find({
      role: { $in: ['teacher', 'student'] }
    });
    
    console.log(`Found ${teacherStudentUsers.length} teacher/student users:`);
    teacherStudentUsers.forEach(user => {
      console.log(`- ${user.email} (${user.role})`);
    });

    if (teacherStudentUsers.length === 0) {
      console.log('No teacher or student accounts found to delete.');
      return;
    }

    // Step 2: Handle Exam Submissions (delete them)
    const examSubmissions = await ExamSubmission.find({
      student: { $in: teacherStudentUsers.map(u => u._id) }
    });
    
    if (examSubmissions.length > 0) {
      console.log(`\nDeleting ${examSubmissions.length} exam submissions...`);
      await ExamSubmission.deleteMany({
        student: { $in: teacherStudentUsers.map(u => u._id) }
      });
      console.log('Exam submissions deleted successfully.');
    }

    // Step 3: Handle Questions created by teachers (delete them)
    const teacherIds = teacherStudentUsers
      .filter(u => u.role === 'teacher')
      .map(u => u._id);
    
    if (teacherIds.length > 0) {
      const questionsByTeachers = await Question.find({
        createdBy: { $in: teacherIds }
      });
      
      if (questionsByTeachers.length > 0) {
        console.log(`\nDeleting ${questionsByTeachers.length} questions created by teachers...`);
        await Question.deleteMany({
          createdBy: { $in: teacherIds }
        });
        console.log('Questions deleted successfully.');
      }
    }

    // Step 4: Handle Exams created by teachers (delete them)
    if (teacherIds.length > 0) {
      const examsByTeachers = await Exam.find({
        createdBy: { $in: teacherIds }
      });
      
      if (examsByTeachers.length > 0) {
        console.log(`\nDeleting ${examsByTeachers.length} exams created by teachers...`);
        await Exam.deleteMany({
          createdBy: { $in: teacherIds }
        });
        console.log('Exams deleted successfully.');
      }
    }

    // Step 5: Handle Subjects - remove teacher references
    const subjects = await Subject.find({
      teachers: { $in: teacherIds }
    });
    
    if (subjects.length > 0) {
      console.log(`\nRemoving teacher references from ${subjects.length} subjects...`);
      for (const subject of subjects) {
        subject.teachers = subject.teachers.filter(
          teacherId => !teacherIds.includes(teacherId)
        );
        await subject.save();
      }
      console.log('Teacher references removed from subjects.');
    }

    // Step 6: Handle Exams approved by teachers (set approvedBy to null)
    const examsApprovedByTeachers = await Exam.find({
      approvedBy: { $in: teacherIds }
    });
    
    if (examsApprovedByTeachers.length > 0) {
      console.log(`\nRemoving approval references from ${examsApprovedByTeachers.length} exams...`);
      await Exam.updateMany(
        { approvedBy: { $in: teacherIds } },
        { 
          $set: { 
            approvedBy: null,
            approved: false,
            approvedAt: null
          }
        }
      );
      console.log('Exam approval references removed.');
    }

    // Step 7: Delete Student records
    const studentEmails = teacherStudentUsers
      .filter(u => u.role === 'student')
      .map(u => u.email);
    
    if (studentEmails.length > 0) {
      const studentRecords = await Student.find({
        email: { $in: studentEmails }
      });
      
      if (studentRecords.length > 0) {
        console.log(`\nDeleting ${studentRecords.length} student records...`);
        await Student.deleteMany({
          email: { $in: studentEmails }
        });
        console.log('Student records deleted successfully.');
      }
    }

    // Step 8: Finally, delete the User accounts
    console.log(`\nDeleting ${teacherStudentUsers.length} user accounts...`);
    await User.deleteMany({
      role: { $in: ['teacher', 'student'] }
    });
    console.log('User accounts deleted successfully.');

    // Step 9: Summary
    console.log('\n=== DELETION SUMMARY ===');
    console.log(`✅ Deleted ${teacherStudentUsers.length} user accounts`);
    console.log(`✅ Deleted ${examSubmissions.length} exam submissions`);
    console.log(`✅ Deleted ${questionsByTeachers?.length || 0} questions`);
    console.log(`✅ Deleted ${examsByTeachers?.length || 0} exams`);
    console.log(`✅ Updated ${subjects.length} subjects (removed teacher references)`);
    console.log(`✅ Updated ${examsApprovedByTeachers.length} exams (removed approval references)`);
    console.log(`✅ Deleted ${studentRecords?.length || 0} student records`);
    
    console.log('\n🎉 All teacher and student accounts have been successfully deleted!');
    console.log('⚠️  Note: All related data (exams, questions, submissions) created by these users has also been removed.');

  } catch (error) {
    console.error('Error during deletion:', error);
    throw error;
  }
};

const main = async () => {
  try {
    await connectDB();
    await deleteTeacherStudentAccounts();
    console.log('\nScript completed successfully.');
  } catch (error) {
    console.error('Script failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Database connection closed.');
    process.exit(0);
  }
};

// Run the script
main(); 