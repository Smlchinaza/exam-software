# Multi-Tenant Backend - Quick Reference Card

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install pg bcryptjs jsonwebtoken
```

### 2. Set Environment Variables
```
DATABASE_URL=postgresql://user:pass@host:5432/exam-software
JWT_SECRET=your-secret-key-here-change-in-production
NODE_ENV=production
PORT=5000
```

### 3. Start Server
```bash
node server.js
```

### 4. Test Integration
```bash
node test-multitenant.js
```

---

## 📝 Multi-Tenant Pattern (All Routes Follow This)

```javascript
// 1. Route requires authentication
router.post('/', authenticateJWT, enforceMultiTenant, async (req, res) => {
  
  // 2. Get school_id from req.tenant (added by enforceMultiTenant middleware)
  const { schoolId, userId, role } = req.tenant;
  
  // 3. Every query scopes by school_id
  const result = await pool.query(
    'SELECT * FROM exams WHERE school_id = $1 AND created_by = $2',
    [schoolId, userId]
  );
  
  // 4. Return scoped data
  res.json(result.rows);
});
```

---

## 🔑 Authentication Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    Multi-Tenant Auth Flow                   │
└─────────────────────────────────────────────────────────────┘

1. REGISTER
   POST /api/auth/register
   → Creates user with default school_id
   → Returns JWT with: {id, email, role, school_id}

2. LOGIN
   POST /api/auth/login
   → Verifies password
   → Returns JWT with: {id, email, role, school_id}

3. JWT PAYLOAD (EXAMPLE)
   {
     "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
     "email": "teacher@school.com",
     "role": "teacher",
     "school_id": "2c048ff5-bd7f-4c47-89eb-9ca54cc2b360",
     "iat": 1234567890,
     "exp": 1234654290
   }

4. MAKE AUTHENTICATED REQUEST
   GET /api/exams
   Headers: Authorization: Bearer <jwt-token>

5. ENFORCEULTITENANT MIDDLEWARE
   → Extracts school_id from JWT
   → Validates school_id exists
   → Attaches to req.tenant
   → Route handler uses req.tenant.schoolId in queries
```

---

## 🗂️ File Structure

```
server/
├── db/
│   └── postgres.js              # Connection pool setup
├── middleware/
│   ├── auth.js                  # JWT verification (existing)
│   └── tenantScoping.js         # Multi-tenant extraction (NEW)
├── routes/
│   ├── auth.js                  # OLD - MongoDB auth
│   ├── auth-postgres.js         # NEW - JWT with school_id
│   ├── exams.js                 # OLD - MongoDB exams
│   ├── exams-postgres.js        # NEW - School-scoped exams
│   ├── submissions-postgres.js  # NEW - School-scoped submissions
│   ├── users-postgres.js        # NEW - School-scoped users
│   └── [others]
├── server.js                    # UPDATED - Registers new routes
├── MULTI_TENANT_GUIDE.md        # Full documentation
├── IMPLEMENTATION_CHECKLIST.md  # This checklist
├── test-multitenant.js          # Test suite
└── package.json
```

---

## 🔐 Security Model

### School Isolation
```sql
-- ❌ NEVER: Cross-tenant access possible
SELECT * FROM exams WHERE id = $1;

-- ✅ ALWAYS: Scoped by school_id
SELECT * FROM exams WHERE id = $1 AND school_id = $2;
```

### Role-Based Access
```
STUDENT
  - View own exams (is_published = true)
  - Submit exams
  - View own submission results

TEACHER
  - Create exams in their school
  - Edit own exams
  - Grade student submissions
  - View all submissions in their school

ADMIN
  - Full access to all school data
  - Manage users, exams, submissions
```

### Ownership Verification
```javascript
// Only exam creator or admin can edit
if (exam.created_by !== userId && role !== 'admin') {
  return res.status(403).json({ error: 'Not authorized' });
}
```

---

## 📡 API Endpoints Overview

