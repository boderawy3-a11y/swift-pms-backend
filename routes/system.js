const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const auth = require('../middleware/auth');

// Activity log: recent events from reservations, transactions, maintenance
router.get('/activity', auth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM (
        SELECT 
          'reservation' AS event_type,
          r.id AS ref_id,
          r.booking_ref AS ref,
          r.status AS status,
          NULL::REAL AS amount,
          NULL AS currency,
          g.full_name AS related_name,
          r.created_at
        FROM reservations r
        LEFT JOIN guests g ON r.guest_id = g.id

        UNION ALL

        SELECT 
          'transaction' AS event_type,
          t.id AS ref_id,
          t.transaction_type AS ref,
          t.category AS status,
          t.amount AS amount,
          t.currency AS currency,
          a.name AS related_name,
          t.created_at
        FROM financial_transactions t
        LEFT JOIN financial_accounts a ON t.account_id = a.id

        UNION ALL

        SELECT 
          'maintenance' AS event_type,
          m.id AS ref_id,
          m.title AS ref,
          m.status AS status,
          NULL::REAL AS amount,
          NULL AS currency,
          NULL AS related_name,
          m.created_at
        FROM maintenance_requests m
      ) events
      ORDER BY created_at DESC NULLS LAST
      LIMIT 100
    `);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Backup: dump all main tables as JSON
router.get('/backup', auth, async (req, res) => {
  try {
    const tables = [
      'users', 'properties', 'units', 'guests', 'reservations',
      'financial_accounts', 'financial_transactions', 'expense_categories',
      'maintenance_requests'
    ];
    const backup = { created_at: new Date().toISOString(), data: {} };
    for (const table of tables) {
      const result = await pool.query(`SELECT * FROM ${table}`);
      backup.data[table] = result.rows;
    }
    res.json(backup);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Restore: replace all data from a backup JSON
router.post('/restore', auth, async (req, res) => {
  const client = await pool.connect();
  try {
    const data = req.body && req.body.data;
    if (!data || typeof data !== 'object') {
      return res.status(400).json({ error: 'Invalid backup file: missing data' });
    }

    // Insert order respects foreign keys (delete in reverse)
    const insertOrder = [
      'users', 'properties', 'units', 'guests', 'financial_accounts',
      'expense_categories', 'reservations', 'financial_transactions',
      'maintenance_requests'
    ];

    await client.query('BEGIN');

    // Clear tables in reverse order
    for (const table of [...insertOrder].reverse()) {
      await client.query(`DELETE FROM ${table}`);
    }

    // Insert rows
    const counts = {};
    for (const table of insertOrder) {
      const rows = data[table];
      if (!Array.isArray(rows) || rows.length === 0) {
        counts[table] = 0;
        continue;
      }
      for (const row of rows) {
        const keys = Object.keys(row);
        const cols = keys.map(k => `"${k}"`).join(', ');
        const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
        const values = keys.map(k => row[k]);
        await client.query(
          `INSERT INTO ${table} (${cols}) VALUES (${placeholders})`,
          values
        );
      }
      counts[table] = rows.length;
      // Reset sequence so new inserts don't collide
      await client.query(
        `SELECT setval(pg_get_serial_sequence('${table}', 'id'), COALESCE((SELECT MAX(id) FROM ${table}), 1))`
      );
    }

    await client.query('COMMIT');
    res.json({ success: true, restored: counts });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

module.exports = router;
