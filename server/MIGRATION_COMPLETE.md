# MongoDB to PostgreSQL Migration: Completed ✓

**Date:** January 28, 2026  
**Status:** ✅ **SUCCESSFUL**

## Migration Summary

### Data Migrated
```
Default School: 2c048ff5-bd7f-4c47-89eb-9ca54cc2b360
  Users:       54
  Exams:       23
  Questions:   81 (9 orphaned, skipped)
  Submissions: 17 (with all answers)
  Answers:     0 skipped
```

### Schema
- **Database:** Neon PostgreSQL (us-east-1)
- **Tenant Model:** Single-tenant with default school
- **UUID PKs:** All tables use UUID primary keys
- **Foreign Keys:** Enforced with ON DELETE CASCADE
- **Indexes:** Optimized for multi-tenant queries (school_id indexed everywhere)

### How to Migrate Your Application

#### 1. Update `.env` to use Postgres
```env
DATABASE_URL=

#### 2. Install Postgres driver
```bash
npm install pg
```

#### 3. Replace MongoDB with Postgres in your app

Example: Replace old Mongoose queries with `pg` queries.

**Old (Mongoose):**
```js
const exam = await Exam.findById(id);
```

**New (Postgres):**
```js
const res = await pool.query(
  'SELECT * FROM exams WHERE id = $1 AND school_id = $2',
  [id, schoolId]
);
const exam = res.rows[0];
```

#### 4. Update routes to scope by school_id

All queries MUST include `school_id` for multi-tenant safety:

```js
app.get('/exams', async (req, res) => {
  const schoolId = req.user.school_id; // from JWT or session
  const result = await pool.query(
    `SELECT * FROM exams WHERE school_id = $1 AND is_published = true`,
    [schoolId]
  );
  res.json(result.rows);
});
```

#### 5. Use transactions for exam lifecycle operations

```js
// Create exam with questions atomically
async function createExamWithQuestions({ schoolId, title, questions }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const examRes = await client.query(
      `INSERT INTO exams (id, school_id, title, is_published)
       VALUES (gen_random_uuid(), $1, $2, false) RETURNING id`,
      [schoolId, title]
    );
    const examId = examRes.rows[0].id;

    for (const q of questions) {
      await client.query(
        `INSERT INTO questions (id, exam_id, school_id, type, text, points)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5)`,
        [examId, schoolId, q.type, q.text, q.points]
      );
    }
    await client.query('COMMIT');
    return examId;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
```

### Files & Scripts

| File | Purpose |
|------|---------|
| `sql/schema-postgres.sql` | Postgres schema (run once to set up tables) |
| `scripts/setup-postgres-schema.js` | Node.js utility to apply schema |
| `scripts/migrate-mongo-to-postgres-v3.js` | Final migration script (MongoDB → Postgres) |
| `scripts/data-access-examples.md` | Pg query examples and patterns |
| `scripts/inspect-mongo.js` | Debug MongoDB collections |

### Verification

Run sanity checks in Postgres:

```sql
-- Check user count
SELECT COUNT(*) FROM users WHERE school_id = '2c048ff5-bd7f-4c47-89eb-9ca54cc2b360';
-- Expected: 54

-- Check exam-question links
SELECT e.title, COUNT(q.id) AS questions
FROM exams e
LEFT JOIN questions q ON e.id = q.exam_id
WHERE e.school_id = '2c048ff5-bd7f-4c47-89eb-9ca54cc2b360'
GROUP BY e.id, e.title;
-- Expected: 23 exams with questions

-- Check submissions with answers
SELECT s.id, COUNT(a.id) AS answers
FROM exam_submissions s
LEFT JOIN exam_answers a ON s.id = a.submission_id
WHERE s.school_id = '2c048ff5-bd7f-4c47-89eb-9ca54cc2b360'
GROUP BY s.id
ORDER BY s.created_at DESC;
-- Expected: 17 submissions
```

### Known Limitations & Data Quality Issues

1. **9 Orphaned Questions:** Exist in Mongo but not referenced by any exam. These were skipped during migration.
2. **20 Dangling Exam References:** Some exams reference questions that don't exist in Mongo (data corruption in source DB).
3. **Password Hashes:** Migrated as-is. Verify they're bcrypt-compatible with your auth layer.

### Rollback Plan

If anything goes wrong:
1. MongoDB remains untouched and is still the source of truth.
2. Keep this Postgres DB as a backup/staging DB.
3. Redeploy the app with `MONGODB_URI` set to revert to Mongo.

### Next Steps

1. ✅ Dry-run validation done
2. ✅ Schema created
3. ✅ Data migrated (54 users, 23 exams, 81 questions, 17 submissions)
4. ⏳ Update backend data-access layer (routes, middleware)
5. ⏳ Test full app flow (login, create exam, submit exam)
6. ⏳ Performance testing and query optimization
7. ⏳ Cutover to production Postgres

### Support Scripts

**Run dry-run migration again:**
```bash
node scripts/migrate-mongo-to-postgres-v3.js \
  --mongo "$MONGODB_URI" \
  --pg "$DATABASE_URL" \
  --dryRun
```

**Inspect MongoDB structure:**
```bash
node scripts/inspect-mongo.js "$MONGODB_URI"
```

**Check for orphaned data:**
```bash
node scripts/check-orphaned.js "$MONGODB_URI"
```

---

**Contact:** For issues or questions, refer to `MIGRATION_README.md` for detailed step-by-step instructions.
