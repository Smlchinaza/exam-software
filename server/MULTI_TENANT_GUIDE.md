# Multi-Tenant Backend Integration Guide

## Overview

The backend has been updated to enforce multi-tenant scoping on all Postgres-based routes. Each tenant is identified by a `school_id`, and all queries are automatically scoped to the authenticated user's school.

## How Multi-Tenancy Works

### 1. JWT Now Includes `school_id`

When a user logs in via Postgres auth, the JWT includes:
```json
{
  "id": "user-uuid",
  "email": "user@school.com",
  "role": "teacher",
  "school_id": "school-uuid"
}
```

### 2. Tenant Middleware Enforces Scoping

The `enforceMultiTenant` middleware:
- Extracts `school_id` from JWT
- Attaches it to `req.tenant`
- All route handlers use `req.tenant.schoolId` in WHERE clauses

### 3. Every Query Includes School_ID

Example:
```sql
-- ❌ BEFORE (accessible to all schools)
SELECT * FROM exams WHERE id = $1;

-- ✅ AFTER (scoped to user's school)
SELECT * FROM exams WHERE id = $1 AND school_id = $2;
```

## Integration Steps

### Step 1: Update server.js

Replace old MongoDB routes with new Postgres routes:

```javascript
// OLD (remove these)
// app.use('/api/auth', authRoutes);
// app.use('/api/exams', examRoutes);

// NEW (add these)
const authPostgres = require('./routes/auth-postgres');
const examsPostgres = require('./routes/exams-postgres');
const submissionsPostgres = require('./routes/submissions-postgres');
const usersPostgres = require('./routes/users-postgres');

app.use('/api/auth', authPostgres);
app.use('/api/exams', examsPostgres);
app.use('/api/submissions', submissionsPostgres);
app.use('/api/users', usersPostgres);
```

### Step 2: Test Registration & Login

```bash
# Register
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "teacher@school.com",
    "password": "secure123",
    "first_name": "John",
    "last_name": "Doe",
    "role": "teacher"
  }'

# Response includes JWT with school_id
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": { "id": "...", "school_id": "...", "role": "teacher" }
}
```

### Step 3: Use Token in Requests

All requests must include Authorization header:

```bash
# Get exams for the authenticated school
curl -X GET http://localhost:5000/api/exams \
  -H "Authorization: Bearer <token>"

# Create new exam
curl -X POST http://localhost:5000/api/exams \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Mathematics Final",
    "questions": [...]
  }'
```

## Key Security Features

### 1. Automatic School Scoping

Every query is scoped by `school_id`:

```javascript
// Router automatically scopes to user's school
router.get('/', authenticateJWT, enforceMultiTenant, async (req, res) => {
  const { schoolId } = req.tenant; // Automatically extracted
  const result = await pool.query(
    'SELECT * FROM exams WHERE school_id = $1',
    [schoolId]
  );
});
```

### 2. Role-Based Access Control

Routes check user role before allowing operations:

```javascript
if (!['teacher', 'admin'].includes(role)) {
  return res.status(403).json({ error: 'Only teachers can create exams' });
}
```

### 3. Ownership Verification

Teachers can only edit their own exams:

```javascript
if (exam.created_by !== userId && role !== 'admin') {
  return res.status(403).json({ error: 'Not authorized' });
}
```

## Route Reference

### Authentication Routes (`/api/auth`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/register` | Register new user in default school |
| POST | `/login` | Login (returns JWT with school_id) |
| GET | `/verify` | Verify JWT token |
| POST | `/logout` | Logout |

### Exam Routes (`/api/exams`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/` | Required | List school's exams |
| GET | `/:examId` | Required | Get exam with questions |
| POST | `/` | Teacher+ | Create exam |
| PUT | `/:examId` | Teacher+ | Update exam (owner or admin) |
| DELETE | `/:examId` | Teacher+ | Delete exam |

