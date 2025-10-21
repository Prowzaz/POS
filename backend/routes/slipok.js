const express = require('express');
const multer = require('multer');
const router = express.Router();
const slipokService = require('../services/slipokService');
const { authenticateToken } = require('../middleware/auth');
const { validateSlipUpload } = require('../middleware/validation');
const db = require('../database/init');

// ตั้งค่า multer สำหรับอัพโหลดไฟล์
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // อนุญาตเฉพาะไฟล์รูปภาพ
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// ตรวจสอบสลิป
router.post('/verify', authenticateToken, upload.single('files'), validateSlipUpload, async (req, res) => {
  const startTime = Date.now();
  
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const { amount } = req.body;
    const userId = req.user.id;

    // ตรวจสอบโควต้าก่อน
    const quotaResult = await slipokService.checkQuota();
    if (quotaResult.success && quotaResult.data.data.quota <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Quota exhausted',
        errorCode: '1004'
      });
    }

    // เรียกใช้ SlipOK API
    const result = await slipokService.verifySlip(req.file.buffer, { amount });

    const responseTime = Date.now() - startTime;

    // บันทึกข้อมูลสลิป
    const slipData = {
      user_id: userId,
      filename: req.file.originalname,
      file_size: req.file.size,
      amount: amount || null,
      created_at: new Date().toISOString()
    };

    if (result.success) {
      const data = result.data;
      
      // ตรวจสอบ Error Code
      const errorCode = data?.errorCode || data?.code;
      if (errorCode) {
        slipData.error_code = errorCode;
        slipData.error_message = slipokService.getErrorMessage(errorCode, data.message);
        slipData.verification_result = 'error';
        slipData.raw_response = JSON.stringify(data);
        
        // สำหรับ Error 1012 (สลิปซ้ำ) ให้แสดงข้อมูลที่ได้จาก API
        if (errorCode === '1012' && data.data) {
          const slipInfo = data.data;
          slipData.bank_code = slipInfo.sendingBank;
          slipData.bank_name = slipokService.getBankName(slipInfo.sendingBank);
          slipData.sender_name = slipInfo.sender?.displayName || 'ไม่ระบุ';
          slipData.sender_account = slipInfo.sender?.account?.value || 'ไม่ระบุ';
          slipData.recipient_name = slipInfo.receiver?.displayName || 'ไม่ระบุ';
          slipData.recipient_account = slipInfo.receiver?.account?.value || 'ไม่ระบุ';
          slipData.transaction_date = slipokService.formatDate(slipInfo.transDate);
          slipData.transaction_time = slipInfo.transTime;
          slipData.reference_id = slipInfo.transRef || 'ไม่ระบุ';
          slipData.status = 'สลิปซ้ำ';
          slipData.is_verified = false;
        }
        
        // บันทึกข้อมูลสลิป
        db.run(`
          INSERT INTO slips (user_id, filename, file_size, amount, bank_code, bank_name, sender_name, sender_account, recipient_name, recipient_account, transaction_date, transaction_time, reference_id, status, is_verified, error_code, error_message, verification_result, raw_response)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          slipData.user_id, slipData.filename, slipData.file_size, slipData.amount,
          slipData.bank_code || null, slipData.bank_name || null, slipData.sender_name || null, slipData.sender_account || null,
          slipData.recipient_name || null, slipData.recipient_account || null, slipData.transaction_date || null, slipData.transaction_time || null,
          slipData.reference_id || null, slipData.status || null, slipData.is_verified || false, slipData.error_code || null, slipData.error_message || null, slipData.verification_result || null, slipData.raw_response || null
        ]);

        // บันทึก API log
        db.run(`
          INSERT INTO api_logs (user_id, endpoint, method, status_code, response_time, error_message)
          VALUES (?, ?, ?, ?, ?, ?)
        `, [userId, '/api/slipok/verify', 'POST', result.status, responseTime, slipData.error_message]);

        // สำหรับ Error 1012 (สลิปซ้ำ) ให้ส่งข้อมูลสลิปกลับไปด้วย
        if (errorCode === '1012' && data.data) {
          return res.json({
            success: false,
            message: slipData.error_message,
            errorCode: errorCode,
            data: {
              bank: slipData.bank_name,
              amount: data.data.amount?.toString() || 'ไม่ระบุ',
              currency: data.data.paidLocalCurrency || 'THB',
              date: slipData.transaction_date,
              time: slipData.transaction_time,
              sender: {
                name: slipData.sender_name,
                account: slipData.sender_account
              },
              recipient: {
                name: slipData.recipient_name,
                account: slipData.recipient_account
              },
              status: slipData.status,
              reference: slipData.reference_id,
              transaction_type: 'โอนเงิน',
              fee: data.data.transFeeAmount || '0.00',
              balance_after: 'ไม่ระบุ'
            },
            isRealSlip: false,
            isDuplicate: true
          });
        }

        return res.status(400).json({
          success: false,
          message: slipData.error_message,
          errorCode: errorCode,
          data: data
        });
      }

      // ประมวลผลข้อมูลสำเร็จ
      if (data && data.success === true && data.data && data.data.success === true) {
        const slipInfo = data.data;
        
        slipData.bank_code = slipInfo.receivingBank;
        slipData.bank_name = slipokService.getBankName(slipInfo.receivingBank);
        slipData.sender_name = slipInfo.sender?.displayName || slipInfo.sender?.name || 'ไม่ระบุ';
        slipData.sender_account = slipInfo.sender?.account?.value || 'ไม่ระบุ';
        slipData.recipient_name = slipInfo.receiver?.displayName || slipInfo.receiver?.name || 'ไม่ระบุ';
        slipData.recipient_account = slipInfo.receiver?.account?.value || 'ไม่ระบุ';
        slipData.transaction_date = slipokService.formatDate(slipInfo.transDate);
        slipData.transaction_time = slipInfo.transTime;
        slipData.reference_id = slipInfo.transRef || 'ไม่ระบุ';
        slipData.status = slipInfo.success ? 'จ่ายเงินสำเร็จ' : 'ไม่สามารถตรวจสอบได้';
        slipData.is_verified = true;
        slipData.verification_result = 'success';
        slipData.raw_response = JSON.stringify(data);

        // ตรวจสอบบัญชีผู้รับ
        const isCorrectRecipient = slipData.recipient_name.includes('มณี') || slipData.recipient_name.includes('แม่มณี');
        if (!isCorrectRecipient) {
          slipData.verification_result = 'wrong_recipient';
          slipData.error_message = 'บัญชีผู้รับไม่ใช่แม่มณี';
        }

        // บันทึกข้อมูลสลิป
        db.run(`
          INSERT INTO slips (user_id, filename, file_size, amount, bank_code, bank_name, sender_name, sender_account, recipient_name, recipient_account, transaction_date, transaction_time, reference_id, status, is_verified, error_code, error_message, verification_result, raw_response)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          slipData.user_id, slipData.filename, slipData.file_size, slipData.amount,
          slipData.bank_code || null, slipData.bank_name || null, slipData.sender_name || null, slipData.sender_account || null,
          slipData.recipient_name || null, slipData.recipient_account || null, slipData.transaction_date || null, slipData.transaction_time || null,
          slipData.reference_id || null, slipData.status || null, slipData.is_verified || false, slipData.error_code || null,
          slipData.error_message || null, slipData.verification_result || null, slipData.raw_response || null
        ]);

        // บันทึก API log
        db.run(`
          INSERT INTO api_logs (user_id, endpoint, method, status_code, response_time)
          VALUES (?, ?, ?, ?, ?)
        `, [userId, '/api/slipok/verify', 'POST', result.status, responseTime]);

        return res.json({
          success: slipData.verification_result === 'success',
          message: slipData.verification_result === 'success' ? 'ตรวจสอบสลิปสำเร็จ' : slipData.error_message,
          data: {
            bank: slipData.bank_name,
            amount: slipInfo.amount?.toString() || 'ไม่ระบุ',
            currency: slipInfo.paidLocalCurrency || 'THB',
            date: slipData.transaction_date,
            time: slipData.transaction_time,
            sender: {
              name: slipData.sender_name,
              account: slipData.sender_account
            },
            recipient: {
              name: slipData.recipient_name,
              account: slipData.recipient_account
            },
            status: slipData.status,
            reference: slipData.reference_id,
            transaction_type: 'โอนเงิน',
            fee: slipInfo.transFeeAmount || '0.00',
            balance_after: 'ไม่ระบุ'
          },
          isRealSlip: slipData.verification_result === 'success'
        });
      } else {
        // ข้อมูลไม่ถูกต้อง
        slipData.verification_result = 'invalid_data';
        slipData.error_message = 'ข้อมูลสลิปไม่ถูกต้อง';
        slipData.raw_response = JSON.stringify(data);

        // บันทึกข้อมูลสลิป
        db.run(`
          INSERT INTO slips (user_id, filename, file_size, amount, verification_result, error_message, raw_response)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [slipData.user_id, slipData.filename, slipData.file_size, slipData.amount, slipData.verification_result, slipData.error_message, slipData.raw_response]);

        return res.status(400).json({
          success: false,
          message: slipData.error_message,
          data: data
        });
      }
    } else {
      // API Error
      slipData.verification_result = 'api_error';
      slipData.error_message = result.error.message || 'ไม่สามารถเชื่อมต่อ SlipOK API ได้';
      slipData.raw_response = JSON.stringify(result.error);

      // บันทึกข้อมูลสลิป
      db.run(`
        INSERT INTO slips (user_id, filename, file_size, amount, verification_result, error_message, raw_response)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [slipData.user_id, slipData.filename, slipData.file_size, slipData.amount, slipData.verification_result, slipData.error_message, slipData.raw_response]);

      // บันทึก API log
      db.run(`
        INSERT INTO api_logs (user_id, endpoint, method, status_code, response_time, error_message)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [userId, '/api/slipok/verify', 'POST', result.status, responseTime, slipData.error_message]);

      return res.status(500).json({
        success: false,
        message: slipData.error_message,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Slip verification error:', error);
    
    // บันทึก API log
    db.run(`
      INSERT INTO api_logs (user_id, endpoint, method, status_code, response_time, error_message)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [req.user.id, '/api/slipok/verify', 'POST', 500, Date.now() - startTime, error.message]);

    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// ตรวจสอบโควต้า
router.get('/quota', authenticateToken, async (req, res) => {
  try {
    const result = await slipokService.checkQuota();
    
    if (result.success) {
      // บันทึก quota log
      db.run(`
        INSERT INTO quota_logs (user_id, quota_remaining, quota_over)
        VALUES (?, ?, ?)
      `, [req.user.id, result.data.data.quota, result.data.data.overQuota]);

      res.json({
        success: true,
        data: result.data.data
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to check quota',
        error: result.error
      });
    }
  } catch (error) {
    console.error('Quota check error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

module.exports = router;

