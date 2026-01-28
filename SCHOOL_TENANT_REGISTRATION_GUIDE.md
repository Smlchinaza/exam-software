# School Tenant Registration Guide

## Overview
The system uses a **multi-tenant architecture** where each school is a separate tenant. Schools are stored in the `schools` table, and all users, exams, and submissions are linked to a school via `school_id`.

---

## Current Implementation Status

### ✅ What's Ready
- Database schema with `schools` table
- Multi-tenant data isolation via `school_id`
- Authentication system that automatically assigns school to new users
- JWT tokens include `school_id` for automatic scoping

### ⚠️ What's Needed
- **School registration endpoint** - Currently uses a hardcoded default school
- **Admin dashboard** - To manage schools and assign admins
- **School domain mapping** - To route requests to correct tenant

---

## How Schools Currently Work

### 1. Database Schema
```sql
CREATE TABLE schools (
    id uuid PRIMARY KEY,           -- Unique identifier
    mongo_id text UNIQUE,          -- Legacy MongoDB ID (if migrating)
    name text NOT NULL,            -- School name
    domain text,                   -- Optional: school's domain (example.edu)
    created_at timestamptz,
    updated_at timestamptz
);
```

### 2. User Registration Flow
When a user registers:
1. System fetches the **first (default) school** from database
2. User is created with that `school_id`
3. JWT token includes `school_id` for multi-tenant scoping
4. **All** subsequent queries are filtered by `school_id`

**Current code (auth-postgres.js):**
```javascript
// Get default school (for now, single-tenant)
const schoolRes = await pool.query(`SELECT id FROM schools LIMIT 1`);
const schoolId = schoolRes.rows[0].id;
```

---

## Methods to Register Schools

### Method 1: Direct Database Insert (SQL)
**Best for:** Initial setup or one-time registration

```sql
-- Insert a new school
INSERT INTO schools (name, domain, created_at, updated_at)
VALUES (
    'Springfield High School',
    'springfield-hs.edu',
    NOW(),
    NOW()
);

-- View all schools
SELECT id, name, domain FROM schools;
```

### Method 2: Database GUI Tool
**Best for:** Non-technical users

Using pgAdmin, DBeaver, or similar:
1. Connect to PostgreSQL database
2. Navigate to `schools` table
3. Insert new row with:
   - `name`: School name
   - `domain`: Optional school domain
   - `id`: Leave blank (auto-generates UUID)

### Method 3: API Endpoint (Recommended - Not Yet Implemented)
**Best for:** Automated registration and onboarding**

The system currently lacks a dedicated school registration endpoint. Here's what needs to be added:

**Endpoint to create:**
```
POST /api/schools/register
```

**Request:**
```json
{
  "name": "Springfield High School",
  "domain": "springfield-hs.edu",
  "adminEmail": "principal@springfield.edu",
  "adminFirstName": "Seymour",
  "adminLastName": "Skinner"
}
```

**Response:**
```json
{
  "school": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Springfield High School",
    "domain": "springfield-hs.edu"
  },
  "admin": {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "email": "principal@springfield.edu",
    "role": "admin",
    "school_id": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

---

## Multi-Tenant Isolation

### How It Works

1. **Registration**: User registers with email/password
   ```javascript
   POST /api/auth/register
   {
     "email": "teacher@school.edu",
     "password": "secure123",
     "first_name": "John",
     "last_name": "Doe",
     "role": "teacher"
   }
   ```

2. **Server assigns school**:
   - Fetches first school from `schools` table
   - Creates user with `school_id` = that school's ID
   - Issues JWT with `school_id` in payload

3. **JWT Contains**:
   ```json
   {
     "id": "user-uuid",
     "email": "teacher@school.edu",
     "role": "teacher",
     "school_id": "school-uuid"  // ← Includes school ID
   }
   ```

4. **All queries scoped by `school_id`**:
   ```sql
   -- When teacher requests exams, backend filters automatically:
   SELECT * FROM exams 
   WHERE school_id = $1  -- $1 = school_id from JWT
   AND is_published = true
   ```

5. **Result**: Users can only see data from their own school
   - Teacher A (School 1) cannot see exams from School 2
   - Student B (School 1) cannot see other schools' submissions
   - Complete data isolation

---

## Current Limitation & Solution

### Problem
**Right now**: Only the first school in the database is used. When you register users, they all go to the same school.

```
Registration → Gets school → Creates user with that school
               (LIMIT 1)
```

### Solution Options

#### Option A: Manual School Registration (Immediate)
1. Use SQL to insert schools manually:
   ```sql
   INSERT INTO schools (name, domain) 
   VALUES ('School A', 'schoola.edu');
   
   INSERT INTO schools (name, domain) 
   VALUES ('School B', 'schoolb.edu');
   ```

2. Users registering will still default to first school
   - Good for testing single-tenant behavior
   - Need backend changes for true multi-tenant

#### Option B: Add School Selection to Registration (Recommended)
Modify the registration to let users specify which school:

**Frontend (Register.js):**
```javascript
// Add school selection dropdown
const [selectedSchool, setSelectedSchool] = useState('');

