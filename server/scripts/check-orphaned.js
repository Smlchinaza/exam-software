#!/usr/bin/env node
"use strict";
const { MongoClient, ObjectId } = require('mongodb');

(async () => {
  const mongoUri = process.argv[2] || process.env.MONGODB_URI;
  const client = new MongoClient(mongoUri);
  await client.connect();
  const db = client.db();

  try {
    // Check orphaned question
    const qId = '685fdb59e07798fa82490678';
    const q = await db.collection('questions').findOne({ '_id': new ObjectId(qId) });
    console.log(`Question ${qId} exists:`, q ? 'YES' : 'NO');

    // List all questions and exams
    const allQs = await db.collection('questions').find({}).toArray();
    const allEs = await db.collection('exams').find({}).toArray();

    const questionIds = new Set(allQs.map(q => String(q._id)));

    console.log(`\nTotal questions in DB: ${allQs.length}`);
    console.log(`Total exams: ${allEs.length}`);

    // Check which questions referenced in exams don't exist
    let orphanedRefs = 0;
    for (const e of allEs) {
      if (Array.isArray(e.questions)) {
        for (const qRef of e.questions) {
          if (!questionIds.has(String(qRef))) {
            orphanedRefs++;
            if (orphanedRefs <= 5) {
              console.log(`  Exam "${e.title}": question ${qRef} NOT FOUND`);
            }
          }
        }
      }
    }
    console.log(`Total orphaned question references: ${orphanedRefs}`);
  } finally {
    await client.close();
  }
})();
