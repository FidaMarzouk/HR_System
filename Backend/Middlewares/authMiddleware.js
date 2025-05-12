const jwt = require('jsonwebtoken');
const verifyToken = require('../utils/jwtVerify');

const authMiddleware = (req, res, next) => {
  // First check for cookie token
  const cookieToken = req.cookies.authToken;
  
  // Then check for Authorization header (for backward compatibility)
  const authHeader = req.header('Authorization');
  let headerToken = null;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    headerToken = authHeader.split(' ')[1];
  }
  
  // Use token from cookie first, fall back to header token
  const token = cookieToken || headerToken;
  
  if (!token) {
    return res.status(401).json({ message: 'Access denied. No token provided.' });
  }

  const result = verifyToken(token);
  
  if (!result.success) {
    // Only log non-expiry errors
    if (result.error.name !== 'TokenExpiredError') {
      // console.error("JWT Verification Error:", result.error.message);
    }
    return res.status(400).json({ message: 'Invalid token.' });
  }
  
  req.user = result.user;
  next();
};

module.exports = authMiddleware;