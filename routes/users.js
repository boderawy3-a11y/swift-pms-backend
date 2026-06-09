const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../config/database');
const auth = require('../middleware/auth');
const router = express.Router();

// Get all users
router.get('/', auth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, username, full_name, email, phone, role, is_active, created_at FROM users ORDER BY id ASC'
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create user
router.post('/', auth, async (req, res) => {
  try {
    const { username, password, fullName, email, phone, role } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const result = await pool.query(
      `INSERT INTO users (username, password, full_name, email, phone, role)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, username, full_name, email, role`,
      [username, hashedPassword, fullName, email, phone, role]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update user
router.put('/:id', auth, async (req, res) => {
  try {
    const { fullName, email, phone, role, isActive } = req.body;
    
    const result = await pool.query(
      `UPDATE users SET full_name = $1, email = $2, phone = $3, role = $4, is_active = $5
       WHERE id = $6 RETURNING id, username, full_name, email, role, is_active`,
      [fullName, email, phone, role, isActive, req.params.id]
    );
    
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update password
router.put('/:id/password', auth, async (req, res) => {
  try {
    const { password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    
    await pool.query('UPDATE users SET password = $1 WHERE id = $2', [hashedPassword, req.params.id]);
    res.json({ message: 'Password updated' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Toggle user status (block/unblock)
router.put('/:id/toggle', auth, async (req, res) => {
  try {
    const result = await pool.query(
      'UPDATE users SET is_active = NOT is_active WHERE id = $1 RETURNING id, is_active',
      [req.params.id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
