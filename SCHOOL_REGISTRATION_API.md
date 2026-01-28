# School Registration API Guide

## Overview
The `/api/schools/register` endpoint provides a complete school onboarding experience:
- Creates a new school tenant
- Creates an admin account for that school
- Issues JWT token for immediate login
- Handles all validation and error cases

---

## Endpoint: POST /api/schools/register

### Description
Public endpoint (no authentication required) to register a new school and create the first admin account.

### Request

**URL:** `POST http://localhost:5000/api/schools/register`

**Headers:**
```
Content-Type: application/json
```

**Body:**
```json
{
  "name": "Spectra Group of Schools",
  "domain": "spectra.exam-software-45ex.vercel.app",
  "adminEmail": "principal@spectra.edu",
  "adminPassword": "SecurePassword123",
  "adminFirstName": "Sarah",
  "adminLastName": "Johnson"
}
```

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | ✅ | School's full name |
| `domain` | string | ❌ | School's domain (optional) |
| `adminEmail` | string | ✅ | Email for school admin account |
| `adminPassword` | string | ✅ | Password (min 8 characters) |
| `adminFirstName` | string | ❌ | Admin's first name |
| `adminLastName` | string | ❌ | Admin's last name |

### Response (201 Created)

**Success:**
```json
{
  "message": "School registered successfully",
  "school": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Spectra Group of Schools",
    "domain": "spectra.exam-software-45ex.vercel.app",
    "created_at": "2026-01-28T10:30:00.000Z"
  },
  "admin": {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "email": "principal@spectra.edu",
    "first_name": "Sarah",
    "last_name": "Johnson",
    "role": "admin",
    "school_id": "550e8400-e29b-41d4-a716-446655440000",
    "created_at": "2026-01-28T10:30:00.000Z"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": "24h"
}
```

### Error Responses

**400 Bad Request** - Missing required fields:
```json
{
  "error": "School name, admin email, and password are required"
}
```

**400 Bad Request** - Password too short:
```json
{
  "error": "Password must be at least 8 characters long"
}
```

**409 Conflict** - School name already exists:
```json
{
  "error": "School name already exists"
}
```

**409 Conflict** - Email already registered:
```json
{
  "error": "Email already registered"
}
```

**500 Internal Server Error**:
```json
{
  "error": "Error message details"
}
```

---

## Usage Examples

### cURL
```bash
curl -X POST http://localhost:5000/api/schools/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Spectra Group of Schools",
    "domain": "spectra.exam-software-45ex.vercel.app",
    "adminEmail": "principal@spectra.edu",
    "adminPassword": "SecurePassword123",
    "adminFirstName": "Sarah",
    "adminLastName": "Johnson"
  }'
```

### JavaScript/Fetch
```javascript
const response = await fetch('http://localhost:5000/api/schools/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'Spectra Group of Schools',
    domain: 'spectra.exam-software-45ex.vercel.app',
    adminEmail: 'principal@spectra.edu',
    adminPassword: 'SecurePassword123',
    adminFirstName: 'Sarah',
    adminLastName: 'Johnson'
  })
});

const data = await response.json();
console.log('School ID:', data.school.id);
console.log('Admin ID:', data.admin.id);
console.log('JWT Token:', data.token);

// Save token for future requests
localStorage.setItem('token', data.token);
```

### Python/Requests
```python
import requests
import json

response = requests.post(
    'http://localhost:5000/api/schools/register',
    headers={'Content-Type': 'application/json'},
    json={
        'name': 'Spectra Group of Schools',
        'domain': 'spectra.exam-software-45ex.vercel.app',
        'adminEmail': 'principal@spectra.edu',
        'adminPassword': 'SecurePassword123',
        'adminFirstName': 'Sarah',
        'adminLastName': 'Johnson'
    }
)

data = response.json()
print(f"School ID: {data['school']['id']}")
print(f"Admin Token: {data['token']}")
```

### Postman
1. Create new POST request
2. URL: `http://localhost:5000/api/schools/register`
3. Headers tab:
   - Key: `Content-Type`
   - Value: `application/json`
4. Body tab (raw JSON):
```json
{
  "name": "Spectra Group of Schools",
  "domain": "spectra.exam-software-45ex.vercel.app",
  "adminEmail": "principal@spectra.edu",
  "adminPassword": "SecurePassword123",
  "adminFirstName": "Sarah",
  "adminLastName": "Johnson"
}
```

---

## After Registration

