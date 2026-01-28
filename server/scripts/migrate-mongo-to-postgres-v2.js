#!/usr/bin/env node
"use strict";
// migrate-mongo-to-postgres-v2.js
// Revised for single-tenant setup (no schools collection)
// Adapted schema mapping from actual MongoDB structure

const { MongoClient } = require('mongodb');
const { Client } = require('pg');
const { v4: uuidv4 } = require('uuid');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');

async function main() {
  const argv = yargs(hideBin(process.argv)).options({
    mongo: { type: 'string', demandOption: true },
    pg: { type: 'string', demandOption: true },
    dryRun: { type: 'boolean', default: false },
    schoolName: { type: 'string', default: 'Default School' }
  }).argv;

  const mongoClient = new MongoClient(argv.mongo, { useNewUrlParser: true, useUnifiedTopology: true });
  const pgClient = new Client({ connectionString: argv.pg });

  await mongoClient.connect();
  await pgClient.connect();

  const db = mongoClient.db();

  // Maps: mongo_id (string) -> new uuid
  const userMap = new Map();
  const examMap = new Map();
  const questionMap = new Map();
  const submissionMap = new Map();

  // Default school (single-tenant mode)
  const defaultSchoolId = uuidv4();
  const schoolName = argv.schoolName;

  try {
    console.log(`Using default school: ${schoolName}`);

    // Insert default school
    if (!argv.dryRun) {
      await pgClient.query(
        `INSERT INTO schools (id, name, domain, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5)`,
        [defaultSchoolId, schoolName, null, new Date(), new Date()]
      );
    }
    console.log(`Default school ID: ${defaultSchoolId}`);

    // Begin transaction for entire migration
    if (!argv.dryRun) await pgClient.query('BEGIN');

    // 1) Migrate users
    console.log('\nMigrating users...');
    const users = await db.collection('users').find({}).toArray();
    console.log(`Found ${users.length} users.`);

    for (const u of users) {
      const newU = uuidv4();
      userMap.set(String(u._id), newU);

      // Map role: 'teacher', 'student', 'admin' (Mongo has these)
      const role = u.role || 'student';

      if (!argv.dryRun) {
        await pgClient.query(
          `INSERT INTO users (id, mongo_id, school_id, role, email, password_hash, first_name, last_name, profile, is_active, created_at, updated_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
          [
            newU, String(u._id), defaultSchoolId, role,
            u.email || null, u.password || null,
            u.displayName || u.firstName || u.first_name || null,
            u.lastName || u.last_name || null,
            JSON.stringify({ uniqueCode: u.uniqueCode || null }),
            true, u.createdAt || new Date(), u.updatedAt || new Date()
          ]
        );
      }
    }

    // 2) Migrate exams
    console.log('\nMigrating exams...');
    const exams = await db.collection('exams').find({}).toArray();
    console.log(`Found ${exams.length} exams.`);

    for (const e of exams) {
      const newE = uuidv4();
      examMap.set(String(e._id), newE);

      // createdBy: assume first exam has a creator, but we may not have it; set null if missing
      const createdBy = e.createdBy ? userMap.get(String(e.createdBy)) : null;

      if (!argv.dryRun) {
        await pgClient.query(
          `INSERT INTO exams (id, mongo_id, school_id, created_by, title, description, duration_minutes, metadata, is_published, created_at, updated_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
          [
            newE, String(e._id), defaultSchoolId, createdBy,
            e.title || null, e.description || null,
            e.duration || e.duration_minutes || null,
            JSON.stringify({
              totalMarks: e.totalMarks || null,
              subject: e.subject || null,
              difficulty: e.difficulty || null,
              instructions: e.instructions || null,
              startTime: e.startTime || null,
              endTime: e.endTime || null
            }),
            true,
            e.createdAt || new Date(), e.updatedAt || new Date()
          ]
        );
      }
    }

    // 3) Migrate questions and options
    console.log('\nMigrating questions...');
    const questions = await db.collection('questions').find({}).toArray();
    console.log(`Found ${questions.length} questions.`);

    for (const q of questions) {
      const newQ = uuidv4();
      questionMap.set(String(q._id), newQ);

      // Find which exam this question belongs to (via exams.questions array)
      let examId = null;
      for (const e of exams) {
        if (Array.isArray(e.questions) && e.questions.includes(String(q._id))) {
          examId = examMap.get(String(e._id));
          break;
        }
      }

      // Skip orphaned questions (not linked to any exam)
      if (!examId) {
        console.log(`Skipping orphaned question: ${q._id}`);
        continue;
      }

      const createdBy = q.createdBy ? userMap.get(String(q.createdBy)) : null;

      if (!argv.dryRun) {
        await pgClient.query(
          `INSERT INTO questions (id, mongo_id, exam_id, school_id, created_by, type, text, points, metadata, created_at, updated_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
          [
            newQ, String(q._id), examId, defaultSchoolId, createdBy,
            'mcq', q.question || q.text || null,
            q.marks || 1,
            JSON.stringify({
              explanation: q.explanation || null,
              subject: q.subject || null,
              correctAnswer: q.correctAnswer !== undefined ? q.correctAnswer : null
            }),
            q.createdAt || new Date(), q.updatedAt || new Date()
          ]
        );

        // Insert MCQ options
        if (Array.isArray(q.options)) {
          for (let i = 0; i < q.options.length; i++) {
            const opt = q.options[i];
            await pgClient.query(
              `INSERT INTO question_options (id, question_id, school_id, text, is_correct, ordinal, created_at)
               VALUES ($1,$2,$3,$4,$5,$6,$7)`,
              [
                uuidv4(), newQ, defaultSchoolId, opt,
                i === q.correctAnswer, i,
                q.createdAt || new Date()
              ]
            );
          }
        }
      }
    }

    // 4) Migrate exam submissions and answers
    console.log('\nMigrating exam submissions...');
    const submissions = await db.collection('examsubmissions').find({}).toArray();
    console.log(`Found ${submissions.length} submissions.`);

    for (const s of submissions) {
      const newSub = uuidv4();
      submissionMap.set(String(s._id), newSub);

      const examId = s.exam ? examMap.get(String(s.exam)) : null;
      const studentId = s.student ? userMap.get(String(s.student)) : null;

      if (!argv.dryRun) {
        await pgClient.query(
          `INSERT INTO exam_submissions (id, mongo_id, exam_id, school_id, student_id, started_at, submitted_at, total_score, metadata, created_at, updated_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
          [
            newSub, String(s._id), examId, defaultSchoolId, studentId,
            s.startedAt || s.started_at || null,
            s.submittedAt || s.submitted_at || new Date(),
            s.score !== undefined ? s.score : null,
            JSON.stringify({}),
            s.createdAt || new Date(), s.updatedAt || new Date()
          ]
        );

        // Insert answers (skip if question doesn't exist in mapping)
        if (s.answers && typeof s.answers === 'object') {
          for (const [questionId, answerValue] of Object.entries(s.answers)) {
            const qId = questionMap.get(questionId);
            if (!qId) {
              console.log(`  Skipping answer for orphaned question: ${questionId}`);
              continue;
            }
            await pgClient.query(
              `INSERT INTO exam_answers (id, submission_id, question_id, school_id, answer, score, created_at)
               VALUES ($1,$2,$3,$4,$5,$6,$7)`,
              [
                uuidv4(), newSub, qId, defaultSchoolId,
                JSON.stringify({ selectedOption: answerValue }),
                null,
                s.createdAt || new Date()
              ]
            );
          }
        }
      }
    }

    if (!argv.dryRun) await pgClient.query('COMMIT');
    console.log('\n✓ Migration completed successfully.');
    console.log(`  School: ${defaultSchoolId}`);
    console.log(`  Users: ${users.length}`);
    console.log(`  Exams: ${exams.length}`);
    console.log(`  Questions: ${questions.length}`);
    console.log(`  Submissions: ${submissions.length}`);
  } catch (err) {
    console.error('Migration error:', err);
    if (!argv.dryRun) {
      try {
        await pgClient.query('ROLLBACK');
      } catch (e) {
        // ignore
      }
    }
  } finally {
    await mongoClient.close();
    await pgClient.end();
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
