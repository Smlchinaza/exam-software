# Multi-Tenant Backend Implementation Checklist

## ✅ Completed

### Database Layer
- [x] PostgreSQL schema created (8 tables with UUID PKs and school_id FKs)
- [x] Migration from MongoDB executed successfully (54 users, 23 exams, 81 questions, 17 submissions)
- [x] Connection pool configured (`db/postgres.js`)
- [x] Orphaned data detected and handled
- [x] Indexes created on school_id for query performance

### Authentication & Authorization
- [x] JWT tokens now include `school_id` payload
- [x] Multi-tenant middleware created (`middleware/tenantScoping.js`)
- [x] `enforceMultiTenant` middleware validates and extracts school_id
- [x] Role-based access control implemented (student, teacher, admin)
- [x] Password hashing with bcryptjs

### API Routes (Postgres-based)
- [x] `routes/auth-postgres.js` - Registration, login, verification (JWT with school_id)
- [x] `routes/exams-postgres.js` - Exam CRUD with transactional support
- [x] `routes/submissions-postgres.js` - Exam submission lifecycle (start, submit, grade)
- [x] `routes/users-postgres.js` - User management with school scoping
- [x] `db/postgres.js` - Connection pool initialization

### Backend Integration
- [x] `server.js` updated to:
  - Import new Postgres route files
  - Register Postgres routes at `/api/*` endpoints
  - Keep legacy MongoDB routes commented for gradual migration
  - Add health check endpoints for both databases
- [x] All queries scoped by school_id (prevents cross-tenant data access)
- [x] Documentation created (`MULTI_TENANT_GUIDE.md`)

### Testing
- [x] Test script created (`test-multitenant.js`) covering:
  - User registration with school_id
  - Login returning JWT with school_id
  - JWT verification
  - Exam creation and retrieval
  - School-scoped query validation
  - User profile endpoints

## ⏳ In Progress / Pending

### Frontend Integration
- [ ] Update React components to use `/api/exams`, `/api/submissions`, `/api/users` endpoints
- [ ] Store JWT token with school_id in localStorage
- [ ] Remove old Mongoose API calls
- [ ] Update login flow to expect JWT with school_id
- [ ] Update profile management to use `/api/users/profile`
- [ ] Update exam creation to use new form structure

**Files to update:**
- `src/services/api.js` - Update API client with Postgres endpoints
- `src/context/AuthContext.js` - Store school_id from JWT
- `src/components/Login.js` - Use new auth flow
- `src/components/StudentLogin.js` - Use new auth flow
- `src/components/TeacherLogin.js` - Use new auth flow
- `src/components/StudentSignUp.js` - Use registration endpoint
- `src/components/TeacherSignUp.js` - Use registration endpoint
- All exam/submission components to use new endpoints

### Deployment
- [ ] Set `DATABASE_URL` environment variable in production
- [ ] Keep `MONGODB_URI` for fallback (during migration period)
- [ ] Set `JWT_SECRET` to a strong random value
- [ ] Configure CORS origins if needed
- [ ] Set up database backups
- [ ] Monitor PostgreSQL connection pool usage

### Gradual Migration Strategy
- [ ] Phase 1 (Current): Keep both MongoDB and PostgreSQL routes running
- [ ] Phase 2: Frontend switches to Postgres routes, MongoDB routes remain active
- [ ] Phase 3: Monitor for issues, validate data consistency
- [ ] Phase 4: Remove legacy MongoDB routes and models
- [ ] Phase 5: Archive old code, document migration

## 🧪 Testing Instructions

### 1. Run Multi-Tenant Test Suite
```bash
cd server
npm install axios  # if not already installed
node test-multitenant.js
```

Expected output:
```
✅ Registration successful (User: test-xxx@school.com, School: xxx)
✅ Login successful (JWT contains school_id)
✅ JWT verification successful (User school matches)
✅ Exam created successfully (Exam ID: xxx)
✅ Exams fetched successfully (Found N exam(s))
✅ All exams belong to user's school
✅ Exam details retrieved
✅ User profile retrieved
```

### 2. Manual Testing

#### Register & Login
```bash
# Register
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "teacher@example.com",
    "password": "secure123",
    "first_name": "John",
    "last_name": "Doe",
    "role": "teacher"
  }'

# Response (save the token):
# {"token": "eyJhbGc...", "user": {"id": "xxx", "school_id": "yyy"}}

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "teacher@example.com",
    "password": "secure123"
  }'
```

#### Verify School Scoping
```bash
# List exams for authenticated user's school
curl -X GET http://localhost:5000/api/exams \
  -H "Authorization: Bearer <token>"

# All exams should have school_id matching the user's school_id
```

#### Create Exam
```bash
curl -X POST http://localhost:5000/api/exams \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Mathematics Final Exam",
    "description": "Test mathematical concepts",
    "is_published": true,
    "duration_minutes": 120,
    "questions": [
      {
        "text": "What is 2 + 2?",
        "question_type": "multiple_choice",
        "options": [
          {"text": "3", "is_correct": false},
          {"text": "4", "is_correct": true},
          {"text": "5", "is_correct": false}
        ]
      }
    ]
  }'
```

#### Submit Exam (Student)
```bash
# Start exam
curl -X POST http://localhost:5000/api/submissions/<exam-id>/start \
  -H "Authorization: Bearer <student-token>"

# Submit answers
curl -X POST http://localhost:5000/api/submissions/<submission-id>/submit \
  -H "Authorization: Bearer <student-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "answers": [
      {
        "question_id": "<question-id>",
        "answer": "4"
      }
    ]
  }'
```

