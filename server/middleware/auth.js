const jwt = require("jsonwebtoken");

const authenticateJWT = (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");
    console.log('Auth middleware - Request headers:', req.headers);
    console.log('Auth middleware - Token:', token);

    if (!token) {
      console.log('Auth middleware - No token provided');
      return res.status(401).json({ message: "No authentication token, access denied" });
    }

    console.log('Auth middleware - Verifying token');
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Auth middleware - Token verified, user:', verified);
    req.user = verified;
    next();
  } catch (error) {
    console.error('Auth middleware - Token verification failed:', error);
    res.status(401).json({ message: "Token verification failed, authorization denied" });
  }
};

const requireRole = (role) => {
  return (req, res, next) => {
    console.log('requireRole - User:', req.user);
    console.log('requireRole - Required role:', role);
    
    // Handle nested user structure in JWT token
    const userRole = req.user?.user?.role || req.user?.role;
    console.log('requireRole - User role:', userRole);
    
    if (!req.user) {
      console.log('requireRole - No user found');
      return res.status(401).json({ message: "Authentication required" });
    }
    if (userRole !== role) {
      console.log('requireRole - Role mismatch. User role:', userRole, 'Required role:', role);
      return res.status(403).json({ message: "Insufficient permissions" });
    }
    console.log('requireRole - Access granted');
    next();
  };
};

module.exports = { authenticateJWT, requireRole };
