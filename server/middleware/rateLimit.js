const rateLimit = require('express-rate-limit');

// Helper function to get user role from request
const getUserRole = (req) => {
  if (req.user && req.user.user && req.user.user.role) {
    return req.user.user.role;
  }
  if (req.user && req.user.role) {
    return req.user.role;
  }
  return 'anonymous';
};

// Dynamic rate limiter that adjusts based on user role
const dynamicLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: (req) => {
    const role = getUserRole(req);
    switch (role) {
      case 'admin':
        return 200; // Admins get more requests
      case 'teacher':
        return 150; // Teachers get moderate requests
      case 'student':
        return 100; // Students get standard requests
      default:
        return 50; // Anonymous users get limited requests
    }
  },
  keyGenerator: (req) => {
    // Use user ID if authenticated, otherwise use IP
    if (req.user && req.user.user && req.user.user.id) {
      return req.user.user.id;
    }
    if (req.user && req.user.id) {
      return req.user.id;
    }
    return req.ip;
  },
  message: {
    error: 'Rate limit exceeded. Please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    const role = getUserRole(req);
    console.log(`Rate limit exceeded for ${role} user: ${req.ip}`);
    res.status(429).json({
      error: 'Rate limit exceeded. Please try again later.',
      retryAfter: '15 minutes'
    });
  }
});

// General API rate limiter - 100 requests per 15 minutes
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req, res) => {
    console.log(`General rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      error: 'Too many requests from this IP, please try again later.',
      retryAfter: '15 minutes'
    });
  }
});

// Authentication rate limiter - 5 requests per 15 minutes (for login/register)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: {
    error: 'Too many authentication attempts, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    console.log(`Auth rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      error: 'Too many authentication attempts, please try again later.',
      retryAfter: '15 minutes'
    });
  }
});

// Admin endpoints rate limiter - 50 requests per 15 minutes
const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // limit each IP to 50 requests per windowMs
  message: {
    error: 'Too many admin requests, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    console.log(`Admin rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      error: 'Too many admin requests, please try again later.',
      retryAfter: '15 minutes'
    });
  }
});

// Exam submission rate limiter - 10 requests per 15 minutes
const examSubmissionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 requests per windowMs
  message: {
    error: 'Too many exam submissions, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    console.log(`Exam submission rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      error: 'Too many exam submissions, please try again later.',
      retryAfter: '15 minutes'
    });
  }
});

// File upload rate limiter - 20 requests per 15 minutes
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // limit each IP to 20 requests per windowMs
  message: {
    error: 'Too many file uploads, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    console.log(`Upload rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      error: 'Too many file uploads, please try again later.',
      retryAfter: '15 minutes'
    });
  }
});

module.exports = {
  dynamicLimiter,
  generalLimiter,
  authLimiter,
  adminLimiter,
  examSubmissionLimiter,
  uploadLimiter
}; 