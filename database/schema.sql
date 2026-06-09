-- Swift PMS Database Schema
-- Run this on your PostgreSQL database

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  full_name VARCHAR(100) NOT NULL,
  email VARCHAR(100),
  phone VARCHAR(20),
  role VARCHAR(20) DEFAULT 'Receptionist',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP
);

CREATE TABLE IF NOT EXISTS properties (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  name_ar VARCHAR(200),
  type VARCHAR(50),
  address TEXT,
  city VARCHAR(100),
  country VARCHAR(100),
  description TEXT,
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
  size_sqm REAL,
  description TEXT,
  photo_paths TEXT,
  status VARCHAR(20) DEFAULT 'Available',
  daily_rate REAL DEFAULT 0,
  monthly_rate REAL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS guests (
  id SERIAL PRIMARY KEY,
  full_name VARCHAR(100) NOT NULL,
  email VARCHAR(100),
  phone VARCHAR(20),
  nationality VARCHAR(50),
  passport_number VARCHAR(50),
  id_number VARCHAR(50),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS reservations (
  id SERIAL PRIMARY KEY,
  booking_ref VARCHAR(50) UNIQUE,
  guest_id INTEGER REFERENCES guests(id),
  unit_id INTEGER REFERENCES units(id),
  property_id INTEGER REFERENCES properties(id),
  check_in DATE NOT NULL,
  check_out DATE NOT NULL,
  adults INTEGER DEFAULT 1,
  children INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'Confirmed',
  source VARCHAR(50) DEFAULT 'Direct',
  total_amount REAL DEFAULT 0,
  paid_amount REAL DEFAULT 0,
  currency VARCHAR(10) DEFAULT 'EGP',
  notes TEXT,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS financial_accounts (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  account_type VARCHAR(20) DEFAULT 'Cash',
  bank_name VARCHAR(100),
  account_number VARCHAR(50),
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
  transfer_to_account_id INTEGER REFERENCES financial_accounts(id),
  transaction_type VARCHAR(20) NOT NULL,
  category VARCHAR(100),
  sub_category VARCHAR(100),
  amount REAL NOT NULL,
  currency VARCHAR(10) DEFAULT 'EGP',
  exchange_rate REAL DEFAULT 1,
  description TEXT,
  reference_number VARCHAR(50),
  reservation_id INTEGER REFERENCES reservations(id),
  attachment_paths TEXT,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS expense_categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  name_ar VARCHAR(100),
  category_type VARCHAR(20) DEFAULT 'expense',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS partners (
  id SERIAL PRIMARY KEY,
  full_name VARCHAR(100) NOT NULL,
  email VARCHAR(100),
  phone VARCHAR(20),
  ownership_percentage REAL DEFAULT 0,
  investment_amount REAL DEFAULT 0,
  share_type VARCHAR(50) DEFAULT 'Profit',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS maintenance_requests (
  id SERIAL PRIMARY KEY,
  unit_id INTEGER REFERENCES units(id),
  title VARCHAR(200) NOT NULL,
  description TEXT,
  priority VARCHAR(20) DEFAULT 'medium',
  status VARCHAR(20) DEFAULT 'Pending',
  reported_by INTEGER REFERENCES users(id),
  assigned_to INTEGER REFERENCES users(id),
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
  scheduled_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50),
  entity_id INTEGER,
  old_values TEXT,
  new_values TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Default admin user (password: admin123 - bcrypt hashed)
INSERT INTO users (username, password, full_name, email, role, is_active)
VALUES ('admin', '$2a$10$YourHashedPasswordHere', 'System Administrator', 'admin@swift.com', 'Super Admin', true)
ON CONFLICT (username) DO NOTHING;

-- Default expense categories
INSERT INTO expense_categories (name, name_ar, category_type) VALUES
  ('Utilities', 'فواتير الخدمات', 'expense'),
  ('Maintenance', 'صيانة', 'expense'),
  ('Cleaning', 'تنظيف', 'expense'),
  ('Salaries', 'رواتب', 'expense'),
  ('Supplier Payment', 'دفع مورد', 'expense'),
  ('Reservation Income', 'إيرادات الحجز', 'revenue'),
  ('Services Income', 'إيرادات خدمات إضافية', 'revenue'),
  ('Other Income', 'إيرادات أخرى', 'revenue')
ON CONFLICT DO NOTHING;
