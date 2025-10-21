// checkout.js - Fixed Version
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Checkout page loaded');
    
    // --- Element References ---
    const summaryItemsList = document.getElementById('summary-items-list');
    const subtotalPriceEl = document.getElementById('subtotal-price');
    const totalPriceEl = document.getElementById('total-price');
    const checkoutForm = document.getElementById('checkout-form');
    const promoCodeInput = document.getElementById('promo-code-input');
    const applyPromoBtn = document.getElementById('apply-promo-btn');
    const discountRow = document.getElementById('discount-row');
    const discountAmountEl = document.getElementById('discount-amount');
    const qrModal = document.getElementById('qr-modal');
    const qrCodeContainer = document.getElementById('qrcode-container');
    const closeModalBtn = document.querySelector('.close-button');
    const paymentTimerContainer = document.getElementById('payment-timer-container');
    const paymentConfirmedBtn = document.getElementById('payment-confirmed-btn');
    const orderSuccessModal = document.getElementById('order-success-modal');
    const orderNumberSpan = document.getElementById('order-number-span');
    const cancelOrderBtn = document.getElementById('cancel-order-btn');

    // --- Variables ---
    let cart = JSON.parse(localStorage.getItem('shoppingCart')) || [];
    let subtotal = 0;
    let discount = 0;
    let currentPromoCode = null;
    let createdOrderNumber = null;
    let countdownInterval = null;
    let countdownEndTime = 0;
    let promptpayConfig = null;

    // --- Helper Functions ---
    function updateTotals() {
        const total = subtotal - discount;
        if (discount > 0) {
            discountAmountEl.textContent = `-${discount.toFixed(2)}฿`;
            discountRow.style.display = 'flex';
        } else {
            discountRow.style.display = 'none';
        }
        subtotalPriceEl.textContent = `${subtotal.toFixed(2)}฿`;
        totalPriceEl.textContent = `${total.toFixed(2)}฿`;
    }

    function renderCart() {
        console.log('📋 Rendering cart:', cart.length, 'items');
        
        if (!summaryItemsList) {
            console.error('❌ Summary list element not found');
            return;
        }
        
        if (cart.length === 0) {
            alert("ไม่มีสินค้าในตะกร้า กลับไปเลือกซื้ออาหาร");
            window.location.href = 'index.html';
            return;
        }
        
        summaryItemsList.innerHTML = '';
        subtotal = 0;
        
        cart.forEach(item => {
            const quantity = item.quantity || 1;
            const priceNumber = parseFloat(item.price.replace('฿', ''));
            const itemTotalPrice = priceNumber * quantity;
            subtotal += itemTotalPrice;
            
            const itemDiv = document.createElement('div');
            itemDiv.classList.add('summary-item');
            itemDiv.innerHTML = `
                <div class="summary-item-info">
                    <span class="summary-item-name">${item.name}</span>
                    <div class="summary-item-controls">
                        <div class="quantity-controls">
                            <button class="quantity-btn minus-btn" data-id="${item.id}">-</button>
                            <span class="quantity-text">x${quantity}</span>
                            <button class="quantity-btn plus-btn" data-id="${item.id}">+</button>
                        </div>
                        <span class="summary-item-price">${itemTotalPrice.toFixed(2)}฿</span>
                    </div>
                </div>
                <input type="text" class="note-input" data-id="${item.id}" 
                       placeholder="เพิ่มหมายเหตุ (เช่น ไม่ใส่ผัก)" 
                       value="${item.notes || ''}">
            `;
            summaryItemsList.appendChild(itemDiv);
        });
        
        updateTotals();
        console.log('✅ Cart rendered. Subtotal:', subtotal);
    }
    
    function saveCart() {
        localStorage.setItem('shoppingCart', JSON.stringify(cart));
    }
    
    function saveAndReRender() {
        saveCart();
        renderCart();
    }
    
    function managePaymentCountdown() {
        if (!countdownInterval) {
            paymentTimerContainer.classList.add('visible');
            countdownEndTime = Date.now() + 5 * 60 * 1000;

            countdownInterval = setInterval(() => {
                const now = Date.now();
                const remainingTime = countdownEndTime - now;

                if (remainingTime <= 0) {
                    clearInterval(countdownInterval);
                    countdownInterval = null;
                    paymentTimerContainer.classList.remove('visible');
                    alert('หมดเวลาชำระเงินแล้ว หากต้องการสั่งซ้ำกรุณากลับไปสั่งใหม่');
                    
                    if (createdOrderNumber && window.API) {
                        cancelOrderOnBackend(createdOrderNumber);
                    }
                    
                    localStorage.removeItem('shoppingCart');
                    window.location.href = 'index.html';
                    return;
                }

                const minutesLeft = Math.floor((remainingTime % (1000 * 60 * 60)) / (1000 * 60));
                const secondsLeft = Math.floor((remainingTime % (1000 * 60)) / 1000);
                
                const countdownElement = document.getElementById('countdown-timer');
                if (countdownElement) {
                    countdownElement.textContent = `เหลือเวลาชำระเงิน: ${String(minutesLeft).padStart(2, '0')}:${String(secondsLeft).padStart(2, '0')}`;
                }
            }, 1000);
        }
    }

    function stopPaymentCountdown() {
        if (countdownInterval) {
            clearInterval(countdownInterval);
            countdownInterval = null;
        }
        if (paymentTimerContainer) {
            paymentTimerContainer.classList.remove('visible');
        }
    }

    async function cancelOrderOnBackend(orderNumber) {
        try {
            if (window.API && typeof window.API.cancelOrder === 'function') {
                await window.API.cancelOrder(orderNumber);
                console.log('✅ Order cancelled on backend:', orderNumber);
            }
        } catch (error) {
            console.error('❌ Failed to cancel order on backend:', error);
        }
    }

    // --- Event Listeners ---
    
    // Quantity controls
    if (summaryItemsList) {
        summaryItemsList.addEventListener('click', (event) => {
            const target = event.target;
            if (!target.classList.contains('quantity-btn')) return;
            
            const itemId = parseInt(target.getAttribute('data-id'));
            const itemInCart = cart.find(item => item.id === itemId);
            
            if (!itemInCart) return;
            
            if (target.classList.contains('plus-btn')) {
                itemInCart.quantity++;
            } else if (target.classList.contains('minus-btn')) {
                itemInCart.quantity--;
                if (itemInCart.quantity <= 0) {
                    cart = cart.filter(item => item.id !== itemId);
                }
            }
            
            discount = 0;
            currentPromoCode = null;
            if (promoCodeInput) promoCodeInput.value = '';
            saveAndReRender();
        });
        
        summaryItemsList.addEventListener('input', (event) => {
            const target = event.target;
            if (target.classList.contains('note-input')) {
                const itemId = parseInt(target.getAttribute('data-id'));
                const itemInCart = cart.find(item => item.id === itemId);
                if (itemInCart) {
                    itemInCart.notes = target.value;
                    saveCart();
                }
            }
        });
    }

    // Promo code
    if (applyPromoBtn) {
        applyPromoBtn.addEventListener('click', async () => {
            const code = promoCodeInput.value.trim().toUpperCase();
            
            if (!code) {
                alert('กรุณากรอกรหัสโปรโมชั่น');
                return;
            }

            if (!window.API) {
                alert('⚠️ ระบบยังไม่พร้อม กรุณารีเฟรชหน้าเว็บ');
                return;
            }

            try {
                applyPromoBtn.textContent = 'กำลังตรวจสอบ...';
                applyPromoBtn.disabled = true;

                const result = await window.API.validatePromoCode(code, subtotal);
                
                if (result.success) {
                    discount = result.data.discount;
                    currentPromoCode = code;
                    updateTotals();
                    alert(`✅ ใช้รหัส ${code} สำเร็จ!\nส่วนลด: ${discount.toFixed(2)}฿`);
                }
            } catch (error) {
                discount = 0;
                currentPromoCode = null;
                updateTotals();
                alert('❌ ' + error.message);
            } finally {
                applyPromoBtn.textContent = 'ใช้ส่วนลด';
                applyPromoBtn.disabled = false;
            }
        });
    }

    // Cancel order button
    if (cancelOrderBtn) {
        cancelOrderBtn.addEventListener('click', async () => {
            const confirmCancel = confirm('คุณต้องการยกเลิกออเดอร์นี้หรือไม่?');
            if (confirmCancel) {
                stopPaymentCountdown();
                
                if (createdOrderNumber && window.API) {
                    await cancelOrderOnBackend(createdOrderNumber);
                }
                
                localStorage.removeItem('shoppingCart');
                alert('ออเดอร์ของคุณถูกยกเลิกแล้ว');
                window.location.href = 'index.html';
            }
        });
    }

    // Payment confirmed button
    if (paymentConfirmedBtn) {
        paymentConfirmedBtn.addEventListener('click', async () => {
            console.log('💰 User clicked payment confirmation');
            
            if (!createdOrderNumber || !window.API) {
                alert('⚠️ เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
                return;
            }
            
            try {
                paymentConfirmedBtn.textContent = 'กำลังตรวจสอบ...';
                paymentConfirmedBtn.disabled = true;

                // ตรวจสอบสถานะการชำระเงิน
                console.log('🔍 Checking payment status...');
                const paymentStatus = await window.API.checkPaymentStatus(createdOrderNumber);
                
                console.log('Payment status result:', paymentStatus);
                
                // ถ้ายังไม่ได้ชำระเงิน
                if (!paymentStatus.data.isPaid) {
                    console.log('❌ Payment not verified');
                    
                    // แสดงข้อความเตือน
                    alert('⚠️ กรุณาชำระเงินก่อนครับ/ค่ะ\n\nกรุณาสแกน QR Code และทำการโอนเงินให้เรียบร้อย\nจากนั้นจึงกดปุ่ม "ยืนยันการชำระเงิน"');
                    
                    // รีเซ็ตปุ่ม
                    paymentConfirmedBtn.textContent = 'ยืนยันการชำระเงิน';
                    paymentConfirmedBtn.disabled = false;
                    
                    // แสดงเอฟเฟกต์เตือน
                    if (qrCodeContainer) {
                        qrCodeContainer.style.animation = 'shake 0.5s';
                        setTimeout(() => {
                            qrCodeContainer.style.animation = '';
                        }, 500);
                    }
                    
                    return;
                }
                
                // ถ้าชำระเงินแล้ว
                console.log('✅ Payment verified!');
                
                // ยืนยันการชำระเงินกับ backend
                paymentConfirmedBtn.textContent = 'กำลังยืนยัน...';
                await window.API.confirmPayment(createdOrderNumber, true);
                console.log('✅ Payment confirmed on backend');
                
                // หยุด countdown
                stopPaymentCountdown();
                
                // แสดงการ์ดสำเร็จพร้อมติ๊กถูก
                if (qrModal) qrModal.style.display = 'none';
                if (orderSuccessModal) {
                    orderNumberSpan.textContent = createdOrderNumber || 'ERROR';
                    orderSuccessModal.style.display = 'flex';
                }
                
                // กลับไปหน้าแรกหลัง 4 วินาที
                setTimeout(() => {
                    localStorage.removeItem('shoppingCart');
                    window.location.href = 'index.html';
                }, 4000);
                
            } catch (error) {
                console.error('❌ Failed to confirm payment:', error);
                
                // ถ้า error เป็นเรื่องยังไม่ชำระเงิน
                if (error.message.includes('กรุณาชำระเงินก่อน')) {
                    alert('⚠️ ' + error.message);
                } else {
                    alert('❌ เกิดข้อผิดพลาด: ' + error.message);
                }
                
                // รีเซ็ตปุ่ม
                paymentConfirmedBtn.textContent = 'ยืนยันการชำระเงิน';
                paymentConfirmedBtn.disabled = false;
            }
        });
    }

    // Close modal button
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', () => {
            if (qrModal) qrModal.style.display = 'none';
        });
    }
    
    if (qrModal) {
        qrModal.addEventListener('click', (event) => {
            if (event.target === qrModal) {
                qrModal.style.display = 'none';
            }
        });
    }

    // --- FORM SUBMISSION ---
    if (checkoutForm) {
        checkoutForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            event.stopPropagation();
            
            console.log('📝 Form submitted - Creating order');
            
            try {
                // ตรวจสอบวิธีชำระเงิน
                const paymentRadio = document.querySelector('input[name="payment"]:checked');
                if (!paymentRadio) {
                    alert('กรุณาเลือกวิธีชำระเงิน');
                    return;
                }
                
                const selectedPayment = paymentRadio.value;
                console.log('💳 Payment method:', selectedPayment);
                
                // ตรวจสอบข้อมูลลูกค้า
                const nameInput = document.getElementById('name');
                const phoneInput = document.getElementById('phone');
                
                if (!nameInput || !phoneInput) {
                    alert('ไม่พบฟอร์มข้อมูล');
                    return;
                }
                
                if (!nameInput.value.trim()) {
                    alert('กรุณากรอกชื่อผู้รับ');
                    nameInput.focus();
                    return;
                }
                
                if (!phoneInput.value.trim()) {
                    alert('กรุณากรอกเบอร์โทรศัพท์');
                    phoneInput.focus();
                    return;
                }
                
                // คำนวณยอดรวม
                const finalTotal = parseFloat(totalPriceEl.textContent.replace('฿', ''));
                console.log('💰 Final total:', finalTotal);
                
                if (finalTotal <= 0 || isNaN(finalTotal)) {
                    alert("ยอดชำระต้องมากกว่า 0 บาท");
                    return;
                }
                
                // ตรวจสอบว่ามี API
                if (!window.API) {
                    alert('⚠️ ไม่สามารถเชื่อมต่อระบบ\nกรุณาตรวจสอบ:\n1. Backend Server ทำงานอยู่\n2. ไฟล์ api.js โหลดเรียบร้อย\n3. รีเฟรชหน้าเว็บแล้วลองใหม่');
                    console.error('❌ window.API is not defined');
                    return;
                }
                
                // เตรียมข้อมูลออเดอร์
                const orderData = {
                    customerName: nameInput.value.trim(),
                    phone: phoneInput.value.trim(),
                    items: cart.map(item => ({
                        id: item.id,
                        quantity: item.quantity || 1,
                        notes: item.notes || ''
                    })),
                    promoCode: currentPromoCode,
                    paymentMethod: selectedPayment
                };
                
                console.log('📤 Sending order to backend:', orderData);
                
                // สร้างออเดอร์บน Backend
                const orderResult = await window.API.createOrder(orderData);
                
                if (orderResult.success) {
                    createdOrderNumber = orderResult.data.orderNumber;
                    console.log('✅ Order created:', createdOrderNumber);
                    console.log('   Order details:', orderResult.data);
                    
                    // แสดง QR Code สำหรับ PromptPay
                    if (selectedPayment === 'promptpay') {
                        // แสดง loading
                        qrCodeContainer.innerHTML = `
                            <div style="text-align: center; padding: 40px;">
                                <i class="fas fa-spinner fa-spin" style="font-size: 48px; color: #28a745;"></i>
                                <p style="margin-top: 20px; font-size: 16px; color: #666; font-family: 'Kanit', sans-serif;">
                                    กำลังสร้าง QR Code...
                                </p>
                            </div>
                        `;
                        
                        // แสดง modal
                        qrModal.style.display = 'flex';
                        
                        // รอให้ UI update
                        await new Promise(resolve => setTimeout(resolve, 300));
                        
                        // ตรวจสอบฟังก์ชัน
                        if (typeof generatePromptPayQR !== 'function') {
                            console.error('❌ generatePromptPayQR function not found');
                            throw new Error('ไม่พบฟังก์ชันสร้าง QR Code\nกรุณาตรวจสอบว่าไฟล์ qr-generator-v2.js โหลดเรียบร้อย');
                        }
                        
                        if (typeof QRCode === 'undefined') {
                            console.error('❌ QRCode library not found');
                            // รอสักครู่แล้วลองใหม่
                            await new Promise(resolve => setTimeout(resolve, 1000));
                            if (typeof QRCode === 'undefined') {
                                throw new Error('ไม่พบ QR Code library\nกรุณารีเฟรชหน้าเว็บ');
                            }
                        }
                        
                        // เบอร์ PromptPay จาก backend
                        const promptPayId = promptpayConfig ? promptpayConfig.phoneNumber : '0914974798';
                        
                        console.log('🔧 Generating QR Code...');
                        console.log('   PromptPay:', promptPayId);
                        console.log('   Amount:', finalTotal);
                        
                        // สร้าง QR Code
                        const qrGenerated = generatePromptPayQR(promptPayId, finalTotal, qrCodeContainer);
                        
                        if (qrGenerated) {
                            console.log('✅ QR Code generated successfully');
                            managePaymentCountdown();
                        } else {
                            throw new Error('ไม่สามารถสร้าง QR Code ได้\nกรุณาลองใหม่');
                        }
                    } else {
                        // ชำระเงินสด
                        console.log('💵 Cash payment selected');
                        orderNumberSpan.textContent = createdOrderNumber;
                        orderSuccessModal.style.display = 'flex';
                        
                        setTimeout(() => {
                            localStorage.removeItem('shoppingCart');
                            window.location.href = 'index.html';
                        }, 3000);
                    }
                } else {
                    throw new Error(orderResult.error || 'ไม่สามารถสร้างออเดอร์ได้');
                }
                
            } catch (error) {
                console.error('❌ Error in form submission:', error);
                
                // แสดง error ใน QR container ถ้า modal เปิดอยู่
                if (qrModal && qrModal.style.display === 'flex' && qrCodeContainer) {
                    qrCodeContainer.innerHTML = `
                        <div style="text-align: center; padding: 30px; color: #d32f2f;">
                            <i class="fas fa-exclamation-triangle" style="font-size: 48px; margin-bottom: 15px;"></i>
                            <p style="font-size: 18px; font-weight: bold; margin-bottom: 10px; font-family: 'Kanit', sans-serif;">
                                เกิดข้อผิดพลาด
                            </p>
                            <p style="font-size: 14px; font-family: 'Kanit', sans-serif; line-height: 1.6;">
                                ${error.message}
                            </p>
                            <button onclick="location.reload()" style="
                                margin-top: 20px;
                                padding: 12px 24px;
                                background: #d32f2f;
                                color: white;
                                border: none;
                                border-radius: 5px;
                                cursor: pointer;
                                font-family: 'Kanit', sans-serif;
                                font-size: 14px;
                                font-weight: bold;
                            ">
                                <i class="fas fa-redo"></i> รีเฟรชหน้าเว็บ
                            </button>
                        </div>
                    `;
                }
                
                alert('เกิดข้อผิดพลาด: ' + error.message);
            }
        });
        
        console.log('✅ Form submit listener attached');
    } else {
        console.error('❌ Form element not found!');
    }

    // --- Load PromptPay Configuration ---
    async function loadPromptPayConfig() {
        try {
            console.log('📱 Loading PromptPay configuration...');
            const response = await API.get('/promptpay');
            if (response.success) {
                promptpayConfig = response.data;
                console.log('✅ PromptPay config loaded:', promptpayConfig);
            } else {
                console.error('❌ Failed to load PromptPay config');
                // Fallback to default
                promptpayConfig = {
                    phoneNumber: '0914974798',
                    name: 'บัญชีแม่มณี'
                };
            }
        } catch (error) {
            console.error('❌ Error loading PromptPay config:', error);
            // Fallback to default
            promptpayConfig = {
                phoneNumber: '0914974798',
                name: 'บัญชีแม่มณี'
            };
        }
    }

    // Initialize
    async function init() {
        await loadPromptPayConfig();
        renderCart();
        console.log('✅ Checkout page initialized');
    }
    
    init();
});