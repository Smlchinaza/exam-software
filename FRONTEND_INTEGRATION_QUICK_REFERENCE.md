# Frontend Integration - Quick Reference

## What Was Updated

### 1. API Service Layer (`client/src/services/api.js`)
- ✅ All 17 Postgres backend endpoints integrated
- ✅ JWT token management with schoolId extraction
- ✅ Multi-tenant scoping on all API calls
- ✅ Improved error handling with network/timeout support

### 2. Authentication Context (`client/src/context/AuthContext.js`)
- ✅ Added `schoolId` state management
- ✅ JWT payload decoding to extract school_id
- ✅ Simplified login/register flows
- ✅ schoolId storage and retrieval

### 3. Login Component (`client/src/components/Login.js`)
- ✅ Removed deprecated `checkUser()` call
- ✅ Simplified authentication flow
- ✅ Role determined by backend (not passed in login)
- ✅ Admin dashboard routing added

### 4. Register Component (`client/src/components/Register.js`)
- ✅ Simplified registration payload
- ✅ Removed complex optional fields
- ✅ Matches new Postgres backend expectations

## How to Use

### Access School ID in Components
```javascript
import { useAuth } from '../context/AuthContext';

const MyComponent = () => {
  const { user, schoolId } = useAuth();
  
  console.log('User:', user);        // {id, email, role, school_id}
  console.log('School ID:', schoolId); // extracted from JWT
  
  return <div>{user.email}</div>;
};
```

### Make API Calls
```javascript
import { examApi, submissionApi, userApi } from '../services/api';

// Get exams (automatically scoped to user's school)
const exams = await examApi.getAllExams(published=true);

// Start exam
const submission = await submissionApi.startExam(examId);

// Get user profile
const profile = await userApi.getProfile();
```

### Login/Register
```javascript
const { login, register } = useAuth();

// Login (schoolId automatically extracted)
await login(email, password, rememberMe);

// Register (schoolId automatically assigned by backend)
await register({
  email,
  password,
  role: 'student',
  firstName: 'John',
  lastName: 'Doe',
  rememberMe: false
});
```

## API Endpoints Summary

### Auth (No school scoping - identifies user)
- POST `/auth/register` - Create account
- POST `/auth/login` - Login
- GET `/auth/verify` - Verify token

### Exams (School-scoped)
- GET `/exams` - List exams
- GET `/exams/{id}` - Get exam with questions
- POST `/exams` - Create exam (teacher)
- PUT `/exams/{id}` - Update exam
- DELETE `/exams/{id}` - Delete exam

### Submissions (School-scoped)
- GET `/submissions` - List submissions
- GET `/submissions/{id}` - Get submission
- POST `/submissions/{examId}/start` - Start exam
- POST `/submissions/{submissionId}/submit` - Submit answers
- POST `/submissions/{submissionId}/grade` - Grade (teacher/admin)

### Users (School-scoped)
- GET `/users/profile` - Get own profile
- PUT `/users/profile` - Update own profile
- GET `/users` - List users (admin/teacher)
- POST `/users` - Create user (admin)
- PUT `/users/{id}` - Update user (admin/self)
- DELETE `/users/{id}` - Delete user (admin)

## School ID Flow Example

```javascript
// 1. User registers
const response = await register({email, password, role, firstName, lastName});
// Response: {token: "eyJhbGc...", user: {id, email, role, school_id}}

// 2. AuthContext extracts school_id from JWT
const decoded = JSON.parse(atob(token.split('.')[1]));
const schoolId = decoded.school_id; // ← Extracted

// 3. Stores in localStorage
localStorage.setItem('schoolId', schoolId);
localStorage.setItem('token', token);

// 4. All API calls include this token
// Header: Authorization: Bearer eyJhbGc...

// 5. Backend uses school_id from token to scope all queries
// GET /exams → Only returns exams created in user's school

// 6. On logout
logout();
// Clears: token, user, schoolId, rememberMe
```

## Multi-Tenant Isolation

### What's Isolated
✅ Exams created by user's school only
✅ Submissions for user's school only
✅ Users list for user's school only
✅ Results visible only to same school

### What's Shared Across Schools
❌ Auth endpoints (anyone can register)
❌ Login credentials (checked globally but user account is school-scoped)

### Security
- Backend validates school_id from JWT on every request
- No parameters allow overriding school_id
- Frontend has no way to access another school's data

## Common Patterns

### Get School-Scoped Data
```javascript
// All these automatically only get THIS school's data
const exams = await examApi.getAllExams();
const users = await userApi.getAllUsers();
const submissions = await submissionApi.getAllSubmissions();
```

### Create School-Scoped Resource
```javascript
// Backend assigns school_id from JWT, frontend doesn't need to pass it
const exam = await examApi.createExam({
  title: "Math Quiz",
  description: "...",
  is_published: false,
  duration_minutes: 60,
  questions: []
});
// Created exam automatically belongs to user's school
```

### Verify School Access
```javascript
// If user tries to access another school's data
const otherSchoolExam = await examApi.getExam(otherSchoolExamId);
// Returns 403 Forbidden (backend enforces school_id match)
```

## Testing Multi-Tenancy

### Test 1: Data Isolation
1. Login as user from School A
2. Create exam in School A
3. Logout and login as user from School B
4. Verify School B doesn't see School A's exam

### Test 2: Cross-School Access Prevention
1. Get exam ID from School A (while logged in as School A)
2. Login as School B
3. Try to access School A's exam
4. Verify access denied (403)

### Test 3: schoolId Extraction
```javascript
// In browser console
const token = localStorage.getItem('token');
const decoded = JSON.parse(atob(token.split('.')[1]));
console.log('School ID:', decoded.school_id);
```

## Environment Variables

**Development (.env)**
```
REACT_APP_API_URL=http://localhost:5000/api
```

**Production (.env)**
```
REACT_APP_API_URL=https://your-domain.com/api
```

## Next Steps

### Immediate Tasks
1. Test login/register flow
2. Verify schoolId extraction
3. Test exam CRUD operations
4. Test submission workflow

### Component Updates Still Needed
- StudentDashboard.js
- TeacherDashboard.js
- CreateExam.js
- ExamSelection.js
- TakeExam.js
- ExamResults.js
- User profile components

### Deployment
1. Update .env with production API URL
2. Run tests: `npm test`
3. Build: `npm run build`
4. Deploy to hosting service

## Troubleshooting

### schoolId is null/undefined
- Check JWT token in localStorage
- Verify token is valid (not expired)
- Check backend is returning school_id in JWT

### 401 Unauthorized on API calls
- Token expired → Need to re-login
- Token format incorrect → Check localStorage
- schoolId not in JWT → Backend config issue

### Data not showing (but no errors)
- Verify user's school has data
- Check network tab for actual response
- Verify role-based access (teachers see more data)

### CORS errors
- Check backend CORS configuration
- Verify API_URL matches backend domain
- Check request headers
