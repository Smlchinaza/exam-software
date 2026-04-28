# Subdomain Implementation Guide for School Tenants

## Overview

This guide provides a complete implementation plan for creating unique subdomains for each school in the exam-software platform. This allows schools to access their dashboards via custom subdomains like `schoolname.yourdomain.com` instead of path-based URLs.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [DNS Configuration](#dns-configuration)
3. [Backend Implementation](#backend-implementation)
4. [Frontend Implementation](#frontend-implementation)
5. [Deployment on Vercel](#deployment-on-vercel)
6. [Testing & Validation](#testing--validation)
7. [Troubleshooting](#troubleshooting)

---

## Architecture Overview

### Current State
- Schools have an optional `domain` field in the database
- Multi-tenant system with `school_id` association
- Vercel deployment with API and frontend separation

### Proposed Solution
- Auto-generate URL-friendly subdomain slugs from school names
- Use middleware to extract school context from subdomains
- Dynamic CORS configuration to accept all school subdomains
- School context available in all API requests

### Benefits
- ✅ Branded school URLs (marketing friendly)
- ✅ Better multi-tenancy isolation
- ✅ Simplified school context passing
- ✅ Improved user experience with school branding

---

## DNS Configuration

### Step 1: Configure Wildcard DNS Record

Contact your domain registrar and add a wildcard DNS record:

**For domain: `yourdomain.com`**

| Type | Name | Value | TTL |
|------|------|-------|-----|
| CNAME | `*.yourdomain.com` | `cname.vercel.app` | 3600 |

**Example for common registrars:**
- **GoDaddy**: Add CNAME record with name `*` pointing to `cname.vercel.app`
- **Namecheap**: Add CNAME record with host `*.yourdomain.com` pointing to `cname.vercel.app`
- **CloudFlare**: Add CNAME record with name `*` pointing to `cname.vercel.app`

### Step 2: Add to Vercel Project

1. Go to Vercel Dashboard → Your Project → Settings → Domains
2. Add your domain and wildcard domain
3. Vercel will provide the CNAME value to add to your DNS

---

## Backend Implementation

### Step 1: Create Subdomain Extraction Middleware

**File:** `server/middleware/subdomain.js`

```javascript
/**
 * Middleware to extract school information from subdomain
 * Parses requests from schoolname.yourdomain.com and attaches school context
 */

const extractSchoolFromSubdomain = async (req, res, next) => {
  try {
    const host = req.get('host');
    const pool = require('../db/postgres');
    
    // Extract subdomain from host
    const parts = host.split('.');
    let subdomain = null;
    
    // Check if subdomain exists
    // schoolname.yourdomain.com -> parts = ['schoolname', 'yourdomain', 'com']
    // localhost:5000 -> parts = ['localhost:5000']
    // www.yourdomain.com -> parts = ['www', 'yourdomain', 'com']
    
    if (parts.length >= 3) {
      subdomain = parts[0];
    }
    
    // Skip www, api, and admin subdomains (these are system subdomains)
    if (subdomain && !['www', 'api', 'admin', 'localhost'].includes(subdomain)) {
      try {
        // Query database for school with matching domain
        const result = await pool.query(
          'SELECT id, name, domain FROM schools WHERE domain = $1 LIMIT 1',
          [`${subdomain}.yourdomain.com`]
        );
        
        if (result.rows.length > 0) {
          req.schoolFromSubdomain = result.rows[0];
          req.schoolIdFromSubdomain = result.rows[0].id;
        }
      } catch (dbError) {
        console.error('Database error in subdomain extraction:', dbError);
        // Continue without subdomain school context
      }
    }
    
    next();
  } catch (error) {
    console.error('Subdomain extraction error:', error);
    next(); // Continue regardless of error
  }
};

module.exports = extractSchoolFromSubdomain;
```

### Step 2: Update Server Configuration

**File:** `server/server.js`

Add the middleware import and usage:

```javascript
// Add this near the top with other middleware imports
const extractSchoolFromSubdomain = require('./middleware/subdomain');

// ... existing code ...

// Add this after app initialization (around line 30-40)
app.use(extractSchoolFromSubdomain);

// Update CORS configuration for dynamic subdomains
const corsOptions = {
  origin: function (origin, callback) {
    // Allow localhost for development
    if (!origin || origin.includes('localhost')) {
      return callback(null, true);
    }
    
    // Allow any subdomain of yourdomain.com
    if (origin && origin.includes('.yourdomain.com')) {
      return callback(null, true);
    }
    
    // Allow specific Vercel deployment domains
    const allowedVercelDomains = [
      'https://exam-software.vercel.app',
      'https://exam-software-45ex.vercel.app',
      'https://schoolshubs.com',
      'https://www.schoolshubs.com'
    ];
    
    if (origin && allowedVercelDomains.includes(origin)) {
      return callback(null, true);
    }
    
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
```

### Step 3: Update School Registration Endpoint

**File:** `server/routes/schools-postgres.js`

Modify the registration endpoint to auto-generate subdomain:

```javascript
// In POST /api/schools/register endpoint (around line 30)

/**
 * Generate URL-friendly subdomain slug from school name
 * Example: "Spectra Group of Schools" -> "spectra-group-of-schools"
 */
function generateSubdomainSlug(schoolName) {
  return schoolName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')      // Remove special characters
    .replace(/\s+/g, '-')               // Replace spaces with hyphens
    .replace(/-+/g, '-')                // Replace multiple hyphens with single
    .slice(0, 50);                      // Limit to 50 characters
}

// In the register endpoint handler, update domain assignment:
const { name, domain, adminEmail, adminPassword, adminFirstName, adminLastName } = req.body;

// If domain not provided, auto-generate from school name
const schoolDomain = domain || `${generateSubdomainSlug(name)}.yourdomain.com`;

// Then insert with:
const insertQuery = `
  INSERT INTO schools (name, domain, created_at, updated_at)
  VALUES ($1, $2, NOW(), NOW())
  RETURNING id, name, domain, created_at, updated_at
`;

const schoolResult = await pool.query(insertQuery, [name, schoolDomain]);
```

### Step 4: Add Subdomain to API Responses

Update school-related endpoints to include the subdomain information. This helps the frontend know the school's subdomain URL.

```javascript
// When returning school data, include:
const schoolData = {
  id: school.id,
  name: school.name,
  domain: school.domain,
  subdomain: school.domain.split('.')[0], // Extract subdomain from domain
  created_at: school.created_at
};
```

---

## Frontend Implementation

### Step 1: Create School Context Hook

**File:** `client/src/hooks/useSchoolSubdomain.js`

```javascript
import { useState, useEffect } from 'react';

export const useSchoolSubdomain = () => {
  const [schoolInfo, setSchoolInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    try {
      const host = window.location.host;
      const parts = host.split('.');
      let subdomain = null;

      // Extract subdomain
      if (parts.length >= 3 && parts[0] !== 'www') {
        subdomain = parts[0];
      }

      if (subdomain) {
        // Store subdomain in state
        setSchoolInfo({
          subdomain: subdomain,
          domain: host,
          isSubdomain: true
        });
      } else {
        setSchoolInfo({
          subdomain: null,
          domain: host,
          isSubdomain: false
        });
      }

      setLoading(false);
    } catch (err) {
      console.error('Error detecting school subdomain:', err);
      setError(err);
      setLoading(false);
    }
  }, []);

  return { schoolInfo, loading, error };
};
```

### Step 2: Update App Component

**File:** `client/src/App.js`

```javascript
import { useSchoolSubdomain } from './hooks/useSchoolSubdomain';

function App() {
  const { schoolInfo, loading: subddomainLoading } = useSchoolSubdomain();

  // Pass school info through context or props
  useEffect(() => {
    if (schoolInfo && schoolInfo.isSubdomain) {
      // User is accessing via school subdomain
      console.log('School subdomain detected:', schoolInfo.subdomain);
      
      // Update app state or context with school information
      // This helps with branding, routing, etc.
    }
  }, [schoolInfo]);

  if (subddomainLoading) {
    return <div>Loading...</div>;
  }

  // Rest of your app...
}
```

### Step 3: Update API Service

**File:** `client/src/services/api.js`

```javascript
// Add school context to API calls
import { useSchoolSubdomain } from '../hooks/useSchoolSubdomain';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

export const apiService = {
  // Include school context in headers if available
  async request(endpoint, options = {}) {
    const { schoolInfo } = useSchoolSubdomain?.() || {};
    
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    // If accessing via subdomain, backend will extract school context
    // No need to pass it explicitly - middleware handles it

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
      credentials: 'include' // Important for CORS with credentials
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    return response.json();
  }
};
```

### Step 4: Add School Branding Display

**File:** `client/src/components/SchoolBranding.js`

```javascript
import { useSchoolSubdomain } from '../hooks/useSchoolSubdomain';

export const SchoolBranding = () => {
  const { schoolInfo } = useSchoolSubdomain();

  if (!schoolInfo || !schoolInfo.isSubdomain) {
    return null;
  }

  return (
    <div className="school-branding">
      <p className="text-sm text-gray-600">
        School: {schoolInfo.subdomain}
      </p>
    </div>
  );
};
```

---

## Deployment on Vercel

### Step 1: Update vercel.json

**File:** `vercel.json`

```json
{
  "version": 2,
  "builds": [
    {
      "src": "server/server.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "server/server.js"
    },
    {
      "src": "/(.*)",
      "dest": "client/public/$1"
    }
  ],
  "env": {
    "NODE_ENV": "production",
    "DB_HOST": "@db_host",
    "DB_PORT": "@db_port",
    "DB_USER": "@db_user",
    "DB_PASSWORD": "@db_password",
    "DB_NAME": "@db_name"
  }
}
```

### Step 2: Add Environment Variables

In Vercel Dashboard → Settings → Environment Variables, ensure these are set:
- `DB_HOST` - Your PostgreSQL host
- `DB_PORT` - Your PostgreSQL port
- `DB_USER` - Your PostgreSQL user
- `DB_PASSWORD` - Your PostgreSQL password
- `DB_NAME` - Your PostgreSQL database name
- `JWT_SECRET` - Your JWT secret key

### Step 3: Configure Domain Settings

1. Go to Vercel Dashboard → Your Project → Settings → Domains
2. Add your main domain (e.g., `yourdomain.com`)
3. Add wildcard domain (e.g., `*.yourdomain.com`)
4. Update CNAME records as instructed by Vercel

### Step 4: Deploy

```bash
# Push changes to GitHub
git add .
git commit -m "feat: implement subdomain support for school tenants"
git push origin main

# Vercel will automatically deploy
# Monitor deployment in Vercel dashboard
```

---

## Testing & Validation

### Manual Testing

#### Test 1: Create a School and Verify Subdomain

```bash
# Create a new school via API or UI
curl -X POST http://localhost:5000/api/schools/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test School Academy",
    "adminEmail": "admin@testschool.edu",
    "adminPassword": "SecurePass123",
    "adminFirstName": "John",
    "adminLastName": "Doe"
  }'

# Response should include auto-generated domain:
# "domain": "test-school-academy.yourdomain.com"
```

#### Test 2: Access via Subdomain (Local Development)

Add to your `hosts` file for local testing:

**Windows:** `C:\Windows\System32\drivers\etc\hosts`
**Mac/Linux:** `/etc/hosts`

```
127.0.0.1  test-school-academy.localhost
127.0.0.1  spectra-group.localhost
```

Then access via: `http://test-school-academy.localhost:3000`

#### Test 3: Verify Subdomain Extraction

Check browser console to verify school context is detected:

```javascript
// In browser console
const { schoolInfo } = useSchoolSubdomain();
console.log(schoolInfo);
// Output: { subdomain: 'test-school-academy', domain: 'test-school-academy.localhost:3000', isSubdomain: true }
```

#### Test 4: Verify CORS

Make API calls from subdomain and verify no CORS errors:

```javascript
fetch('http://localhost:5000/api/schools', {
  credentials: 'include'
})
.then(r => r.json())
.then(data => console.log('CORS successful:', data));
```

### Automated Testing

Create test script: `test-subdomains.js`

```javascript
const axios = require('axios');

const testSubdomains = async () => {
  try {
    // Test 1: Register school
    console.log('Creating school with auto-generated subdomain...');
    const schoolRes = await axios.post('http://localhost:5000/api/schools/register', {
      name: 'Automated Test School',
      adminEmail: 'test@school.edu',
      adminPassword: 'TestPass123',
      adminFirstName: 'Test',
      adminLastName: 'User'
    });

    const { domain } = schoolRes.data.school;
    const subdomain = domain.split('.')[0];
    
    console.log(`✓ School created with subdomain: ${subdomain}`);
    console.log(`✓ Full domain: ${domain}`);

    // Test 2: Verify school retrieval
    const schoolsRes = await axios.get('http://localhost:5000/api/schools');
    const foundSchool = schoolsRes.data.find(s => s.domain === domain);
    console.log(`✓ School retrieved from database: ${foundSchool.name}`);

  } catch (error) {
    console.error('Test failed:', error.message);
  }
};

testSubdomains();
```

Run with:
```bash
node test-subdomains.js
```

---

## Database Schema Verification

Ensure your `schools` table has the `domain` column:

```sql
-- Check if domain column exists
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'schools' AND column_name = 'domain';

-- If not present, add it:
ALTER TABLE schools 
ADD COLUMN domain VARCHAR(255) UNIQUE;

-- Create index for faster lookups
CREATE INDEX idx_schools_domain ON schools(domain);
```

---

## Troubleshooting

### Issue 1: CORS Errors

**Error:** "Access to XMLHttpRequest blocked by CORS policy"

**Solution:**
1. Verify CORS middleware is configured correctly
2. Check that subdomain is included in allowed origins
3. Ensure `credentials: 'include'` in API calls
4. Check browser console for exact origin being sent

```javascript
// Debug: Log origin in browser console
console.log('Current origin:', window.location.origin);
console.log('Current host:', window.location.host);
```

### Issue 2: Subdomain Not Detected

**Problem:** School context not being extracted

**Solution:**
1. Verify DNS records are propagated (use `nslookup` or `dig`)
2. Check that host header is correct in request
3. Verify middleware is added to Express app before routes
4. Enable debug logging:

```javascript
// Add to subdomain.js middleware
console.log('Request host:', req.get('host'));
console.log('Extracted subdomain:', subdomain);
console.log('School found:', req.schoolFromSubdomain);
```

### Issue 3: Subdomain Slug Generation Issues

**Problem:** Special characters breaking subdomain

**Solution:** Test slug generation:

```javascript
const generateSubdomainSlug = (name) => {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 50);
};

// Test cases
console.log(generateSubdomainSlug("St. Mary's Academy"));
// Output: "st-marys-academy"

console.log(generateSubdomainSlug("101 School Drive"));
// Output: "101-school-drive"
```

### Issue 4: Database Connection Issues

**Problem:** Subdomain extraction middleware failing silently

**Solution:** Add detailed error logging:

```javascript
const extractSchoolFromSubdomain = async (req, res, next) => {
  try {
    // ... extraction logic ...
  } catch (error) {
    console.error('[SUBDOMAIN_EXTRACT] Error:', error);
    console.error('[SUBDOMAIN_EXTRACT] Stack:', error.stack);
    next();
  }
};
```

---

## Security Considerations

### 1. Subdomain Validation
- Limit subdomain length to 50 characters
- Allow only alphanumeric and hyphens
- Validate before storing in database

### 2. DNS Spoofing Prevention
- Always validate school ownership
- Use email verification for school registration
- Implement rate limiting on registration

### 3. CORS Security
- Only allow specific origins
- Require credentials for sensitive operations
- Use HTTPS in production

### 4. SQL Injection Prevention
- Always use parameterized queries (already done in code)
- Validate domain format before database query
- Use connection pooling

---

## Performance Optimization

### Database Optimization

```sql
-- Index for fast subdomain lookups
CREATE INDEX idx_schools_domain ON schools(domain) WHERE status = 'active';

-- Index for school name searches
CREATE INDEX idx_schools_name ON schools(name);

-- Analyze query performance
EXPLAIN ANALYZE SELECT id, name FROM schools WHERE domain = 'schoolname.yourdomain.com';
```

### Caching Strategy

```javascript
// Add caching layer for school lookups
const NodeCache = require('node-cache');
const schoolCache = new NodeCache({ stdTTL: 3600 }); // 1 hour TTL

const extractSchoolFromSubdomain = async (req, res, next) => {
  const host = req.get('host');
  
  // Check cache first
  if (schoolCache.has(host)) {
    req.schoolFromSubdomain = schoolCache.get(host);
    return next();
  }

  // Database lookup
  const result = await pool.query(...);
  
  // Cache result
  if (result.rows.length > 0) {
    schoolCache.set(host, result.rows[0]);
    req.schoolFromSubdomain = result.rows[0];
  }

  next();
};
```

---

## Rollback Plan

If subdomain implementation needs to be rolled back:

1. **Remove middleware from server.js**
2. **Revert CORS configuration to original**
3. **Keep domain column in database** (no harm having it)
4. **Redeploy to Vercel**

```bash
git revert <commit-hash>
git push origin main
```

---

## Next Steps

1. ✅ Implement subdomain extraction middleware
2. ✅ Update school registration endpoint
3. ✅ Configure CORS for dynamic origins
4. ✅ Update frontend to handle subdomains
5. ✅ Configure DNS with wildcard record
6. ✅ Deploy to Vercel
7. ✅ Test subdomain access
8. ✅ Monitor logs for issues
9. ✅ Update documentation for users
10. ✅ Plan marketing for branded URLs

---

## References

- [Vercel Wildcard Domains](https://vercel.com/docs/concepts/projects/domains/wildcards)
- [Node.js Express CORS](https://expressjs.com/en/resources/middleware/cors.html)
- [PostgreSQL Connection Pooling](https://node-postgres.com/features/pooling)
- [Multi-Tenancy Best Practices](https://www.postgresql.org/docs/current/ddl-schemas.html)

---

**Document Version:** 1.0  
**Last Updated:** April 26, 2026  
**Status:** Ready for Implementation
