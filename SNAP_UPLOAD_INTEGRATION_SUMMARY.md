# Snap & Upload Feature — Integration Summary

**Date:** May 22, 2026  
**Status:** ✅ SNAP_UPLOAD_DEV.md Updated to Sync with Existing Architecture  
**Scope:** Connecting Python backend microservice to existing exam-software system

---

## 📋 What Was Analyzed

1. **SNAP_UPLOAD_DEV.md** — The feature specification (attached to chat)
2. **exam-software/client** — React frontend (existing)
3. **exam-software/server** — Node.js/Express backend (existing)
4. **Existing Database** — PostgreSQL with multi-tenant structure
5. **Existing API Endpoints** — Student results routes already in place

---

## ✅ Key Alignment Confirmations

### Your System Already Has Everything Needed

| Requirement | Status | Location |
|------------|--------|----------|
| Student results API | ✅ Exists | `server/routes/student-results.js` |
| JWT authentication | ✅ Exists | `server/middleware/auth.js` |
| Multi-tenant scope | ✅ Exists | `server/middleware/tenantScoping.js` |
| React frontend | ✅ Exists | `client/src/` |
| Result management | ✅ Partially | `client/src/components/TeacherResultManager.js` |
| PostgreSQL backend | ✅ Exists | Multi-tenant ready |

### Endpoints the Python Backend Will Call

Your Node.js API already provides these:

```bash
# 1. Get class roster for name matching
GET /api/student-results/class/:class/:session/:term
Authorization: Bearer {teacher_token}
Response: [ { student_id, student_name, admission_number, ... } ]

# 2. Save individual scores
POST /api/student-results
Authorization: Bearer {teacher_token}
Body: { student_id, subject_name, class, session, term, exam_score, ... }
Response: { id, success_status, ... }
```

**The Python backend calls these unchanged endpoints** — no new Node.js code needed.

---

## 📝 What Was Updated in SNAP_UPLOAD_DEV.md

### Section 2: System Architecture
**Before:** Generic description of two repos  
**After:** Specific diagram showing Python → Node.js → PostgreSQL flow, emphasizing that Python never touches the DB

### Section 3: Repository Structure  
**Before:** Create two new repos  
**After:** Create ONE new repo (Python backend), add ONE folder to existing frontend (score-scan feature)

### Section 5: Frontend Repository Structure
**Before:** Generic React structure  
**After:** Specific path `client/src/features/score-scan/` added to EXISTING frontend, includes teacher token passing in `api.js`

### Section 6: Backend Environment Setup
**Before:** Generic Python setup  
**After:** Added explanation of your multi-tenant system, emphasized that teacher tokens MUST be forwarded to Node.js API, realistic `.env` with your actual backend URL

### Section 7: Frontend Environment
**Before:** Generic setup  
**After:** Specific for YOUR environment (localhost:5000 for Node.js, localhost:8000 for Python, localhost:3000 for React)

### Section 13: Write Agent (Previously Agent 6)
**Before:** Generic API client code  
**After:** Complete rewrite showing how to:
   - Extract teacher token from Authorization header
   - Call GET `/api/student-results/class/...` to fetch roster
   - Call POST `/api/student-results` to save scores
   - Always forward the teacher's token (no new auth)

### Section 16: Connecting the Two Repositories
**Before:** Generic "here's how repos talk"  
**After:** Detailed token forwarding flow, multi-tenant explanation, actual error scenarios

### Section 17: API Reference
**Before:** Generic endpoint specs  
**After:** Split into TWO sections:
   1. Backend-to-backend (Python calls Node.js) — with actual exam-software endpoints
   2. Frontend-to-Python — the public API contract

### Section 19: Deployment
**Before:** Two separate deployment processes  
**After:** Three-part process:
   1. Deploy Python to new Render instance
   2. Update frontend .env.production
   3. NO changes to existing Node.js backend

### NEW: Errors 17-20
Added specific errors for this multi-repo, token-forwarding setup:
- ERROR 17: Not forwarding teacher token to Node.js API
- ERROR 18: Connecting Python directly to PostgreSQL
- ERROR 19: Forgetting multi-tenant scope
- ERROR 20: Hardcoding API URLs

---

## 🔑 Critical Implementation Points

### 1. Token Forwarding (THE MOST IMPORTANT)

```
React Frontend
│
└─ Has: teacher_token (from login)
   
   Python Backend
   │
   ├─ Receives: Authorization: Bearer {teacher_token}
   ├─ Extracts: token from header
   │
   └─ Forwards: Authorization: Bearer {teacher_token} → Node.js API
      
      Node.js API
      │
      ├─ Receives: Bearer token
      ├─ Validates: token is authentic
      ├─ Extracts: school_id from token payload
      │
      └─ Returns: data filtered to that school_id only
```

**Critical Rule:** Python backend never creates, validates, or modifies the token. Just passes it through.

### 2. No Database Access from Python

❌ **WRONG:**
```python
import psycopg2
conn = psycopg2.connect(os.getenv("DATABASE_URL"))
cursor = conn.cursor()
cursor.execute("SELECT * FROM student_results WHERE class = %s")
```

✅ **CORRECT:**
```python
import httpx
response = await client.get(
    f"{SCHOOLSHUB_API_BASE_URL}/student-results/class/{class_name}/...",
    headers={"Authorization": f"Bearer {teacher_token}"}
)
```

### 3. Environment Variables Strategy

**Python Backend (.env):**
```
ANTHROPIC_API_KEY=your_anthropic_key
SCHOOLSHUB_API_BASE_URL=https://exam-software-65fk.onrender.com/api
OCR_MODE=tesseract
ALLOWED_ORIGINS=http://localhost:3000,https://exam-software.vercel.app
```

