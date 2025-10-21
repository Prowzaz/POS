# ร้านข้าวมันไก่ท้ายซอยไอยรา 21

ระบบสั่งซื้ออาหารออนไลน์สำหรับร้านข้าวมันไก่ พร้อมระบบชำระเงินผ่าน PromptPay QR Code

## 🚀 ฟีเจอร์หลัก

- **เมนูอาหารหลากหลาย**: ข้าวมันไก่ต้ม, ทอด, ผสม, และแพคพิเศษ
- **ระบบสั่งซื้อออนไลน์**: เลือกเมนูและเพิ่มลงตะกร้าได้ง่ายๆ
- **ชำระเงิน PromptPay**: สแกน QR Code เพื่อชำระเงินสะดวก
- **ระบบโปรโมชั่น**: รหัสส่วนลดสำหรับลูกค้า
- **หน้าติดต่อครบครัน**: ข้อมูลร้าน, แผนที่, และแบบฟอร์มติดต่อ

## 📁 โครงสร้างโปรเจค

```
kaomankai/
├── frontend/                 # หน้าเว็บ Frontend
│   ├── index.html           # หน้าหลัก - เมนูอาหาร
│   ├── checkout.html        # หน้าสั่งซื้อ
│   ├── about.html           # หน้าเกี่ยวกับเรา
│   ├── services.html        # หน้าบริการ
│   ├── contact.html         # หน้าติดต่อเรา
│   ├── style.css            # CSS หลัก
│   ├── script.js            # JavaScript หน้าหลัก
│   ├── checkout.js          # JavaScript หน้าสั่งซื้อ
│   ├── api.js               # API Helper
│   ├── qr-generator-v2.js   # QR Code Generator
│   └── img/                 # รูปภาพ
│       ├── demologo.png
│       ├── kaitom.jpg
│       ├── kaitod.jpg
│       ├── pasom.jpg
│       ├── kaisub.jpg
│       └── IMG_5366.HEIC
├── backend/                 # Backend API
│   ├── server.js            # Express Server
│   ├── config.js            # การตั้งค่า
│   ├── routes/              # API Routes
│   │   ├── orders.js        # ระบบสั่งซื้อ
│   │   ├── auth.js          # ระบบ Authentication
│   │   ├── slipok.js        # ระบบ SlipOK
│   │   └── admin.js         # ระบบ Admin
│   ├── database/            # ฐานข้อมูล
│   │   ├── init.js          # เริ่มต้นฐานข้อมูล
│   │   └── slipok.db        # SQLite Database
│   ├── middleware/          # Middleware
│   ├── services/            # Business Logic
│   └── package.json         # Dependencies
├── start-system.sh          # Script เริ่มต้นระบบ
└── README.md               # เอกสารนี้
```

## 🛠️ การติดตั้งและใช้งาน

### ข้อกำหนดระบบ
- Node.js (เวอร์ชัน 14 หรือใหม่กว่า)
- npm หรือ yarn
- เบราว์เซอร์ที่รองรับ ES6+

### วิธีการติดตั้ง

1. **Clone หรือดาวน์โหลดโปรเจค**
   ```bash
   # ถ้าใช้ git
   git clone <repository-url>
   cd kaomankai
   ```

2. **ติดตั้ง Dependencies**
   ```bash
   cd backend
   npm install
   ```

3. **เริ่มต้นระบบ**
   ```bash
   # ใช้ script ที่เตรียมไว้
   ./start-system.sh
   
   # หรือเริ่มต้นด้วยตนเอง
   cd backend
   npm start
   ```

4. **เปิดหน้าเว็บ**
   - เปิดไฟล์ `frontend/index.html` ในเบราว์เซอร์
   - หรือใช้ Live Server extension ใน VS Code

## 🌐 API Endpoints

### ระบบสั่งซื้อ
- `GET /api/menu` - ดึงข้อมูลเมนู
- `POST /api/orders` - สร้างออเดอร์ใหม่
- `GET /api/orders/:orderNumber/check-payment` - ตรวจสอบสถานะการชำระเงิน
- `POST /api/orders/:orderNumber/payment` - ยืนยันการชำระเงิน
- `DELETE /api/orders/:orderNumber` - ยกเลิกออเดอร์

### ระบบโปรโมชั่น
- `POST /api/promo/validate` - ตรวจสอบรหัสโปรโมชั่น

### ระบบสถิติ
- `GET /api/stats` - ดึงข้อมูลสถิติ