// Send school with registration
const response = await authApi.register({
  email, password, firstName, lastName, role,
  schoolId: selectedSchool  // ← NEW
});
```

**Backend (auth-postgres.js):**
```javascript
router.post('/register', async (req, res) => {
  const { email, password, schoolId } = req.body;  // ← Accept schoolId
  
  // Use provided schoolId instead of LIMIT 1
  const result = await pool.query(
    `INSERT INTO users (...)
     VALUES (..., $1, ...)`,  // ← Use provided schoolId
    [schoolId, email, ...]
  );
});
```

#### Option C: Implement Admin School Registration Endpoint (Best Practice)
Create dedicated endpoint for school onboarding:

**Route (create new: routes/schools-postgres.js):**
```javascript
// POST /api/schools/register
// Public endpoint (no auth required)
router.post('/register', async (req, res) => {
  const { name, domain, adminEmail, adminPassword, adminFirstName } = req.body;
  
  // 1. Create school
  const schoolRes = await pool.query(
    `INSERT INTO schools (name, domain) VALUES ($1, $2) RETURNING id`,
    [name, domain]
  );
  const schoolId = schoolRes.rows[0].id;
  
  // 2. Create admin user for that school
  const password_hash = await bcryptjs.hash(adminPassword, 10);
  const adminRes = await pool.query(
    `INSERT INTO users (school_id, email, password_hash, first_name, role)
     VALUES ($1, $2, $3, $4, 'admin') RETURNING id`,
    [schoolId, adminEmail, password_hash, adminFirstName]
  );
  
  // 3. Return school + admin credentials
  res.json({ school: { id: schoolId, name, domain }, admin: adminRes.rows[0] });
});
```

---

## Step-by-Step: Register Your First School

### Quick Setup (Using SQL)

1. **Connect to PostgreSQL**:
   ```bash
   psql $DATABASE_URL
   ```

2. **Insert school**:
   ```sql
   INSERT INTO schools (name, domain)
   VALUES ('Test School', 'testschool.edu')
   RETURNING id, name;
   ```

3. **Register users** in that school:
   - Frontend: POST /api/auth/register
   - Payload: `{ email, password, first_name, last_name, role }`
   - Users will get the school's `school_id` automatically

4. **Verify**:
   ```sql
   SELECT u.email, u.role, s.name
   FROM users u
   JOIN schools s ON u.school_id = s.id
   WHERE s.name = 'Test School';
   ```

---

## Architecture Diagram

```
                    ┌─────────────────────┐
                    │   Database          │
                    │                     │
    ┌───────────────┤  schools table      │
    │               │  ├─ School A (id:1) │
    │               │  ├─ School B (id:2) │
    │               └─────────────────────┘
    │
    ├─→ Register User (School A)
    │   ├─ email: user@a.edu
    │   ├─ school_id: 1 (auto-assigned)
    │   └─ JWT includes school_id: 1
    │
    └─→ When user requests exams:
        ├─ Middleware extracts school_id from JWT
        ├─ Query: SELECT exams WHERE school_id = 1
        └─ Returns only School A's exams
```

---

## Next Steps

### Immediate Actions
1. ✅ Insert schools into database (SQL)
2. ✅ Test registration (ensures users get school_id)
3. ✅ Verify multi-tenant isolation (users can't see other schools' data)

### Recommended Implementation
1. ⏳ Add school selection to registration form
2. ⏳ Create `/api/schools/register` endpoint
3. ⏳ Add admin dashboard to manage schools
4. ⏳ Implement domain-based routing (school.example.com → tenant A)

---

## Code Reference

### Key Files
- **Schema**: `server/sql/schema-postgres.sql`
- **Auth Routes**: `server/routes/auth-postgres.js` (lines 28-31 show LIMIT 1)
- **Tenant Scoping**: `server/middleware/tenantScoping.js`
- **User Routes**: `server/routes/users-postgres.js` (example of school_id filtering)

### Tenant Scoping Middleware
```javascript
// Extracts school_id from JWT and enforces it
const enforceMultiTenant = (req, res, next) => {
  req.tenant = {
    schoolId: req.user.school_id,  // From JWT payload
    userId: req.user.id,
    role: req.user.role
  };
  next();
};
```

---

## FAQ

**Q: Can users from different schools have the same email?**
A: No. The UNIQUE constraint is `(school_id, email)`, so each school can have one user per email, but different schools can each have user@example.com.

**Q: How are admins assigned to schools?**
A: Set `role = 'admin'` when creating user. Admins have access to all users in their school.

**Q: What prevents a user from seeing another school's data?**
A: The `enforceMultiTenant` middleware adds `school_id` to all queries automatically from the JWT payload.

**Q: Can you change a user's school later?**
A: Yes, but it's a data surgery. Would need to update `school_id` column and issue new JWT.

---

## See Also
- [Multi-Tenant Architecture](./IMPLEMENTATION_COMPLETE.md)
- [Backend API Reference](./server/QUICK_REFERENCE.md)
- [Database Schema](./server/sql/schema-postgres.sql)
