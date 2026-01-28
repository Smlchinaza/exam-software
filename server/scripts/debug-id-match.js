#!/usr/bin/env node
"use strict";
const { MongoClient } = require('mongodb');

(async () => {
  const mongoUri = process.argv[2] || process.env.MONGODB_URI;
  const client = new MongoClient(mongoUri);
  await client.connect();
  const db = client.db();

  try {
    // Get one exam and see type of question IDs
    const e = await db.collection('exams').findOne({});
    console.log('Exam questions field type:', typeof e.questions[0]);
    console.log('Sample exam question ID:', e.questions[0], typeof e.questions[0]);

    // Get one question and see type of _id
    const q = await db.collection('questions').findOne({});
    console.log('Question _id:', q._id, typeof q._id);
    console.log('Question _id string:', String(q._id));

    // Try to find if any exam question matches any question
    const allQs = await db.collection('questions').find({}).project({ _id: 1 }).toArray();
    const qIdSet = new Set(allQs.map(q => String(q._id)));

    const firstExam = await db.collection('exams').findOne({});
    if (Array.isArray(firstExam.questions)) {
      console.log(`\nExam has ${firstExam.questions.length} questions`);
      for (let i = 0; i < Math.min(3, firstExam.questions.length); i++) {
        const qRef = firstExam.questions[i];
        const refStr = String(qRef);
        console.log(`  Question ref: ${refStr}, type: ${typeof qRef}`);
        console.log(`  Found in DB: ${qIdSet.has(refStr)}`);
      }
    }
  } finally {
    await client.close();
  }
})();
