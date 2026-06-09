# Swift PMS Backend API

## Prerequisites
- Node.js 18+
- PostgreSQL 14+
- VPS (Ubuntu 20.04+ recommended)

## Setup Steps

### 1. Install Node.js & PostgreSQL
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib
```

### 2. Create Database
```bash
# Switch to postgres user
sudo -u postgres psql

# Create database
CREATE DATABASE swift_pms;
CREATE USER swift_user WITH ENCRYPTED PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE swift_pms TO swift_user;

# Exit
\q
```

### 3. Upload & Run Backend
```bash
# Upload swift_server folder to VPS (use FileZilla or SCP)
# Then on VPS:
cd ~/swift_server
npm install

# Create .env file
nano .env
# Add:
# PORT=3000
# DB_HOST=localhost
# DB_PORT=5432
# DB_NAME=swift_pms
# DB_USER=swift_user
# DB_PASSWORD=your_password
# JWT_SECRET=your_secret_key_here

# Run database schema
sudo -u postgres psql swift_pms < database/schema.sql

# Install PM2 for process management
sudo npm install -g pm2

# Start server
pm2 start server.js --name "swift-api"
pm2 startup
pm2 save
```

### 4. Configure Firewall
```bash
sudo ufw allow 3000/tcp
sudo ufw allow 22/tcp
sudo ufw enable
```

### 5. Update Flutter App
In `lib/core/services/api_service.dart`, change:
```dart
static const String baseUrl = 'http://YOUR_VPS_IP:3000/api';
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/login | Login |
| GET | /api/auth/me | Get current user |
| GET | /api/users | List users |
| POST | /api/users | Create user |
| GET | /api/properties | List properties |
| GET | /api/properties/units | List units |
| GET | /api/reservations | List reservations |
| POST | /api/reservations | Create reservation |
| GET | /api/finances/accounts | List accounts |
| GET | /api/finances/transactions | List transactions |
| POST | /api/finances/transactions | Create transaction |
| GET | /api/maintenance | List maintenance requests |
| POST | /api/maintenance | Create request |
| GET | /api/notifications | List notifications |

## Monitoring
```bash
# View logs
pm2 logs swift-api

# Restart
pm2 restart swift-api

# Stop
pm2 stop swift-api
```
