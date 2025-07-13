// approveAllTeachers.js
// Run this script to approve all teachers who are not yet approved

const mongoose = require('mongoose');
const User = require('../models/users/User');

// TODO: Update this with your actual MongoDB connection string
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/exam_software';

async function approveAllTeachers() {
  try {
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    const result = await User.updateMany(
      { role: 'teacher', $or: [ { approved: { $exists: false } }, { approved: false } ] },
      { $set: { approved: true } }
    );

    console.log(`Approved ${result.modifiedCount} teacher(s).`);
  } catch (err) {
    console.error('Error approving teachers:', err);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    process.exit(0);
  }
}

approveAllTeachers(); 