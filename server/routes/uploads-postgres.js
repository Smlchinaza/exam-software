const express = require('express');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const ScriptUpload = require('../models/ScriptUploadPostgres');
const storage = require('../utils/storage');

const { authenticateJWT, requireRole } = require('../middleware/auth');

const router = express.Router();

const upload = multer({ storage: multer.memoryStorage() });

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'application/pdf'];
const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10MB

// POST /api/uploads
router.post('/', upload.array('files'), async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    let user = null;
    if (token) {
      try { user = require('jsonwebtoken').verify(token, process.env.JWT_SECRET); } catch (e) { user = null; }
    }

    const { school_id: schoolId } = req.body;
    if (!schoolId) return res.status(400).json({ error: 'school_id is required' });

    const files = req.files || [];
    if (files.length === 0) return res.status(400).json({ error: 'No files uploaded' });

    // Determine uploader type
    const uploaderRole = user?.user?.role || user?.role || null;
    const isSchoolAdmin = uploaderRole === 'school_admin';

    // Teacher rate limit: 2 files per rolling 1 hour per school_id + ip
    if (!isSchoolAdmin) {
      const existing = await ScriptUpload.countTeacherUploadsForWindow(schoolId, req.ip, 60);
      if (existing + files.length > 2) {
        return res.status(429).json({ error: 'Teacher upload limit exceeded (2 files per hour)' });
      }
    }

    const created = [];
    for (const f of files) {
      if (!ALLOWED_MIME.includes(f.mimetype)) {
        return res.status(400).json({ error: `Invalid file type: ${f.originalname}` });
      }
      if (f.size > MAX_FILE_BYTES) {
        return res.status(400).json({ error: `File too large: ${f.originalname}` });
      }

      const id = uuidv4();
      const safeName = `${id}_${f.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      const dest = `uploads/script_uploads/${schoolId}/${safeName}`;

      await storage.saveBufferToPath(f.buffer, dest);

      const record = await ScriptUpload.create({
        schoolId,
        uploaderType: isSchoolAdmin ? 'school_admin' : 'teacher',
        uploaderId: isSchoolAdmin ? (user?.user?.id || user?.id) : null,
        uploaderIp: req.ip,
        filePath: dest,
        fileName: f.originalname,
        mimeType: f.mimetype,
        sizeBytes: f.size,
        status: 'pending'
      });

      created.push({ id: record.id, status: record.status, file: record.file_name });
    }

    return res.status(202).json({ uploads: created });
  } catch (error) {
    console.error('Upload error', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

// Super-admin review endpoints
// GET /api/uploads?status=pending&school_id=...
router.get('/', authenticateJWT, requireRole('super_admin'), async (req, res) => {
  try {
    const { status = 'pending', school_id: schoolId, page = 1, limit = 20 } = req.query;
    if (status === 'pending') {
      const result = await ScriptUpload.findPending({ schoolId, page: parseInt(page, 10), limit: parseInt(limit, 10) });
      return res.json(result);
    }
    return res.status(400).json({ error: 'Only status=pending is supported in this endpoint' });
  } catch (err) {
    console.error('List pending uploads error', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/uploads/:id
router.get('/:id', authenticateJWT, requireRole('super_admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const upload = await ScriptUpload.findById(id);
    if (!upload) return res.status(404).json({ error: 'Upload not found' });
    // For now return file_path; presigned URL can be added if external storage used
    return res.json(upload);
  } catch (err) {
    console.error('Get upload error', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/uploads/:id/approve
router.post('/:id/approve', authenticateJWT, requireRole('super_admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const reviewerId = req.user?.user?.id || req.user?.id;
    const updated = await ScriptUpload.approve(id, reviewerId);
    return res.json(updated);
  } catch (err) {
    console.error('Approve upload error', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/uploads/:id/reject
router.post('/:id/reject', authenticateJWT, requireRole('super_admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    if (!reason) return res.status(400).json({ error: 'reason is required' });
    const reviewerId = req.user?.user?.id || req.user?.id;
    const updated = await ScriptUpload.reject(id, reviewerId, reason);
    return res.json(updated);
  } catch (err) {
    console.error('Reject upload error', err);
    res.status(500).json({ error: err.message });
  }
});