## 🎯 วิธีการใช้งาน

### สำหรับลูกค้า
1. **เลือกเมนู**: เปิดหน้าเว็บและเลือกเมนูที่ต้องการ
2. **เพิ่มลงตะกร้า**: กดปุ่ม "เพิ่มลงตะกร้า" สำหรับแต่ละเมนู
3. **ไปหน้า Checkout**: กดไอคอนตะกร้าสินค้า
4. **กรอกข้อมูล**: กรอกชื่อและเบอร์โทรศัพท์
5. **ใช้โปรโมชั่น**: ใส่รหัสส่วนลด (ถ้ามี)
6. **ชำระเงิน**: สแกน QR Code เพื่อชำระเงิน
7. **ยืนยันการชำระ**: กดปุ่ม "ยืนยันการชำระเงิน"

### รหัสโปรโมชั่น
- `WELCOME10` - ส่วนลด 10% (ยอดขั้นต่ำ 100 บาท)
- `SAVE20` - ส่วนลด 20 บาท (ยอดขั้นต่ำ 50 บาท)
- `NEWUSER` - ส่วนลด 15% (ไม่มียอดขั้นต่ำ)

## 🔧 การตั้งค่า

### Backend Configuration
แก้ไขไฟล์ `backend/config.js`:
```javascript
module.exports = {
  server: {
    port: process.env.PORT || 3001,
    nodeEnv: process.env.NODE_ENV || 'development'
  },
  // ... การตั้งค่าอื่นๆ
};
```

### PromptPay Configuration
แก้ไขไฟล์ `frontend/checkout.js` บรรทัด 461:
```javascript
const promptPayId = '0812345678'; // ใส่เบอร์ PromptPay จริง
```

## 🗄️ ฐานข้อมูล

ระบบใช้ SQLite Database เก็บข้อมูล:
- **orders**: ข้อมูลออเดอร์
- **users**: ข้อมูลผู้ใช้ (สำหรับระบบ admin)
- **slips**: ข้อมูลสลิป (สำหรับระบบ SlipOK)
- **api_logs**: บันทึกการใช้งาน API

## 🎨 การปรับแต่ง

### สีธีม
แก้ไขไฟล์ `frontend/style.css`:
```css
:root {
  --primary-color: #e87325;    /* สีหลัก */
  --secondary-color: #fecf40;  /* สีรอง */
  --accent-color: #28a745;     /* สีเน้น */
}
```

### เมนูอาหาร
แก้ไขไฟล์ `backend/routes/orders.js`:
```javascript
const menuItems = {
  1: { name: 'ข้าวมันไก่ต้ม', price: 50, image: 'img/kaitom.jpg' },
  // เพิ่มเมนูใหม่ที่นี่
};
```

## 🐛 การแก้ไขปัญหา

### Backend ไม่เริ่มต้น
```bash
# ตรวจสอบ port
lsof -i :3001

# เปลี่ยน port ใน config.js
```

### QR Code ไม่แสดง
- ตรวจสอบการเชื่อมต่ออินเทอร์เน็ต
- ตรวจสอบว่า QRCode library โหลดสำเร็จ
- ดู Console ในเบราว์เซอร์เพื่อดู error

### API ไม่ตอบสนอง
- ตรวจสอบว่า backend ทำงานอยู่
- ตรวจสอบ CORS settings
- ดู Network tab ในเบราว์เซอร์

## 📱 การใช้งานบนมือถือ

ระบบรองรับการใช้งานบนมือถือ:
- Responsive Design
- Touch-friendly interface
- QR Code สแกนได้ง่าย

## 🔒 ความปลอดภัย

- Input validation
- SQL injection protection
- XSS protection
- Rate limiting
- CORS configuration

## 📈 การพัฒนาต่อ

### ฟีเจอร์ที่สามารถเพิ่มได้
- ระบบสมาชิก
- ระบบคะแนนสะสม
- ระบบจัดส่ง
- ระบบแจ้งเตือน
- ระบบรายงาน
- ระบบจัดการสต็อก

## 📞 การสนับสนุน

หากมีปัญหาหรือข้อสงสัย:
- ดู Console ในเบราว์เซอร์
- ตรวจสอบ Network tab
- ดู Log ใน Terminal
- อ่านเอกสาร API

## 📄 License

MIT License - ใช้งานได้อย่างอิสระ

---

**ร้านข้าวมันไก่ท้ายซอยไอยรา 21**  
*อร่อย ถูกใจ คุ้มค่า*# POS