#### Grade Exam (Teacher)
```bash
curl -X POST http://localhost:5000/api/submissions/<submission-id>/grade \
  -H "Authorization: Bearer <teacher-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "answers": [
      {
        "answer_id": "<answer-id>",
        "score": 1
      }
    ]
  }'
```

### 3. Verify School Isolation

Database query to confirm school scoping:
```sql
-- Check that users are scoped by school
SELECT school_id, COUNT(*) as user_count FROM users GROUP BY school_id;

-- Check that exams belong to schools
SELECT school_id, COUNT(*) as exam_count FROM exams GROUP BY school_id;

-- Check that submissions reference schools
SELECT school_id, COUNT(*) as submission_count FROM exam_submissions GROUP BY school_id;

-- Verify no cross-school data references
SELECT 
  es.school_id as submission_school,
  e.school_id as exam_school,
  u.school_id as user_school,
  COUNT(*) 
FROM exam_submissions es
JOIN exams e ON es.exam_id = e.id
JOIN users u ON es.student_id = u.id
WHERE es.school_id != e.school_id OR es.school_id != u.school_id
GROUP BY es.school_id, e.school_id, u.school_id;
-- Should return 0 rows if data is properly isolated
```

## 📋 Frontend Integration Checklist

### 1. Update API Service (`src/services/api.js`)

Current (Old - Mongoose):
```javascript
// Example
export const getExams = () => api.get('/api/exams');
```

New (Postgres with JWT):
```javascript
// Same endpoints, but now JWT includes school_id
export const getExams = () => api.get('/api/exams');
// JWT automatically scopes to user's school
```

### 2. Update Auth Context (`src/context/AuthContext.js`)

```javascript
// Store school_id from token when user logs in
const decoded = jwt_decode(token);
setSchoolId(decoded.school_id);
localStorage.setItem('schoolId', decoded.school_id);
```

### 3. Update Login Components

- `src/components/StudentLogin.js`
- `src/components/TeacherLogin.js`
- `src/components/AdminLogin.js`

Should now call `/api/auth/login` which returns JWT with school_id.

### 4. Update Registration Components

- `src/components/StudentSignUp.js`
- `src/components/TeacherSignUp.js`

Should now call `/api/auth/register` which creates user in default school.

### 5. Update Exam Management

- `src/components/CreateExam.js` - POST to `/api/exams`
- `src/components/ExamSelection.js` - GET from `/api/exams`
- `src/components/TakeExam.js` - Submissions to `/api/submissions`
- `src/components/ExamResults.js` - GET from `/api/submissions`

### 6. Update User Management

- `src/components/UserProfile.js` - GET/PUT `/api/users/profile`
- `src/components/StudentProfile.js` - GET/PUT `/api/users/profile`
- `src/components/TeacherProfile.js` - GET/PUT `/api/users/profile`

## 🔍 Monitoring & Validation

### Monitor PostgreSQL Pool

The server logs pool stats. Check for:
- Connection count stays under max (20)
- No idle connection leaks
- Query response times

### Validate Data Integrity

After frontend migration, run:
```sql
-- Verify migration completeness
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM exams;
SELECT COUNT(*) FROM exam_submissions;

-- Verify school scoping
SELECT DISTINCT school_id FROM users;
SELECT DISTINCT school_id FROM exams;
```

### Monitor Error Logs

Watch for:
- "User not assigned to a school" → User has null school_id
- "Not authorized" → Role check failing
- "connection pool error" → Too many open connections
- "Schema mismatch" → Frontend/backend sync issues

## 🚀 Deployment Steps

### Pre-Deployment

1. Backup PostgreSQL database
2. Run test suite in production environment
3. Verify all frontend changes are tested
4. Document rollback plan

### Deployment

1. Deploy backend changes (server.js, new routes)
2. Set `DATABASE_URL` environment variable
3. Restart server
4. Verify health checks pass: `/health`, `/health/postgres`
5. Run limited smoke tests with subset of users
6. Deploy frontend changes
7. Monitor error logs for issues

### Rollback Plan

If issues occur:
1. Switch frontend to use legacy MongoDB routes (comment out Postgres routes in server.js)
2. Revert frontend code to use old endpoints
3. Continue with MongoDB until issues are resolved

## 📚 Documentation

- ✅ `MULTI_TENANT_GUIDE.md` - How multi-tenancy works, API reference, examples
- ✅ `test-multitenant.js` - Automated test suite
- ✅ This checklist - Implementation progress tracking
- TODO: `DEPLOYMENT.md` - Production deployment procedures
- TODO: `TROUBLESHOOTING.md` - Common issues and solutions

## 🎯 Success Criteria

- [x] PostgreSQL schema supports multi-tenant operations
- [x] Authentication returns JWT with school_id
- [x] All API routes enforce school_id scoping
- [ ] Frontend components updated to use new routes
- [ ] End-to-end tests pass (register → create exam → submit → grade)
- [ ] No cross-tenant data access possible
- [ ] Performance acceptable (sub-100ms query times)
- [ ] Error messages clear and actionable
- [ ] Documentation complete
- [ ] Team trained on new architecture

## 🐛 Known Issues & Workarounds

### Issue: "Unexpected field school_id"
**Cause:** Frontend sending old request format
**Fix:** Update frontend to not send school_id; let backend set it from JWT

### Issue: JW token missing school_id
**Cause:** User registered with old auth endpoint
**Fix:** Re-register user with `/api/auth/register`

### Issue: 403 Forbidden on exam access
**Cause:** User's school_id doesn't match exam's school_id
**Fix:** Verify both user and exam are in same school; check JWT payload

### Issue: Connection pool exhausted
**Cause:** Too many open connections, possible query hangs
**Fix:** Increase pool size, check for long-running queries, restart server

