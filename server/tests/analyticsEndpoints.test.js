const request = require('supertest');
const express = require('express');
const analyticsRouter = require('../routes/analytics');

describe('Analytics API', () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/analytics', analyticsRouter);
  });

  it('accepts analytics events with required fields', async () => {
    const response = await request(app)
      .post('/api/analytics/events')
      .send({
        event: 'script_upload',
        school_id: 'school-123',
        files_count: 1,
        total_bytes: 1024,
        duration_ms: 250
      });

    expect(response.status).toBe(202);
    expect(response.body).toEqual({ message: 'Analytics event accepted' });
  });

  it('rejects analytics events without an event name', async () => {
    const response = await request(app)
      .post('/api/analytics/events')
      .send({
        school_id: 'school-123'
      });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'event is required' });
  });

  it('rejects analytics events without school_id', async () => {
    const response = await request(app)
      .post('/api/analytics/events')
      .send({
        event: 'script_upload'
      });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'school_id is required' });
  });
});
