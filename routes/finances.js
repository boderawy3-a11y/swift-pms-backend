const express = require('express');
const pool = require('../config/database');
const auth = require('../middleware/auth');
const router = express.Router();

// ============= ACCOUNTS =============

router.get('/accounts', auth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM financial_accounts WHERE is_active = true ORDER BY account_type, name'
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/accounts', auth, async (req, res) => {
  try {
    const { name, accountType, bankName, accountNumber, currency, openingBalance } = req.body;
    const result = await pool.query(
      `INSERT INTO financial_accounts (name, account_type, bank_name, account_number, currency, opening_balance, current_balance)
       VALUES ($1, $2, $3, $4, $5, $6, $6) RETURNING *`,
      [name, accountType, bankName, accountNumber, currency, openingBalance]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============= TRANSACTIONS =============

router.get('/transactions', auth, async (req, res) => {
  try {
    const { type, accountId } = req.query;
    let query = `SELECT t.*, a.name as account_name
      FROM financial_transactions t
      JOIN financial_accounts a ON t.account_id = a.id
      WHERE 1=1`;
    const params = [];
    
    if (type) {
      params.push(type);
      query += ` AND t.transaction_type = $${params.length}`;
    }
    if (accountId) {
      params.push(accountId);
      query += ` AND t.account_id = $${params.length}`;
    }
    
    query += ' ORDER BY t.transaction_date DESC';
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/transactions', auth, async (req, res) => {
  try {
    const { transactionDate, accountId, transactionType, category, amount, currency, description } = req.body;
    
    const result = await pool.query(
      `INSERT INTO financial_transactions (transaction_date, account_id, transaction_type, category, amount, currency, description, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [transactionDate, accountId, transactionType, category, amount, currency, description, req.user.id]
    );
    
    // Update account balance
    const multiplier = transactionType === 'Income' ? 1 : -1;
    await pool.query(
      'UPDATE financial_accounts SET current_balance = current_balance + $1 WHERE id = $2',
      [amount * multiplier, accountId]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============= CATEGORIES =============

router.get('/categories', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM expense_categories WHERE is_active = true');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
