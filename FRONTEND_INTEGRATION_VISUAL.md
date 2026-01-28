# Frontend Integration - Visual Summary

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    REACT FRONTEND (Client)                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │   Login.js   │  │ Register.js  │  │    Other     │           │
│  │              │  │              │  │  Components  │           │
│  │ (Simplified) │  │ (Simplified) │  │              │           │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘           │
│         │                 │                  │                   │
│         └─────────────────┼──────────────────┘                   │
│                           │                                       │
│                    useAuth() Hook                                │
│                           │                                       │
│         ┌─────────────────▼─────────────────┐                   │
│         │  AuthContext.js (Updated)         │                   │
│         │  ─────────────────────────────    │                   │
│         │  • user (id, email, role, ...)   │                   │
│         │  • schoolId (Extracted from JWT) │                   │
│         │  • login() - No checkUser        │                   │
│         │  • register() - Simplified       │                   │
│         │  • logout() - Clear schoolId     │                   │
│         └─────────────────┬─────────────────┘                   │
│                           │                                       │
│         ┌─────────────────▼─────────────────┐                   │
│         │  api.js (Rewritten)               │                   │
│         │  ─────────────────────────────    │                   │
│         │  • authApi (4 methods)           │                   │
│         │  • examApi (6 methods)           │                   │
│         │  • submissionApi (5 methods)     │                   │
│         │  • userApi (6 methods)           │                   │
│         │  • Interceptors + JWT handling   │                   │
│         │  • schoolId extraction/storage   │                   │
│         └─────────────────┬─────────────────┘                   │
│                           │                                       │
│         HTTP/JWT Token    │                                       │
│         Bearer Auth       │                                       │
│                           │                                       │
└───────────────────────────┼───────────────────────────────────────┘
                            │
                    ┌───────▼────────┐
                    │   HTTPS/TLS    │
                    └───────┬────────┘
                            │
