const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');
const router = express.Router();

// Debug endpoint
router.get('/test', (req, res) => {
  res.json({ status: 'auth route v2 loaded', timestamp: new Date().toISOString() });
});

router.post('/test-post', (req, res) => {
  res.json({ body: req.body, type: typeof req.body, contentType: req.headers['content-type'] });
});

router.get('/login-debug', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, username, full_name, role, is_active FROM users WHERE username = $1 AND is_active = true',
      ['admin']
    );
    res.json({ userCount: result.rows.length, user: result.rows[0] });
  } catch (error) {
    res.json({ error: error.message, stack: error.stack });
  }
});

router.get('/bcrypt-test', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT password FROM users WHERE username = $1',
      ['admin']
    );
    const storedPassword = result.rows[0]?.password || '';
    const isBcrypt = storedPassword.startsWith('$2');
    let compareResult = false;
    if (isBcrypt) {
      compareResult = await bcrypt.compare('admin123', storedPassword);
    }
    res.json({
      storedPassword: storedPassword.substring(0, 20) + '...',
      isBcrypt,
      compareResult,
    });
  } catch (error) {
    res.json({ error: error.message, stack: error.stack });
  }
});

router.post('/echo', (req, res) => {
  res.json({ body: req.body, headers: req.headers['content-type'] });
});

router.post('/login-step', async (req, res) => {
  try {
    const { username, password } = req.body;
    const result = await pool.query(
      'SELECT * FROM users WHERE username = $1 AND is_active = true',
      [username]
    );
    if (result.rows.length === 0) {
      return res.json({ step: 'no_user' });
    }
    const user = result.rows[0];
    const bcryptOk = await bcrypt.compare(password, user.password);
    const jwtSecret = process.env.JWT_SECRET ? 'set' : 'MISSING';
    res.json({ step: 'done', bcryptOk, jwtSecret, userId: user.id });
  } catch (error) {
    res.json({ step: 'error', message: error.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  if (!req.body || Object.keys(req.body).length === 0) {
    return res.status(400).json({ error: 'Empty body', received: req.body, contentType: req.headers['content-type'] });
  }
  try {
    const { username, password } = req.body;
    
    const result = await pool.query(
      'SELECT * FROM users WHERE username = $1 AND is_active = true',
      [username]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];
    let validPassword = false;
    try {
      validPassword = await bcrypt.compare(password, user.password);
    } catch (e) {
      validPassword = false;
    }
    // Fallback for seeded users with plain text passwords
    if (!validPassword && user.password === password) {
      validPassword = true;
    }
    
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Update last login
    await pool.query(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
      [user.id]
    );

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.full_name,
        email: user.email,
        role: user.role,
        isActive: user.is_active,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: error.message, details: error.stack });
  }
});

// Get current user
router.get('/me', async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'No token' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const result = await pool.query(
      'SELECT id, username, full_name, email, role, is_active FROM users WHERE id = $1',
      [decoded.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

module.exports = router;
