-- Postgres schema for exam platform (multi-tenant)
-- Uses UUIDs for PKs and school_id FK in tenant tables
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
-- schools
CREATE TABLE IF NOT EXISTS schools (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    mongo_id text UNIQUE,
    name text NOT NULL,
    domain text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_schools_name ON schools(name);
-- user roles
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'user_role'
) THEN CREATE TYPE user_role AS ENUM ('admin', 'teacher', 'student');
END IF;
END $$;
-- users
CREATE TABLE IF NOT EXISTS users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    mongo_id text,
    school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    role user_role NOT NULL,
    email text NOT NULL,
    password_hash text,
    first_name text,
    last_name text,
    profile jsonb,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (school_id, email)
);
CREATE INDEX IF NOT EXISTS idx_users_school ON users(school_id);
CREATE INDEX IF NOT EXISTS idx_users_school_role ON users(school_id, role);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
-- exams
CREATE TABLE IF NOT EXISTS exams (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    mongo_id text,
    school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    created_by uuid REFERENCES users(id) ON DELETE
    SET NULL,
        title text NOT NULL,
        description text,
        duration_minutes integer,
        metadata jsonb,
        is_published boolean NOT NULL DEFAULT false,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_exams_school ON exams(school_id);
CREATE INDEX IF NOT EXISTS idx_exams_school_published ON exams(school_id, is_published);
-- questions
CREATE TABLE IF NOT EXISTS questions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    mongo_id text,
    exam_id uuid NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    created_by uuid REFERENCES users(id) ON DELETE
    SET NULL,
        type text NOT NULL,
        text text NOT NULL,
        points numeric NOT NULL DEFAULT 1,
        metadata jsonb,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_questions_school_exam ON questions(school_id, exam_id);
-- question options
CREATE TABLE IF NOT EXISTS question_options (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id uuid NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    text text NOT NULL,
    is_correct boolean NOT NULL DEFAULT false,
    ordinal integer,
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_qopts_question ON question_options(question_id);
CREATE INDEX IF NOT EXISTS idx_qopts_school ON question_options(school_id);
-- exam_submissions
CREATE TABLE IF NOT EXISTS exam_submissions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    mongo_id text,
    exam_id uuid NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    student_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    started_at timestamptz,
    submitted_at timestamptz,
    total_score numeric,
    metadata jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_submissions_school_student ON exam_submissions(school_id, student_id);
CREATE INDEX IF NOT EXISTS idx_submissions_exam ON exam_submissions(exam_id);
-- exam_answers
CREATE TABLE IF NOT EXISTS exam_answers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id uuid NOT NULL REFERENCES exam_submissions(id) ON DELETE CASCADE,
    question_id uuid NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    answer jsonb,
    score numeric,
    graded_by uuid REFERENCES users(id) ON DELETE
    SET NULL,
        graded_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_answers_submission ON exam_answers(submission_id);
CREATE INDEX IF NOT EXISTS idx_answers_question ON exam_answers(question_id);
CREATE INDEX IF NOT EXISTS idx_answers_school ON exam_answers(school_id);
-- subjects (optional)
CREATE TABLE IF NOT EXISTS subjects (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    mongo_id text,
    school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    name text NOT NULL,
    code text,
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_subjects_school ON subjects(school_id);
-- GIN indexes for JSONB fields (add only if queries will use these fields)
-- CREATE INDEX ON users USING GIN (profile);
-- CREATE INDEX ON exams USING GIN (metadata);