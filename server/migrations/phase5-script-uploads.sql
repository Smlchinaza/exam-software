-- Migration: create script_uploads table
-- Adds table to store teacher and school-admin script uploads for review
CREATE TABLE IF NOT EXISTS script_uploads (
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
CREATE INDEX IF NOT EXISTS idx_script_uploads_school_status ON script_uploads (school_id, status);
CREATE INDEX IF NOT EXISTS idx_script_uploads_created_at ON script_uploads (created_at);