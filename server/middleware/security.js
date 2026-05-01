// Security Middleware
// Advanced security measures including rate limiting, IP tracking, and security monitoring

const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const { Pool } = require('pg');
const pool = require('../db/postgres');

// Security configuration
const securityConfig = {
    // Rate limiting
    loginAttempts: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 5, // 5 attempts per window
        message: 'Too many login attempts, please try again later',
        standardHeaders: true,
        legacyHeaders: false,
    },
    generalRequests: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 1000, // 1000 requests per window
        message: 'Too many requests, please try again later',
        standardHeaders: true,
        legacyHeaders: false,
    },
    adminRequests: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 500, // 500 requests per window for admin users
        message: 'Too many admin requests, please try again later',
        standardHeaders: true,
        legacyHeaders: false,
    }
};

// IP-based rate limiting with database tracking
const createRateLimitWithDB = (config, actionType = 'general') => {
    return rateLimit({
        windowMs: config.windowMs,
        max: config.max,
        message: config.message,
        standardHeaders: config.standardHeaders,
        legacyHeaders: config.legacyHeaders,
        keyGenerator: (req) => {
            return req.ip || req.connection.remoteAddress;
        },
        handler: async (req, res) => {
            const ip = req.ip || req.connection.remoteAddress;
            
            // Log security event
            try {
                await logSecurityEvent({
                    eventType: 'RATE_LIMIT_EXCEEDED',
                    severity: 'medium',
                    ipAddress: ip,
                    userAgent: req.get('User-Agent'),
                    description: `Rate limit exceeded for ${actionType}`,
                    details: {
                        actionType,
                        limit: config.max,
                        windowMs: config.windowMs,
                        path: req.path,
                        method: req.method
                    }
                });
            } catch (error) {
                console.error('Failed to log rate limit event:', error);
            }
            
            res.status(429).json({
                error: config.message,
                code: 'RATE_LIMIT_EXCEEDED',
                retryAfter: Math.ceil(config.windowMs / 1000)
            });
        }
    });
};

// Login attempt rate limiting
const loginRateLimit = createRateLimitWithDB(securityConfig.loginAttempts, 'login');

// General rate limiting
const generalRateLimit = createRateLimitWithDB(securityConfig.generalRequests, 'general');

// Admin-specific rate limiting
const adminRateLimit = createRateLimitWithDB(securityConfig.adminRequests, 'admin');

// Helmet configuration for security headers
const helmetConfig = helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "https:"],
            scriptSrc: ["'self'"],
            connectSrc: ["'self'", "https://api.example.com"],
            frameSrc: ["'none'"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            manifestSrc: ["'self'"]
        }
    },
    crossOriginEmbedderPolicy: false,
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
    }
});

// IP blacklist checking
const checkIPBlacklist = async (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress;
    
    try {
        // Check if IP is in blacklist
        const result = await pool.query(
            'SELECT id FROM blacklisted_ips WHERE ip = $1 AND active = true',
            [ip]
        );
        
        if (result.rows.length > 0) {
            // Log security event
            await logSecurityEvent({
                eventType: 'BLACKLISTED_IP_ACCESS',
                severity: 'high',
                ipAddress: ip,
                userAgent: req.get('User-Agent'),
                description: 'Access attempt from blacklisted IP',
                details: {
                    path: req.path,
                    method: req.method
                }
            });
            
            return res.status(403).json({
                error: 'Access denied',
                code: 'IP_BLACKLISTED'
            });
        }
        
        next();
    } catch (error) {
        console.error('IP blacklist check error:', error);
        next();
    }
};

// Suspicious activity detection
const detectSuspiciousActivity = async (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');
    
    try {
        // Check for suspicious patterns
        const suspiciousPatterns = [
            /sql/i,
            /script/i,
            /javascript/i,
            /eval/i,
            /alert/i
        ];
        
        const url = req.url;
        const query = JSON.stringify(req.query);
        const body = JSON.stringify(req.body);
        
        const combinedText = url + ' ' + query + ' ' + body;
        
        for (const pattern of suspiciousPatterns) {
            if (pattern.test(combinedText)) {
                await logSecurityEvent({
                    eventType: 'SUSPICIOUS_PATTERN',
                    severity: 'medium',
                    ipAddress: ip,
                    userAgent: userAgent,
                    description: 'Suspicious pattern detected in request',
                    details: {
                        pattern: pattern.toString(),
                        url: req.url,
                        method: req.method,
                        query: req.query,
                        body: req.body
                    }
                });
                
                // Don't block the request, just log it for now
                break;
            }
        }
        
        next();
    } catch (error) {
        console.error('Suspicious activity detection error:', error);
        next();
    }
};