**React Frontend (.env.production):**
```
REACT_APP_SCAN_API_URL=https://your-score-scan-service.onrender.com
REACT_APP_API_URL=https://exam-software-65fk.onrender.com/api
```

**Existing Node.js Backend:**
No changes needed — everything stays the same.

### 4. Multi-Tenant Scope is Automatic

The Node.js middleware handles everything:
- Token validation ✅
- School_id extraction ✅
- Result filtering ✅
- Access control ✅

Python doesn't need to:
- Validate tokens (Node.js does it)
- Extract school_id (Node.js does it)
- Filter results (Node.js does it)
- Check permissions (Node.js does it)

Just pass the token through.

---

## 🚀 Implementation Roadmap

### Phase 1: Build Python Backend
1. ✅ Understand the spec (SNAP_UPLOAD_DEV.md)
2. Create `schoolshub-score-scan` repo on GitHub
3. Set up Python project structure as defined in Section 4
4. Implement Agents 1-6, with Agent 6 calling your Node.js endpoints
5. Test locally with Postman
6. Deploy to Render

### Phase 2: Add React Components
1. Create `client/src/features/score-scan/` folder
2. Build `api.js` that calls Python backend with teacher token
3. Build `UploadForm.jsx`
4. Build `ReviewTable.jsx`
5. Build `SuccessScreen.jsx`
6. Test with local Python backend
7. Update `.env.production` with Render URL

### Phase 3: Deploy & Test
1. Push frontend to GitHub → auto-deploys to Vercel/Netlify
2. Verify Python backend is live on Render
3. Test end-to-end in production
4. Pilot with 1-2 schools

---

## ✨ What This Achieves

| Aspect | Benefit |
|--------|---------|
| **Separation of Concerns** | Python does image processing; Node.js handles data & auth |
| **Independent Scaling** | Can deploy Python separately, zero downtime for frontend |
| **Zero DB Credentials** | Python backend has no database access — can't accidentally corrupt data |
| **Reuses Auth** | Leverages your existing JWT system — no new auth to build |
| **Audit Trail** | Node.js writes all scores with teacher_id in database |
| **Multi-tenant Safe** | Middleware automatically enforces school isolation |
| **Easy Removal** | Delete Python service + score-scan folder = feature gone |

---

## 🔍 Key Files Affected

### Files Updated
- ✅ `SNAP_UPLOAD_DEV.md` — Sections 2, 3, 5, 6, 7, 13, 16, 17, 19 + new errors

### Files to Create (Next Steps)
- `schoolshub-score-scan/` — New Python repo (to be created)
- `client/src/features/score-scan/` — New React folder (to be created)

### Files NOT Modified
- ✅ `server/` — No changes needed
- ✅ `server/routes/student-results.js` — Already perfect
- ✅ `server/middleware/auth.js` — Already perfect
- ✅ `client/src/` (existing) — Only additions, no deletions

---

## 🎯 Next Steps

1. **Review** the updated SNAP_UPLOAD_DEV.md for accuracy
2. **Create** the `schoolshub-score-scan` Python repository
3. **Set up** Python project structure (Section 4)
4. **Build** Python agents (Sections 8-13)
5. **Test locally** with Postman against your Node.js API
6. **Deploy** Python to Render
7. **Build** React components (Section 14)
8. **Connect** frontend to Python backend
9. **Test end-to-end** and deploy

---

## 📊 Architecture Diagram (Text)

```
┌──────────────────────────────────────┐
│  React Frontend (exam-software)      │
│  ├─ Login → get JWT token            │
│  ├─ teacher_token saved in localStorage
│  └─ Score Scan feature               │
│     └─ Upload photo                  │
│        └─ Pass token in header       │
└──────────────────────────────────────┘
        │
        │ Authorization: Bearer {teacher_token}
        │
        ▼
┌──────────────────────────────────────┐
│  Python Backend (schoolshub-score-scan)
│  ├─ Extract token from header        │
│  ├─ Process image (OCR, parse, match)│
│  └─ Call Node.js API with token      │
└──────────────────────────────────────┘
        │
        │ Authorization: Bearer {teacher_token}
        │
        ▼
┌──────────────────────────────────────┐
│  Node.js Backend (exam-software)     │
│  ├─ Validate token                   │
│  ├─ Extract school_id from token     │
│  ├─ Filter to that school only       │
│  ├─ Check permissions                │
│  ├─ Write to PostgreSQL              │
│  └─ Return results                   │
└──────────────────────────────────────┘
        │
        ▼
┌──────────────────────────────────────┐
│  PostgreSQL Database                 │
│  ├─ student_results table            │
│  ├─ Multi-tenant by school_id        │
│  └─ Audit trail with teacher_id      │
└──────────────────────────────────────┘
```

---

## 🛡️ Security Notes

- ✅ **Token forwarding is secure** — Python never validates or modifies it
- ✅ **Multi-tenant isolation** — Node.js middleware enforces it
- ✅ **No shared credentials** — Each service has its own `.env`
- ✅ **No direct DB access** — Python can't bypass Node.js logic
- ✅ **Audit trail intact** — All writes go through Node.js (recorded with teacher_id)

---

## 📞 Support

If you have questions about:
- **SNAP_UPLOAD_DEV.md changes** → See the sections marked as updated
- **Token forwarding** → See Section 16, ERROR 17, and the Write Agent (Section 13)
- **Multi-tenant setup** → See Section 6 (backend environment) and Section 19 (deployment)
- **API endpoints** → See Section 17 (API Reference) for exact formats
- **Local development** → See Section 7 (frontend environment)

---

**Status:** ✅ SNAP_UPLOAD_DEV.md is now fully synced with your existing architecture and ready for implementation.

**Next Action:** Review the updated document and confirm the architecture aligns with your system before starting Python backend development.
