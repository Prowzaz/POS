const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const config = require('../config');

// สร้างโฟลเดอร์ database ถ้าไม่มี
const dbDir = path.dirname(config.database.path);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new sqlite3.Database(config.database.path);

// สร้างตาราง users
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'user',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // สร้างตาราง slips
  db.run(`
    CREATE TABLE IF NOT EXISTS slips (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      filename TEXT NOT NULL,
      file_size INTEGER,
      amount REAL,
      bank_code TEXT,
      bank_name TEXT,
      sender_name TEXT,
      sender_account TEXT,
      recipient_name TEXT,
      recipient_account TEXT,
      transaction_date TEXT,
      transaction_time TEXT,
      reference_id TEXT,
      status TEXT,
      is_verified BOOLEAN DEFAULT 0,
      verification_result TEXT,
      error_code TEXT,
      error_message TEXT,
      raw_response TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id)
    )
  `);

  // สร้างตาราง quota_logs
  db.run(`
    CREATE TABLE IF NOT EXISTS quota_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      quota_remaining INTEGER,
      quota_over INTEGER,
      checked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id)
    )
  `);

  // สร้างตาราง api_logs
  db.run(`
    CREATE TABLE IF NOT EXISTS api_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      endpoint TEXT,
      method TEXT,
      status_code INTEGER,
      response_time INTEGER,
      error_message TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id)
    )
  `);

  // สร้างตาราง orders สำหรับระบบสั่งอาหาร
  db.run(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_number TEXT UNIQUE NOT NULL,
      customer_name TEXT NOT NULL,
      phone TEXT NOT NULL,
      items TEXT NOT NULL,
      subtotal REAL NOT NULL,
      discount REAL DEFAULT 0,
      total REAL NOT NULL,
      promo_code TEXT,
      payment_method TEXT DEFAULT 'promptpay',
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // สร้าง admin user เริ่มต้น
  const bcrypt = require('bcryptjs');
  const adminPassword = bcrypt.hashSync('admin123', 10);
  const userPassword = bcrypt.hashSync('user123', 10);
  
  db.run(`
    INSERT OR IGNORE INTO users (username, email, password, role) 
    VALUES ('admin', 'admin@kaomankai.com', ?, 'admin')
  `, [adminPassword], function(err) {
    if (err) {
      console.error('Error creating admin user:', err);
    } else {
      console.log('Admin user created successfully');
    }
  });

  db.run(`
    INSERT OR IGNORE INTO users (username, email, password, role) 
    VALUES ('user', 'user@kaomankai.com', ?, 'user')
  `, [userPassword], function(err) {
    if (err) {
      console.error('Error creating user:', err);
    } else {
      console.log('User created successfully');
    }
  });

  console.log('Database initialized successfully');
});

module.exports = db;

