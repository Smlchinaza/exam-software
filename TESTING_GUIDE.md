# 🧪 TESTING GUIDE - Frontend Integration Phase 1

## Quick Start Test (5 minutes)

### Prerequisites
1. Backend running: `npm start` (in server directory)
2. Frontend running: `npm start` (in client directory)
3. Browser open to: `http://localhost:3000`

### Test 1: Register Account
```
1. Click "Register here" link on login page
2. Fill form:
   - Email: test@school.com
   - Password: TestPass123!
   - Confirm: TestPass123!
   - Role: Student
   - First Name: John
   - Last Name: Doe
3. Click Register
✅ Should redirect to login with success message
✅ Should clear form
```

### Test 2: Login
```
1. Enter credentials:
   - Email: test@school.com
   - Password: TestPass123!
2. Click Sign in
✅ Should authenticate
✅ Should redirect to /student/dashboard
✅ No errors in console
```

### Test 3: Verify JWT & schoolId
```
Open browser console (F12) and run:

// Check localStorage
localStorage.getItem('token');     // Should be long JWT string
localStorage.getItem('schoolId');  // Should be UUID format
localStorage.getItem('user');      // Should be JSON user object

// Check JWT payload
const token = localStorage.getItem('token');
const decoded = JSON.parse(atob(token.split('.')[1]));
console.log(decoded);  // Should show: id, email, role, school_id
```

### Test 4: API Calls
```
1. Open DevTools (F12)
2. Go to Network tab
3. Refresh or make any action
4. Check request headers:
   ✅ Authorization: Bearer eyJhbGc... (JWT token)
5. Check response:
   ✅ No 401 errors
   ✅ Data is school-scoped
```

### Test 5: Logout
```
1. Click logout
2. Browser console:
   localStorage.getItem('token');     // Should be null
   localStorage.getItem('schoolId');  // Should be null
3. Should redirect to login
✅ All auth data cleared
✅ Can login again
```

---

## Comprehensive Test Suite

### Authentication Tests

#### Test: Register with Valid Data
```
Input: email, password, role, firstName, lastName
Expected: User created, JWT issued with school_id, redirect to login
Actual: [PASS/FAIL]
Notes: 
```

#### Test: Register with Invalid Email
```
Input: "invalid-email", password, role, firstName, lastName
Expected: Error message about invalid email
Actual: [PASS/FAIL]
Notes:
```

#### Test: Register with Weak Password
```
Input: email, "123", role, firstName, lastName
Expected: Error message about weak password
Actual: [PASS/FAIL]
Notes:
```

#### Test: Register with Existing Email
```
Input: email (already used), password, role, firstName, lastName
Expected: Error message "Email already exists"
Actual: [PASS/FAIL]
Notes:
```

#### Test: Login with Valid Credentials
```
Input: test@school.com, TestPass123!
Expected: JWT issued, schoolId extracted, redirect to dashboard
Actual: [PASS/FAIL]
Notes:
```

#### Test: Login with Invalid Password
```
Input: test@school.com, WrongPassword
Expected: Error message about invalid credentials
Actual: [PASS/FAIL]
Notes:
```

#### Test: Login with Non-Existent Email
```
Input: nonexistent@mail.com, password
Expected: Error message about no account
Actual: [PASS/FAIL]
Notes:
```

#### Test: Remember Me Functionality
```
1. Login with "Remember me" checked
2. Close browser tab/window
3. Open browser again
4. Navigate to localhost:3000
Expected: User already logged in, dashboard showing
Actual: [PASS/FAIL]
Notes:
```

#### Test: Session-Only Login
```
1. Login WITHOUT "Remember me" checked
2. Close browser tab/window
3. Open browser again
4. Navigate to localhost:3000
Expected: Redirected to login page
Actual: [PASS/FAIL]
Notes:
```

### schoolId Tests

#### Test: schoolId Extraction
```
1. Login
2. Browser console: 
   const token = localStorage.getItem('token');
   const decoded = JSON.parse(atob(token.split('.')[1]));
   console.log('School ID:', decoded.school_id);
Expected: Should show valid UUID
Actual: [PASS/FAIL]
Notes:
```

