// script.js - สำหรับหน้า index.html
document.addEventListener('DOMContentLoaded', () => {
    const addToCartButtons = document.querySelectorAll('.btn');
    const cartCountElement = document.querySelector('.cart-count');
    const floatingCart = document.querySelector('.floating-cart');

    // โหลดข้อมูลตะกร้าจาก localStorage
    let cart = JSON.parse(localStorage.getItem('shoppingCart')) || [];

    // ฟังก์ชันอัปเดตตัวเลขบนไอคอนตะกร้า
    function updateCartBadge() {
        if (!cartCountElement) return;
        const totalItems = cart.reduce((sum, item) => sum + (item.quantity || 0), 0);
        cartCountElement.textContent = totalItems;
        
        // เปลี่ยนสีถ้ามีสินค้าในตะกร้า
        if (totalItems > 0) {
            floatingCart.style.backgroundColor = '#e87325';
        } else {
            floatingCart.style.backgroundColor = '#999';
        }
    }

    // ฟังก์ชันบันทึกตะกร้าลง localStorage
    function saveCart() {
        localStorage.setItem('shoppingCart', JSON.stringify(cart));
        updateCartBadge();
    }

    // ฟังก์ชันแสดงข้อความแจ้งเตือน
    function showNotification(message, type = 'success') {
        // สร้าง element สำหรับแจ้งเตือน
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
            <span>${message}</span>
        `;
        
        // เพิ่ม styles
        notification.style.cssText = `
            position: fixed;
            top: 100px;
            right: 20px;
            background: ${type === 'success' ? '#4CAF50' : '#f44336'};
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            z-index: 3000;
            animation: slideInRight 0.3s ease;
            display: flex;
            align-items: center;
            gap: 10px;
            font-family: 'Kanit', sans-serif;
        `;
        
        // เพิ่ม animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideInRight {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            @keyframes slideOutRight {
                from {
                    transform: translateX(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(100%);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);
        
        document.body.appendChild(notification);
        
        // ลบแจ้งเตือนหลังจาก 3 วินาที
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 3000);
    }

    // เพิ่มเหตุการณ์คลิกให้กับทุกปุ่ม "เพิ่มลงตะกร้า"
    if (addToCartButtons.length > 0) {
        addToCartButtons.forEach(button => {
            button.addEventListener('click', (event) => {
                const card = event.target.closest('.menu-card');
                const itemName = card.querySelector('.card-title').textContent.trim();
                const itemPrice = card.querySelector('.price').textContent.trim();
                const itemImage = card.querySelector('.card-img').src;
                
                // ดึง ID จาก data attribute ของการ์ด
                const itemId = parseInt(card.getAttribute('data-id'));
                
                // ตรวจสอบว่าได้ ID หรือไม่
                if (!itemId || isNaN(itemId)) {
                    console.error('❌ ไม่พบ data-id หรือ ID ไม่ถูกต้อง:', card);
                    showNotification('เกิดข้อผิดพลาดในการเพิ่มสินค้า', 'error');
                    return;
                }
                
                // ตรวจสอบว่ามีสินค้านี้ในตะกร้าแล้วหรือยัง
                const existingItem = cart.find(item => item.id === itemId);

                if (existingItem) {
                    // ถ้ามีแล้วให้เพิ่มจำนวน
                    existingItem.quantity = (existingItem.quantity || 1) + 1;
                    showNotification(`เพิ่ม ${itemName} อีก 1 จาน (รวม ${existingItem.quantity} จาน)`);
                } else {
                    // ถ้ายังไม่มีให้เพิ่มสินค้าใหม่
                    const product = {
                        id: itemId, // ใช้ ID จาก data attribute
                        name: itemName,
                        price: itemPrice,
                        image: itemImage,
                        quantity: 1,
                        notes: '' 
                    };
                    cart.push(product);
                    showNotification(`เพิ่ม ${itemName} ลงตะกร้าแล้ว`);
                }
                
                // บันทึกและอัปเดตตัวเลข
                saveCart();
                
                // เพิ่มแอนิเมชันให้ปุ่ม
                button.textContent = '✓ เพิ่มแล้ว';
                button.style.backgroundColor = '#4CAF50';
                setTimeout(() => {
                    button.textContent = 'เพิ่มลงตะกร้า';
                    button.style.backgroundColor = '';
                }, 1000);
                
                // เพิ่มแอนิเมชัน pop ให้ตะกร้า
                if (floatingCart) {
                    floatingCart.classList.add('pop');
                    setTimeout(() => {
                        floatingCart.classList.remove('pop');
                    }, 400);
                }
            });
        });
    }
    
    // เพิ่มเอฟเฟกต์ hover ให้การ์ดเมนู
    const menuCards = document.querySelectorAll('.menu-card');
    menuCards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-5px)';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
        });
    });
    
    // ตรวจสอบว่ามีสินค้าในตะกร้าหรือไม่เมื่อคลิกตะกร้า
    if (floatingCart) {
        floatingCart.addEventListener('click', (e) => {
            const totalItems = cart.reduce((sum, item) => sum + (item.quantity || 0), 0);
            if (totalItems === 0) {
                e.preventDefault();
                showNotification('ตะกร้าว่าง กรุณาเลือกสินค้าก่อน', 'error');
            } else {
                // เปลี่ยนไปหน้า checkout-final.html
                e.preventDefault();
                window.location.href = 'checkout-final.html';
            }
        });
    }
    
    // อัปเดตตัวเลขเมื่อโหลดหน้าเว็บ
    updateCartBadge();
    
    // แสดงข้อความต้อนรับ
    if (!sessionStorage.getItem('welcomed')) {
        setTimeout(() => {
            showNotification('ยินดีต้อนรับสู่ร้านข้าวมันไก่ท้ายซอยไอยรา 21 🍗');
            sessionStorage.setItem('welcomed', 'true');
        }, 1000);
    }
});