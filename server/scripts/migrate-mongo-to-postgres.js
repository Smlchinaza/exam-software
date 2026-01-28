#!/usr/bin/env node
"use strict";
// migrate-mongo-to-postgres.js
// Conservative migration script: per-school transactions, preserves mongo_id

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
    batchSize: { type: 'number', default: 500 }
  }).argv;

  const mongoClient = new MongoClient(argv.mongo, { useNewUrlParser: true, useUnifiedTopology: true });
  const pgClient = new Client({ connectionString: argv.pg });

  await mongoClient.connect();
  await pgClient.connect();

  const db = mongoClient.db();

  // maps: mongo_id -> new uuid
  const schoolMap = new Map();
  const userMap = new Map();
  const examMap = new Map();
  const questionMap = new Map();
  const submissionMap = new Map();

  try {
    console.log('Reading schools from Mongo...');
    const schools = await db.collection('schools').find({}).toArray();

    for (const s of schools) {
      const mongoId = String(s._id);
      const newId = uuidv4();
      schoolMap.set(mongoId, newId);

      if (!argv.dryRun) {
        await pgClient.query(
          `INSERT INTO schools (id, mongo_id, name, domain, created_at, updated_at)
           VALUES ($1,$2,$3,$4,$5,$6)
           ON CONFLICT (mongo_id) DO UPDATE SET name = EXCLUDED.name, domain = EXCLUDED.domain, updated_at = EXCLUDED.updated_at`,
          [newId, mongoId, s.name || null, s.domain || null, s.createdAt || new Date(), s.updatedAt || new Date()]
        );
      }
    }

    console.log(`Found ${schools.length} schools. Starting per-school migration...`);

    for (const s of schools) {
      const mongoSchoolId = String(s._id);
      const schoolId = schoolMap.get(mongoSchoolId);
      console.log(`Migrating school ${s.name || mongoSchoolId} -> ${schoolId}`);

      // Collect maps for this school to localize memory usage
      const localUserMap = new Map();
      const localExamMap = new Map();
      const localQuestionMap = new Map();
      const localSubmissionMap = new Map();

      // Begin transaction for this school
      if (!argv.dryRun) await pgClient.query('BEGIN');
      try {
        // Users
        const usersCursor = db.collection('users').find({ $or: [{ schoolId: s._id }, { school: s._id }, { 'school._id': s._id }, { school: String(s._id) }] });
        while (await usersCursor.hasNext()) {
          const u = await usersCursor.next();
          const newU = uuidv4();
          userMap.set(String(u._id), newU);
          localUserMap.set(String(u._id), newU);

          if (argv.dryRun) continue;

          await pgClient.query(
            `INSERT INTO users (id, mongo_id, school_id, role, email, password_hash, first_name, last_name, profile, is_active, created_at, updated_at)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
             ON CONFLICT (mongo_id) DO UPDATE
             SET school_id = EXCLUDED.school_id, role = EXCLUDED.role, email = EXCLUDED.email, password_hash = EXCLUDED.password_hash, first_name = EXCLUDED.first_name, last_name = EXCLUDED.last_name, profile = EXCLUDED.profile, is_active = EXCLUDED.is_active, updated_at = EXCLUDED.updated_at`,
            [newU, String(u._id), schoolId, (u.role || 'student'), u.email || null, u.passwordHash || u.password || null, u.firstName || u.first_name || null, u.lastName || u.last_name || null, u.profile || {}, (u.isActive === undefined ? true : !!u.isActive), u.createdAt || new Date(), u.updatedAt || new Date()]
          );
        }

        // Exams
        const examsCursor = db.collection('exams').find({ $or: [{ schoolId: s._id }, { school: s._id }, { 'school._id': s._id }, { school: String(s._id) }] });
        while (await examsCursor.hasNext()) {
          const e = await examsCursor.next();
          const newE = uuidv4();
          examMap.set(String(e._id), newE);
          localExamMap.set(String(e._id), newE);

          if (argv.dryRun) continue;

          const createdBy = e.createdBy ? userMap.get(String(e.createdBy)) : null;
          await pgClient.query(
            `INSERT INTO exams (id, mongo_id, school_id, created_by, title, description, duration_minutes, metadata, is_published, created_at, updated_at)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
             ON CONFLICT (mongo_id) DO UPDATE
             SET title = EXCLUDED.title, description = EXCLUDED.description, duration_minutes = EXCLUDED.duration_minutes, metadata = EXCLUDED.metadata, is_published = EXCLUDED.is_published, updated_at = EXCLUDED.updated_at`,
            [newE, String(e._id), schoolId, createdBy, e.title || null, e.description || null, e.duration || e.duration_minutes || null, e.metadata || {}, !!e.isPublished, e.createdAt || new Date(), e.updatedAt || new Date()]
          );
        }

        // Questions and options
        const questionsCursor = db.collection('questions').find({ $or: [{ schoolId: s._id }, { school: s._id }, { 'school._id': s._id }, { school: String(s._id) }] });
        while (await questionsCursor.hasNext()) {
          const q = await questionsCursor.next();
          const newQ = uuidv4();
          questionMap.set(String(q._id), newQ);
          localQuestionMap.set(String(q._id), newQ);

          if (!argv.dryRun) {
            const mongoExamId = q.examId || q.exam || null;
            const examId = mongoExamId ? examMap.get(String(mongoExamId)) : null;
            const createdBy = q.createdBy ? userMap.get(String(q.createdBy)) : null;

            await pgClient.query(
              `INSERT INTO questions (id, mongo_id, exam_id, school_id, created_by, type, text, points, metadata, created_at, updated_at)
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
               ON CONFLICT (mongo_id) DO UPDATE SET text = EXCLUDED.text, points = EXCLUDED.points, metadata = EXCLUDED.metadata, updated_at = EXCLUDED.updated_at`,
              [newQ, String(q._id), examId, schoolId, createdBy, q.type || q.questionType || 'mcq', q.text || q.body || null, (q.points !== undefined ? q.points : (q.weight || 1)), q.metadata || {}, q.createdAt || new Date(), q.updatedAt || new Date()]
            );

            if (Array.isArray(q.options)) {
              for (let i = 0; i < q.options.length; i++) {
                const opt = q.options[i];
                await pgClient.query(
                  `INSERT INTO question_options (id, question_id, school_id, text, is_correct, ordinal, created_at)
                   VALUES ($1,$2,$3,$4,$5,$6,$7)
                   ON CONFLICT DO NOTHING`,
                  [uuidv4(), newQ, schoolId, opt.text || opt.value || null, !!opt.isCorrect || !!opt.is_correct, i, q.createdAt || new Date()]
                );
              }
            }
          }
        }

        // Submissions/results
        const resultsCursor = db.collection('results').find({ $or: [{ schoolId: s._id }, { school: s._id }, { 'school._id': s._id }, { school: String(s._id) }] });
        while (await resultsCursor.hasNext()) {
          const r = await resultsCursor.next();
          const newSub = uuidv4();
          submissionMap.set(String(r._id), newSub);
          localSubmissionMap.set(String(r._id), newSub);

          if (!argv.dryRun) {
            const mongoExamId = r.examId || r.exam || null;
            const examId = mongoExamId ? examMap.get(String(mongoExamId)) : null;
            const studentId = r.studentId ? userMap.get(String(r.studentId)) : null;

            await pgClient.query(
              `INSERT INTO exam_submissions (id, mongo_id, exam_id, school_id, student_id, started_at, submitted_at, total_score, metadata, created_at, updated_at)
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
               ON CONFLICT (mongo_id) DO UPDATE SET submitted_at = EXCLUDED.submitted_at, total_score = EXCLUDED.total_score, metadata = EXCLUDED.metadata, updated_at = EXCLUDED.updated_at`,
              [newSub, String(r._id), examId, schoolId, studentId, r.startedAt || r.started_at || null, r.submittedAt || r.submitted_at || null, r.totalScore || r.score || null, r.metadata || {}, r.createdAt || new Date(), r.updatedAt || new Date()]
            );

            if (Array.isArray(r.answers)) {
              for (const a of r.answers) {
                const ansId = uuidv4();
                const questionMongoId = a.questionId || a.qid || null;
                const questionId = questionMap.get(String(questionMongoId));
                await pgClient.query(
                  `INSERT INTO exam_answers (id, submission_id, question_id, school_id, answer, score, graded_by, graded_at, created_at)
                   VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
                   ON CONFLICT DO NOTHING`,
                  [ansId, newSub, questionId, schoolId, a.answer ? a.answer : a, a.score !== undefined ? a.score : null, a.gradedBy ? userMap.get(String(a.gradedBy)) : null, a.gradedAt || a.graded_at || null, a.createdAt || new Date()]
                );
              }
            }
          }
        }

        if (!argv.dryRun) await pgClient.query('COMMIT');
        console.log(`Committed migration for school ${s.name || mongoSchoolId}`);
      } catch (err) {
        console.error(`Error migrating school ${s.name || mongoSchoolId}:`, err);
        if (!argv.dryRun) await pgClient.query('ROLLBACK');
        // continue to next school after logging
      }
    }

    console.log('Migration finished.');
  } catch (err) {
    console.error('Fatal migration error:', err);
  } finally {
    await mongoClient.close();
    await pgClient.end();
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