#### Test: schoolId Storage
```
1. Login
2. Browser console:
   localStorage.getItem('schoolId')
Expected: Should match JWT payload school_id
Actual: [PASS/FAIL]
Notes:
```

#### Test: schoolId Cleanup on Logout
```
1. Login
2. Verify schoolId in localStorage
3. Logout
4. Browser console:
   localStorage.getItem('schoolId')
Expected: Should be null/undefined
Actual: [PASS/FAIL]
Notes:
```

### Multi-Tenant Tests

#### Test: User Only Sees Own School's Data
```
1. User A logs in (from School A)
2. Create exam in School A
3. Logout
4. User B logs in (from School B)
5. Check exams list
Expected: User B doesn't see User A's exam
Actual: [PASS/FAIL]
Notes:
```

#### Test: Cross-School Access Prevention
```
1. Get exam ID from School A
2. Login as user from School B
3. Try to access: /exams/{schoolAExamId}
Expected: 403 Forbidden error
Actual: [PASS/FAIL]
Notes:
```

#### Test: Different Schools Have Different Data
```
1. Create 5 exams in School A
2. Create 3 exams in School B
3. Login to School A → Should see 5 exams
4. Logout, Login to School B → Should see 3 exams
Expected: Each school only sees own data
Actual: [PASS/FAIL]
Notes:
```

### API Integration Tests

#### Test: JWT Token in Requests
```
1. Login
2. Open DevTools → Network tab
3. Make any API call
4. Check request headers
Expected: Authorization: Bearer [token]
Actual: [PASS/FAIL]
Notes:
```

#### Test: 401 Error Handling
```
1. Login
2. Clear token from localStorage manually
3. Refresh page
4. Try to make API call
Expected: 401 error, redirect to login, auth data cleared
Actual: [PASS/FAIL]
Notes:
```

#### Test: Network Error Handling
```
1. Stop backend server
2. Try to login
Expected: "Unable to connect" error message
Actual: [PASS/FAIL]
Notes:
```

#### Test: Request Timeout
```
1. Backend intentionally slow (simulate)
2. Make API request
Expected: After 30s → "Request timed out" message
Actual: [PASS/FAIL]
Notes:
```

#### Test: API Endpoints Accessible
```
POST   /auth/register    ✓/✗
POST   /auth/login       ✓/✗
GET    /auth/verify      ✓/✗
GET    /exams            ✓/✗
POST   /exams            ✓/✗
PUT    /exams/:id        ✓/✗
DELETE /exams/:id        ✓/✗
GET    /submissions      ✓/✗
POST   /submissions/:id/start    ✓/✗
POST   /submissions/:id/submit   ✓/✗
POST   /submissions/:id/grade    ✓/✗
GET    /users/profile    ✓/✗
PUT    /users/profile    ✓/✗
GET    /users            ✓/✗
POST   /users            ✓/✗
```

### Component Tests

#### Test: Login Page Renders
```
1. Navigate to /login
Expected: Form appears, no console errors
Actual: [PASS/FAIL]
Notes:
```

#### Test: Register Page Renders
```
1. Navigate to /register
Expected: Form appears, no console errors
Actual: [PASS/FAIL]
Notes:
```

#### Test: Form Validation
```
1. Click Submit without filling form
Expected: HTML5 validation, cannot submit empty
Actual: [PASS/FAIL]
Notes:
```

#### Test: Error Messages Display
```
1. Try login with wrong password
Expected: Error message appears in red box
Actual: [PASS/FAIL]
Notes:
```

#### Test: Loading State
```
1. Click login/register button
Expected: Button shows "Signing in..." or "Registering..."
Actual: [PASS/FAIL]
Notes:
```

#### Test: Password Visibility Toggle
```
1. Click eye icon in password field
Expected: Password becomes visible
Expected: Click again → password hidden
Actual: [PASS/FAIL]
Notes:
```

#### Test: Role Toggle
```
1. Click "Switch to Teacher Login"
Expected: Form title changes to "Teacher Login"
Expected: Click again → Back to "Student Login"
Actual: [PASS/FAIL]
Notes:
```

---

## Browser Console Monitoring

