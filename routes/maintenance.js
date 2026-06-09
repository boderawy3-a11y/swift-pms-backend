const express = require('express');
const pool = require('../config/database');
const auth = require('../middleware/auth');
const router = express.Router();

// Get all maintenance requests
router.get('/', auth, async (req, res) => {
  try {
    const { status } = req.query;
    let query = `SELECT mr.*, u.unit_number,
      rep.full_name as reported_by_name,
      assign.full_name as assigned_to_name
      FROM maintenance_requests mr
      LEFT JOIN units u ON mr.unit_id = u.id
      LEFT JOIN users rep ON mr.reported_by = rep.id
      LEFT JOIN users assign ON mr.assigned_to = assign.id
      WHERE 1=1`;
    const params = [];
    
    if (status) {
      params.push(status);
      query += ` AND mr.status = $${params.length}`;
    }
    
    query += ` ORDER BY 
      CASE mr.priority 
        WHEN 'urgent' THEN 1 
        WHEN 'high' THEN 2 
        WHEN 'medium' THEN 3 
        ELSE 4 
      END,
      mr.created_at DESC`;
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create request
router.post('/', auth, async (req, res) => {
  try {
    const { unitId, title, description, priority } = req.body;
    const result = await pool.query(
      `INSERT INTO maintenance_requests (unit_id, title, description, priority, reported_by)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [unitId, title, description, priority, req.user.id]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Assign request
router.put('/:id/assign', auth, async (req, res) => {
  try {
    const result = await pool.query(
      'UPDATE maintenance_requests SET assigned_to = $1, status = $2 WHERE id = $3 RETURNING *',
      [req.user.id, 'In Progress', req.params.id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Complete request
router.put('/:id/complete', auth, async (req, res) => {
  try {
    const { notes } = req.body;
    const result = await pool.query(
      'UPDATE maintenance_requests SET status = $1, completed_at = CURRENT_TIMESTAMP, notes = $2 WHERE id = $3 RETURNING *',
      ['Completed', notes, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
