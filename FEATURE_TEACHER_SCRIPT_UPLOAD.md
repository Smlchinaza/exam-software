# Teacher Script Upload Feature

## Summary

Allow teachers to upload script images (e.g., scanned answer scripts) for review by a super admin. Teachers do not need to authenticate to upload, but must select their school. Uploads are reviewed and then accepted or rejected by a super admin. School admins can upload multiple images at once; teachers are limited to 2 uploads per hour.

## Goals

- Provide a simple, low-friction upload flow for teachers on the public homepage.
- Provide a school-admin upload UI for bulk uploads in the admin dashboard.
- Implement a review workflow for super admins to accept or reject uploads.
- Prevent abuse by rate-limiting unauthenticated teacher uploads (2 images per hour).

## High-level user flows

1. Teacher upload (public):
   - On the public homepage a `Upload Script` button opens a modal.
   - Teacher selects a school (required) and one or two image files (jpg/png/pdf allowed).
   - Submit -> backend validates, stores image(s) as `pending` and returns success.
   - Super admins receive a notification/listing and can approve or reject with an optional reason.

2. School admin upload (authenticated):
   - In the school admin dashboard, an `Upload Scripts` control allows multi-select of many files.
   - Authenticated school admins may upload any number of images in a single operation (subject to storage/policy limits).
   - Files created by admins are marked as `pending` (or optionally auto-approved depending on business rule).

3. Super admin review:
   - Super admin UI lists `pending` uploads with school, uploader type (teacher/admin), upload time, and thumbnails.
   - Super admin can `Approve` or `Reject` (provide reason). Approved items move to `approved` state and become available where needed.

## Constraints & Decisions

- Teacher uploads are unauthenticated by design. Rate limiting will be applied by IP and optionally by a short-lived cookie to reduce accidental double-counting.
- School must be selected; school IDs are validated server-side.
- Allowed file types: `image/jpeg`, `image/png`, `application/pdf`.
- Individual file max size: 10 MB (adjustable).
- Storage: use existing object storage (S3/MinIO) or local filesystem if not available. Store metadata in DB.

## Data model (proposed)

Table: `script_uploads`

- `id` (uuid, PK)
- `school_id` (uuid, FK -> schools)
- `uploader_type` (enum: `teacher`, `school_admin`)
- `uploader_id` (nullable uuid) — populated for authenticated uploads (school_admin user id); null for teacher uploads
- `uploader_ip` (string, nullable)
- `file_path` (string) — storage key / URL
- `file_name` (string)
- `mime_type` (string)
- `size_bytes` (int)
- `status` (enum: `pending`, `approved`, `rejected`)
- `rejection_reason` (text, nullable)
- `reviewed_by` (nullable uuid) — super admin id
- `created_at`, `updated_at`, `reviewed_at`

Indexes:
- index on `school_id, status` for admin lists
- index on `created_at` for retention/cleanup

## API contract (backend)

1. POST /api/uploads
   - Auth: optional. If request includes an Authorization token with a valid admin user, `uploader_type` inferred as `school_admin`.
   - Content-Type: `multipart/form-data`
   - Body:
     - `school_id` (required)
     - `files[]` (one or more files)
   - Behavior:
     - If no auth or role != school_admin, treat as `teacher` upload and enforce rate limit (max 2 files total per rolling 1 hour period per IP + school_id).
     - Validate school exists. Validate file types and sizes.
     - Store files in object storage and create `script_uploads` rows with `status = pending`.
   - Response: 202 Accepted with list of created upload ids and statuses.

2. GET /api/uploads?status=pending&school_id=... (super admin only)
   - Returns paginated pending uploads for review.

3. GET /api/uploads/:id (super admin only)
   - Returns metadata and a presigned URL for the file for viewing.

4. POST /api/uploads/:id/approve (super admin only)
   - Body: optional metadata
   - Action: set `status=approved`, `reviewed_by`, `reviewed_at`.

5. POST /api/uploads/:id/reject (super admin only)
   - Body: `reason` (required)
   - Action: set `status=rejected`, `rejection_reason`, `reviewed_by`, `reviewed_at`.

## Rate limiting & abuse prevention

- Teachers (unauthenticated): limit to 2 uploaded files per rolling 1-hour window per key. Keying strategy:
  - Primary: `school_id + uploader_ip`
  - Secondary (optional): short-lived cookie to handle NAT/shared IP situations
- School admin uploads bypass the teacher rate limit when authenticated and authorized.
- Implement monitoring and alerting for high-volume upload patterns.

## Frontend changes

- Homepage (public): add `Upload Script` button (visible to unauthenticated users). Opens modal with:
  - School select (searchable dropdown)
  - File input (accepts multiple but enforce max 2 for teachers)
  - Visual validation, file list, and submit button
  - Show helpful copy: accepted formats, max size, teacher upload limits, and review explanation
- School admin dashboard: add `Upload Scripts` page/section allowing multi-file selection, bulk upload, progress UI, and per-file status.
- Super admin review UI: add list view with filters, preview modal with full-size image, approve/reject buttons, and rejection reason input.

## Notifications

- On new pending uploads, optionally notify super admins via email or in-app notification.

## Acceptance criteria

- Teachers can select a school and upload up to 2 images/hour from the homepage without logging in.
- School admins can upload any number of images in the admin dashboard while authenticated.
- Files are stored and represented in `script_uploads` with `pending` status after upload.
- Super admins can view pending uploads and approve or reject with reasons.
- Teacher rate limits enforced and tested.

## Migration example (SQL)

```sql
CREATE TABLE script_uploads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id),
  uploader_type text NOT NULL,
  uploader_id uuid NULL,
  uploader_ip text NULL,
  file_path text NOT NULL,
  file_name text NOT NULL,
  mime_type text NOT NULL,
  size_bytes bigint NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  rejection_reason text NULL,
  reviewed_by uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz NULL
);
CREATE INDEX ON script_uploads (school_id, status);
CREATE INDEX ON script_uploads (created_at);
```

## Tests to add

- Unit tests: validate upload handler enforces file type and size.
- Integration tests: POST /api/uploads for teacher behavior (rate limiting), admin behavior (bypass limit).
- E2E: homepage upload modal flow and admin dashboard upload.

## Tasks & estimates

- Spec (this document): 0.5 day
- DB schema + migration: 0.5 day
- Backend endpoints + storage: 2 days
- Rate-limiter and abuse prevention: 1 day
- Frontend homepage teacher upload: 1 day
- Frontend school-admin upload UI: 1 day
- Super admin review UI: 1 day
- Tests & QA: 1 day
- Docs & deploy: 0.5 day

Total: ~8–9 days (single developer) — can be parallelized across frontend/backend engineers to shorten calendar time.

## Open questions / options

- Should super admins receive email notifications on each upload, or only a digest?
- For unauthenticated teachers, do we want to capture any additional metadata (teacher name, class, phone) optionally on upload?
- Should school admin uploads be auto-approved, or always require super-admin review?

---

If you'd like, I can now:

- Implement the DB migration and backend endpoints, or
- Add frontend modal and dashboard UI components, or
- Wire up a basic review UI for super admins.

Which should I do next?