// Session security validation
const validateSessionSecurity = async (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    const ip = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');
    
    if (!token) {
        return next();
    }
    
    try {
        // Check if session is valid for this IP and user agent
        const result = await pool.query(
            `SELECT id, user_id, ip_address, user_agent, created_at 
             FROM active_sessions 
             WHERE token_hash = $1`,
            [hashToken(token)]
        );
        
        if (result.rows.length === 0) {
            await logSecurityEvent({
                eventType: 'INVALID_SESSION',
                severity: 'medium',
                ipAddress: ip,
                userAgent: userAgent,
                description: 'Invalid session token used',
                details: {
                    tokenHash: hashToken(token),
                    path: req.path,
                    method: req.method
                }
            });
            
            return res.status(401).json({
                error: 'Invalid session',
                code: 'INVALID_SESSION'
            });
        }
        
        const session = result.rows[0];
        
        // Check for session hijacking (different IP or user agent)
        if (session.ip_address !== ip || session.user_agent !== userAgent) {
            await logSecurityEvent({
                eventType: 'SESSION_HIJACKING_ATTEMPT',
                severity: 'high',
                userId: session.user_id,
                ipAddress: ip,
                userAgent: userAgent,
                description: 'Potential session hijacking detected',
                details: {
                    sessionId: session.id,
                    originalIP: session.ip_address,
                    originalUserAgent: session.user_agent,
                    currentIP: ip,
                    currentUserAgent: userAgent
                }
            });
            
            // Invalidate the session
            await pool.query('DELETE FROM active_sessions WHERE id = $1', [session.id]);
            
            return res.status(401).json({
                error: 'Session invalidated for security reasons',
                code: 'SESSION_HIJACKING'
            });
        }
        
        next();
    } catch (error) {
        console.error('Session validation error:', error);
        next();
    }
};

// Security monitoring middleware
const securityMonitoring = async (req, res, next) => {
    const startTime = Date.now();
    const ip = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');
    
    // Store original res.end to intercept response
    const originalEnd = res.end;
    
    res.end = function(...args) {
        const endTime = Date.now();
        const responseTime = endTime - startTime;
        
        // Log slow requests
        if (responseTime > 5000) { // 5 seconds
            logSecurityEvent({
                eventType: 'SLOW_REQUEST',
                severity: 'low',
                ipAddress: ip,
                userAgent: userAgent,
                description: 'Slow request detected',
                details: {
                    path: req.path,
                    method: req.method,
                    responseTime: responseTime,
                    statusCode: res.statusCode
                }
            }).catch(console.error);
        }
        
        // Log errors
        if (res.statusCode >= 400) {
            logSecurityEvent({
                eventType: 'HTTP_ERROR',
                severity: res.statusCode >= 500 ? 'medium' : 'low',
                ipAddress: ip,
                userAgent: userAgent,
                description: `HTTP ${res.statusCode} error`,
                details: {
                    path: req.path,
                    method: req.method,
                    statusCode: res.statusCode,
                    responseTime: responseTime
                }
            }).catch(console.error);
        }
        
        originalEnd.apply(this, args);
    };
    
    next();
};

// Helper function to hash tokens
function hashToken(token) {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(token).digest('hex');
}

// Helper function to log security events
async function logSecurityEvent(eventData) {
    try {
        const query = `
            INSERT INTO security_events (
                event_type, severity, user_id, school_id, ip_address, 
                user_agent, description, details
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `;
        
        await pool.query(query, [
            eventData.eventType,
            eventData.severity,
            eventData.userId || null,
            eventData.schoolId || null,
            eventData.ipAddress || null,
            eventData.userAgent || null,
            eventData.description,
            JSON.stringify(eventData.details || {})
        ]);
    } catch (error) {
        console.error('Failed to log security event:', error);
    }
}

// Brute force protection
const bruteForceProtection = async (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress;
    const email = req.body?.email;
    
    if (!email || req.path !== '/api/school-admin/auth/login') {
        return next();
    }
    
    try {
        // Check recent failed attempts
        const result = await pool.query(
            `SELECT COUNT(*) as failed_attempts 
             FROM login_attempts 
             WHERE email = $1 AND ip_address = $2 AND success = false 
             AND created_at > NOW() - INTERVAL '1 hour'`,
            [email, ip]
        );
        
        const failedAttempts = parseInt(result.rows[0].failed_attempts);
        
        if (failedAttempts >= 10) {
            await logSecurityEvent({
                eventType: 'BRUTE_FORCE_ATTACK',
                severity: 'high',
                ipAddress: ip,
                userAgent: req.get('User-Agent'),
                description: 'Brute force attack detected',
                details: {
                    email: email,
                    failedAttempts: failedAttempts,
                    timeWindow: '1 hour'
                }
            });
            
            return res.status(429).json({
                error: 'Account temporarily locked due to too many failed attempts',
                code: 'ACCOUNT_LOCKED',
                retryAfter: 3600 // 1 hour
            });
        }
        
        next();
    } catch (error) {
        console.error('Brute force protection error:', error);
        next();
    }
};

// CORS security configuration
const corsConfig = {
    origin: function (origin, callback) {
        // Allow requests from same origin and school subdomains
        const allowedOrigins = [
            process.env.CLIENT_URL || 'http://localhost:3000',
            /^https:\/\/.*\.examplatform\.com$/, // Allow all school subdomains
            /^http:\/\/localhost:\d+$/, // Allow localhost development
        ];
        
        if (!origin) return callback(null, true); // Allow same-origin
        
        for (const allowedOrigin of allowedOrigins) {
            if (typeof allowedOrigin === 'string' && allowedOrigin === origin) {
                return callback(null, true);
            }
            if (allowedOrigin instanceof RegExp && allowedOrigin.test(origin)) {
                return callback(null, true);
            }
        }
        
        callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['X-Total-Count', 'X-Page-Count']
};

module.exports = {
    // Rate limiting
    loginRateLimit,
    generalRateLimit,
    adminRateLimit,
    
    // Security middleware
    helmetConfig,
    checkIPBlacklist,
    detectSuspiciousActivity,
    validateSessionSecurity,
    securityMonitoring,
    bruteForceProtection,
    
    // Configuration
    corsConfig,
    securityConfig,
    
    // Helper functions
    logSecurityEvent,
    hashToken
};
