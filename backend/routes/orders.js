const express = require('express');
const router = express.Router();
const db = require('../database/init');
const config = require('../config');

// Menu data
const menuItems = {
  1: { name: 'ข้าวมันไก่ต้ม', price: 50, image: 'img/kaitom.jpg' },
  2: { name: 'ข้าวมันไก่ทอด', price: 50, image: 'img/kaitod.jpg' },
  3: { name: 'ข้าวมันไก่ผสม (ต้ม + ทอด)', price: 50, image: 'img/pasom.jpg' },
  4: { name: 'แพคอิ่มอวม', price: 80, image: 'img/kaisub.jpg' },
  5: { name: 'Tip น้องมารวย', price: 5, image: 'img/IMG_5366.HEIC' }
};

// Promo codes
const promoCodes = {
  'WELCOME10': { discount: 10, type: 'percentage', minAmount: 100 },
  'SAVE20': { discount: 20, type: 'fixed', minAmount: 50 },
  'NEWUSER': { discount: 15, type: 'percentage', minAmount: 0 }
};

// Get menu
router.get('/menu', (req, res) => {
  try {
    const menu = Object.entries(menuItems).map(([id, item]) => ({
      id: parseInt(id),
      ...item
    }));
    
    res.json({
      success: true,
      data: menu
    });
  } catch (error) {
    console.error('Get menu error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Get PromptPay configuration
router.get('/promptpay', (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        phoneNumber: config.promptpay.phoneNumber,
        name: config.promptpay.name
      }
    });
  } catch (error) {
    console.error('Get PromptPay config error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Validate promo code
router.post('/promo/validate', (req, res) => {
  try {
    const { code, subtotal } = req.body;
    
    if (!code || typeof subtotal !== 'number') {
      return res.status(400).json({
        success: false,
        message: 'Invalid request data'
      });
    }
    
    const promoCode = promoCodes[code.toUpperCase()];
    
    if (!promoCode) {
      return res.status(400).json({
        success: false,
        message: 'รหัสโปรโมชั่นไม่ถูกต้อง'
      });
    }
    
    if (subtotal < promoCode.minAmount) {
      return res.status(400).json({
        success: false,
        message: `ยอดสั่งซื้อต้องมากกว่า ${promoCode.minAmount} บาท`
      });
    }
    
    let discount = 0;
    if (promoCode.type === 'percentage') {
      discount = (subtotal * promoCode.discount) / 100;
    } else {
      discount = promoCode.discount;
    }
    
    // ไม่ให้ส่วนลดเกิน 50% ของยอดรวม
    discount = Math.min(discount, subtotal * 0.5);
    
    res.json({
      success: true,
      data: {
        code: code.toUpperCase(),
        discount: Math.round(discount * 100) / 100,
        type: promoCode.type
      }
    });
  } catch (error) {
    console.error('Validate promo error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Create order
router.post('/orders', (req, res) => {
  try {
    const { customerName, phone, items, promoCode, paymentMethod } = req.body;
    
    // Validate input
    if (!customerName || !phone || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'ข้อมูลไม่ครบถ้วน'
      });
    }
    
    // Calculate total
    let subtotal = 0;
    const orderItems = [];
    
    for (const item of items) {
      const menuItem = menuItems[item.id];
      if (!menuItem) {
        return res.status(400).json({
          success: false,
          message: `ไม่พบสินค้า ID: ${item.id}`
        });
      }
      
      const quantity = parseInt(item.quantity) || 1;
      const itemTotal = menuItem.price * quantity;
      subtotal += itemTotal;
      
      orderItems.push({
        id: item.id,
        name: menuItem.name,
        price: menuItem.price,
        quantity: quantity,
        notes: item.notes || '',
        total: itemTotal
      });
    }
    
    // Apply promo code if provided
    let discount = 0;
    if (promoCode && promoCodes[promoCode.toUpperCase()]) {
      const promo = promoCodes[promoCode.toUpperCase()];
      if (subtotal >= promo.minAmount) {
        if (promo.type === 'percentage') {
          discount = (subtotal * promo.discount) / 100;
        } else {
          discount = promo.discount;
        }
        discount = Math.min(discount, subtotal * 0.5);
      }
    }
    
    const total = subtotal - discount;
    
    // Generate order number
    const orderNumber = 'A' + Date.now().toString().slice(-6);
    
    // Save order to database
    const orderData = {
      orderNumber,
      customerName,
      phone,
      items: orderItems,
      subtotal,
      discount,
      total,
      promoCode: promoCode || null,
      paymentMethod: paymentMethod || 'promptpay',
      status: 'pending',
      createdAt: new Date().toISOString()
    };
    
    db.run(`
      INSERT INTO orders (order_number, customer_name, phone, items, subtotal, discount, total, promo_code, payment_method, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      orderNumber,
      customerName,
      phone,
      JSON.stringify(orderItems),
      subtotal,
      discount,
      total,
      promoCode,
      paymentMethod || 'promptpay',
      'pending',
      orderData.createdAt
    ], function(err) {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({
          success: false,
          message: 'ไม่สามารถบันทึกออเดอร์ได้'
        });
      }
      
      res.json({
        success: true,
        data: {
          orderNumber,
          orderId: this.lastID,
          total,
          items: orderItems,
          customerName,
          phone,
          paymentMethod: paymentMethod || 'promptpay'
        }
      });
    });
    
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Check payment status
router.get('/orders/:orderNumber/check-payment', (req, res) => {
  try {
    const { orderNumber } = req.params;
    
    db.get('SELECT * FROM orders WHERE order_number = ?', [orderNumber], (err, order) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({
          success: false,
          message: 'ไม่สามารถตรวจสอบสถานะได้'
        });
      }
      
      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'ไม่พบออเดอร์'
        });
      }
      
      // For demo purposes, simulate payment verification
      // In real implementation, this would check with payment gateway
      const isPaid = order.status === 'paid' || order.status === 'completed';
      
      res.json({
        success: true,
        data: {
          orderNumber: order.order_number,
          status: order.status,
          isPaid: isPaid,
          total: order.total,
          paymentMethod: order.payment_method
        }
      });
    });
    
  } catch (error) {
    console.error('Check payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Confirm payment
router.post('/orders/:orderNumber/payment', (req, res) => {
  try {
    const { orderNumber } = req.params;
    const { verified } = req.body;
    
    if (typeof verified !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'Invalid verification status'
      });
    }
    
    db.get('SELECT * FROM orders WHERE order_number = ?', [orderNumber], (err, order) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({
          success: false,
          message: 'ไม่สามารถอัปเดตสถานะได้'
        });
      }
      
      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'ไม่พบออเดอร์'
        });
      }
      
      if (order.status === 'paid' || order.status === 'completed') {
        return res.status(400).json({
          success: false,
          message: 'ออเดอร์นี้ได้รับการยืนยันแล้ว'
        });
      }
      
      if (!verified) {
        return res.status(400).json({
          success: false,
          message: 'กรุณาชำระเงินก่อนยืนยัน'
        });
      }
      
      // Update order status
      const newStatus = 'paid';
      db.run(
        'UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE order_number = ?',
        [newStatus, orderNumber],
        function(err) {
          if (err) {
            console.error('Database error:', err);
            return res.status(500).json({
              success: false,
              message: 'ไม่สามารถอัปเดตสถานะได้'
            });
          }
          
          res.json({
            success: true,
            data: {
              orderNumber,
              status: newStatus,
              message: 'ยืนยันการชำระเงินสำเร็จ'
            }
          });
        }
      );
    });
    
  } catch (error) {
    console.error('Confirm payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Cancel order
router.delete('/orders/:orderNumber', (req, res) => {
  try {
    const { orderNumber } = req.params;
    
    db.get('SELECT * FROM orders WHERE order_number = ?', [orderNumber], (err, order) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({
          success: false,
          message: 'ไม่สามารถยกเลิกออเดอร์ได้'
        });
      }
      
      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'ไม่พบออเดอร์'
        });
      }
      
      if (order.status === 'paid' || order.status === 'completed') {
        return res.status(400).json({
          success: false,
          message: 'ไม่สามารถยกเลิกออเดอร์ที่ชำระเงินแล้ว'
        });
      }
      
      // Update order status to cancelled
      db.run(
        'UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE order_number = ?',
        ['cancelled', orderNumber],
        function(err) {
          if (err) {
            console.error('Database error:', err);
            return res.status(500).json({
              success: false,
              message: 'ไม่สามารถยกเลิกออเดอร์ได้'
            });
          }
          
          res.json({
            success: true,
            data: {
              orderNumber,
              status: 'cancelled',
              message: 'ยกเลิกออเดอร์สำเร็จ'
            }
          });
        }
      );
    });
    
  } catch (error) {
    console.error('Cancel order error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Get orders (for admin)
router.get('/orders', (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    
    let query = 'SELECT * FROM orders WHERE 1=1';
    let params = [];
    
    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }
    
    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);
    
    db.all(query, params, (err, orders) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({
          success: false,
          message: 'ไม่สามารถดึงข้อมูลออเดอร์ได้'
        });
      }
      
      // Count total orders
      let countQuery = 'SELECT COUNT(*) as total FROM orders WHERE 1=1';
      let countParams = [];
      
      if (status) {
        countQuery += ' AND status = ?';
        countParams.push(status);
      }
      
      db.get(countQuery, countParams, (err, count) => {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({
            success: false,
            message: 'ไม่สามารถนับจำนวนออเดอร์ได้'
          });
        }
        
        res.json({
          success: true,
          data: {
            orders: orders.map(order => ({
              ...order,
              items: JSON.parse(order.items || '[]')
            })),
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
    console.error('Get orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Get statistics
router.get('/stats', (req, res) => {
  try {
    db.get('SELECT COUNT(*) as total_orders FROM orders', (err, orderCount) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({
          success: false,
          message: 'ไม่สามารถดึงสถิติได้'
        });
      }
      
      db.get('SELECT COUNT(*) as pending_orders FROM orders WHERE status = "pending"', (err, pendingCount) => {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({
            success: false,
            message: 'ไม่สามารถดึงสถิติได้'
          });
        }
        
        db.get('SELECT COUNT(*) as paid_orders FROM orders WHERE status = "paid"', (err, paidCount) => {
          if (err) {
            console.error('Database error:', err);
            return res.status(500).json({
              success: false,
              message: 'ไม่สามารถดึงสถิติได้'
            });
          }
          
          db.get('SELECT SUM(total) as total_revenue FROM orders WHERE status = "paid"', (err, revenue) => {
            if (err) {
              console.error('Database error:', err);
              return res.status(500).json({
                success: false,
                message: 'ไม่สามารถดึงสถิติได้'
              });
            }
            
            res.json({
              success: true,
              data: {
                totalOrders: orderCount.total_orders,
                pendingOrders: pendingCount.pending_orders,
                paidOrders: paidCount.paid_orders,
                totalRevenue: revenue.total_revenue || 0
              }
            });
          });
        });
      });
    });
    
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

module.exports = router;
