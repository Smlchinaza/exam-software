// routes/states-postgres.js
// States management routes for Nigerian states

const express = require('express');
const router = express.Router();
const pool = require('../db/postgres');
const { authenticateJWT } = require('../middleware/auth');

/**
 * GET /api/states
 * Public endpoint - List all active states
 */
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, code, country, is_active, created_at, updated_at
       FROM states 
       WHERE is_active = true
       ORDER BY name ASC`
    );

    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching states:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/states/all
 * Admin endpoint - List all states (including inactive)
 */
router.get('/all', authenticateJWT, async (req, res) => {
  try {
    // Only admins can view all states
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const result = await pool.query(
      `SELECT id, name, code, country, is_active, created_at, updated_at
       FROM states 
       ORDER BY name ASC`
    );

    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching all states:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/states/:id
 * Get specific state details
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT id, name, code, country, is_active, created_at, updated_at
       FROM states 
       WHERE id = $1 AND is_active = true`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'State not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching state:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/states/code/:code
 * Get state by code (e.g., 'LA' for Lagos)
 */
router.get('/code/:code', async (req, res) => {
  try {
    const { code } = req.params;

    const result = await pool.query(
      `SELECT id, name, code, country, is_active, created_at, updated_at
       FROM states 
       WHERE code = $1 AND is_active = true`,
      [code.toUpperCase()]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'State not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching state by code:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/states
 * Admin endpoint - Add new state
 */
router.post('/', authenticateJWT, async (req, res) => {
  const client = await pool.connect();
  
  try {
    // Only admins can add states
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { name, code, country } = req.body;

    // Validate required fields
    if (!name || !code) {
      return res.status(400).json({
        error: 'State name and code are required'
      });
    }

    // Start transaction
    await client.query('BEGIN');

    // Check if state name already exists
    const nameExistsRes = await client.query(
      `SELECT id FROM states WHERE name = $1`,
      [name]
    );

    if (nameExistsRes.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'State name already exists' });
    }

    // Check if state code already exists
    const codeExistsRes = await client.query(
      `SELECT id FROM states WHERE code = $1`,
      [code.toUpperCase()]
    );

    if (codeExistsRes.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'State code already exists' });
    }

    // Create state
    const stateRes = await client.query(
      `INSERT INTO states (name, code, country, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, true, NOW(), NOW())
       RETURNING id, name, code, country, is_active, created_at, updated_at`,
      [name, code.toUpperCase(), country || 'Nigeria']
    );

    const state = stateRes.rows[0];

    // Commit transaction
    await client.query('COMMIT');

    res.status(201).json({
      message: 'State created successfully',
      state
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('State creation error:', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

/**
 * PUT /api/states/:id
 * Admin endpoint - Update state
 */
router.put('/:id', authenticateJWT, async (req, res) => {
  const client = await pool.connect();
  
  try {
    // Only admins can update states
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { id } = req.params;
    const { name, code, country, is_active } = req.body;

    // Start transaction
    await client.query('BEGIN');

    // Check if state exists
    const stateExistsRes = await client.query(
      `SELECT id FROM states WHERE id = $1`,
      [id]
    );

    if (stateExistsRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'State not found' });
    }

    // Check for duplicate name (if updating name)
    if (name) {
      const nameExistsRes = await client.query(
        `SELECT id FROM states WHERE name = $1 AND id != $2`,
        [name, id]
      );

      if (nameExistsRes.rows.length > 0) {
        await client.query('ROLLBACK');
        return res.status(409).json({ error: 'State name already exists' });
      }
    }

    // Check for duplicate code (if updating code)
    if (code) {
      const codeExistsRes = await client.query(
        `SELECT id FROM states WHERE code = $1 AND id != $2`,
        [code.toUpperCase(), id]
      );

      if (codeExistsRes.rows.length > 0) {
        await client.query('ROLLBACK');
        return res.status(409).json({ error: 'State code already exists' });
      }
    }

    // Update state
    const stateRes = await client.query(
      `UPDATE states
       SET name = COALESCE($1, name),
           code = COALESCE($2, code),
           country = COALESCE($3, country),
           is_active = COALESCE($4, is_active),
           updated_at = NOW()
       WHERE id = $5
       RETURNING id, name, code, country, is_active, created_at, updated_at`,
      [name, code ? code.toUpperCase() : null, country, is_active, id]
    );

    const state = stateRes.rows[0];

    // Commit transaction
    await client.query('COMMIT');

    res.json({
      message: 'State updated successfully',
      state
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('State update error:', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

/**
 * DELETE /api/states/:id
 * Admin endpoint - Deactivate state (soft delete)
 */
router.delete('/:id', authenticateJWT, async (req, res) => {
  try {
    // Only admins can deactivate states
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { id } = req.params;

    // Check if state exists
    const stateExistsRes = await pool.query(
      `SELECT id FROM states WHERE id = $1`,
      [id]
    );

    if (stateExistsRes.rows.length === 0) {
      return res.status(404).json({ error: 'State not found' });
    }

    // Check if state has associated schools
    const schoolsRes = await pool.query(
      `SELECT COUNT(*) as count FROM schools WHERE state_id = $1`,
      [id]
    );

    if (parseInt(schoolsRes.rows[0].count) > 0) {
      return res.status(400).json({ 
        error: 'Cannot deactivate state with associated schools' 
      });
    }

    // Deactivate state
    const result = await pool.query(
      `UPDATE states 
       SET is_active = false, updated_at = NOW()
       WHERE id = $1
       RETURNING id, name, code, is_active`,
      [id]
    );

    res.json({
      message: 'State deactivated successfully',
      state: result.rows[0]
    });
  } catch (err) {
    console.error('State deactivation error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/states/:id/schools
 * Get schools in a specific state
 */
router.get('/:id/schools', async (req, res) => {
  try {
    const { id } = req.params;

    // Verify state exists and is active
    const stateRes = await pool.query(
      `SELECT id, name FROM states WHERE id = $1 AND is_active = true`,
      [id]
    );

    if (stateRes.rows.length === 0) {
      return res.status(404).json({ error: 'State not found' });
    }

    // Get schools in this state
    const schoolsRes = await pool.query(
      `SELECT id, name, domain, city, type, is_public, status, created_at
       FROM schools 
       WHERE state_id = $1 AND status = 'active'
       ORDER BY name ASC`,
      [id]
    );

    res.json({
      state: stateRes.rows[0],
      schools: schoolsRes.rows
    });
  } catch (err) {
    console.error('Error fetching schools by state:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
