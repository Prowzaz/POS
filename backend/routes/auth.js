const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const router = express.Router();
const { validateUserRegistration, validateUserLogin } = require('../middleware/validation');
const { authenticateToken } = require('../middleware/auth');
const config = require('../config');
const db = require('../database/init');

// สมัครสมาชิก
router.post('/register', validateUserRegistration, async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // ตรวจสอบว่ามี username หรือ email ซ้ำหรือไม่
    db.get(
      'SELECT id FROM users WHERE username = ? OR email = ?',
      [username, email],
      async (err, row) => {
        if (err) {
          return res.status(500).json({
            success: false,
            message: 'Database error',
            error: err.message
          });
        }

        if (row) {
          return res.status(400).json({
            success: false,
            message: 'Username or email already exists'
          });
        }

        // เข้ารหัสรหัสผ่าน
        const hashedPassword = await bcrypt.hash(password, 10);

        // สร้างผู้ใช้ใหม่
        db.run(
          'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
          [username, email, hashedPassword],
          function(err) {
            if (err) {
              return res.status(500).json({
                success: false,
                message: 'Failed to create user',
                error: err.message
              });
            }

            // สร้าง JWT token
            const token = jwt.sign(
              { id: this.lastID, username, email, role: 'user' },
              config.jwt.secret,
              { expiresIn: config.jwt.expiresIn }
            );

            res.status(201).json({
              success: true,
              message: 'User created successfully',
              data: {
                user: {
                  id: this.lastID,
                  username,
                  email,
                  role: 'user'
                },
                token
              }
            });
          }
        );
      }
    );
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// เข้าสู่ระบบ
router.post('/login', validateUserLogin, async (req, res) => {
  try {
    const { username, password } = req.body;

    // ค้นหาผู้ใช้
    db.get(
      'SELECT * FROM users WHERE username = ? OR email = ?',
      [username, username],
      async (err, user) => {
        if (err) {
          return res.status(500).json({
            success: false,
            message: 'Database error',
            error: err.message
          });
        }

        if (!user) {
          return res.status(401).json({
            success: false,
            message: 'Invalid username or password'
          });
        }

        // ตรวจสอบรหัสผ่าน
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
          return res.status(401).json({
            success: false,
            message: 'Invalid username or password'
          });
        }

        // สร้าง JWT token
        const token = jwt.sign(
          { 
            id: user.id, 
            username: user.username, 
            email: user.email, 
            role: user.role 
          },
          config.jwt.secret,
          { expiresIn: config.jwt.expiresIn }
        );

        res.json({
          success: true,
          message: 'Login successful',
          data: {
            user: {
              id: user.id,
              username: user.username,
              email: user.email,
              role: user.role
            },
            token
          }
        });
      }
    );
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// ตรวจสอบ token
router.get('/verify', authenticateToken, (req, res) => {
  res.json({
    success: true,
    message: 'Token is valid',
    data: {
      user: {
        id: req.user.id,
        username: req.user.username,
        email: req.user.email,
        role: req.user.role
      }
    }
  });
});

// เปลี่ยนรหัสผ่าน
router.put('/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long'
      });
    }

    // ค้นหาผู้ใช้
    db.get(
      'SELECT password FROM users WHERE id = ?',
      [req.user.id],
      async (err, user) => {
        if (err) {
          return res.status(500).json({
            success: false,
            message: 'Database error',
            error: err.message
          });
        }

        if (!user) {
          return res.status(404).json({
            success: false,
            message: 'User not found'
          });
        }

        // ตรวจสอบรหัสผ่านปัจจุบัน
        const isValidPassword = await bcrypt.compare(currentPassword, user.password);
        if (!isValidPassword) {
          return res.status(401).json({
            success: false,
            message: 'Current password is incorrect'
          });
        }

        // เข้ารหัสรหัสผ่านใหม่
        const hashedNewPassword = await bcrypt.hash(newPassword, 10);

        // อัพเดทรหัสผ่าน
        db.run(
          'UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          [hashedNewPassword, req.user.id],
          function(err) {
            if (err) {
              return res.status(500).json({
                success: false,
                message: 'Failed to update password',
                error: err.message
              });
            }

            res.json({
              success: true,
              message: 'Password updated successfully'
            });
          }
        );
      }
    );
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

module.exports = router;


