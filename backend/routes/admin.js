const express = require('express');
const router = express.Router();
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const db = require('../database/init');

// ใช้ middleware สำหรับ admin ทั้งหมด
router.use(authenticateToken);
router.use(requireAdmin);

// ดูสถิติทั้งหมด
router.get('/stats', (req, res) => {
  try {
    // สถิติผู้ใช้
    db.get('SELECT COUNT(*) as total_users FROM users', (err, userCount) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: 'Database error',
          error: err.message
        });
      }

      // สถิติสลิป
      db.get('SELECT COUNT(*) as total_slips FROM slips', (err, slipCount) => {
        if (err) {
          return res.status(500).json({
            success: false,
            message: 'Database error',
            error: err.message
          });
        }

        // สถิติสลิปที่ตรวจสอบสำเร็จ
        db.get('SELECT COUNT(*) as verified_slips FROM slips WHERE is_verified = 1', (err, verifiedCount) => {
          if (err) {
            return res.status(500).json({
              success: false,
              message: 'Database error',
              error: err.message
            });
          }

          // สถิติสลิปที่ผิดพลาด
          db.get('SELECT COUNT(*) as error_slips FROM slips WHERE verification_result = "error"', (err, errorCount) => {
            if (err) {
              return res.status(500).json({
                success: false,
                message: 'Database error',
                error: err.message
              });
            }

            // สถิติการใช้งาน API
            db.get('SELECT COUNT(*) as total_api_calls FROM api_logs', (err, apiCount) => {
              if (err) {
                return res.status(500).json({
                  success: false,
                  message: 'Database error',
                  error: err.message
                });
              }

              res.json({
                success: true,
                data: {
                  users: userCount.total_users,
                  slips: slipCount.total_slips,
                  verified: verifiedCount.verified_slips,
                  errors: errorCount.error_slips,
                  apiCalls: apiCount.total_api_calls
                }
              });
            });
          });
        });
      });
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// ดูรายการผู้ใช้ทั้งหมด
router.get('/users', (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    db.all(
      'SELECT id, username, email, role, created_at FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [limit, offset],
      (err, users) => {
        if (err) {
          return res.status(500).json({
            success: false,
            message: 'Database error',
            error: err.message
          });
        }

        // นับจำนวนผู้ใช้ทั้งหมด
        db.get('SELECT COUNT(*) as total FROM users', (err, count) => {
          if (err) {
            return res.status(500).json({
              success: false,
              message: 'Database error',
              error: err.message
            });
          }

          res.json({
            success: true,
            data: {
              users,
              pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: count.total,
                pages: Math.ceil(count.total / limit)
              }
            }
          });
        });
      }
    );
  } catch (error) {
    console.error('Users list error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// ดูรายการสลิปทั้งหมด
router.get('/slips', (req, res) => {
  try {
    const { page = 1, limit = 10, status, user_id } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT s.*, u.username 
      FROM slips s 
      LEFT JOIN users u ON s.user_id = u.id 
      WHERE 1=1
    `;
    let params = [];

    if (status) {
      query += ' AND s.verification_result = ?';
      params.push(status);
    }

    if (user_id) {
      query += ' AND s.user_id = ?';
      params.push(user_id);
    }

    query += ' ORDER BY s.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    db.all(query, params, (err, slips) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: 'Database error',
          error: err.message
        });
      }

      // นับจำนวนสลิปทั้งหมด
      let countQuery = 'SELECT COUNT(*) as total FROM slips s WHERE 1=1';
      let countParams = [];

      if (status) {
        countQuery += ' AND s.verification_result = ?';
        countParams.push(status);
      }

      if (user_id) {
        countQuery += ' AND s.user_id = ?';
        countParams.push(user_id);
      }

      db.get(countQuery, countParams, (err, count) => {
        if (err) {
          return res.status(500).json({
            success: false,
            message: 'Database error',
            error: err.message
          });
        }

        res.json({
          success: true,
          data: {
            slips,
            pagination: {
              page: parseInt(page),
              limit: parseInt(limit),
              total: count.total,
              pages: Math.ceil(count.total / limit)
            }
          }
        });
      });
    });
  } catch (error) {
    console.error('Slips list error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// ดูรายการ API logs
router.get('/api-logs', (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    db.all(
      `SELECT al.*, u.username 
       FROM api_logs al 
       LEFT JOIN users u ON al.user_id = u.id 
       ORDER BY al.created_at DESC 
       LIMIT ? OFFSET ?`,
      [limit, offset],
      (err, logs) => {
        if (err) {
          return res.status(500).json({
            success: false,
            message: 'Database error',
            error: err.message
          });
        }

        // นับจำนวน logs ทั้งหมด
        db.get('SELECT COUNT(*) as total FROM api_logs', (err, count) => {
          if (err) {
            return res.status(500).json({
              success: false,
              message: 'Database error',
              error: err.message
            });
          }

          res.json({
            success: true,
            data: {
              logs,
              pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: count.total,
                pages: Math.ceil(count.total / limit)
              }
            }
          });
        });
      }
    );
  } catch (error) {
    console.error('API logs error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// ดูรายการ Quota logs
router.get('/quota-logs', (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    db.all(
      `SELECT ql.*, u.username 
       FROM quota_logs ql 
       LEFT JOIN users u ON ql.user_id = u.id 
       ORDER BY ql.checked_at DESC 
       LIMIT ? OFFSET ?`,
      [limit, offset],
      (err, logs) => {
        if (err) {
          return res.status(500).json({
            success: false,
            message: 'Database error',
            error: err.message
          });
        }

        // นับจำนวน logs ทั้งหมด
        db.get('SELECT COUNT(*) as total FROM quota_logs', (err, count) => {
          if (err) {
            return res.status(500).json({
              success: false,
              message: 'Database error',
              error: err.message
            });
          }

          res.json({
            success: true,
            data: {
              logs,
              pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: count.total,
                pages: Math.ceil(count.total / limit)
              }
            }
          });
        });
      }
    );
  } catch (error) {
    console.error('Quota logs error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// ลบผู้ใช้
router.delete('/users/:id', (req, res) => {
  try {
    const { id } = req.params;

    if (id == req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete your own account'
      });
    }

    db.run('DELETE FROM users WHERE id = ?', [id], function(err) {
      if (err) {
        return res.status(500).json({
          success: false,
          message: 'Database error',
          error: err.message
        });
      }

      if (this.changes === 0) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      res.json({
        success: true,
        message: 'User deleted successfully'
      });
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// เปลี่ยน role ของผู้ใช้
router.put('/users/:id/role', (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role. Must be "user" or "admin"'
      });
    }

    if (id == req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'Cannot change your own role'
      });
    }

    db.run(
      'UPDATE users SET role = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [role, id],
      function(err) {
        if (err) {
          return res.status(500).json({
            success: false,
            message: 'Database error',
            error: err.message
          });
        }

        if (this.changes === 0) {
          return res.status(404).json({
            success: false,
            message: 'User not found'
          });
        }

        res.json({
          success: true,
          message: 'User role updated successfully'
        });
      }
    );
  } catch (error) {
    console.error('Update user role error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Export ข้อมูลสลิปเป็น CSV
router.get('/export/slips', (req, res) => {
  try {
    const { start_date, end_date, status } = req.query;

    let query = `
      SELECT s.*, u.username 
      FROM slips s 
      LEFT JOIN users u ON s.user_id = u.id 
      WHERE 1=1
    `;
    let params = [];

    if (start_date) {
      query += ' AND DATE(s.created_at) >= ?';
      params.push(start_date);
    }

    if (end_date) {
      query += ' AND DATE(s.created_at) <= ?';
      params.push(end_date);
    }

    if (status) {
      query += ' AND s.verification_result = ?';
      params.push(status);
    }

    query += ' ORDER BY s.created_at DESC';

    db.all(query, params, (err, slips) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: 'Database error',
          error: err.message
        });
      }

      // สร้าง CSV header
      const csvHeader = [
        'ID',
        'Username',
        'Filename',
        'File Size',
        'Amount',
        'Bank Code',
        'Bank Name',
        'Sender Name',
        'Sender Account',
        'Recipient Name',
        'Recipient Account',
        'Transaction Date',
        'Transaction Time',
        'Reference ID',
        'Status',
        'Is Verified',
        'Verification Result',
        'Error Message',
        'Created At'
      ].join(',');

      // สร้าง CSV data
      const csvData = slips.map(slip => [
        slip.id,
        slip.username || '',
        slip.filename || '',
        slip.file_size || '',
        slip.amount || '',
        slip.bank_code || '',
        slip.bank_name || '',
        slip.sender_name || '',
        slip.sender_account || '',
        slip.recipient_name || '',
        slip.recipient_account || '',
        slip.transaction_date || '',
        slip.transaction_time || '',
        slip.reference_id || '',
        slip.status || '',
        slip.is_verified ? 'Yes' : 'No',
        slip.verification_result || '',
        (slip.error_message || '').replace(/,/g, ';'),
        slip.created_at || ''
      ].join(','));

      const csv = [csvHeader, ...csvData].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=slips_export.csv');
      res.send(csv);
    });
  } catch (error) {
    console.error('Export slips error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

module.exports = router;

