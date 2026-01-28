# Data-access examples (Postgres / `pg`)

Below are concise examples to replace Mongo queries. Always scope queries by `school_id`.

1) Pool setup

```js
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
module.exports = pool;
```

2) List published exams for a school

```js
async function listPublishedExams(schoolId) {
  const res = await pool.query(
    `SELECT id, title, description, duration_minutes
     FROM exams
     WHERE school_id = $1 AND is_published = true
     ORDER BY created_at DESC`,
    [schoolId]
  );
  return res.rows;
}
```

3) Create exam with questions in a transaction

```js
async function createExamWithQuestions({ schoolId, createdBy, exam, questions }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const examRes = await client.query(
      `INSERT INTO exams (school_id, created_by, title, description, duration_minutes, metadata, is_published)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
      [schoolId, createdBy, exam.title, exam.description, exam.duration_minutes, exam.metadata || {}, !!exam.is_published]
    );
    const examId = examRes.rows[0].id;
    for (const q of questions) {
      const qRes = await client.query(
        `INSERT INTO questions (exam_id, school_id, created_by, type, text, points, metadata)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
        [examId, schoolId, createdBy, q.type, q.text, q.points || 1, q.metadata || {}]
      );
      const qId = qRes.rows[0].id;
      if (Array.isArray(q.options)) {
        for (let i = 0; i < q.options.length; i++) {
          const opt = q.options[i];
          await client.query(
            `INSERT INTO question_options (question_id, school_id, text, is_correct, ordinal)
             VALUES ($1,$2,$3,$4,$5)`,
            [qId, schoolId, opt.text, !!opt.is_correct, i]
          );
        }
      }
    }
    await client.query('COMMIT');
    return { examId };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
```

4) Submit exam example

```js
async function submitExam({ schoolId, examId, studentId, answers }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const subRes = await client.query(
      `INSERT INTO exam_submissions (exam_id, school_id, student_id, started_at, submitted_at, metadata)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
      [examId, schoolId, studentId, answers.started_at || null, answers.submitted_at || new Date(), answers.metadata || {}]
    );
    const submissionId = subRes.rows[0].id;
    for (const ans of answers.items) {
      await client.query(
        `INSERT INTO exam_answers (submission_id, question_id, school_id, answer, score)
         VALUES ($1,$2,$3,$4,$5)`,
        [submissionId, ans.question_id, schoolId, ans.answer, ans.score || null]
      );
    }
    await client.query('COMMIT');
    return { submissionId };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
```
