const express = require('express');
const pool = require('../config/database');
const auth = require('../middleware/auth');
const router = express.Router();

// Get all reservations
router.get('/', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT r.*, 
        g.full_name as guest_name, 
        u.unit_number, 
        p.name as property_name
       FROM reservations r
       JOIN guests g ON r.guest_id = g.id
       JOIN units u ON r.unit_id = u.id
       JOIN properties p ON r.property_id = p.id
       ORDER BY r.check_in DESC`
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create reservation
router.post('/', auth, async (req, res) => {
  try {
    const { 
      bookingRef, guestId, unitId, propertyId, checkIn, checkOut,
      adults, children, status, source, totalAmount, paidAmount, currency, notes
    } = req.body;
    
    const result = await pool.query(
      `INSERT INTO reservations (booking_ref, guest_id, unit_id, property_id, check_in, check_out, 
        adults, children, status, source, total_amount, paid_amount, currency, notes, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) RETURNING *`,
      [bookingRef, guestId, unitId, propertyId, checkIn, checkOut, adults, children, 
       status, source, totalAmount, paidAmount, currency, notes, req.user.id]
    );
    
    // Update unit status
    if (status === 'Confirmed') {
      await pool.query("UPDATE units SET status = 'Reserved' WHERE id = $1", [unitId]);
    }
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update reservation
router.put('/:id', auth, async (req, res) => {
  try {
    const { status, paidAmount } = req.body;
    const result = await pool.query(
      'UPDATE reservations SET status = $1, paid_amount = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *',
      [status, paidAmount, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Check in
router.put('/:id/checkin', auth, async (req, res) => {
  try {
    const result = await pool.query(
      "UPDATE reservations SET status = 'CheckedIn', updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *",
      [req.params.id]
    );
    // Update unit status
    await pool.query("UPDATE units SET status = 'Occupied' WHERE id = $1", [result.rows[0].unit_id]);
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Check out
router.put('/:id/checkout', auth, async (req, res) => {
  try {
    const result = await pool.query(
      "UPDATE reservations SET status = 'CheckedOut', updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *",
      [req.params.id]
    );
    // Update unit status
    await pool.query("UPDATE units SET status = 'Available' WHERE id = $1", [result.rows[0].unit_id]);
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============= GUESTS =============

// Get all guests
router.get('/guests', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM guests ORDER BY full_name');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create guest
router.post('/guests', auth, async (req, res) => {
  try {
    const { fullName, email, phone, nationality, notes } = req.body;
    const result = await pool.query(
      `INSERT INTO guests (full_name, email, phone, nationality, notes)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [fullName, email, phone, nationality, notes]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
