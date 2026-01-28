#!/usr/bin/env node
"use strict";
const { MongoClient } = require('mongodb');

(async () => {
  const mongoUri = process.argv[2] || process.env.MONGODB_URI;
  const client = new MongoClient(mongoUri);
  await client.connect();

  try {
    const db = client.db();

    // Check question mapping in exams
    const exams = await db.collection('exams').find({}).toArray();
    console.log(`\n=== Exams to Questions ===`);
    for (const e of exams) {
      console.log(`Exam ${e._id} (${e.title}): ${(e.questions || []).length} questions`);
      if (e.questions) {
        console.log(`  Q IDs: ${(e.questions).slice(0, 3).join(', ')}`);
      }
    }

    // Check submissions
    const subs = await db.collection('examsubmissions').find({}).limit(3).toArray();
    console.log(`\n=== Sample Submissions ===`);
    for (const s of subs) {
      console.log(`Submission ${s._id}:`);
      console.log(`  Exam: ${s.exam}`);
      console.log(`  Answers: ${Object.keys(s.answers || {}).join(', ')}`);
    }

    // Check questions
    const qs = await db.collection('questions').find({}).limit(3).toArray();
    console.log(`\n=== Sample Questions ===`);
    for (const q of qs) {
      console.log(`Question ${q._id}: "${q.question || q.text}"`);
    }
  } finally {
    await client.close();
  }
})();
