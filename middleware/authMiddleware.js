const jwt = require('jsonwebtoken');

// Middleware to authenticate JWT token
function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return res.status(401).json({ success: false, message: 'Access denied. No token provided.' });
  }

  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : authHeader;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fashion_hub_secret_jwt_key_2026_modern_ecommerce');
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ success: false, message: 'Invalid or expired token. Please log in again.' });
  }
}

// Middleware to check if user has admin privileges
function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Forbidden. Admin privileges required.' });
  }
  next();
}

module.exports = {
  verifyToken,
  requireAdmin
};