### Submission Routes (`/api/submissions`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/` | Required | List submissions (scoped by role) |
| GET | `/:submissionId` | Required | Get submission with answers |
| POST | `/:examId/start` | Student | Start new exam |
| POST | `/:submissionId/submit` | Student | Submit completed exam |
| POST | `/:submissionId/grade` | Teacher+ | Grade exam |

### User Routes (`/api/users`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/profile` | Required | Get current user's profile |
| PUT | `/profile` | Required | Update profile |
| GET | `/` | Teacher+ | List school's users |
| POST | `/` | Admin | Create new user |
| PUT | `/:userId` | Admin/Owner | Update user |
| DELETE | `/:userId` | Admin | Delete user |

## Example Request Flow

### Scenario: Student Takes an Exam

```javascript
// 1. Register (gets JWT with school_id)
POST /api/auth/register
→ token, user.school_id

// 2. Get available exams for school
GET /api/exams?published=true
Headers: Authorization: Bearer <token>
→ [exam1, exam2, ...]  // Scoped to school_id

// 3. Start exam (creates submission)
POST /api/submissions/:examId/start
Headers: Authorization: Bearer <token>
→ submission_id, started_at

// 4. Submit answers
POST /api/submissions/:submissionId/submit
Headers: Authorization: Bearer <token>
Body: { answers: [{question_id, answer}, ...] }
→ { message: "Exam submitted" }

// 5. Teacher grades exam
POST /api/submissions/:submissionId/grade
Headers: Authorization: Bearer <token>
Body: { answers: [{answer_id, score}, ...] }
→ { message: "Exam graded", total_score: 85 }
```

## Frontend Integration Example

```javascript
// React example with multi-tenant auth

const [token, setToken] = useState(null);
const [schoolId, setSchoolId] = useState(null);

// Login
const login = async (email, password) => {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const { token, user } = await res.json();
  setToken(token);
  setSchoolId(user.school_id);
  localStorage.setItem('token', token);
};

// Get exams
const getExams = async () => {
  const res = await fetch('/api/exams', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return res.json();
};

// Create exam
const createExam = async (title, questions) => {
  const res = await fetch('/api/exams', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ title, questions })
  });
  return res.json();
};
```

## Data Isolation Verification

To verify multi-tenant scoping works:

```sql
-- All users are scoped by school
SELECT school_id, COUNT(*) FROM users GROUP BY school_id;

-- All exams belong to a school
SELECT school_id, COUNT(*) FROM exams GROUP BY school_id;

-- All submissions reference school
SELECT school_id, COUNT(*) FROM exam_submissions GROUP BY school_id;
```

## Migration Checklist

- [ ] Update `server.js` to use new Postgres routes
- [ ] Install `pg` and `bcryptjs` if not already present
- [ ] Test auth endpoints (register, login, verify)
- [ ] Test exam endpoints (create, list, get, update, delete)
- [ ] Test submission endpoints (start, submit, grade)
- [ ] Test access control (verify students can't create exams, teachers can)
- [ ] Test school isolation (verify queries are scoped by school_id)
- [ ] Update frontend to use new routes
- [ ] Update CI/CD or deployment scripts if needed

## Common Issues & Solutions

### "User not assigned to a school/tenant"
**Cause:** User in DB doesn't have school_id, or JWT doesn't include it.
**Fix:** Re-register or manually update user with valid school_id.

### "Not authorized to edit this exam"
**Cause:** User is not the exam creator or not admin.
**Fix:** Only exam creators or admins can edit exams.

### "Email already exists in this school"
**Cause:** Unique constraint on (school_id, email).
**Fix:** Expected behavior; prevents duplicate emails per school.

### Query returns empty results
**Cause:** Query is scoped by school_id; user may be in different school.
**Fix:** Verify school_id in JWT matches school_id in DB.

## Next Steps

1. Update frontend to handle JWT with school_id
2. Add multi-school admin UI (manage multiple schools)
3. Add audit logging for multi-tenant compliance
4. Performance tune indexes on (school_id, other_field)
5. Add data residency/compliance features
