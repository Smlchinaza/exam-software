const express = require('express');
const router = express.Router();

/**
 * POST /api/analytics/events
 * Accept lightweight analytics events from the frontend.
 * This endpoint is intentionally non-blocking and does not require authentication.
 */
router.post('/events', async (req, res) => {
  const { event, files_count, total_bytes, duration_ms, school_id } = req.body;

  if (!event) {
    return res.status(400).json({ error: 'event is required' });
  }

  if (!school_id) {
    return res.status(400).json({ error: 'school_id is required' });
  }

  try {
    console.info('Analytics event received:', {
      event,
      school_id,
      files_count,
      total_bytes,
      duration_ms,
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });
    return res.status(202).json({ message: 'Analytics event accepted' });
  } catch (error) {
    console.error('Analytics event error:', error);
    return res.status(500).json({ error: 'Failed to process analytics event' });
  }
});

module.exports = router;
