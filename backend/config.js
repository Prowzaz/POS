require('dotenv').config();

module.exports = {
  // SlipOK API Configuration
  slipok: {
    apiKey: process.env.SLIPOK_API_KEY || 'SLIPOK58LPD9J',
    branchId: process.env.SLIPOK_BRANCH_ID || '54831',
    baseUrl: process.env.SLIPOK_BASE_URL || 'https://api.slipok.com/api/line/apikey'
  },
  
  // Server Configuration
  server: {
    port: process.env.PORT || 3001,
    nodeEnv: process.env.NODE_ENV || 'development'
  },
  
  // Database Configuration
  database: {
    path: process.env.DB_PATH || './database/slipok.db'
  },
  
  // JWT Configuration
  jwt: {
    secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h'
  },
  
  // Rate Limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000, // 15 minutes
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100
  },
  
  // CORS Configuration
  cors: {
    origin: process.env.CORS_ORIGIN || ['http://localhost:3000', 'http://localhost:8080', 'file://', null]
  },
  
  // PromptPay Configuration
  promptpay: {
    phoneNumber: process.env.PROMPTPAY_PHONE || '0914974798', // เบอร์บัญชีแม่มณี
    name: process.env.PROMPTPAY_NAME || 'บัญชีแม่มณี'
  }
};


