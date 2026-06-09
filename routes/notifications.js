const express = require('express');
const pool = require('../config/database');
const auth = require('../middleware/auth');
const router = express.Router();

// Get all notifications
router.get('/', auth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM app_notifications ORDER BY created_at DESC LIMIT 100'
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get unread count
router.get('/unread-count', auth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT COUNT(*) as count FROM app_notifications WHERE is_read = false'
    );
    res.json({ count: parseInt(result.rows[0].count) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Mark as read
router.put('/:id/read', auth, async (req, res) => {
  try {
    await pool.query('UPDATE app_notifications SET is_read = true WHERE id = $1', [req.params.id]);
    res.json({ message: 'Marked as read' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Mark all as read
router.put('/read-all', auth, async (req, res) => {
  try {
    await pool.query('UPDATE app_notifications SET is_read = true WHERE is_read = false');
    res.json({ message: 'All marked as read' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create notification (internal use)
router.post('/', auth, async (req, res) => {
  try {
    const { title, body, notificationType, relatedId } = req.body;
    const result = await pool.query(
      `INSERT INTO app_notifications (title, body, notification_type, related_id)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [title, body, notificationType, relatedId]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
