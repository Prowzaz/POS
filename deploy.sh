#!/bin/bash

echo "🚀 กำลัง Deploy ระบบ SlipOK..."

# ตรวจสอบ Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker ไม่ได้ติดตั้ง กรุณาติดตั้ง Docker ก่อน"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose ไม่ได้ติดตั้ง กรุณาติดตั้ง Docker Compose ก่อน"
    exit 1
fi

# หยุด containers ที่ทำงานอยู่
echo "🛑 หยุด containers ที่ทำงานอยู่..."
docker-compose down

# ลบ images เก่า
echo "🗑️ ลบ images เก่า..."
docker-compose down --rmi all

# Build และเริ่มต้น containers ใหม่
echo "🔨 Build และเริ่มต้น containers..."
docker-compose up --build -d

# ตรวจสอบสถานะ
echo "⏳ รอให้ containers เริ่มต้น..."
sleep 10

# ตรวจสอบสถานะ containers
echo "📊 สถานะ containers:"
docker-compose ps

# ตรวจสอบ logs
echo "📝 Logs:"
docker-compose logs --tail=20

echo ""
echo "🎉 Deploy เสร็จสิ้น!"
echo "🌐 Frontend: http://localhost:3000"
echo "🔧 Backend: http://localhost:3001"
echo "👑 Admin: http://localhost:3000/admin"
echo ""
echo "🔑 Admin Login: admin / admin123"
echo "👤 User Login: user / user123"






