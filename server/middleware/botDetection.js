const { pool } = require('../config/database');

// In-memory window tracking for rapid burst detection
const requestHistory = new Map();
const WINDOW_MS = 10000; // 10 seconds
const MAX_REQUESTS = 5;  // More than 5 requests in 10s is flagged as bot activity

async function botDetection(req, res, next) {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
  const account = req.body?.accountNumber || req.query?.accountNumber || 'anonymous';
  const key = `${ip}_${account}`;
  const now = Date.now();

  const history = requestHistory.get(key) || [];
  const validHistory = history.filter(timestamp => now - timestamp < WINDOW_MS);
  validHistory.push(now);
  requestHistory.set(key, validHistory);

  if (validHistory.length > MAX_REQUESTS) {
    try {
      await pool.query(`
        INSERT INTO security_logs (ip_address, account_number, endpoint, status, user_agent, details)
        VALUES (?, ?, ?, 'Blocked_Bot', ?, ?)
      `, [ip, account, req.originalUrl, req.headers['user-agent'] || 'Unknown', `Rapid requests: ${validHistory.length} in ${WINDOW_MS}ms`]);
    } catch (err) {
      console.error('Error logging bot activity:', err.message);
    }

    return res.status(429).json({
      success: false,
      errorType: 'PURCHASE_BLOCKED',
      title: 'Purchase Blocked',
      message: 'Unusual activity detected. Please try again later.',
      refId: `SEC-${Math.floor(100000 + Math.random() * 900000)}X`
    });
  }

  next();
}

module.exports = botDetection;