### 1. Admin Login
Use the returned JWT token to authenticate:
```javascript
const headers = {
  'Authorization': `Bearer ${data.token}`
};

// Or login with credentials
const loginResponse = await fetch('http://localhost:5000/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'principal@spectra.edu',
    password: 'SecurePassword123'
  })
});
```

### 2. Invite Teachers
The admin can now register teachers in the school. Teachers will be automatically scoped to this school:
```javascript
// This requires auth, but will assign user to the school from their JWT
const teacherResponse = await fetch('http://localhost:5000/api/auth/register', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${adminToken}`
  },
  body: JSON.stringify({
    email: 'teacher@spectra.edu',
    password: 'TeacherPass123',
    first_name: 'John',
    last_name: 'Smith',
    role: 'teacher'
  })
});
```

### 3. Students Register
Students can register themselves (will be assigned to the school):
```javascript
const studentResponse = await fetch('http://localhost:5000/api/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'student@spectra.edu',
    password: 'StudentPass123',
    first_name: 'Alice',
    last_name: 'Brown',
    role: 'student'
  })
});
```

---

## Other School Endpoints

### GET /api/schools (List all schools)
**Requires:** Admin authentication
```bash
curl -X GET http://localhost:5000/api/schools \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### GET /api/schools/:schoolId (Get school details)
**Requires:** Authentication from that school
```bash
curl -X GET http://localhost:5000/api/schools/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### PUT /api/schools/:schoolId (Update school)
**Requires:** Admin from that school
```bash
curl -X PUT http://localhost:5000/api/schools/550e8400-e29b-41d4-a716-446655440000 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "Updated School Name",
    "domain": "newdomain.example.com"
  }'
```

### GET /api/schools/:schoolId/stats (School statistics)
**Requires:** Admin from that school
```bash
curl -X GET http://localhost:5000/api/schools/550e8400-e29b-41d4-a716-446655440000/stats \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response:**
```json
{
  "totalUsers": 45,
  "totalExams": 12,
  "totalSubmissions": 234,
  "totalTeachers": 5,
  "totalStudents": 40
}
```

---

## Implementation Checklist

- ✅ School registration endpoint created
- ✅ Admin account creation on registration
- ✅ JWT token issued immediately after registration
- ✅ Multi-tenant isolation with school_id
- ✅ Transaction handling (rollback on errors)
- ✅ Additional admin endpoints for school management

---

## Architecture Flow

```
┌─────────────────────────────────────────────────────────────┐
│ POST /api/schools/register                                  │
│ {name, domain, adminEmail, adminPassword, adminFirstName}   │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
                    ┌─────────────────┐
                    │ Validation      │
                    │ - Email format  │
                    │ - Password len  │
                    │ - Fields exist  │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │ Start txn       │
                    └────────┬────────┘
                             │
          ┌──────────────────┼──────────────────┐
          │                  │                  │
          ▼                  ▼                  ▼
    1. Create        2. Hash Password    3. Create Admin
       School                               User
       INSERT                          INSERT INTO users
    │ id (UUID)                       │ school_id (from school)
    │ name                           │ email
    │ domain                         │ password_hash
    └──────────────────┬─────────────┘
                       │
                       ▼
            ┌─────────────────────┐
            │ Issue JWT Token     │
            │ {id, email, role,   │
            │  school_id}         │
            └────────┬────────────┘
                     │
                     ▼
          ┌──────────────────────┐
          │ Return Response      │
          │ - school info        │
          │ - admin user info    │
          │ - JWT token          │
          └──────────────────────┘
```

---

## Security Considerations

1. **Transaction Safety**: Uses database transactions to ensure atomic operations
2. **Password Hashing**: Passwords hashed with bcrypt (10 rounds)
3. **Unique Constraints**: School names and emails are unique
4. **No Direct SQL**: All queries use parameterized statements
5. **Error Messages**: Generic messages to prevent information leakage
6. **Public Endpoint**: No auth required, but validates all inputs

---

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| "Email already registered" | Use a different email address for admin account |
| "Password must be at least 8 characters" | Use a password with 8+ characters |
| "School name already exists" | School names must be unique; use different name |
| Connection timeout | Ensure DATABASE_URL is set correctly |
| CORS error | Check allowedOrigins in server.js |

---

## See Also
- [School Tenant Registration Guide](./SCHOOL_TENANT_REGISTRATION_GUIDE.md)
- [Authentication API](./server/routes/auth-postgres.js)
- [Multi-Tenant Architecture](./IMPLEMENTATION_COMPLETE.md)
