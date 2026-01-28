# Migration README

This document explains how to run a conservative migration from MongoDB to Postgres for the exam platform.

Prerequisites
- A running Postgres instance and the connection string in `DATABASE_URL`.
- A MongoDB instance and the connection string in `MONGO_URI`.
- Backup your MongoDB: `mongodump --uri "$MONGO_URI" --archive=backup.gz --gzip`
- Create an empty Postgres database or schema and run `server/sql/schema-postgres.sql`.

Install dependencies (inside `server/`):

```bash
npm install
npm install --no-save mongodb pg uuid yargs
```

Run a dry-run migration (no writes to Postgres):

```bash
MONGO_URI="mongodb://..." DATABASE_URL="postgres://..." node scripts/migrate-mongo-to-postgres.js --mongo "$MONGO_URI" --pg "$DATABASE_URL" --dryRun
```

Run an actual migration:

```bash
MONGO_URI="mongodb://..." DATABASE_URL="postgres://..." node scripts/migrate-mongo-to-postgres.js --mongo "$MONGO_URI" --pg "$DATABASE_URL"
```

Validation checklist
- Compare counts per school for collections: `users`, `exams`, `questions`, `results`.
- Spot-check foreign keys: every `exam.created_by` should reference a `users.id` or be NULL.
- Verify a sample of `exam_answers` point to existing `questions`.
- Verify password hashes are preserved and compatible with your auth logic.

Rollback plan
- Keep MongoDB readonly as a fallback until Postgres is fully validated.

Notes
- Script is conservative: it stores original Mongo `_id` into `mongo_id` fields and uses upserts by `mongo_id`.
- Missing or dangling references are logged to console; you should capture the logs and reconcile before final cutover.
