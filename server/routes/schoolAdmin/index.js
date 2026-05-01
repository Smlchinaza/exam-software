// School Admin Routes Index
// Main router for all school admin endpoints

const express = require('express');
const router = express.Router();

// Import route modules
const authRoutes = require('./auth');
const dashboardRoutes = require('./dashboard');
const teacherRegistrationRoutes = require('./teacherRegistrations');

// Mount routes
router.use('/auth', authRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/teacher-registrations', teacherRegistrationRoutes);

// Health check endpoint
router.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'School Admin API is healthy',
        timestamp: new Date().toISOString()
    });
});

// API info endpoint
router.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'School Admin API',
        version: '1.0.0',
        endpoints: {
            auth: {
                'POST /auth/login': 'School admin login',
                'POST /auth/refresh': 'Refresh authentication token',
                'POST /auth/logout': 'Logout endpoint',
                'GET /auth/verify': 'Verify token validity',
                'POST /auth/change-password': 'Change admin password'
            },
            dashboard: {
                'GET /dashboard/stats': 'Get dashboard statistics',
                'GET /dashboard/activity': 'Get recent activity',
                'GET /dashboard/performance': 'Get performance metrics',
                'GET /dashboard/teachers': 'Get teachers overview',
                'GET /dashboard/students': 'Get students overview',
                'GET /dashboard/exams': 'Get exams overview'
            },
            teacherRegistrations: {
                'GET /teacher-registrations/pending': 'Get pending registrations',
                'GET /teacher-registrations': 'Get all registrations (with filters)',
                'GET /teacher-registrations/:id': 'Get registration details',
                'POST /teacher-registrations/:id/approve': 'Approve registration',
                'POST /teacher-registrations/:id/reject': 'Reject registration',
                'GET /teacher-registrations/stats/summary': 'Get registration statistics',
                'GET /teacher-registrations/export': 'Export registrations data'
            }
        }
    });
});

module.exports = router;
