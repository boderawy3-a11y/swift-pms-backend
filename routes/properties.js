const express = require('express');
const pool = require('../config/database');
const auth = require('../middleware/auth');
const router = express.Router();

// ============= PROPERTIES =============

// Get all properties
router.get('/', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM properties WHERE is_active = true ORDER BY name');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create property
router.post('/', auth, async (req, res) => {
  try {
    const { name, nameAr, type, address, city, country, description } = req.body;
    const result = await pool.query(
      `INSERT INTO properties (name, name_ar, type, address, city, country, description)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [name, nameAr, type, address, city, country, description]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============= UNITS =============

// Get all units
router.get('/units', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.*, p.name as property_name, p.name_ar as property_name_ar
       FROM units u
       JOIN properties p ON u.property_id = p.id
       WHERE u.status != 'Out of Service'
       ORDER BY u.unit_number`
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create unit
router.post('/units', auth, async (req, res) => {
  try {
    const { propertyId, unitNumber, floor, unitType, beds, capacity, dailyRate, monthlyRate, status } = req.body;
    const result = await pool.query(
      `INSERT INTO units (property_id, unit_number, floor, unit_type, beds, capacity, daily_rate, monthly_rate, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [propertyId, unitNumber, floor, unitType, beds, capacity, dailyRate, monthlyRate, status || 'Available']
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update unit status
router.put('/units/:id', auth, async (req, res) => {
  try {
    const { status, dailyRate } = req.body;
    const result = await pool.query(
      'UPDATE units SET status = $1, daily_rate = $2 WHERE id = $3 RETURNING *',
      [status, dailyRate, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
