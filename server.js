const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/properties', require('./routes/properties'));
app.use('/api/reservations', require('./routes/reservations'));
app.use('/api/finances', require('./routes/finances'));
app.use('/api/maintenance', require('./routes/maintenance'));
app.use('/api/notifications', require('./routes/notifications'));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});
// Seed database endpoint
app.get('/api/seed', async (req, res) => {
  try {
    const pool = require('./config/database');
    
    // Create tables
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        full_name VARCHAR(100) NOT NULL,
        email VARCHAR(100),
        role VARCHAR(20) DEFAULT 'Receptionist',
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS properties (
        id SERIAL PRIMARY KEY,
        name VARCHAR(200) NOT NULL,
        type VARCHAR(50),
        address TEXT,
        city VARCHAR(100),
        country VARCHAR(100),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS units (
        id SERIAL PRIMARY KEY,
        property_id INTEGER REFERENCES properties(id),
        unit_number VARCHAR(20) NOT NULL,
        floor INTEGER DEFAULT 1,
        unit_type VARCHAR(50),
        beds INTEGER DEFAULT 1,
        capacity INTEGER DEFAULT 2,
        status VARCHAR(20) DEFAULT 'Available',
        daily_rate REAL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS financial_accounts (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        account_type VARCHAR(20) DEFAULT 'Cash',
        bank_name VARCHAR(100),
        currency VARCHAR(10) DEFAULT 'EGP',
        opening_balance REAL DEFAULT 0,
        current_balance REAL DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS financial_transactions (
        id SERIAL PRIMARY KEY,
        transaction_date DATE NOT NULL,
        account_id INTEGER REFERENCES financial_accounts(id),
        transaction_type VARCHAR(20) NOT NULL,
        category VARCHAR(100),
        amount REAL NOT NULL,
        currency VARCHAR(10) DEFAULT 'EGP',
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS expense_categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        name_ar VARCHAR(100),
        category_type VARCHAR(20) DEFAULT 'expense',
        is_active BOOLEAN DEFAULT true
      );

      CREATE TABLE IF NOT EXISTS maintenance_requests (
        id SERIAL PRIMARY KEY,
        unit_id INTEGER,
        title VARCHAR(200) NOT NULL,
        description TEXT,
        priority VARCHAR(20) DEFAULT 'medium',
        status VARCHAR(20) DEFAULT 'Pending',
        reported_by INTEGER,
        assigned_to INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP,
        notes TEXT
      );

      CREATE TABLE IF NOT EXISTS app_notifications (
        id SERIAL PRIMARY KEY,
        title VARCHAR(200) NOT NULL,
        body TEXT,
        notification_type VARCHAR(50) NOT NULL,
        related_id INTEGER,
        is_read BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Insert default data with hashed passwords
    const seedUsers = [
      { username: 'admin', password: 'admin123', full_name: 'System Administrator', email: 'admin@swift.com', role: 'Super Admin' },
      { username: 'owner', password: 'owner123', full_name: 'Property Owner', email: 'owner@swift.com', role: 'Owner' },
      { username: 'accountant', password: 'acc123', full_name: 'Accountant', email: 'acc@swift.com', role: 'Accountant' },
      { username: 'reception', password: 'rec123', full_name: 'Receptionist', email: 'rec@swift.com', role: 'Receptionist' },
      { username: 'maintenance', password: 'maint123', full_name: 'Maintenance Technician', email: 'maint@swift.com', role: 'Maintenance' },
    ];

    for (const u of seedUsers) {
      const hashedPassword = await bcrypt.hash(u.password, 10);
      await pool.query(`
        INSERT INTO users (username, password, full_name, email, role, is_active)
        VALUES ($1, $2, $3, $4, $5, true)
        ON CONFLICT (username) DO UPDATE SET
          password = EXCLUDED.password,
          full_name = EXCLUDED.full_name,
          email = EXCLUDED.email,
          role = EXCLUDED.role,
          is_active = true
      `, [u.username, hashedPassword, u.full_name, u.email, u.role]);
    }

    await pool.query(`
      INSERT INTO financial_accounts (name, account_type, currency, opening_balance, current_balance) VALUES
      ('Main Cash', 'Cash', 'EGP', 10000, 10000),
      ('Bank Account', 'Bank', 'EGP', 50000, 50000)
      ON CONFLICT DO NOTHING;

      INSERT INTO expense_categories (name, name_ar, category_type) VALUES
      ('Utilities', 'فواتير الخدمات', 'expense'),
      ('Maintenance', 'صيانة', 'expense'),
      ('Cleaning', 'تنظيف', 'expense'),
      ('Salaries', 'رواتب', 'expense'),
      ('Supplier Payment', 'دفع مورد', 'expense'),
      ('Reservation Income', 'إيرادات الحجز', 'revenue'),
      ('Services Income', 'إيرادات خدمات إضافية', 'revenue'),
      ('Other Income', 'إيرادات أخرى', 'revenue');
    `);

    res.json({ success: true, message: 'Database seeded successfully' });
  } catch (error) {
    console.error('Seed error:', error);
    res.status(500).json({ error: error.message });
  }
});
app.listen(PORT, () => {
  console.log(`🚀 Swift PMS API running on port ${PORT}`);
  console.log(`📡 API URL: http://localhost:${PORT}/api`);
});
