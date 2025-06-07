const jwt = require("jsonwebtoken");

const auth = (req, res, next) => {
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

module.exports = auth;
