# SchoolsHub — Snap & Upload Feature
## Development Specification & Build Guide

**Version:** 2.0  
**Feature Name:** Snap & Upload (internally: `score-scan`)  
**Author:** SchoolsHub Engineering  
**Status:** Pre-build  
**Architecture:** Two-repository split — backend microservice + React frontend  

---

## Table of Contents

1. [Feature Overview](#1-feature-overview)
2. [System Architecture](#2-system-architecture)
3. [Repository Structure](#3-repository-structure)
4. [Backend Repository — Project Structure](#4-backend-repository--project-structure)
5. [Frontend Repository — Project Structure](#5-frontend-repository--project-structure)
6. [Environment Setup — Backend](#6-environment-setup--backend)
7. [Environment Setup — Frontend](#7-environment-setup--frontend)
8. [Agent 1 — Image Receiver](#8-agent-1--image-receiver)
9. [Agent 2 — OCR Engine](#9-agent-2--ocr-engine)
10. [Agent 3 — Parser](#10-agent-3--parser)
11. [Agent 4 — Fuzzy Matcher](#11-agent-4--fuzzy-matcher)
12. [Agent 5 — Validation Payload](#12-agent-5--validation-payload)
13. [Agent 6 — Write Agent](#13-agent-6--write-agent)
14. [Frontend — Teacher Review UI](#14-frontend--teacher-review-ui)
15. [Audit Logging](#15-audit-logging)
16. [Connecting the Two Repositories](#16-connecting-the-two-repositories)
17. [API Reference](#17-api-reference)
18. [Testing Strategy](#18-testing-strategy)
19. [Deployment](#19-deployment)
20. [Errors to Avoid](#20-errors-to-avoid)
21. [Cost Reference](#21-cost-reference)

---

## 1. Feature Overview

### What This Feature Does

Teachers in rural areas with limited internet literacy can write student scores on a plain paper sheet, photograph it with any smartphone, upload the photo, and have SchoolsHub automatically read the scores, match each name to the correct student in the database, and present a confirmation screen before saving anything.

### What This Feature Does NOT Do

- It does **not** write to the database without explicit teacher confirmation.
- It does **not** replace the existing score entry flow — it runs alongside it.
- It does **not** require always-on internet during the upload (photo can be queued offline and uploaded when connection is available — future enhancement).

### Success Criteria

| Metric | Target |
|--------|--------|
| Name match accuracy (auto) | ≥ 90% on pre-printed sheets |
| Name match accuracy (handwritten) | ≥ 75% on clean handwriting |
| End-to-end processing time | Under 8 seconds per sheet |
| Teacher correction required | Less than 15% of rows per sheet |
| Zero silent errors | No score commits without teacher confirmation |

---

## 2. System Architecture

### Principle: Two Repositories, One Connection Point

The Snap & Upload feature is built across two completely separate GitHub repositories. The Python microservice backend lives in one repo. The React frontend additions live in your existing exam-software frontend. They are connected by a single, clean API contract — nothing else is shared between them.

```
┌─────────────────────────────────────────────────────────────────┐
│  REPO 1: schoolshub-score-scan  (Python / FastAPI)              │
│                                                                   │
│  [Image Receiver] → [OCR Agent] → [Parser Agent]                │
│       → [Matcher Agent] → [Payload Builder]                      │
│       → [Write Agent] → [Call Existing Node.js API]             │
│                                                                   │
│  Deployed to: Render / Railway                                    │
│  Live URL: https://score-scan.onrender.com                        │
└───────────────────────┬─────────────────────────────────────────┘
                        │  HTTP (JSON over HTTPS)
                        │  Two endpoints only:
                        │  POST /api/scan-sheet
                        │  POST /api/commit-scores
                        │
┌───────────────────────▼─────────────────────────────────────────┐
│  REPO 2: exam-software/client  (React)                           │
│  NEW: src/features/score-scan/ folder added                      │
│                                                                   │
│  [UploadForm] → calls /api/scan-sheet                            │
│  [ReviewTable] → teacher confirms / corrects                     │
│  [SuccessScreen] → calls /api/commit-scores                      │
│                                                                   │
│  Deployed to: Vercel / Netlify / existing frontend host          │
└─────────────────────────────────────────────────────────────────┘
                        │
                        │  After teacher confirmation,
                        │  Python backend calls existing
                        │  Node.js API using teacher's token
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│  EXISTING EXAM-SOFTWARE BACKEND  (Node.js/Express)              │
│  POST /api/student-results (existing endpoint)                   │
│  GET /api/student-results/class/:subject/:class/:session/:term   │
│  Your existing PostgreSQL database stays untouched               │
└─────────────────────────────────────────────────────────────────┘
```

### The One Rule

The two repos share **exactly one thing**: the API contract defined in [Section 17 — API Reference](#17-api-reference). The Python backend repo:
- Never imports React code  
- Never connects directly to your PostgreSQL database
- Always calls your existing Node.js API via HTTP with a valid teacher token

The React repo:
- Never imports Python code
- Talks to the Python backend for scan processing  
- Uses existing Node.js API for authentication

### Why Two Repositories

- **Independent deployments.** You can redeploy the backend (e.g. to upgrade the OCR engine) without touching the frontend. You can update the UI without redeploying Python.
- **Independent failure.** If the scan service goes down, your main SchoolsHub frontend still works — teachers can still use the manual score entry flow.
- **Independent teams.** If you ever bring in a second developer, one can own the backend, one can own the frontend, with zero conflicts.
- **Clean separation of concerns.** Python does computation. React does UI. Never the other way around.

---

## 3. Repository Structure

### GitHub Setup

You will be creating ONE new repository:

```
Your Workspace
├── schoolshub-score-scan        ← NEW Python backend repo you will create
│   (to be created on GitHub)
│
└── exam-software               ← EXISTING — no structural changes needed
    (already exists, you'll only add to client/src/features)
```

The Python backend repo is completely new and separate. The React frontend repo already exists — you're only adding a new feature folder to it, nothing else changes.

**Frontend repo — no new repo needed:**
```
exam-software/  (existing)
├── client/     (existing React app)
│   └── src/
│       └── features/
│           └── score-scan/     ← NEW feature folder (add this)
│               ├── api.js
│               ├── UploadForm.jsx
│               ├── ReviewTable.jsx
│               └── ... (see Section 5)
│
└── server/     (existing Node.js backend — DO NOT MODIFY for this feature)
```

This approach means:
- Zero changes to your existing backend code
- Zero breaking changes to any existing features
- Clean separation: Python handles image processing, Node.js handles data
- Easy to remove the feature later if needed — delete one folder from frontend, turn off one Python service

---

## 4. Backend Repository — Project Structure

**Repo name:** `schoolshub-score-scan`

```
schoolshub-score-scan/
├── main.py                  # FastAPI app entry point
├── requirements.txt         # Python dependencies
├── .env                     # Environment variables (never commit this)
├── .env.example             # Template for .env (commit this)
├── .gitignore               # Must include .env, venv/, __pycache__/
├── README.md                # How to run locally, env vars needed
│
├── agents/
│   ├── __init__.py
│   ├── image_processor.py   # OpenCV preprocessing
│   ├── ocr_engine.py        # Tesseract / Google Vision
│   ├── parser.py            # Claude Haiku structured parsing
│   ├── matcher.py           # RapidFuzz name matching
│   ├── payload_builder.py   # Builds review payload for frontend
│   └── write_agent.py       # Calls existing SchoolsHub API
│
├── models/
│   ├── __init__.py
│   ├── upload.py            # Pydantic models for upload request
│   ├── review.py            # Pydantic models for review payload
│   └── commit.py            # Pydantic models for confirmed submission
│
├── utils/
│   ├── __init__.py
│   ├── audit.py             # Audit log writer (Cloudinary + DB)
│   ├── validators.py        # Score range checks, type checks
│   └── schoolshub_client.py # HTTP client for existing SchoolsHub API
│
├── tests/
│   ├── test_ocr.py
│   ├── test_parser.py
│   ├── test_matcher.py
│   └── sample_sheets/       # Real test images go here (gitignored if large)
│
└── scripts/
    └── test_ocr_local.py    # Quick script to test OCR on a single image
```

### Backend `.gitignore`

```gitignore
# Environment
.env
.env.local

# Python
venv/
__pycache__/
*.pyc
*.pyo
*.egg-info/
dist/
build/

# Test images (can be large)
tests/sample_sheets/*.jpg
tests/sample_sheets/*.png

# IDE
.vscode/
.idea/
```

---

## 5. Frontend Repository — Project Structure

**Repo name:** `exam-software` (your existing repo)

You are **not** creating a new frontend repo. You are adding a feature folder to your existing React codebase. All Snap & Upload UI lives under `client/src/features/score-scan/`.

**Important:** The existing `client/src/services/studentResultsApi.js` already has score posting functionality. The score-scan feature will use the teacher's existing authentication token when calling the Python backend, then the Python backend will use that same token to post scores via your existing `/api/student-results` endpoint.

```
exam-software/
├── client/
│   └── src/
│       ├── features/
│       │   ├── results/          # Your existing result processing UI
│       │   └── score-scan/       # ← NEW: everything for Snap & Upload
│       │       ├── index.js      # Exports the main entry component
│       │       ├── UploadForm.jsx
│       │       ├── ReviewTable.jsx
│       │       ├── ReviewRow.jsx
│       │       ├── SuccessScreen.jsx
│       │       ├── score-scan.css
│       │       └── api.js        # ALL HTTP calls to Python backend go here
│       │
│       ├── services/
│       │   └── studentResultsApi.js  # EXISTING — score-scan may also use this
│       │
│       └── ... (rest of your existing frontend)
│
├── server/                        # EXISTING Node.js backend — DO NOT MODIFY
│   └── routes/
│       └── student-results.js     # EXISTING — score-scan calls this, unchanged
│
└── ... (rest of your existing structure)
```

### Why `src/features/score-scan/`

Grouping all Snap & Upload code under one feature folder means:
- If you ever remove the feature, you delete one folder.
- A new developer can find everything related to this feature in one place.
- It never interferes with your existing result processing code.

### The `api.js` File — The Only Place That Knows the Python Backend URL

All HTTP calls to `schoolshub-score-scan` must live in one file: `src/features/score-scan/api.js`. No component should ever have a hardcoded URL or a raw `fetch` call. Everything goes through this file.

```js
// client/src/features/score-scan/api.js

const BASE_URL = process.env.REACT_APP_SCAN_API_URL;

export async function scanSheet(formData, authToken) {
  const response = await fetch(`${BASE_URL}/api/scan-sheet`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${authToken}`,
      // Do NOT set Content-Type manually — browser sets it automatically for FormData
    },
    body: formData,
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Scan failed. Please try again.");
  }
  return response.json();
}

export async function commitScores(payload, authToken) {
  const response = await fetch(`${BASE_URL}/api/commit-scores`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${authToken}`,
      "Content-Type": "application/json" 
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Could not save scores. Please try again.");
  }
  return response.json();
}
```

### Frontend `.env` Setup

Add this to your existing `client/.env`:

```env
# Scan API URL (Python microservice)
REACT_APP_SCAN_API_URL=http://localhost:8000
```

For your production build, create or update `client/.env.production`:

```env
# Production Scan API URL
REACT_APP_SCAN_API_URL=https://your-score-scan-service.onrender.com
```

React automatically uses `.env.production` when you run `npm run build`.

---

## 6. Environment Setup — Backend

### Prerequisites

Install the following on your machine before writing any code:

```bash
# 1. Python 3.11+
python --version   # Should show 3.11 or higher

# 2. Tesseract OCR engine (the actual binary, not the Python library)
# On Ubuntu/Debian:
sudo apt-get install tesseract-ocr

# On macOS:
brew install tesseract

# On Windows:
# Download installer from: https://github.com/UB-Mannheim/tesseract/wiki

# 3. Verify Tesseract works
tesseract --version
```

### Python Virtual Environment

**Always use a virtual environment.** Never install Python packages globally.

```bash
# Create virtual environment in the schoolshub-score-scan repo
python -m venv venv

# Activate it
# On Mac/Linux:
source venv/bin/activate

# On Windows (PowerShell):
venv\Scripts\Activate

# You should see (venv) in your terminal prompt now
```

### Install Dependencies

Create `requirements.txt` in the root of `schoolshub-score-scan/`:

```txt
fastapi==0.111.0
uvicorn==0.29.0
python-multipart==0.0.9
opencv-python==4.9.0.80
pytesseract==0.3.10
Pillow==10.3.0
rapidfuzz==3.9.0
anthropic==0.25.0
httpx==0.27.0
cloudinary==1.40.0
pydantic==2.7.0
python-dotenv==1.0.1
```

```bash
pip install -r requirements.txt
```

### Environment Variables

Create `.env` in the root of `schoolshub-score-scan/` (note: DO NOT commit this file to GitHub):

```env
# Anthropic Claude API
ANTHROPIC_API_KEY=your_key_here

# Cloudinary (audit image storage) — optional, for future enhancement
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_key_here
CLOUDINARY_API_SECRET=your_secret_here

# Your Existing Exam Software Backend
SCHOOLSHUB_API_BASE_URL=https://exam-software-65fk.onrender.com/api
# Or locally: http://localhost:5000/api

# OCR mode: "tesseract" or "google_vision"
OCR_MODE=tesseract

# Google Cloud Vision (only needed if OCR_MODE=google_vision)
# GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account.json

# Confidence thresholds (adjust based on testing with real sheets)
MATCH_AUTO_APPROVE_THRESHOLD=90
MATCH_FLAG_THRESHOLD=65

# Environment
ENV=development
DEBUG=true
```

Also create `.env.example` (commit this to GitHub):

```env
# Anthropic Claude API
ANTHROPIC_API_KEY=

# Cloudinary (audit image storage)
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# Your Existing Exam Software Backend
SCHOOLSHUB_API_BASE_URL=http://localhost:5000/api

# OCR mode: "tesseract" or "google_vision"
OCR_MODE=tesseract

# Google Cloud Vision API credentials (if using Google Vision)
# GOOGLE_APPLICATION_CREDENTIALS=

# Confidence thresholds
MATCH_AUTO_APPROVE_THRESHOLD=90
MATCH_FLAG_THRESHOLD=65

# Environment
ENV=development
DEBUG=true
```

Add `.env` to `.gitignore`:

```gitignore
# Environment
.env
.env.local

# Python
venv/
__pycache__/
*.pyc
*.pyo
*.egg-info/
dist/
build/

# Test images (can be large)
tests/sample_sheets/*.jpg
tests/sample_sheets/*.png

# IDE
.vscode/
.idea/
```

### Critical: Understand Your Backend's Multi-Tenant Setup

Your existing Node.js backend uses:
- **Multi-tenant routing**: Each school is isolated by `school_id` in the database
- **Subdomain support**: `student.schoolname.schoolshubs.com` routes to the same backend
- **JWT authentication**: Every request includes a `Bearer {token}` header
- **Tenant enforcement**: The middleware automatically extracts `schoolId` from the token

**For the Python backend to post scores correctly, it MUST:**
1. Accept the teacher's `Authorization: Bearer {token}` header from the frontend
2. Pass that exact same token to the Node.js API when calling `/api/student-results`
3. Never try to extract school_id directly — let the Node.js API validate it

This is handled in [Section 13 — Write Agent](#13-agent-6--write-agent).

---

## 7. Environment Setup — Frontend

Your React frontend repo (`exam-software/client`) needs one new environment variable to know where the Python backend microservice lives. Everything else in your existing frontend setup stays the same.

### Local Development

When running locally, your Python backend runs on `localhost:8000` and your React app runs on `localhost:3000`. They are on different ports — that is fine and expected.

**In `client/.env` (create if it doesn't exist, or add to your existing one):**

```bash
# Add to your existing client/.env file:
REACT_APP_SCAN_API_URL=http://localhost:8000
```

Your existing variables stay untouched:
```bash
# These already exist in your client/.env
REACT_APP_API_URL=http://localhost:5000/api
PORT=3000
```

### Running All Three Repos Locally at the Same Time

During development you'll have three repos running (or two if you keep server and client together):

```bash
# Terminal 1 — Python backend
cd schoolshub-score-scan
source venv/bin/activate
uvicorn main:app --reload --port 8000

# Terminal 2 — Node.js backend (your existing server)
cd exam-software/server
npm run dev
# Runs on port 5000

# Terminal 3 — React frontend
cd exam-software/client
npm start
# React runs on port 3000, calls:
#   - Python backend on localhost:8000 for scan operations
#   - Node.js backend on localhost:5000 for authentication & score saving
```

### Switching Between Local and Production

The frontend automatically picks the right URL:

```bash
# client/.env — local development
REACT_APP_SCAN_API_URL=http://localhost:8000

# client/.env.production — production build
REACT_APP_SCAN_API_URL=https://your-score-scan-service.onrender.com
```

React automatically uses `.env.production` when you run `npm run build`. You never need to manually change the URL before deploying — it's automatic based on the `NODE_ENV` environment variable.

## 8. Agent 1 — Image Receiver

**Repo:** `schoolshub-score-scan`  
**File:** `main.py` + `agents/image_processor.py`  
**Purpose:** Accept the uploaded image from the React frontend and prepare it for OCR.

### `main.py` — FastAPI Entry Point

```python
from fastapi import FastAPI, UploadFile, File, Form, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from agents.image_processor import preprocess_image
from agents.ocr_engine import extract_text
from agents.parser import parse_ocr_text
from agents.matcher import match_names
from agents.payload_builder import build_review_payload
from agents.write_agent import commit_scores
from models.commit import CommitRequest
from utils.audit import log_upload
import uvicorn

app = FastAPI(title="SchoolsHub Score Scan", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Restrict to your frontend domain in production
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/api/scan-sheet")
async def scan_sheet(
    file: UploadFile = File(...),
    subject: str = Form(...),
    class_name: str = Form(...),
    term: str = Form(...),
    assessment_type: str = Form(...),
    teacher_id: str = Form(...),
):
    # 1. Validate file
    if file.content_type not in ["image/jpeg", "image/png", "image/webp"]:
        raise HTTPException(status_code=400, detail="Only JPEG, PNG or WebP images allowed")

    image_bytes = await file.read()

    if len(image_bytes) > 10 * 1024 * 1024:  # 10MB limit
        raise HTTPException(status_code=400, detail="Image too large. Maximum 10MB.")

    # 2. Preprocess image
    clean_image = preprocess_image(image_bytes)

    # 3. Run OCR
    raw_text = extract_text(clean_image)

    # 4. Parse OCR text into structured data
    parsed_rows = await parse_ocr_text(raw_text)

    # 5. Match names against class roster
    metadata = {
        "subject": subject,
        "class_name": class_name,
        "term": term,
        "assessment_type": assessment_type,
        "teacher_id": teacher_id,
    }
    matched_rows = await match_names(parsed_rows, metadata)

    # 6. Build review payload
    review_payload = build_review_payload(matched_rows, metadata)

    # 7. Log the upload for audit trail
    await log_upload(image_bytes, raw_text, review_payload, metadata)

    return review_payload


@app.post("/api/commit-scores")
async def commit_scores_endpoint(request: CommitRequest):
    result = await commit_scores(request)
    return result


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
```

### `agents/image_processor.py`

```python
import cv2
import numpy as np
from PIL import Image
import io

def preprocess_image(image_bytes: bytes) -> np.ndarray:
    """
    Clean up the image to maximize OCR accuracy.
    Steps: decode → grayscale → denoise → contrast → deskew → threshold
    """
    # Decode bytes to numpy array
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    if img is None:
        raise ValueError("Could not decode image. File may be corrupted.")

    # Convert to grayscale
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # Denoise
    denoised = cv2.fastNlMeansDenoising(gray, h=10)

    # Increase contrast using CLAHE
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    contrasted = clahe.apply(denoised)

    # Deskew (straighten tilted photos)
    deskewed = deskew(contrasted)

    # Adaptive threshold — makes text black on white background
    processed = cv2.adaptiveThreshold(
        deskewed, 255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY, 11, 2
    )

    return processed


def deskew(image: np.ndarray) -> np.ndarray:
    """Straighten a rotated image using moments."""
    coords = np.column_stack(np.where(image > 0))
    if len(coords) < 10:
        return image  # Not enough points to compute angle
    angle = cv2.minAreaRect(coords)[-1]
    if angle < -45:
        angle = -(90 + angle)
    else:
        angle = -angle
    if abs(angle) < 0.5:
        return image  # Already straight enough
    h, w = image.shape[:2]
    center = (w // 2, h // 2)
    M = cv2.getRotationMatrix2D(center, angle, 1.0)
    rotated = cv2.warpAffine(image, M, (w, h), flags=cv2.INTER_CUBIC,
                              borderMode=cv2.BORDER_REPLICATE)
    return rotated
```

---

## 9. Agent 2 — OCR Engine

**Repo:** `schoolshub-score-scan`  
**File:** `agents/ocr_engine.py`  
**Purpose:** Extract raw text from the preprocessed image.

```python
import pytesseract
import numpy as np
import os
from dotenv import load_dotenv

load_dotenv()

OCR_MODE = os.getenv("OCR_MODE", "tesseract")


def extract_text(image: np.ndarray) -> str:
    """
    Extract raw text from preprocessed image.
    Uses Tesseract by default. Switches to Google Vision if configured.
    """
    if OCR_MODE == "google_vision":
        return _extract_with_google_vision(image)
    return _extract_with_tesseract(image)


def _extract_with_tesseract(image: np.ndarray) -> str:
    """Free, self-hosted OCR. Good for printed/typed sheets."""
    # PSM 6: Assumes a single uniform block of text
    # OEM 3: Default engine (LSTM)
    config = "--psm 6 --oem 3"
    text = pytesseract.image_to_string(image, config=config, lang="eng")
    return text.strip()


def _extract_with_google_vision(image: np.ndarray) -> str:
    """Google Cloud Vision. Better for handwritten text."""
    from google.cloud import vision
    import cv2

    client = vision.ImageAnnotatorClient()
    _, buffer = cv2.imencode(".jpg", image)
    content = buffer.tobytes()
    vision_image = vision.Image(content=content)
    response = client.text_detection(image=vision_image)

    if response.error.message:
        raise Exception(f"Google Vision error: {response.error.message}")

    texts = response.text_annotations
    if not texts:
        return ""

    return texts[0].description.strip()
```

---

## 10. Agent 3 — Parser

**Repo:** `schoolshub-score-scan`  
**File:** `agents/parser.py`  
**Purpose:** Turn messy OCR text into a structured list of `{name, score}` objects.

```python
import anthropic
import json
import re
import os
from dotenv import load_dotenv

load_dotenv()

client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

PARSE_PROMPT = """You are a data extraction assistant for a school management system in Nigeria.

You will receive raw OCR text extracted from a handwritten or printed score sheet. 
Your job is to extract every student name and their corresponding score.

Rules:
- Return ONLY a JSON array. No explanation, no markdown, no code blocks.
- Each object must have exactly two keys: "name" (string) and "score" (number or null)
- If a score is illegible or missing, use null for the score
- Fix obvious OCR errors in numbers (e.g. "7B" likely means "78", "lOO" likely means "100")
- Do NOT fix names — return them exactly as OCR gave you, even if misspelled
- Ignore header lines (subject, class, teacher name, date, etc.)
- Ignore row numbers (e.g. "1.", "2." at the start of lines)
- If a score is above 100, still include it — flag it as-is

Example output:
[
  {"name": "John Adebayo", "score": 78},
  {"name": "Amaka Okonkwo", "score": 65},
  {"name": "E. Nwosu", "score": null}
]

OCR Text:
"""


async def parse_ocr_text(raw_text: str) -> list[dict]:
    """
    Parse raw OCR text into structured rows using Claude Haiku.
    Falls back to regex parser if API call fails.
    """
    if not raw_text or len(raw_text.strip()) < 5:
        return []

    try:
        message = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=1000,
            messages=[
                {"role": "user", "content": PARSE_PROMPT + raw_text}
            ]
        )
        response_text = message.content[0].text.strip()
        parsed = json.loads(response_text)

        if not isinstance(parsed, list):
            raise ValueError("Response is not a list")

        return parsed

    except Exception as e:
        # Fallback to regex parser if Claude call fails
        print(f"[Parser] Claude API failed: {e}. Using regex fallback.")
        return _regex_fallback_parser(raw_text)


def _regex_fallback_parser(raw_text: str) -> list[dict]:
    """
    Simple regex parser as fallback.
    Works well for clean printed sheets with consistent formatting.
    Pattern: name followed by a number at end of line.
    """
    results = []
    lines = raw_text.split("\n")

    for line in lines:
        line = line.strip()
        if not line:
            continue

        # Remove leading row numbers like "1." or "1)"
        line = re.sub(r"^\d+[\.\)]\s*", "", line)

        # Match: any text followed by a number (score) at end of line
        match = re.match(r"^(.+?)\s+(\d{1,3})\s*$", line)
        if match:
            name = match.group(1).strip()
            score = int(match.group(2))
            if len(name) > 2:  # Filter out garbage
                results.append({"name": name, "score": score})

    return results
```

---

## 11. Agent 4 — Fuzzy Matcher

**Repo:** `schoolshub-score-scan`  
**File:** `agents/matcher.py`  
**Purpose:** Match each OCR name to a real student ID in the database.

```python
from rapidfuzz import fuzz, process
from utils.schoolshub_client import get_class_roster
import os

AUTO_APPROVE = int(os.getenv("MATCH_AUTO_APPROVE_THRESHOLD", 90))
FLAG_THRESHOLD = int(os.getenv("MATCH_FLAG_THRESHOLD", 65))


async def match_names(parsed_rows: list[dict], metadata: dict) -> list[dict]:
    """
    Match OCR-extracted names to real students in the class roster.
    Returns each row enriched with match data and confidence score.
    """
    # Fetch the class roster from existing SchoolsHub API
    roster = await get_class_roster(
        class_name=metadata["class_name"],
        term=metadata["term"]
    )

    # Build lookup: student_name → student data
    roster_names = [s["name"] for s in roster]
    roster_map = {s["name"]: s for s in roster}

    matched_rows = []

    for row in parsed_rows:
        ocr_name = row.get("name", "")
        score = row.get("score")

        if not ocr_name:
            continue

        match_result = _find_best_match(ocr_name, roster_names, roster_map)

        matched_rows.append({
            "ocr_name": ocr_name,
            "score": score,
            "student_id": match_result["student_id"],
            "matched_name": match_result["matched_name"],
            "confidence": match_result["confidence"],
            "status": _determine_status(match_result["confidence"], score),
            "alternatives": match_result["alternatives"],
        })

    return matched_rows


def _find_best_match(ocr_name: str, roster_names: list, roster_map: dict) -> dict:
    """Find the best fuzzy match for an OCR name in the class roster."""
    if not roster_names:
        return {"student_id": None, "matched_name": None, "confidence": 0, "alternatives": []}

    # Get top 3 matches with scores
    results = process.extract(
        ocr_name,
        roster_names,
        scorer=fuzz.token_sort_ratio,
        limit=3
    )

    if not results:
        return {"student_id": None, "matched_name": None, "confidence": 0, "alternatives": []}

    best_name, best_score, _ = results[0]
    best_student = roster_map.get(best_name, {})

    # Build alternatives list (excluding the top match)
    alternatives = []
    for name, score, _ in results[1:]:
        if score >= FLAG_THRESHOLD:
            student = roster_map.get(name, {})
            alternatives.append({
                "student_id": student.get("id"),
                "name": name,
                "confidence": score
            })

    return {
        "student_id": best_student.get("id"),
        "matched_name": best_name,
        "confidence": best_score,
        "alternatives": alternatives,
    }


def _determine_status(confidence: int, score) -> str:
    """
    Determine the display status for a matched row.
    green = auto-approved
    yellow = needs teacher selection
    red = unmatched, needs manual input
    score_error = score out of valid range
    """
    if score is not None and (score < 0 or score > 100):
        return "score_error"
    if confidence >= AUTO_APPROVE:
        return "green"
    if confidence >= FLAG_THRESHOLD:
        return "yellow"
    return "red"
```

---

## 12. Agent 5 — Validation Payload

**Repo:** `schoolshub-score-scan`  
**File:** `agents/payload_builder.py`  
**Purpose:** Package the matched data into a structured payload the frontend can render.

```python
def build_review_payload(matched_rows: list[dict], metadata: dict) -> dict:
    """
    Build the final review payload sent to the teacher's confirmation screen.
    """
    total = len(matched_rows)
    auto_approved = sum(1 for r in matched_rows if r["status"] == "green")
    needs_review = sum(1 for r in matched_rows if r["status"] in ["yellow", "red", "score_error"])

    return {
        "metadata": metadata,
        "summary": {
            "total_rows": total,
            "auto_approved": auto_approved,
            "needs_review": needs_review,
            "ready_to_submit": needs_review == 0,
        },
        "rows": matched_rows,
    }
```

---

## 13. Agent 6 — Write Agent

**Repo:** `schoolshub-score-scan`  
**File:** `agents/write_agent.py`  
**Purpose:** After teacher confirmation, write scores to the existing exam-software backend via its API.

### Key Understanding

The Python backend DOES NOT connect directly to your PostgreSQL database. Instead:
1. The frontend sends the teacher's JWT token to the Python backend in the Authorization header
2. The Python backend forwards that same token to your Node.js API
3. Your Node.js API validates the token and multi-tenant scope
4. Your Node.js API writes to the database with full audit trail

This ensures:
- No shared database credentials between repos
- Clean separation of concerns
- Your existing auth and multi-tenant logic is reused
- Full audit trail in your database

```python
from utils.schoolshub_client import post_scores_to_api
from utils.audit import log_commit
from models.commit import CommitRequest


async def commit_scores(request: CommitRequest, teacher_token: str) -> dict:
    """
    Write confirmed scores to the existing exam-software backend.
    Only called after the teacher has reviewed and confirmed.
    
    Args:
        request: CommitRequest object with metadata and confirmed rows
        teacher_token: JWT token from the frontend (passed through from the teacher)
    
    Returns:
        dict with success status and message
    """
    confirmed_rows = [
        row for row in request.rows
        if row.student_id is not None and row.score is not None
    ]

    if not confirmed_rows:
        return {"success": False, "message": "No valid rows to commit."}

    # Prepare scores for the existing API
    # The existing endpoint expects individual score entries
    scores_to_post = []
    for row in confirmed_rows:
        scores_to_post.append({
            "student_id": row.student_id,
            "assessment1": row.score if request.metadata.assessment_type == "assessment1" else None,
            "assessment2": row.score if request.metadata.assessment_type == "assessment2" else None,
            "ca_test": row.score if request.metadata.assessment_type == "ca_test" else None,
            "exam_score": row.score if request.metadata.assessment_type == "exam" else None,
        })

    try:
        result = await post_scores_to_api(
            scores=scores_to_post,
            metadata=request.metadata,
            teacher_token=teacher_token
        )

        await log_commit(request, result)

        return {
            "success": result.get("success", False),
            "committed": len(confirmed_rows),
            "skipped": len(request.rows) - len(confirmed_rows),
            "message": result.get("message", "Scores saved successfully.")
        }
    except Exception as e:
        return {
            "success": False,
            "committed": 0,
            "skipped": len(request.rows),
            "message": f"Error saving scores: {str(e)}"
        }
```

### `utils/schoolshub_client.py`

```python
import httpx
import os
from dotenv import load_dotenv

load_dotenv()

SCHOOLSHUB_API_BASE_URL = os.getenv("SCHOOLSHUB_API_BASE_URL")


async def get_class_roster(class_name: str, term: str, teacher_token: str) -> list:
    """
    Fetch the class roster from the existing exam-software API.
    
    The exam-software backend handles multi-tenant isolation via the JWT token.
    We don't need to specify school_id — the token tells the backend which school.
    """
    # The exam-software API returns student results which includes student names and IDs
    # We'll query for the class in the given term to get the roster
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{SCHOOLSHUB_API_BASE_URL}/student-results/class/{class_name}/session/2024/term/{term}",
            headers={"Authorization": f"Bearer {teacher_token}"}
        )
    
    if response.status_code != 200:
        raise Exception(f"Failed to fetch class roster: {response.text}")
    
    results = response.json()
    
    # Extract unique students from results
    students = {}
    for result in results:
        student_id = result.get("student_id")
        if student_id not in students:
            students[student_id] = {
                "id": student_id,
                "name": result.get("student_name", "Unknown"),
                "email": result.get("student_email", ""),
                "admission_number": result.get("admission_number", "")
            }
    
    return list(students.values())


async def post_scores_to_api(scores: list, metadata: dict, teacher_token: str) -> dict:
    """
    Post confirmed scores to the existing exam-software backend.
    
    Each score becomes a student_result record in the database.
    The backend validates:
    - Token is valid
    - Teacher can write for this school/subject
    - Multi-tenant scope is correct
    - All required fields are present
    """
    async with httpx.AsyncClient() as client:
        # POST each score as a new/updated student result
        # The existing endpoint handles the DB transaction and validation
        
        for score in scores:
            payload = {
                "student_id": score["student_id"],
                "subject_name": metadata.subject,
                "class": metadata.class_name,
                "session": metadata.session,  # e.g., "2024"
                "term": metadata.term,  # e.g., "First Term"
                # Set the appropriate score field based on assessment type
                "assessment1": score.get("assessment1"),
                "assessment2": score.get("assessment2"),
                "ca_test": score.get("ca_test"),
                "exam_score": score.get("exam_score"),
                "teacher_comment": score.get("teacher_comment", "")
            }
            
            response = await client.post(
                f"{SCHOOLSHUB_API_BASE_URL}/student-results",
                json=payload,
                headers={"Authorization": f"Bearer {teacher_token}"}
            )
            
            if response.status_code not in [200, 201]:
                raise Exception(f"Failed to post score for student {score['student_id']}: {response.text}")
    
    return {"success": True, "message": "All scores posted successfully"}
```

---

## 14. Frontend — Teacher Review UI

**Repo:** `schoolshub-frontend`  
**Location:** `src/features/score-scan/`  
**Purpose:** The teacher-facing UI that handles upload, review and confirmation.

### Flow

```
UploadForm → (POST /api/scan-sheet) → ReviewTable → (POST /api/commit-scores) → SuccessScreen
```

### Key Components to Build

**`UploadForm.jsx`**
- Dropdown: select subject, class, term, assessment type
- File input (accept="image/*") with camera capture on mobile
- Client-side image compression before upload
- Loading state while processing

**`ReviewTable.jsx`**
- Render each row with colour coding:
  - 🟢 Green row: name and score shown, checkbox auto-ticked
  - 🟡 Yellow row: show matched name + dropdown of alternatives
  - 🔴 Red row: show empty name input, teacher types manually
  - ⚠️ Score error row: show score in red, teacher corrects inline
- "Confirm All & Submit" button — disabled until no red/score-error rows remain
- Row count summary at top: "28 matched automatically · 3 need your input"

**`SuccessScreen.jsx`**
- "32 scores saved for Mathematics — SS2A — CA1"
- Option to upload another sheet

### Sample `ReviewTable.jsx` Structure

```jsx
function ReviewTable({ payload, onConfirm }) {
  const [rows, setRows] = useState(payload.rows);

  const updateRow = (index, field, value) => {
    setRows(prev => prev.map((r, i) =>
      i === index ? { ...r, [field]: value } : r
    ));
  };

  const canSubmit = rows.every(r =>
    r.status !== "red" && r.status !== "score_error"
  );

  return (
    <div>
      <div className="summary">
        {payload.summary.auto_approved} auto-matched ·{" "}
        {payload.summary.needs_review} need review
      </div>
      <table>
        <thead>
          <tr>
            <th>Name on Sheet</th>
            <th>Matched Student</th>
            <th>Score</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <ReviewRow
              key={i}
              row={row}
              index={i}
              onUpdate={updateRow}
            />
          ))}
        </tbody>
      </table>
      <button
        onClick={() => onConfirm(rows)}
        disabled={!canSubmit}
      >
        Confirm All & Submit
      </button>
    </div>
  );
}
```

---

## 15. Audit Logging

**Repo:** `schoolshub-score-scan`  
**File:** `utils/audit.py`

Every upload must be logged — original image, OCR text, and final committed scores. This is your legal protection if any teacher disputes a recorded score.

```python
import cloudinary
import cloudinary.uploader
import os
import json
from datetime import datetime

cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
    api_key=os.getenv("CLOUDINARY_API_KEY"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET")
)


async def log_upload(image_bytes: bytes, raw_text: str, payload: dict, metadata: dict) -> str:
    """
    Store the original image on Cloudinary.
    Store OCR text and payload in your database via the SchoolsHub API.
    Returns an audit_id for reference.
    """
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    folder = f"score_scan/{metadata['class_name']}/{metadata['term']}"
    public_id = f"{folder}/{metadata['subject']}_{timestamp}"

    upload_result = cloudinary.uploader.upload(
        image_bytes,
        public_id=public_id,
        resource_type="image",
        overwrite=False,
    )

    audit_record = {
        "image_url": upload_result["secure_url"],
        "raw_ocr_text": raw_text,
        "metadata": metadata,
        "upload_timestamp": timestamp,
    }

    # TODO: Save audit_record to your existing SchoolsHub DB via API
    # audit_id = await schoolshub_client.post("/api/audit-log", audit_record)

    return upload_result["public_id"]


async def log_commit(request, result: dict):
    """Log the final commit action for the audit trail."""
    # TODO: Update the audit record with the final committed state
    pass
```

---

## 16. Connecting the Two Repositories

This section explains exactly how the Python backend talks to your existing Node.js API — what crosses the boundary, what stays inside each repo.

### The Contract Between Repos

The only things the two repositories share are:
1. **The frontend URL** where the Python backend is deployed
2. **The teacher's JWT token** which proves who is performing the scan operation
3. **The data format** of the two API endpoints (Section 17)

Everything else is independent:
- The Python backend does NOT have your database credentials
- The Python backend does NOT have your Node.js code
- The Node.js backend does NOT have Python code or OCR dependencies
- Each repo can be deployed, scaled, or updated independently

```
exam-software/client (React)
└─ calls Python backend at https://score-scan.onrender.com/api/scan-sheet
   └─ passes Authorization: Bearer {teacher_token}
      └─ teacher_token from localStorage after login to Node.js API

   ↓ (Python backend processes image)

schoolshub-score-scan (Python)
└─ calls exam-software Node.js API at https://exam-software-65fk.onrender.com/api/student-results
   └─ passes Authorization: Bearer {teacher_token}
   └─ Node.js validates token → checks multi-tenant scope → writes to DB

exam-software/server (Node.js)
└─ trusts the teacher_token
└─ enforces multi-tenant isolation
└─ writes to PostgreSQL
```

### Step 1 — Understand Your Token System

When a teacher logs into your frontend, they receive a JWT token stored in `localStorage`. This token:
- Contains the teacher's ID and school ID
- Is validated by your Node.js middleware (`authenticateJWT`)
- Is checked against multi-tenant scope (`enforceMultiTenant`)

The Python backend **must never validate tokens itself**. It must:
1. Accept the token from the React frontend in the Authorization header
2. Forward that exact same token to your Node.js API
3. Let your Node.js API validate it

```python
# In the Python backend's main.py
from fastapi import FastAPI, Header, HTTPException

@app.post("/api/scan-sheet")
async def scan_sheet(
    file: UploadFile,
    subject_name: str,
    class_name: str,
    session: str,
    term: str,
    assessment_type: str,
    authorization: str = Header(None)  # Get the bearer token from header
):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid authorization header")
    
    teacher_token = authorization.replace("Bearer ", "")
    
    # Pass this token to every call to the Node.js API
    # The Node.js API will validate it
    roster = await get_class_roster(
        class_name=class_name,
        term=term,
        teacher_token=teacher_token  # ← Forward the token
    )
    
    # ... rest of processing
```

### Step 2 — Get the Backend URL After Deploying

After you deploy `schoolshub-score-scan` to Render (or your chosen platform), you receive a public URL:

```
https://schoolshub-score-scan.onrender.com
```

This URL is the only thing you copy from the backend repo to the frontend repo. You paste it into the frontend's environment variable.

### Step 3 — Set the URL in the Frontend Repo

```bash
# In exam-software/client/.env.production:
REACT_APP_SCAN_API_URL=https://schoolshub-score-scan.onrender.com

# In exam-software/client/.env (for local development):
REACT_APP_SCAN_API_URL=http://localhost:8000
```

Never hardcode this URL inside any React component. It must always come from `process.env.REACT_APP_SCAN_API_URL` via the `api.js` file defined in Section 5.

### Step 4 — Configure CORS on the Python Backend

The Python backend must explicitly allow requests from your frontend domain. This is configured in `main.py`:

```python
# schoolshub-score-scan/main.py

from fastapi.middleware.cors import CORSMiddleware

ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)
```

In your Render environment variables, set:

```
ALLOWED_ORIGINS=http://localhost:3000,https://exam-software.vercel.app,https://www.schoolshubs.com
```

Multiple origins are comma-separated. You never need to change code — only environment variables — when your frontend domain changes.

### Step 5 — How Authentication Flows

**When a teacher uses the Snap & Upload feature:**

```
1. Teacher logs in to React frontend
   └─ frontend calls Node.js API at /api/auth/login
   └─ Node.js sends back a JWT token
   └─ React stores token in localStorage

2. Teacher goes to score-scan feature
   └─ React reads token from localStorage
   └─ React gets file from file input (user selected a photo)

3. Teacher clicks "Process"
   └─ React uploads image to Python backend
   └─ React includes: Authorization: Bearer {token}
   └─ React also includes: subject_name, class_name, etc. as form fields

4. Python backend receives request
   └─ Extracts Authorization header
   └─ Processes image (OCR, parse, match names)
   └─ To get class roster:
      └─ calls Node.js at GET /api/student-results/class/:class/:session/:term
      └─ includes: Authorization: Bearer {token}
      └─ Node.js validates token, checks multi-tenant scope
      └─ Returns roster filtered to the teacher's school

5. Python backend returns review payload to React
   └─ React shows review table to teacher

6. Teacher corrects any mismatches, clicks "Confirm"
   └─ React sends confirmed rows to Python backend
   └─ React includes: Authorization: Bearer {token} again

7. Python backend writes scores
   └─ For each confirmed row:
      └─ calls Node.js at POST /api/student-results
      └─ includes: Authorization: Bearer {token}
      └─ Node.js validates, writes to PostgreSQL
      └─ Returns success

8. Python backend returns confirmation to React
   └─ React shows success screen
```

### Step 6 — Local Development Workflow

When developing locally, all three services run on different ports. Configure them correctly:

```bash
# In schoolshub-score-scan/.env
SCHOOLSHUB_API_BASE_URL=http://localhost:5000/api
# Or if your server is running on a different port, change this

# In exam-software/client/.env
REACT_APP_SCAN_API_URL=http://localhost:8000
REACT_APP_API_URL=http://localhost:5000/api
```

Test the full flow:
1. Start Node.js server: `npm run dev` in `exam-software/server`
2. Start React frontend: `npm start` in `exam-software/client`
3. Start Python backend: `uvicorn main:app --reload --port 8000` in `schoolshub-score-scan`
4. Log in as a teacher in React
5. Upload a score sheet photo
6. Verify the Python backend can fetch roster and post scores to the Node.js API

### Step 7 — What Never Crosses the Repo Boundary

| ❌ Never share across repos | ✅ Correct approach |
|---|---|
| Database credentials | Python backend has zero DB access; calls Node.js API only |
| Python code | Python backend never imported into React |
| React code | Python backend doesn't know about React; it just returns JSON |
| API secrets | Each repo has its own .env; neither shares with the other |
| Node.js code | Python backend doesn't import any Node.js files |

The **only** things that cross the boundary:
1. Frontend URL (public knowledge)
2. Teacher's JWT token (already public in the browser anyway)
3. JSON requests/responses (defined in Section 17)

---

## 17. API Reference

### Backend-to-Backend: Python Microservice Calls Existing Node.js API

When the Python backend needs to fetch roster data or post scores, it calls the existing exam-software Node.js API using the teacher's JWT token. This section documents those internal calls.

#### GET /api/student-results/class/:class/:session/:term

**Caller:** Python backend (score-scan microservice)  
**Purpose:** Fetch student roster for name matching  
**Authentication:** Bearer {teacher_token}

**Request:**
```
GET /api/student-results/class/SS2A/session/2024/term/First%20Term
Authorization: Bearer {teacher_token}
```

**Response:**
```json
[
  {
    "id": "result_001",
    "student_id": "std_042",
    "student_name": "John Adebayo",
    "student_email": "john@school.edu",
    "admission_number": "ADM042",
    "subject_name": "Mathematics",
    "class": "SS2A",
    "session": "2024",
    "term": "First Term",
    "assessment1": null,
    "assessment2": null,
    "ca_test": null,
    "exam_score": null
  },
  {
    "id": "result_002",
    "student_id": "std_019",
    "student_name": "Emeka Nwosu",
    "student_email": "emeka@school.edu",
    "admission_number": "ADM019",
    "subject_name": "Mathematics",
    "class": "SS2A",
    "session": "2024",
    "term": "First Term",
    "assessment1": null,
    "assessment2": null,
    "ca_test": null,
    "exam_score": null
  }
]
```

#### POST /api/student-results

**Caller:** Python backend (score-scan microservice)  
**Purpose:** Save a single student score  
**Authentication:** Bearer {teacher_token}

**Request:**
```json
POST /api/student-results
Authorization: Bearer {teacher_token}
Content-Type: application/json

{
  "student_id": "std_042",
  "subject_name": "Mathematics",
  "class": "SS2A",
  "session": "2024",
  "term": "First Term",
  "assessment1": 12,
  "assessment2": null,
  "ca_test": null,
  "exam_score": 78,
  "teacher_comment": "Good performance. Scanned from score sheet."
}
```

**Response:**
```json
{
  "id": "result_001",
  "student_id": "std_042",
  "subject_name": "Mathematics",
  "class": "SS2A",
  "session": "2024",
  "term": "First Term",
  "assessment1": 12,
  "assessment2": null,
  "ca_test": null,
  "exam_score": 78,
  "teacher_comment": "Good performance. Scanned from score sheet.",
  "created_at": "2024-05-22T14:30:00Z",
  "school_id": "school_001",
  "teacher_id": "tchr_001"
}
```

---

### Frontend-to-Python-Backend API

These are the two public endpoints of the Python microservice that the React frontend calls directly.

#### `POST /api/scan-sheet`

Accepts an image and sheet metadata. Returns a review payload.

**Request:** `multipart/form-data`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| file | File | Yes | JPEG, PNG or WebP image (max 10MB) |
| subject_name | string | Yes | e.g. "Mathematics" |
| class_name | string | Yes | e.g. "SS2A" |
| session | string | Yes | e.g. "2024" |
| term | string | Yes | e.g. "First Term" |
| assessment_type | string | Yes | e.g. "exam", "ca_test", "assessment1", "assessment2" |
| teacher_token | string | Yes | Teacher's JWT from localStorage — must be passed in Authorization header |

**Request Headers:**
```
POST /api/scan-sheet HTTP/1.1
Authorization: Bearer {teacher_token}
Content-Type: multipart/form-data
```

**Response:** `application/json`

```json
{
  "metadata": {
    "subject_name": "Mathematics",
    "class_name": "SS2A",
    "session": "2024",
    "term": "First Term",
    "assessment_type": "exam"
  },
  "summary": {
    "total_rows": 32,
    "auto_approved": 28,
    "needs_review": 4,
    "ready_to_submit": false
  },
  "rows": [
    {
      "ocr_name": "John Adebayo",
      "score": 78,
      "student_id": "std_042",
      "matched_name": "John Adebayo",
      "confidence": 100,
      "status": "green",
      "alternatives": []
    },
    {
      "ocr_name": "E. Nwosu",
      "score": 82,
      "student_id": "std_019",
      "matched_name": "Emeka Nwosu",
      "confidence": 71,
      "status": "yellow",
      "alternatives": [
        {"student_id": "std_031", "name": "Emmanuel Nwosu", "confidence": 68}
      ]
    },
    {
      "ocr_name": "Unknown Student",
      "score": 65,
      "student_id": null,
      "matched_name": null,
      "confidence": 0,
      "status": "red",
      "alternatives": []
    }
  ]
}
```

**Status Legend:**
- `green`: Auto-approved match (confidence ≥ 90%) — checkbox auto-ticked
- `yellow`: Needs teacher review (confidence 65-89%) — show alternatives dropdown
- `red`: No match found (confidence < 65%) — teacher enters name/ID manually
- `score_error`: Score outside valid range (0-100) — teacher corrects inline

---

#### `POST /api/commit-scores`

Commits confirmed scores to the existing exam-software system.

**Request:** `application/json`

```json
{
  "metadata": {
    "subject_name": "Mathematics",
    "class_name": "SS2A",
    "session": "2024",
    "term": "First Term",
    "assessment_type": "exam"
  },
  "rows": [
    {
      "student_id": "std_042",
      "score": 78,
      "ocr_name": "John Adebayo",
      "matched_name": "John Adebayo"
    },
    {
      "student_id": "std_019",
      "score": 82,
      "ocr_name": "E. Nwosu",
      "matched_name": "Emeka Nwosu"
    }
  ]
}
```

**Request Headers:**
```
POST /api/commit-scores HTTP/1.1
Authorization: Bearer {teacher_token}
Content-Type: application/json
```

**Response:**

```json
{
  "success": true,
  "committed": 32,
  "skipped": 0,
  "message": "32 scores saved successfully."
}
```

**Error Response:**
```json
{
  "success": false,
  "committed": 15,
  "skipped": 17,
  "message": "Error saving some scores: Student not found for ID std_042"
}
```

---

## 18. Testing Strategy

### Phase 1 — Test Before You Code

Before writing any code, run this test manually:

1. Get 10 real score sheets from an actual Nigerian school teacher.
2. Photograph each with a phone (don't adjust lighting, use real conditions).
3. Upload each photo to [vision.cloud.google.com](https://vision.cloud.google.com) (free demo).
4. Copy the OCR output into a text file.
5. Count: what % of names were read correctly? What % of scores?

This data tells you whether to start with Tesseract or go straight to Google Vision.

### Phase 2 — Unit Tests

**`tests/test_ocr.py`**
```python
from agents.image_processor import preprocess_image
from agents.ocr_engine import extract_text
import os

def test_ocr_on_sample_sheet():
    with open("tests/sample_sheets/sheet_01.jpg", "rb") as f:
        image_bytes = f.read()
    processed = preprocess_image(image_bytes)
    text = extract_text(processed)
    assert len(text) > 10, "OCR returned no text"
    assert "78" in text or "65" in text, "Expected scores not found in OCR output"
```

**`tests/test_matcher.py`**
```python
import asyncio
from agents.matcher import _find_best_match

ROSTER = ["John Adebayo", "Amaka Okonkwo", "Emeka Nwosu", "Fatima Bello"]

def test_exact_match():
    result = _find_best_match("John Adebayo", ROSTER, {n: {"id": i} for i, n in enumerate(ROSTER)})
    assert result["confidence"] == 100

def test_partial_name_match():
    result = _find_best_match("E. Nwosu", ROSTER, {n: {"id": i} for i, n in enumerate(ROSTER)})
    assert result["matched_name"] == "Emeka Nwosu"
    assert result["confidence"] >= 65

def test_ocr_typo_match():
    result = _find_best_match("Jhn Adebyo", ROSTER, {n: {"id": i} for i, n in enumerate(ROSTER)})
    assert result["matched_name"] == "John Adebayo"
```

### Phase 3 — End-to-End Manual Test

Before deploying:
1. Run the full microservice locally (`uvicorn main:app --reload`)
2. Use Postman to upload a real sheet photo
3. Check the JSON response — verify names and scores
4. Test the commit endpoint with the response payload
5. Verify the scores appear in your existing SchoolsHub system

---

## 19. Deployment

Deployment happens in three separate steps:
1. Create and deploy the Python backend to Render (new)
2. Deploy the frontend with the new environment variable (update existing)
3. NO changes needed to the existing Node.js backend — it already has all endpoints

### Part A — Deploy the Python Backend Repo (`schoolshub-score-scan`)

#### Step 1 — Push Backend to GitHub

```bash
# Inside schoolshub-score-scan/
git init
git add .
git commit -m "feat: initial score-scan microservice"
git remote add origin https://github.com/YOUR_USERNAME/schoolshub-score-scan.git
git push -u origin main
```

#### Step 2 — Deploy Backend to Render

1. Go to [render.com](https://render.com) and sign in with GitHub
2. Click **New → Web Service**
3. Connect the `schoolshub-score-scan` repository
4. Configure the service:
   - **Name:** `schoolshub-score-scan` (or whatever you prefer)
   - **Environment:** Python 3
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - **Plan:** Free tier works for testing; upgrade if needed for production
5. Under **Environment Variables**, add every key from `.env.example` with real values:
   - `ANTHROPIC_API_KEY` (from Anthropic console)
   - `SCHOOLSHUB_API_BASE_URL=https://exam-software-65fk.onrender.com/api` (your existing Node.js backend URL)
   - `OCR_MODE=tesseract`
   - `MATCH_AUTO_APPROVE_THRESHOLD=90`
   - `MATCH_FLAG_THRESHOLD=65`
   - `ALLOWED_ORIGINS=http://localhost:3000,https://exam-software.vercel.app` (your frontend domain)
   - `ENV=production`
   - Optionally: Cloudinary keys if using audit image storage
6. Click **Deploy**

Render builds and gives you a live URL:
```
https://schoolshub-score-scan.onrender.com
```

#### Step 3 — Verify the Backend is Live

Open Postman and test:
```
POST https://schoolshub-score-scan.onrender.com/api/scan-sheet
```

Using Postman:
- Create a **POST** request to the URL above
- Set Authorization header: `Bearer {any_valid_teacher_token_from_your_system}`
- In Body → form-data, add:
  - `file`: Upload a real score sheet photo
  - `subject_name`: "Mathematics"
  - `class_name`: "SS2A"
  - `session`: "2024"
  - `term`: "First Term"
  - `assessment_type`: "exam"

Confirm you get a valid JSON response with matched rows before proceeding.

---

### Part B — Deploy the Frontend Repo (`exam-software`)

**No new deployment is needed if you're deploying to the same Vercel/Netlify instance.** Just update the `.env.production` file:

#### Step 4 — Add the Backend URL to Frontend Environment

In your `exam-software/client/.env.production`:

```bash
# Add this line (keep your existing variables)
REACT_APP_SCAN_API_URL=https://schoolshub-score-scan.onrender.com

# Your existing variables stay the same
REACT_APP_API_URL=https://exam-software-65fk.onrender.com/api
```

Commit this file:

```bash
git add client/.env.production
git commit -m "feat: add score-scan backend URL for production"
git push
```

#### Step 5 — Redeploy Frontend

Your CI/CD pipeline should automatically redeploy when you push to `main`. If deploying manually:

**If using Vercel:**
- Go to your Vercel project settings → **Environment Variables**
- Add `REACT_APP_SCAN_API_URL` with value `https://schoolshub-score-scan.onrender.com`
- Redeploy

**If using Netlify:**
- Go to Site Settings → **Build & Deploy → Environment**
- Add `REACT_APP_SCAN_API_URL` with value `https://schoolshub-score-scan.onrender.com`
- Redeploy

**If deploying your own way:**
- Ensure `.env.production` is loaded during build
- Run `npm run build` (React automatically uses `.env.production`)
- Deploy the `build/` directory

#### Step 6 — NO Changes to Existing Node.js Backend

Your existing Node.js backend at `exam-software-65fk.onrender.com` needs **zero changes**. The endpoints already exist:
- `GET /api/student-results/class/:class/:session/:term` — already working
- `POST /api/student-results` — already working

Just make sure your Render environment variables are correct (they should already be):
- `SCHOOLSHUB_API_BASE_URL` should match your Node.js backend URL
- All existing Node.js env vars stay the same

#### Step 7 — Smoke Test End-to-End

After all three are deployed:

1. Open your frontend in a browser: `https://exam-software.vercel.app`
2. Log in as a teacher
3. Navigate to the Score Scan feature (you'll add this UI in the frontend)
4. Upload a real score sheet photo
5. Verify the review table loads with matched rows
6. Make any corrections needed
7. Click confirm
8. Verify scores appear in the existing teacher result dashboard

If step 7 fails, check:
- The Python backend logs on Render
- The Node.js backend logs on Render
- CORS headers: is `ALLOWED_ORIGINS` correct on the Python backend?
- Auth token: is it being passed correctly to the Python backend?
- API URL: is `REACT_APP_SCAN_API_URL` correct?

---

### Deployment Summary

| Service | Platform | Status | Triggers |
|---------|----------|--------|----------|
| exam-software backend (Node.js) | Render | Existing — no changes | Already deployed |
| exam-software frontend (React) | Vercel/Netlify | Update .env.production | Auto-deploys on push |
| schoolshub-score-scan (Python) | Render | NEW — deploy now | Set up auto-deploy from GitHub |

Each repo deploys independently. A push to the Python repo never triggers a frontend redeploy, and vice versa. The three can be updated in any order without breaking anything.

---

### Deployment Summary

| Repo | Platform | Triggers |
|------|----------|---------|
| `schoolshub-score-scan` | Render | Auto-deploys on push to `main` |
| `schoolshub-frontend` | Vercel / your host | Auto-deploys on push to `main` |

Each repo deploys independently. A push to the backend repo never triggers a frontend redeploy, and vice versa.

---

## 20. Errors to Avoid

This section documents the most common and costly mistakes when building this feature. Study this before you write code.

---

### ❌ ERROR 01 — Writing Directly to the Database

**Mistake:** Connecting the score-scan microservice directly to your PostgreSQL/MongoDB database and writing scores without going through your existing API.

**Why it's dangerous:** A bug in the new code can corrupt or duplicate records across your entire school dataset with no safeguard.

**Correct approach:** The score-scan service must ONLY call your existing SchoolsHub API endpoints to write data. Never give the new microservice direct database credentials.

---

### ❌ ERROR 02 — Committing Scores Without Teacher Confirmation

**Mistake:** Auto-committing scores as soon as OCR + matching finishes, skipping the review screen.

**Why it's dangerous:** OCR makes mistakes. A "78" misread as "18" silently poisons a student's result. The teacher has no way to know.

**Correct approach:** The `/api/scan-sheet` endpoint ONLY returns a payload for review. The `/api/commit-scores` endpoint ONLY fires after the teacher explicitly clicks "Confirm." These are two separate endpoints, always.

---

### ❌ ERROR 03 — Matching Names Against the Whole School

**Mistake:** Running fuzzy matching against all students in the database instead of only the students in the specific class.

**Why it's dangerous:** "Amaka Okonkwo" in SS2A might score 88% confidence against "Amaka Okonkwo-Peters" in JSS1C. Wrong student gets the score.

**Correct approach:** Always scope the match pool to the specific class_name AND term passed in the upload metadata. The roster should never contain more than 40–50 names.

---

### ❌ ERROR 04 — Ignoring OCR Preprocessing

**Mistake:** Sending the raw phone photo straight to Tesseract without preprocessing.

**Why it's dangerous:** Phone photos have glare, shadows, rotation, and low contrast. Tesseract accuracy on raw photos can drop to 40–50%. After preprocessing it typically reaches 80–90%.

**Correct approach:** Always run `preprocess_image()` first — grayscale, denoise, CLAHE contrast, deskew, adaptive threshold. This step is not optional.

---

### ❌ ERROR 05 — Committing Partial Data (Non-Atomic Writes)

**Mistake:** Sending each confirmed score as a separate API call. If the network drops mid-way, you get half the class saved and half missing.

**Why it's dangerous:** Teacher sees "done," but 15 students are missing scores. They don't know which ones.

**Correct approach:** Send all confirmed scores as a single batch API call. Your existing backend should wrap the insert in a database transaction — all rows succeed or all fail with a clear error message.

---

### ❌ ERROR 06 — Skipping the Audit Log

**Mistake:** Not saving the original photo and OCR output anywhere.

**Why it's dangerous:** A teacher disputes a score six weeks later. "The system entered 42, I wrote 82." Without the original photo, you have no way to resolve it.

**Correct approach:** Every upload must save: the original image (Cloudinary), the raw OCR text, the matched payload, and the final committed scores — all linked to one `audit_id`.

---

### ❌ ERROR 07 — Not Handling the Claude API Failure Gracefully

**Mistake:** If the Claude Haiku API call fails (network error, rate limit, invalid key), the entire scan fails with an unhandled exception.

**Why it's dangerous:** Teachers in rural areas on unstable internet will hit this often. The whole feature becomes unusable.

**Correct approach:** Always wrap the Claude API call in a try/except. Fall back to the regex parser if it fails. Log the failure but let the flow continue.

---

### ❌ ERROR 08 — Using WidthType.PERCENTAGE or Forgetting Virtual Environment

**Mistake (Python-specific):** Running `pip install` without activating your virtual environment, installing packages globally, then deploying to Render and finding the packages aren't available.

**Why it's dangerous:** Hours of confusing debugging. Your local code works; deployed code crashes with `ModuleNotFoundError`.

**Correct approach:** Always activate `venv` before installing anything. Always run `pip freeze > requirements.txt` before pushing to GitHub.

---

### ❌ ERROR 09 — Accepting Any Uploaded File Type

**Mistake:** Not validating the uploaded file's content type, allowing PDFs, videos, or corrupted files to reach the OCR engine.

**Why it's dangerous:** OpenCV and Tesseract will crash with confusing errors on non-image files.

**Correct approach:** Check `file.content_type` at the very start of the endpoint. Only accept `image/jpeg`, `image/png`, `image/webp`. Reject everything else with a clear 400 error.

---

### ❌ ERROR 10 — Hardcoding API Keys in Source Code

**Mistake:** Writing `api_key = "sk-ant-..."` directly in your Python files and pushing to GitHub.

**Why it's dangerous:** GitHub scans public repos for exposed API keys automatically. Anthropic will revoke your key within minutes. Worse — you may be billed for someone else's usage.

**Correct approach:** All secrets go in `.env`. `.env` goes in `.gitignore`. Only `.env.example` (with empty placeholder values) is committed. Always.

---

### ❌ ERROR 11 — Building Without Real Test Data

**Mistake:** Testing only with clean, perfectly formatted sample sheets you create yourself. Deploying to real schools and discovering that actual handwriting breaks everything.

**Why it's dangerous:** Real teacher handwriting varies dramatically. Real lighting conditions vary. What works on your desk photo will fail on a dimly-lit rural classroom sheet.

**Correct approach:** Collect at least 20 real score sheets from 3 different teachers before finalising the OCR pipeline. Test ugly, smudged, rotated, badly-lit photos. Build for the worst case, not the best.

---

### ❌ ERROR 12 — Setting CORS to Wildcard in Production

**Mistake:** Leaving `allow_origins=["*"]` in your FastAPI CORS config when you deploy to production.

**Why it's dangerous:** Any website on the internet can call your API and potentially trigger score processing requests.

**Correct approach:** Use the `ALLOWED_ORIGINS` environment variable pattern shown in Section 16. Set it explicitly in Render's environment variables to your frontend's domain only. Use `["*"]` only during local development.

---

### ❌ ERROR 13 — Hardcoding the Backend URL Inside React Components

**Mistake:** Writing `fetch("https://schoolshub-score-scan.onrender.com/api/scan-sheet", ...)` directly inside `UploadForm.jsx` or any other component.

**Why it's dangerous:** When your backend URL changes (it will — Render free tier URLs change, you may move hosts), you have to hunt through every component file to update it. One missed instance breaks silently.

**Correct approach:** The backend URL lives in exactly one place: the `REACT_APP_SCAN_API_URL` environment variable, read only through `src/features/score-scan/api.js`. Every component calls `scanSheet()` from `api.js` — never `fetch()` directly.

---

### ❌ ERROR 14 — Putting Secrets in the Frontend Repo

**Mistake:** Adding `ANTHROPIC_API_KEY`, `CLOUDINARY_API_SECRET`, or `SCHOOLSHUB_API_SECRET` to the frontend's `.env` file thinking they'll stay private.

**Why it's dangerous:** Any environment variable starting with `REACT_APP_` is bundled into the JavaScript that ships to the browser. Anyone who opens DevTools → Sources can read it. Your API keys become public.

**Correct approach:** All secrets live exclusively in the `schoolshub-score-scan` backend repo's environment (Render's environment variables). The frontend repo's `.env` files contain only the backend's public URL — which is not a secret.

---

### ❌ ERROR 15 — Building the Frontend Before the Backend API is Working

**Mistake:** Starting to build `ReviewTable.jsx` and `UploadForm.jsx` before `/api/scan-sheet` returns real data.

**Why it's dangerous:** You end up building UI around assumptions about the response shape. When the real API returns slightly different JSON keys, you have to rewrite half the frontend.

**Correct approach:** Build and test the backend API in Postman first. Only when `/api/scan-sheet` reliably returns the correct JSON shape do you open the frontend repo and start building components. The API contract in Section 17 is the spec — backend must match it exactly before frontend work begins.

---

### ❌ ERROR 16 — Forgetting to Test CORS Before Assuming It Works

**Mistake:** Deploying both repos and then discovering CORS errors in the browser console that block every API call.

**Why it's dangerous:** CORS errors look alarming, are confusing to debug for beginners, and can waste a full day if you don't know where to look.

**Correct approach:** After deploying the backend to Render, test CORS immediately by making a `fetch` call from your local React app (running on `localhost:3000`) to the live Render URL. If it fails with a CORS error, fix `ALLOWED_ORIGINS` in Render's environment variables before writing any more frontend code. The fix is always one environment variable change, not a code change.

---

### ❌ ERROR 17 — Not Forwarding the Teacher's Token to the Existing API

**Mistake:** The Python backend receives the teacher's token but tries to create its own token or authentication mechanism instead of forwarding the existing token to your Node.js API.

**Why it's dangerous:** The Node.js API won't recognize the new token. Requests will be rejected with 401. Teachers won't be able to save scores. You lose the audit trail of which teacher posted the scores.

**Correct approach:** The Python backend should be completely stateless regarding authentication. Accept the teacher's token from the React frontend, validate it (optional — the Node.js API will do this), and forward the exact same token to every call to the Node.js API.

```python
# schoolshub-score-scan/main.py — CORRECT APPROACH
@app.post("/api/scan-sheet")
async def scan_sheet(
    authorization: str = Header(None)  # Extract from header
):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing authorization header")
    
    teacher_token = authorization.replace("Bearer ", "")
    
    # Pass token to every Node.js API call
    roster = await get_class_roster(
        class_name=class_name,
        teacher_token=teacher_token  # ← Forward it
    )
```

---

### ❌ ERROR 18 — Connecting Python Backend Directly to PostgreSQL

**Mistake:** The Python backend gets the PostgreSQL connection string from `.env` and queries the database directly instead of calling the Node.js API.

**Why it's dangerous:**
- Bypasses Node.js middleware (auth, multi-tenant, audit logging)
- A bug in Python code can corrupt data with no audit trail
- If database schema changes, Python code breaks while Node.js still works
- Violates the two-repo separation principle

**Correct approach:** The Python backend has ZERO database credentials. It never imports your database code. Always call the Node.js API via HTTP, passing the teacher's token.

```python
# ❌ WRONG - Direct DB access
import psycopg2
conn = psycopg2.connect(os.getenv("DATABASE_URL"))
cursor.execute("SELECT * FROM student_results WHERE class = %s", (class_name,))

# ✅ CORRECT - Call Node.js API
response = await client.get(
    f"{SCHOOLSHUB_API_BASE_URL}/student-results/class/{class_name}/...",
    headers={"Authorization": f"Bearer {teacher_token}"}
)
```

---

### ❌ ERROR 19 — Forgetting Multi-Tenant Scope in API Calls

**Mistake:** The Python backend calls the Node.js API but doesn't consider that results should be filtered by school.

**Why it's dangerous:** Teacher A in School X might see/modify scores from School Y. Data leak across school boundaries.

**Correct approach:** Let the Node.js API handle multi-tenant scope. By passing the teacher's JWT token, the Node.js middleware automatically extracts `school_id` and filters results. Python doesn't need to think about school isolation.

```python
# ✅ CORRECT - Node.js middleware handles multi-tenancy
roster = await client.get(
    f"{SCHOOLSHUB_API_BASE_URL}/student-results/class/{class_name}/...",
    headers={"Authorization": f"Bearer {teacher_token}"}
    # Node.js middleware automatically:
    # 1. Validates token
    # 2. Extracts school_id from token
    # 3. Filters to that school_id only
)
```

---

### ❌ ERROR 20 — Hardcoding the Node.js API URL in Python Code

**Mistake:** Writing `SCHOOLSHUB_API_BASE_URL = "https://exam-software-65fk.onrender.com/api"` directly in Python source files.

**Why it's dangerous:** When the backend URL changes or you deploy to a different environment, you must modify and redeploy the Python code. Every URL change requires a rebuild.

**Correct approach:** Always load the API base URL from `.env`. This lets you change it without redeploying code.

```python
# ✅ CORRECT
SCHOOLSHUB_API_BASE_URL = os.getenv("SCHOOLSHUB_API_BASE_URL")

# In schoolshub-score-scan/.env:
SCHOOLSHUB_API_BASE_URL=https://exam-software-65fk.onrender.com/api
```

---

## 21. Cost Reference

| Service | Repo | Free Tier | Cost After Free |
|---------|------|-----------|-----------------|
| Tesseract OCR | Backend | Unlimited (self-hosted) | ₦0 forever |
| RapidFuzz | Backend | Unlimited (self-hosted) | ₦0 forever |
| OpenCV | Backend | Unlimited (self-hosted) | ₦0 forever |
| Claude Haiku API | Backend | Pay-per-use | ~₦0.50 per sheet |
| Google Cloud Vision | Backend | 1,000 images/month | ~₦2.40 per 1,000 after |
| Cloudinary | Backend | 25GB storage | Free at startup scale |
| Render (backend hosting) | Backend | 1 free service | $7/month when scaling |
| Vercel / Netlify (frontend) | Frontend | Free for hobby | Free at startup scale |
| GitHub | Both | Unlimited private repos | ₦0 |
| **Total at 500 sheets/month** | | | **~₦250 – ₦800/month** |

---

## Build Order Checklist

Follow this order. Do not skip steps. Complete the backend repo fully before opening the frontend repo.

**Backend Repo — `schoolshub-score-scan`**
- [ ] Create the GitHub repo and initialise locally
- [ ] Collect 20 real score sheet photos from actual teachers
- [ ] Test OCR manually on those photos (Google Vision free demo)
- [ ] Set up Python virtual environment and install dependencies
- [ ] Create `.env` from `.env.example`, fill in real values
- [ ] Build and test `image_processor.py` on your sample photos
- [ ] Build and test `ocr_engine.py` — verify Tesseract extracts text correctly
- [ ] Build and test `parser.py` — verify Claude Haiku returns clean JSON
- [ ] Build and test `matcher.py` — verify confidence scores make sense on real Nigerian names
- [ ] Build `main.py` — wire all agents together
- [ ] Test the full pipeline end-to-end with Postman using a real photo
- [ ] Verify `/api/scan-sheet` returns the correct JSON shape from Section 17
- [ ] Push to GitHub and deploy backend to Render
- [ ] Test the live Render URL with Postman — confirm it works

**Frontend Repo — `schoolshub-frontend`**
- [ ] Add `REACT_APP_SCAN_API_URL` to `.env` (localhost) and `.env.production` (Render URL)
- [ ] Create `src/features/score-scan/api.js` with `scanSheet()` and `commitScores()`
- [ ] Build `UploadForm.jsx` — dropdowns, file input, compression, loading state
- [ ] Build `ReviewRow.jsx` — single row with green/yellow/red logic
- [ ] Build `ReviewTable.jsx` — full table with summary and confirm button
- [ ] Build `SuccessScreen.jsx`
- [ ] Test CORS: call live Render URL from local React app, fix if needed
- [ ] Test end-to-end locally: upload → review → confirm → verify scores in existing system
- [ ] Deploy frontend
- [ ] Test end-to-end on production with a real teacher watching
- [ ] Pilot with 2–3 schools before wider rollout

---

*SchoolsHub · score-scan · v2.0 · Two repos, one API contract, zero shortcuts on the confirmation step.*
