// api.js - Modern Version v2.0
const API_BASE_URL = 'http://localhost:3001/api';
const API_TIMEOUT = 30000; // 30 seconds

/**
 * Enhanced API call function with timeout and retry logic
 * @param {string} endpoint - API endpoint
 * @param {Object} options - Fetch options
 * @param {number} retries - Number of retries (default: 1)
 * @returns {Promise<Object>} API response
 */
async function callAPI(endpoint, options = {}, retries = 1) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);
    
    try {
        console.log(`📤 API Call: ${options.method || 'GET'} ${endpoint}`);
        if (options.body) {
            try {
                console.log('   Data:', JSON.parse(options.body));
            } catch (e) {
                console.log('   Data:', options.body);
            }
        }
        
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                ...options.headers 
            },
            signal: controller.signal,
            ...options
        });

        clearTimeout(timeoutId);
        
        // ตรวจสอบ Content-Type
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            throw new Error('Invalid response format');
        }
        
        const data = await response.json();
        
        console.log(`📥 API Response [${response.status}]:`, data);
        
        if (!response.ok) {
            const errorMessage = data.error || data.message || `HTTP ${response.status}: ${response.statusText}`;
            throw new Error(errorMessage);
        }
        
        return data;
        
    } catch (error) {
        clearTimeout(timeoutId);
        
        // Handle abort/timeout
        if (error.name === 'AbortError') {
            console.error('⏱️ API Timeout:', endpoint);
            throw new Error('คำขอใช้เวลานานเกินไป กรุณาลองใหม่อีกครั้ง');
        }
        
        // Handle network error with retry
        if (error.message.includes('Failed to fetch') && retries > 0) {
            console.warn(`🔄 Retrying API call... (${retries} attempts left)`);
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s before retry
            return callAPI(endpoint, options, retries - 1);
        }
        
        console.error('❌ API Error:', error);
        throw error;
    }
}

/**
 * Utility functions for validation and sanitization
 */
const ValidationUtils = {
    sanitizeString: (str, maxLength = 200) => {
        if (typeof str !== 'string') return '';
        return str.trim().substring(0, maxLength).replace(/[<>]/g, '');
    },
    
    validatePhone: (phone) => {
        const cleaned = phone.replace(/[-\s]/g, '');
        return /^(0[0-9]{9}|66[0-9]{9})$/.test(cleaned);
    },
    
    validatePromoCode: (code) => {
        return /^[A-Z0-9]{3,20}$/.test(code);
    }
};

window.API = {
    validatePromoCode: (code, subtotal) => {
        console.log('🔍 Validating promo code:', code, 'Subtotal:', subtotal);
        
        // Validate input
        const sanitizedCode = ValidationUtils.sanitizeString(code, 20).toUpperCase();
        if (!ValidationUtils.validatePromoCode(sanitizedCode)) {
            throw new Error('รูปแบบโค้ดส่วนลดไม่ถูกต้อง');
        }
        
        if (typeof subtotal !== 'number' || subtotal <= 0) {
            throw new Error('ยอดรวมไม่ถูกต้อง');
        }
        
        return callAPI('/promo/validate', {
            method: 'POST',
            body: JSON.stringify({ code: sanitizedCode, subtotal })
        });
    },

    createOrder: (orderData) => {
        console.log('📦 Creating order with data:', orderData);
        
        // Validate and sanitize customer name
        const customerName = ValidationUtils.sanitizeString(orderData.customerName, 100);
        if (!customerName || customerName.length < 2) {
            throw new Error('กรุณากรอกชื่อที่ถูกต้อง (อย่างน้อย 2 ตัวอักษร)');
        }
        
        // Validate phone
        const phone = ValidationUtils.sanitizeString(orderData.phone, 15);
        if (!ValidationUtils.validatePhone(phone)) {
            throw new Error('รูปแบบเบอร์โทรศัพท์ไม่ถูกต้อง');
        }
        
        // Validate items
        if (!Array.isArray(orderData.items) || orderData.items.length === 0) {
            throw new Error('ไม่มีสินค้าในออเดอร์');
        }
        
        if (orderData.items.length > 50) {
            throw new Error('สินค้าในตะกร้ามากเกินไป (สูงสุด 50 รายการ)');
        }
        
        // Sanitize and validate items
        const sanitizedItems = orderData.items.map(item => {
            const quantity = parseInt(item.quantity);
            if (isNaN(quantity) || quantity < 1 || quantity > 99) {
                throw new Error('จำนวนสินค้าไม่ถูกต้อง');
            }
            
            return {
                id: parseInt(item.id),
                quantity: quantity,
                notes: ValidationUtils.sanitizeString(item.notes || '', 500)
            };
        });
        
        const sanitizedOrderData = {
            customerName,
            phone,
            items: sanitizedItems,
            promoCode: orderData.promoCode ? ValidationUtils.sanitizeString(orderData.promoCode, 20).toUpperCase() : null,
            paymentMethod: ['promptpay', 'cash'].includes(orderData.paymentMethod) ? orderData.paymentMethod : 'promptpay'
        };
        
        return callAPI('/orders', {
            method: 'POST',
            body: JSON.stringify(sanitizedOrderData)
        });
    },

    checkPaymentStatus: (orderNumber) => {
        console.log('🔍 Checking payment status for order:', orderNumber);
        return callAPI(`/orders/${orderNumber}/check-payment`, {
            method: 'GET'
        });
    },

    confirmPayment: (orderNumber, verified = true) => {
        console.log('💰 Confirming payment for order:', orderNumber, 'verified:', verified);
        return callAPI(`/orders/${orderNumber}/payment`, {
            method: 'POST',
            body: JSON.stringify({ verified })
        });
    },

    cancelOrder: (orderNumber) => {
        console.log('🚫 Cancelling order:', orderNumber);
        return callAPI(`/orders/${orderNumber}`, {
            method: 'DELETE'
        });
    },

    getMenu: () => {
        console.log('📋 Fetching menu');
        return callAPI('/menu', {
            method: 'GET'
        });
    },

    getOrders: (status = null) => {
        console.log('📊 Fetching orders', status ? `with status: ${status}` : '');
        const query = status ? `?status=${status}` : '';
        return callAPI(`/orders${query}`, {
            method: 'GET'
        });
    },

    getStats: () => {
        console.log('📈 Fetching statistics');
        return callAPI('/stats', {
            method: 'GET'
        });
    }
};

console.log('✅ API Helper loaded successfully!');
console.log('Available methods:');
console.log('  - API.validatePromoCode(code, subtotal)');
console.log('  - API.createOrder(orderData)');
console.log('  - API.confirmPayment(orderNumber)');
console.log('  - API.cancelOrder(orderNumber)');
console.log('  - API.getMenu()');
console.log('  - API.getOrders(status)');
console.log('  - API.getStats()');