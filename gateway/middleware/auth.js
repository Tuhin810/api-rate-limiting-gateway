const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
  // Allow login/admin endpoints without token if needed, but strictly:
  // Requirements: "Reject unauthenticated requests". 
  // We assume /auth/login is public, handled before this middleware or excluded.
  
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return res.status(401).json({ message: 'No token provided' });
  }

  const token = authHeader.split(' ')[1]; // Bearer <token>
  if (!token) {
    return res.status(401).json({ message: 'Malformed token' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'supersecretkey', (err, decoded) => {
    if (err) {
      return res.status(403).json({ message: 'Failed to authenticate token' });
    }
    
    // Attach user info to request
    req.user = decoded;
    next();
  });
};

module.exports = verifyToken;