### What to Check
```javascript
// After each action, run:

// 1. Check localStorage
console.table(localStorage);
// Expected: token, user, schoolId, rememberMe

// 2. Check token validity
const token = localStorage.getItem('token');
const decoded = JSON.parse(atob(token.split('.')[1]));
console.log('Token expires:', new Date(decoded.exp * 1000));

// 3. Check auth context
const user = JSON.parse(localStorage.getItem('user'));
console.log('User:', user);

// 4. Check for errors
// Expected: No red errors in console
```

### Expected Console Output

**After Login:**
```
✅ No errors
✅ Token present and valid
✅ User object contains: id, email, role, school_id
✅ schoolId extracted and stored
✅ No 401 or 403 errors
```

**After Logout:**
```
✅ localStorage cleared
✅ No auth data remaining
✅ Ready for next login
```

---

## Performance Checks

### Page Load Time
```
Target: < 2 seconds
Actual: __ seconds
Status: [PASS/FAIL]
```

### Login Time
```
Target: < 1 second (network latency)
Actual: __ seconds
Status: [PASS/FAIL]
```

### API Response Time
```
GET /exams:      Target < 500ms, Actual: __ ms
POST /auth/login: Target < 500ms, Actual: __ ms
Status: [PASS/FAIL]
```

---

## Security Checks

### ✅ JWT Security
- [ ] Token is long string (>100 chars)
- [ ] Token follows JWT format (3 parts: . separated)
- [ ] Token stored in localStorage (HTTPS recommended)
- [ ] Token included in all API requests
- [ ] Token cleared on logout
- [ ] Token cleared on 401

### ✅ Password Security
- [ ] Password not visible by default
- [ ] Password not stored in localStorage
- [ ] Password not logged to console
- [ ] Password never in request body logs
- [ ] Confirm password validation works

### ✅ Multi-Tenant Security
- [ ] schoolId extracted from JWT (not user input)
- [ ] schoolId stored locally (for UI convenience)
- [ ] schoolId not sent as parameter
- [ ] Backend enforces school_id scoping
- [ ] Cross-school access blocked

### ✅ Error Handling
- [ ] Errors don't expose sensitive data
- [ ] User-friendly error messages
- [ ] Backend errors not logged to console
- [ ] Stack traces not exposed to users

---

## Issue Tracking

### Issue #1: [Description]
```
Severity: HIGH/MEDIUM/LOW
Status: [OPEN/CLOSED/PENDING]
Steps to Reproduce:
1. ...
2. ...

Expected: ...
Actual: ...

Resolution: ...
```

### Issue #2: [Description]
```
Severity: HIGH/MEDIUM/LOW
Status: [OPEN/CLOSED/PENDING]
Steps to Reproduce:
1. ...
2. ...

Expected: ...
Actual: ...

Resolution: ...
```

---

## Test Results Summary

| Test Category | Status | Issues Found | Resolution |
|---------------|--------|--------------|-----------|
| Authentication | ✅/⏳ | ____ | ____ |
| schoolId Handling | ✅/⏳ | ____ | ____ |
| Multi-Tenancy | ✅/⏳ | ____ | ____ |
| API Integration | ✅/⏳ | ____ | ____ |
| Components | ✅/⏳ | ____ | ____ |
| Performance | ✅/⏳ | ____ | ____ |
| Security | ✅/⏳ | ____ | ____ |

---

## Sign-Off

**Phase 1 Testing Complete**

Tested By: ________________
Date: ________________
Status: PASSED/FAILED/NEEDS WORK

Critical Issues Found: ____ (List)
Minor Issues Found: ____ (List)
Notes: 

---

## Next Steps After Testing

✅ If All Tests Pass:
1. Proceed to feature component integration
2. Update StudentDashboard.js
3. Update TeacherDashboard.js
4. Update CreateExam.js
5. Deploy to staging

⏳ If Issues Found:
1. Fix critical issues
2. Retest affected areas
3. Document resolutions
4. Update code if needed

---

## Quick Test Execution

```bash
# Run quick smoke test
npm test -- --testPathPattern="Login|Register"

# Check for console errors
# (No automated, manual check required)

# Verify build
npm run build

# Check bundle size
npm run analyze (if available)
```

---

*Testing Guide Version:* 1.0
*Last Updated:* [Current Session]
*Status:* Ready for Testing
*Next:* Feature Component Integration