┌───────────────────────────┼───────────────────────────────────────┐
│                  EXPRESS BACKEND (Node.js)                         │
├───────────────────────────┼───────────────────────────────────────┤
│                           ▼                                        │
│  ┌────────────────────────────────────────┐                       │
│  │  Middleware (Auth + JWT Validation)    │                       │
│  │  • Verify bearer token                 │                       │
│  │  • Extract school_id from JWT          │                       │
│  │  • Validate user.school_id             │                       │
│  └────────────────────┬───────────────────┘                       │
│                       │                                            │
│  ┌────────────────────▼──────────────────────────────┐            │
│  │         API Routes (Postgres endpoints)           │            │
│  │  ───────────────────────────────────────────────  │            │
│  │  • /auth/register - Create account               │            │
│  │  • /auth/login - Authenticate                    │            │
│  │  • /auth/verify - Validate JWT                   │            │
│  │  • /exams/* - Exam CRUD (school-scoped)         │            │
│  │  • /submissions/* - Submission flow              │            │
│  │  • /users/* - User management                    │            │
│  └────────────────────┬───────────────────────────────┘            │
│                       │                                            │
│  ┌────────────────────▼──────────────────────────────┐            │
│  │         Database Queries                          │            │
│  │  (All filtered by school_id from JWT)            │            │
│  │                                                   │            │
│  │  WHERE school_id = extract(school_id from JWT)   │            │
│  └────────────────────┬───────────────────────────────┘            │
│                       │                                            │
│  ┌────────────────────▼──────────────────────────────┐            │
│  │     PostgreSQL Database (Multi-Tenant)            │            │
│  │  ───────────────────────────────────────────────  │            │
│  │  • users (school_id, email, role, ...)          │            │
│  │  • exams (school_id, title, ...)                │            │
│  │  • questions (exam_id, content, ...)            │            │
│  │  • submissions (school_id, user_id, exam_id,..) │            │
│  │  • answers (submission_id, question_id, ...)    │            │
│  │  • schools (default school for new users)        │            │
│  └────────────────────────────────────────────────────┘            │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

---

## Data Flow: Login

```
User Enters Email/Password
         │
         ▼
   ┌──────────────┐
   │  Login.js    │
   │  handleSubmit│
   └──────┬───────┘
          │
          │ No more checkUser() ✅
          │
          ▼
   ┌────────────────────────┐
   │  authContext.login()   │
   │  - Removed role param  │
   └──────┬─────────────────┘
          │
          ▼
   ┌──────────────────────────────────┐
   │  authApi.login(email, password)  │
   │  POST /auth/login                │
   └──────┬───────────────────────────┘
          │
          ▼
   ┌───────────────────────────────────────┐
   │  Backend Response:                    │
   │  {                                    │
   │    token: "eyJhbGc...",              │
   │    user: {                            │
   │      id: "uuid",                     │
   │      email: "user@mail.com",         │
   │      role: "student",                │
   │      school_id: "school-uuid"  ◄─┐  │
   │    }                              │  │
   │  }                                │  │
   └───────┬───────────────────────────┼──┘
           │                           │
           ▼                           │ JWT Payload:
   ┌─────────────────────┐            │ {id, email, role,
   │ Extract school_id   │◄───────────┘   school_id}
   │ from JWT payload    │
   │ (atob + JSON.parse) │
   └─────┬───────────────┘
         │
         ▼
   ┌──────────────────────────────┐
   │ Store in localStorage:       │
   │ • token (JWT)               │
   │ • user (JSON)               │
   │ • schoolId (string)    ◄─── NEW
   │ • rememberMe (boolean)      │
   └─────┬────────────────────────┘
         │
         ▼
   ┌──────────────────────────┐
   │ Update AuthContext:      │
   │ • setUser(user)         │
   │ • setSchoolId(schoolId) │◄─ NEW
   │ • loading = false       │
   └─────┬──────────────────┘
         │
         ▼
   ┌──────────────────────┐
   │ Redirect to         │
   │ /student/dashboard  │
   └─────────────────────┘
```

---

## Multi-Tenant Data Isolation

```
┌────────────────────────────────────────────────────────────┐
│                   PostgreSQL Database                       │
├────────────────────────────────────────────────────────────┤
│                                                              │
│  School A (ID: aaaa-aaaa)                                  │
│  ├─ Users: 10 (all with school_id: aaaa-aaaa)            │
│  ├─ Exams: 5 (all with school_id: aaaa-aaaa)             │
│  └─ Submissions: 20 (all with school_id: aaaa-aaaa)       │
│                                                              │
│  School B (ID: bbbb-bbbb)                                  │
│  ├─ Users: 8 (all with school_id: bbbb-bbbb)              │
│  ├─ Exams: 3 (all with school_id: bbbb-bbbb)              │
│  └─ Submissions: 12 (all with school_id: bbbb-bbbb)        │
│                                                              │
│  School C (ID: cccc-cccc)                                  │
│  ├─ Users: 6 (all with school_id: cccc-cccc)              │
│  ├─ Exams: 2 (all with school_id: cccc-cccc)              │
│  └─ Submissions: 8 (all with school_id: cccc-cccc)         │
│                                                              │
└────────────────────────────────────────────────────────────┘


┌────────────────────────────────────────────────────────────┐
│           Frontend User from School A                        │
├────────────────────────────────────────────────────────────┤
│                                                              │
│  JWT Token:                                                 │
│  {                                                          │
│    id: "user1",                                            │
│    email: "teacher@schoola.com",                           │
│    role: "teacher",                                        │
│    school_id: "aaaa-aaaa"  ◄─────────────────────┐        │
│  }                                               │        │
│                                                  │        │
│  localStorage: {schoolId: "aaaa-aaaa"}          │        │
│                                                  │        │
│  GET /exams                                    │        │
│  ↓                                              │        │
│  Backend: WHERE school_id = "aaaa-aaaa"       │        │
│  ↓                                              ├─ Backend
│  Result: Only School A's 5 exams returned     │   Enforced
│                                                 │        │
│  Attempted: GET /exams/bbbb-5 (School B)      │        │
│  ↓                                              │        │
│  Backend: Verify school_id from JWT = "aaaa"   │        │
│  Result: 403 Forbidden - Not your school    │        │
│                                                  │        │
└────────────────────────────────────────────────┘        │
                                                            │
                    ← Data Isolation Enforced by Backend →
```

---

## Before and After Comparison

### Authentication Flow
```
BEFORE (Old MongoDB backend):
┌─────────────────────────────────────────┐
│ Login.js                                │
├─────────────────────────────────────────┤
│ 1. await authApi.checkUser(email)       │
│ 2. await authApi.login(email, pw, rem, │
│                                role)    │
│ 3. if role !== formData.role: error     │
│ 4. Store: token, user, rememberMe       │
│ 5. No school_id support                 │
│ 6. All exams returned (no scoping)       │
└─────────────────────────────────────────┘

AFTER (New Postgres backend):
┌─────────────────────────────────────────┐
│ Login.js                                │
├─────────────────────────────────────────┤
│ 1. ✅ No checkUser() call               │
│ 2. ✅ await authApi.login(email, pw,   │
│                              rememberMe) │
│ 3. ✅ Backend determines role           │
│ 4. ✅ Store: token, user, schoolId,    │
│       rememberMe                        │
│ 5. ✅ school_id extracted from JWT      │
│ 6. ✅ Only school's exams returned      │
└─────────────────────────────────────────┘
```

### API Modules
```
BEFORE:
  • authApi (with checkUser, complex register)
  • studentApi (basic CRUD)
  • teacherApi (basic CRUD)
  • subjectApi (basic CRUD)
  
  4 modules, ~12 methods, no schoolId support

AFTER:
  • authApi (4: register, login, verify, logout)
  • examApi (6: CRUD + getAvailableExams)
  • submissionApi (5: manage exam submissions)
  • userApi (6: profile + admin management)
  • studentApi (backward compat wrapper)
  • teacherApi (backward compat wrapper)
  • subjectApi (backward compat wrapper)
  
  7 modules, 17 methods, full JWT + schoolId support
```

---

## Component Files Changed

```
┌─────────────────────────────────────────────────────┐
│ client/src/services/api.js (435 lines)             │
├─────────────────────────────────────────────────────┤
│ Status: ✅ COMPLETE                                │
│                                                     │
│ Changes:                                           │
│ • Rewritten completely                            │
│ • Axios setup with JWT interceptors               │
│ • 5 API modules (17 endpoints total)              │
│ • schoolId extraction and storage                 │
│ • Error handling (network, timeout, 401)         │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ client/src/context/AuthContext.js (252 lines)     │
├─────────────────────────────────────────────────────┤
│ Status: ✅ COMPLETE                                │
│                                                     │
│ Changes:                                           │
│ • Added schoolId state                            │
│ • JWT extraction helper function                  │
│ • Updated login() - simplified                    │
│ • Updated register() - simplified                 │
│ • Updated logout() - clear schoolId              │
│ • Context includes schoolId                      │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ client/src/components/Login.js (282 lines)        │
├─────────────────────────────────────────────────────┤
│ Status: ✅ COMPLETE                                │
│                                                     │
│ Changes:                                           │
│ • Removed checkUser() call                        │
│ • Simplified handleSubmit()                       │
│ • Backend determines role                         │
│ • Added admin routing                             │
│ • Role toggle for UX only                         │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ client/src/components/Register.js (406 lines)     │
├─────────────────────────────────────────────────────┤
│ Status: ✅ COMPLETE                                │
│                                                     │
│ Changes:                                           │
│ • Simplified registration payload                 │
│ • Removed optional fields                         │
│ • Matches Postgres backend format                 │
│ • Better error handling                           │
└─────────────────────────────────────────────────────┘
```

---

## JWT Token Lifecycle

```
┌─────────────┐
│  Register   │
└──────┬──────┘
       │
       ▼
┌──────────────────────────────────────────┐
│ Backend Issues JWT:                      │
│ Header: {alg: "HS256", typ: "JWT"}      │
│ Payload: {                               │
│   id: "uuid",                            │
│   email: "user@mail.com",                │
│   role: "student",                       │
│   school_id: "school-uuid",             │
│   iat: 1234567890,                       │
│   exp: 1234571490  (5 min from now)     │
│ }                                        │
│ Signature: HMAC256(header.payload,key)  │
└──────┬───────────────────────────────────┘
       │
       ▼ Token: eyJhbGc.eyJpZCI6.H1Gg...
┌──────────────────────────────────────┐
│ Frontend stores:                     │
│ localStorage.token = token           │
│ localStorage.user = JSON.stringify({
│   id, email, role, school_id })      │
│ localStorage.schoolId = school_id    │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│ Every API Request:                   │
│ Header: Authorization: Bearer token  │
│ ↓                                    │
│ Backend verifies signature           │
│ ↓                                    │
│ Backend extracts school_id           │
│ ↓                                    │
│ Backend scopes query: WHERE school_id
└──────┬───────────────────────────────┘
       │
       ▼
   ┌──────────────┐
   │ Token Valid? │
   └──┬────────┬──┘
      │ YES    │ NO/EXPIRED
      │        └──────┐
      │               ▼
      │        ┌────────────────┐
      │        │ 401 Unauthorized
      │        │ Frontend clears│
      │        │ all auth data  │
      │        │ Redirect login │
      │        └────────────────┘
      │
      ▼
   Continue Request
   Return Data (school-scoped)
```

---

## Current Architecture Status

```
FRONTEND (React) ✅ UPDATED
├─ Authentication Layer
│  ├─ Login.js ✅ (simplified, no checkUser)
│  ├─ Register.js ✅ (simplified payload)
│  └─ AuthContext.js ✅ (JWT + schoolId)
│
├─ API Service Layer ✅ UPDATED
│  ├─ authApi ✅ (4 methods)
│  ├─ examApi ✅ (6 methods)
│  ├─ submissionApi ✅ NEW (5 methods)
│  ├─ userApi ✅ NEW (6 methods)
│  └─ Interceptors ✅ (JWT + schoolId)
│
├─ Dashboard Components ⏳ TODO
│  ├─ StudentDashboard.js
│  ├─ TeacherDashboard.js
│  └─ AdminDashboard.js
│
└─ Feature Components ⏳ TODO
   ├─ CreateExam.js
   ├─ TakeExam.js
   ├─ ExamResults.js
   └─ User Profile Components

BACKEND (Node.js/PostgreSQL) ✅ COMPLETE
├─ Auth Routes ✅
│  ├─ POST /auth/register
│  ├─ POST /auth/login
│  └─ GET /auth/verify
│
├─ Exam Routes (school-scoped) ✅
│  ├─ GET /exams
│  ├─ POST /exams
│  ├─ PUT /exams/{id}
│  └─ DELETE /exams/{id}
│
├─ Submission Routes (school-scoped) ✅
│  ├─ GET /submissions
│  ├─ POST /submissions/{id}/start
│  ├─ POST /submissions/{id}/submit
│  └─ POST /submissions/{id}/grade
│
└─ User Routes (school-scoped) ✅
   ├─ GET /users/profile
   ├─ PUT /users/profile
   ├─ GET /users
   ├─ POST /users
   ├─ PUT /users/{id}
   └─ DELETE /users/{id}
```

---

## Integration Progress

```
[████████████████████████████████████████░░░░░░░░░░░░░░░░░░░] 65%

Phase 1: Core Integration ✅ COMPLETE
  [████████████████████████████░░] 100%
  ✅ Authentication layer
  ✅ API service layer
  ✅ Login component
  ✅ Register component

Phase 2: Feature Components ⏳ PENDING
  [░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░] 0%
  ⏳ Dashboard components
  ⏳ Exam components
  ⏳ Submission components
  ⏳ Results components

Phase 3: Testing ⏳ PENDING
  [░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░] 0%
  ⏳ Unit tests
  ⏳ Integration tests
  ⏳ E2E tests

Phase 4: Deployment ⏳ PENDING
  [░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░] 0%
  ⏳ Build optimization
  ⏳ Staging deployment
  ⏳ Production deployment

Overall Time Estimate Remaining: ~4-6 hours
```

---

## Quick Start

### For Developers
1. **Read** `FRONTEND_INTEGRATION_COMPLETE.md` for detailed guide
2. **Reference** `FRONTEND_INTEGRATION_QUICK_REFERENCE.md` while coding
3. **Test** Login/Register flows
4. **Update** Feature components one by one

### For Testing
1. Register as new user
2. Verify schoolId in localStorage
3. Create exam (teacher)
4. Submit exam (student)
5. View results (both)

### For Deployment
1. Update `.env` with production API URL
2. Run `npm build`
3. Deploy to production
4. Run smoke tests

---

*Status:* ✅ Phase 1 Complete - Frontend↔Backend Integration
*Next:* Feature Component Integration
*Priority:* High
*Estimate:* 4-6 hours remaining
