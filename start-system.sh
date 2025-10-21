#!/bin/bash

echo "🚀 เริ่มต้นระบบร้านข้าวมันไก่ท้ายซอยไอยรา 21"
echo "================================================"

# ตรวจสอบว่า Node.js ติดตั้งแล้วหรือไม่
if ! command -v node &> /dev/null; then
    echo "❌ ไม่พบ Node.js กรุณาติดตั้ง Node.js ก่อน"
    exit 1
fi

# ตรวจสอบว่า npm ติดตั้งแล้วหรือไม่
if ! command -v npm &> /dev/null; then
    echo "❌ ไม่พบ npm กรุณาติดตั้ง npm ก่อน"
    exit 1
fi

echo "✅ Node.js และ npm พร้อมใช้งาน"

# เข้าไปในโฟลเดอร์ backend
echo "📁 เข้าสู่โฟลเดอร์ backend..."
cd backend

# ติดตั้ง dependencies
echo "📦 ติดตั้ง dependencies..."
npm install

# เริ่มต้น backend server
echo "🖥️  เริ่มต้น backend server..."
echo "   Backend จะทำงานที่ http://localhost:3001"
echo "   API endpoints:"
echo "   - GET  /api/menu"
echo "   - POST /api/orders"
echo "   - POST /api/promo/validate"
echo "   - GET  /api/orders/:orderNumber/check-payment"
echo "   - POST /api/orders/:orderNumber/payment"
echo ""

# เริ่มต้น server ในพื้นหลัง
npm start &
BACKEND_PID=$!

# รอให้ backend เริ่มต้น
echo "⏳ รอให้ backend เริ่มต้น..."
sleep 5

# ตรวจสอบว่า backend ทำงานหรือไม่
if curl -s http://localhost:3001/health > /dev/null; then
    echo "✅ Backend server ทำงานเรียบร้อย"
else
    echo "❌ Backend server ไม่สามารถเริ่มต้นได้"
    kill $BACKEND_PID 2>/dev/null
    exit 1
fi

# กลับไปที่โฟลเดอร์หลัก
cd ..

echo ""
echo "🌐 เปิดหน้าเว็บในเบราว์เซอร์..."
echo "   Frontend: file://$(pwd)/frontend/index.html"
echo "   หรือเปิดไฟล์ frontend/index.html ในเบราว์เซอร์"
echo ""

# เปิดหน้าเว็บในเบราว์เซอร์ (macOS)
if [[ "$OSTYPE" == "darwin"* ]]; then
    open frontend/index.html
fi

echo "🎉 ระบบพร้อมใช้งาน!"
echo ""
echo "📋 วิธีการใช้งาน:"
echo "   1. เลือกเมนูที่ต้องการ"
echo "   2. กดปุ่ม 'เพิ่มลงตะกร้า'"
echo "   3. กดไอคอนตะกร้าสินค้าเพื่อไปหน้า checkout"
echo "   4. กรอกข้อมูลและชำระเงิน"
echo ""
echo "🔧 รหัสโปรโมชั่น:"
echo "   - WELCOME10 (ส่วนลด 10%)"
echo "   - SAVE20 (ส่วนลด 20 บาท)"
echo "   - NEWUSER (ส่วนลด 15%)"
echo ""
echo "⏹️  กด Ctrl+C เพื่อหยุดระบบ"

# รอให้ผู้ใช้กด Ctrl+C
trap "echo ''; echo '🛑 หยุดระบบ...'; kill $BACKEND_PID 2>/dev/null; exit 0" INT

# รอให้ backend ทำงาน
wait $BACKEND_PID
