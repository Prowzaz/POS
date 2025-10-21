const axios = require('axios');
const config = require('../config');

class SlipOKService {
  constructor() {
    this.baseUrl = config.slipok.baseUrl;
    this.apiKey = config.slipok.apiKey;
    this.branchId = config.slipok.branchId;
  }

  async verifySlip(fileBuffer, options = {}) {
    try {
      const FormData = require('form-data');
      const formData = new FormData();
      formData.append('files', fileBuffer, 'slip.jpg');
      formData.append('log', 'true');
      
      if (options.amount) {
        formData.append('amount', options.amount.toString());
      }

      const response = await axios.post(
        `${this.baseUrl}/${this.branchId}`,
        formData,
        {
          headers: {
            'x-authorization': this.apiKey,
            'Accept': 'application/json',
            ...formData.getHeaders()
          },
          timeout: 30000 // 30 seconds timeout
        }
      );

      return {
        success: true,
        data: response.data,
        status: response.status
      };
    } catch (error) {
      console.error('SlipOK API Error:', error.response?.data || error.message);
      
      return {
        success: false,
        error: error.response?.data || {
          code: 'API_ERROR',
          message: error.message
        },
        status: error.response?.status || 500
      };
    }
  }

  async checkQuota() {
    try {
      const response = await axios.get(
        `${this.baseUrl}/${this.branchId}/quota`,
        {
          headers: {
            'x-authorization': this.apiKey,
            'Accept': 'application/json'
          },
          timeout: 10000 // 10 seconds timeout
        }
      );

      return {
        success: true,
        data: response.data,
        status: response.status
      };
    } catch (error) {
      console.error('SlipOK Quota API Error:', error.response?.data || error.message);
      
      return {
        success: false,
        error: error.response?.data || {
          code: 'QUOTA_ERROR',
          message: error.message
        },
        status: error.response?.status || 500
      };
    }
  }

  // ฟังก์ชันแปลงรหัสธนาคาร
  getBankName(bankCode) {
    const bankCodes = {
      "002": "ธนาคารกรุงเทพ (BBL)",
      "004": "ธนาคารกสิกรไทย (KBANK)",
      "006": "ธนาคารกรุงไทย (KTB)",
      "011": "ธนาคารทหารไทยธนชาต (TTB)",
      "014": "ธนาคารไทยพาณิชย์ (SCB)",
      "022": "ธนาคารซีไอเอ็มบีไทย (CIMBT)",
      "024": "ธนาคารยูโอบี (UOBT)",
      "025": "ธนาคารกรุงศรีอยุธยา (BAY)",
      "030": "ธนาคารออมสิน (GSB)",
      "033": "ธนาคารอาคารสงเคราะห์ (GHB)",
      "034": "ธนาคารเพื่อการเกษตรและสหกรณ์การเกษตร (BAAC)",
      "035": "ธนาคารเพื่อการส่งออกและนำเข้าแห่งประเทศไทย (EXIM)",
      "067": "ธนาคารทิสโก้ (TISCO)",
      "069": "ธนาคารเกียรตินาคินภัทร (KKP)",
      "070": "ธนาคารไอซีบีซี (ไทย) (ICBCT)",
      "071": "ธนาคารไทยเครดิตเพื่อรายย่อย (TCD)",
      "073": "ธนาคารแลนด์ แอนด์ เฮ้าส์ (LHFG)",
      "098": "ธนาคารพัฒนาวิสาหกิจขนาดกลางและขนาดย่อมแห่งประเทศไทย (SME)"
    };
    return bankCodes[bankCode] || `ธนาคารรหัส ${bankCode}`;
  }

  // ฟังก์ชันแปลงวันที่
  formatDate(dateString) {
    if (!dateString) return "ไม่ระบุ";
    if (dateString.length === 8) {
      const year = dateString.substring(0, 4);
      const month = dateString.substring(4, 6);
      const day = dateString.substring(6, 8);
      return `${day}/${month}/${year}`;
    }
    return dateString;
  }

  // ฟังก์ชันจัดการ Error Code
  getErrorMessage(errorCode, message) {
    const errorMessages = {
      "1000": "กรุณาใส่ข้อมูล QR Code ให้ครบใน field data, files หรือ url",
      "1001": "ไม่พบข้อมูลสาขา กรุณาตรวจสอบไอดีสาขา",
      "1002": "Authorization Header ไม่ถูกต้อง",
      "1003": "Package ของคุณหมดอายุแล้ว",
      "1004": "Package ของคุณใช้เกินโควต้ามาแล้ว 400 บาท กรุณาต่อสมาชิกแพ็กเกจ",
      "1005": "ไฟล์ไม่ใช่ไฟล์ภาพ กรุณาอัพโหลดไฟล์เฉพาะนามสกุล .jpg .jpeg .png .jfif หรือ .webp",
      "1006": "รูปภาพไม่ถูกต้อง",
      "1007": "รูปภาพไม่มี QR Code",
      "1008": "QR ดังกล่าวไม่ใช่ QR สำหรับการตรวจสอบการชำระเงิน",
      "1009": "ขออภัยในความไม่สะดวก ขณะนี้ข้อมูลธนาคารเกิดขัดข้องชั่วคราว โปรดตรวจใหม่อีกครั้งใน 15 นาทีถัดไป (ไม่เสียโควต้าสลิป)",
      "1010": "เนื่องจากเป็นสลิปจากธนาคาร กรุณารอการตรวจสอบสลิปหลังการโอนประมาณ นาที",
      "1011": "QR Code หมดอายุ หรือ ไม่มีรายการอยู่จริง",
      "1012": "สลิปซ้ำ สลิปนี้เคยส่งเข้ามาในระบบเมื่อ",
      "1013": "ยอดที่ส่งมาไม่ตรงกับยอดสลิป",
      "1014": "บัญชีผู้รับไม่ตรงกับบัญชีหลักของร้าน อย่าพึ่งทำอะไรจนกว่าจะสั่ง"
    };
    
    return errorMessages[errorCode] || message || "เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ";
  }
}

module.exports = new SlipOKService();