### Authentication `/api/auth`
| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/register` | POST | No | Create user with default school |
| `/login` | POST | No | Get JWT with school_id |
| `/verify` | GET | Yes | Verify token validity |
| `/logout` | POST | Yes | Client-side logout audit |

### Exams `/api/exams`
| Endpoint | Method | Auth | Who | Purpose |
|----------|--------|------|-----|---------|
| `/` | GET | Yes | All | List school exams |
| `/:id` | GET | Yes | All | Get exam + questions |
| `/` | POST | Yes | Teacher+ | Create exam |
| `/:id` | PUT | Yes | Teacher+ | Update exam |
| `/:id` | DELETE | Yes | Teacher+ | Delete exam |

### Submissions `/api/submissions`
| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/` | GET | Yes | List submissions |
| `/:id` | GET | Yes | Get submission details |
| `/:examId/start` | POST | Yes | Start new submission |
| `/:submissionId/submit` | POST | Yes | Submit answers |
| `/:submissionId/grade` | POST | Yes | Grade submission |

### Users `/api/users`
| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/profile` | GET | Yes | Get user's profile |
| `/profile` | PUT | Yes | Update user's profile |
| `/` | GET | Yes | List school users (admin/teacher) |
| `/` | POST | Yes | Create new user (admin) |
| `/:id` | PUT | Yes | Update user (admin/self) |
| `/:id` | DELETE | Yes | Delete user (admin) |

---

## 📊 Database Schema (Multi-Tenant Aware)

```
schools (1 school per tenant)
├── id (UUID PK)
├── name
└── created_at

users (many per school)
├── id (UUID PK)
├── school_id (FK → schools)
├── email (UNIQUE per school)
├── role (student|teacher|admin)
└── ...

exams (many per school)
├── id (UUID PK)
├── school_id (FK → schools)
├── created_by (FK → users)
├── title
└── ...

questions (many per exam)
├── id (UUID PK)
├── exam_id (FK → exams)
├── school_id (denormalized from exam)
└── ...

exam_submissions (many per exam)
├── id (UUID PK)
├── school_id (FK → schools)
├── exam_id (FK → exams)
├── student_id (FK → users)
└── ...

exam_answers (many per submission)
├── id (UUID PK)
├── submission_id (FK → exam_submissions)
└── ...
```

---

## ✅ Pre-Launch Checklist

- [ ] All 5 Postgres route files created (`auth-postgres.js`, `exams-postgres.js`, etc.)
- [ ] Multi-tenant middleware created (`tenantScoping.js`)
- [ ] Database connection pool configured (`postgres.js`)
- [ ] `server.js` updated to register new routes
- [ ] Environment variables set (DATABASE_URL, JWT_SECRET)
- [ ] `node test-multitenant.js` passes all tests
- [ ] JWT tokens include school_id in payload
- [ ] All queries scope by school_id
- [ ] Frontend updated to use new endpoints
- [ ] Database backup created
- [ ] Rollback plan documented

---

## 🧪 Quick Test

```bash
# 1. Start server
node server.js

# 2. In another terminal, run test suite
node test-multitenant.js

# 3. Expected output
✅ Registration successful
✅ Login successful
✅ JWT verification successful
✅ Exam created successfully
✅ Exams fetched successfully
✅ All exams belong to user's school
✅ User profile retrieved

# 4. If all pass, multi-tenant backend is ready!
```

---

## 🚨 Common Errors & Fixes

| Error | Cause | Fix |
|-------|-------|-----|
| "No user school/tenant" | JWT missing school_id | Re-register user |
| "Not authorized" | User not exam creator | Only creator can edit |
| "Email already exists" | Duplicate email in school | Use different email |
| "Query returns 0 rows" | School scoping filtering | Verify JWT school_id |
| "Connection pool error" | Too many connections | Restart server |
| "Invalid token" | Expired JWT | Login again |

---

## 📞 Support Resources

- Full Guide: `MULTI_TENANT_GUIDE.md`
- Checklist: `IMPLEMENTATION_CHECKLIST.md`
- Tests: `test-multitenant.js`
- Database: PostgreSQL (Neon)
- Auth: JWT with school_id payload
- ORM: `pg` module (connection pooling)

---

## 🎯 Next Steps

1. ✅ Backend routes created and scoped by school_id
2. → Update frontend components to use new endpoints
3. → Test end-to-end flow (register → exam → submit)
4. → Deploy to production
5. → Monitor and validate data isolation

**Status:** Backend implementation complete. Ready for frontend integration.
