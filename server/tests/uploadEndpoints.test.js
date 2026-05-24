const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');

jest.mock('../db/postgres');
jest.mock('../models/ScriptUploadPostgres');
jest.mock('../utils/storage');

const ScriptUpload = require('../models/ScriptUploadPostgres');
const storage = require('../utils/storage');
const uploadsRouter = require('../routes/uploads-postgres');

describe('Uploads API', () => {
  let app;

  beforeAll(() => {
    process.env.JWT_SECRET = 'test-jwt-secret';
    app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use('/api/uploads', uploadsRouter);
  });

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('accepts teacher upload when under limit', async () => {
    ScriptUpload.countTeacherUploadsForWindow.mockResolvedValue(0);
    ScriptUpload.create.mockResolvedValue({
      id: 'upload-1',
      status: 'pending',
      file_name: 'test.pdf',
      file_path: 'uploads/script_uploads/test.pdf'
    });
    storage.saveBufferToPath.mockResolvedValue('uploads/script_uploads/test.pdf');

    const response = await request(app)
      .post('/api/uploads')
      .field('school_id', 'school-123')
      .attach('files', Buffer.from('fake-file'), 'test.pdf');

    expect(response.status).toBe(202);
    expect(response.body.uploads).toHaveLength(1);
    expect(response.body.uploads[0]).toMatchObject({
      id: 'upload-1',
      status: 'pending',
      file: 'test.pdf'
    });
    expect(ScriptUpload.countTeacherUploadsForWindow).toHaveBeenCalledWith('school-123', expect.any(String), 60);
    expect(storage.saveBufferToPath).toHaveBeenCalled();
  });

  it('rejects teacher upload when rate limit is exceeded', async () => {
    ScriptUpload.countTeacherUploadsForWindow.mockResolvedValue(2);

    const response = await request(app)
      .post('/api/uploads')
      .field('school_id', 'school-123')
      .attach('files', Buffer.from('fake-file'), 'test.pdf');

    expect(response.status).toBe(429);
    expect(response.body.error).toMatch(/Teacher upload limit exceeded/);
    expect(ScriptUpload.countTeacherUploadsForWindow).toHaveBeenCalledTimes(1);
    expect(storage.saveBufferToPath).not.toHaveBeenCalled();
  });

  it('returns pending uploads list for super-admin', async () => {
    const token = jwt.sign({ role: 'super_admin', id: 'admin-1' }, process.env.JWT_SECRET);
    ScriptUpload.findPending.mockResolvedValue({
      uploads: [
        {
          id: 'upload-1',
          file_name: 'test.pdf',
          file_path: 'uploads/script_uploads/test.pdf',
          school_name: 'Test School',
          uploader_type: 'teacher',
          mime_type: 'application/pdf',
          created_at: new Date().toISOString()
        }
      ],
      pagination: {
        page: 1,
        limit: 20,
        total: 1,
        pages: 1
      }
    });

    const response = await request(app)
      .get('/api/uploads?status=pending')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.uploads).toHaveLength(1);
    expect(response.body.uploads[0].school_name).toBe('Test School');
    expect(ScriptUpload.findPending).toHaveBeenCalledWith({ schoolId: undefined, page: 1, limit: 20 });
  });

  it('returns upload history for school admin', async () => {
    const token = jwt.sign({ role: 'admin', id: 'admin-2', school_id: 'school-123' }, process.env.JWT_SECRET);
    ScriptUpload.findHistory.mockResolvedValue({
      uploads: [
        {
          id: 'upload-2',
          file_name: 'history.pdf',
          school_name: 'Test School',
          uploader_name: 'Teacher A',
          reviewer_name: 'Super Admin',
          status: 'approved',
          reviewed_at: new Date().toISOString(),
          created_at: new Date().toISOString()
        }
      ],
      pagination: {
        page: 1,
        limit: 20,
        total: 1,
        pages: 1
      }
    });

    const response = await request(app)
      .get('/api/uploads?status=history')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.uploads).toHaveLength(1);
    expect(response.body.uploads[0].reviewer_name).toBe('Super Admin');
    expect(ScriptUpload.findHistory).toHaveBeenCalledWith({ schoolId: 'school-123', page: 1, limit: 20 });
  });

  it('allows super-admin to approve an upload', async () => {
    const token = jwt.sign({ role: 'super_admin', id: 'admin-1' }, process.env.JWT_SECRET);
    ScriptUpload.approve.mockResolvedValue({ id: 'upload-1', status: 'approved' });

    const response = await request(app)
      .post('/api/uploads/upload-1/approve')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ id: 'upload-1', status: 'approved' });
    expect(ScriptUpload.approve).toHaveBeenCalledWith('upload-1', 'admin-1');
  });

  it('requires rejection reason for super-admin reject', async () => {
    const token = jwt.sign({ role: 'super_admin', id: 'admin-1' }, process.env.JWT_SECRET);

    const response = await request(app)
      .post('/api/uploads/upload-1/reject')
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/reason is required/);
  });
});
