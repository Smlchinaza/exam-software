# School Admin Subdomain Isolation Development Plan

## Overview
This document outlines the development plan for implementing school admin subdomain isolation, ensuring that school administrators can only access and manage their own school's data, teachers, and students. Additionally, school admins must approve teacher registrations before teachers can access their dashboards.

## Current Infrastructure Analysis

### Existing Subdomain Components
- `client/src/utils/subdomain.js` - Subdomain detection utilities
- `client/src/services/subdomainApi.js` - Subdomain-based API calls
- `client/src/components/SubdomainRouter.js` - Route handling based on subdomain
- `server/middleware/subdomainAuth.js` - Subdomain authentication middleware
- `server/middleware/subdomain.js` - Subdomain validation logic
- `client/src/hooks/useSchoolSubdomain.js` - React hook for subdomain management

### Current Database Schema
- Schools table with subdomain field
- Users table with role-based access
- Existing authentication system with JWT tokens

## Development Phases

### Phase 1: Database Schema Enhancement
**Objective**: Extend database schema to support school admin isolation and teacher approval workflow

#### 1.1 School Admins Table Enhancement
```sql
-- Add school-specific admin fields
ALTER TABLE school_admins 
ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES schools(id),
ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS last_login TIMESTAMP,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_school_admins_school_id ON school_admins(school_id);
CREATE INDEX IF NOT EXISTS idx_school_admins_is_active ON school_admins(is_active);
```

#### 1.2 Teacher Registration Approval System
```sql
-- Create teacher registrations table for approval workflow
CREATE TABLE IF NOT EXISTS teacher_registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    school_id UUID REFERENCES schools(id),
    registration_data JSONB,
    status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected
    reviewed_by UUID REFERENCES school_admins(id),
    reviewed_at TIMESTAMP,
    rejection_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_teacher_registrations_school_id ON teacher_registrations(school_id);
CREATE INDEX IF NOT EXISTS idx_teacher_registrations_status ON teacher_registrations(status);
CREATE INDEX IF NOT EXISTS idx_teacher_registrations_user_id ON teacher_registrations(user_id);
```

#### 1.3 School Admin Permissions Schema
```sql
-- Create permissions table for granular control
CREATE TABLE IF NOT EXISTS school_admin_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID REFERENCES school_admins(id),
    permission_type VARCHAR(50), -- teachers, students, exams, analytics
    access_level VARCHAR(20), -- read, write, full, none
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Phase 2: Backend API Development
**Objective**: Create APIs for school admin management with proper isolation

#### 2.1 School Admin Authentication Middleware
```javascript
// server/middleware/schoolAdminAuth.js
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const schoolAdminAuth = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Verify school admin role and school access
        const adminQuery = `
            SELECT sa.*, s.subdomain, s.name as school_name 
            FROM school_admins sa 
            JOIN schools s ON sa.school_id = s.id 
            WHERE sa.id = $1 AND sa.is_active = true
        `;
        
        const adminResult = await pool.query(adminQuery, [decoded.userId]);
        
        if (adminResult.rows.length === 0) {
            return res.status(403).json({ error: 'Invalid school admin credentials' });
        }

        // Verify subdomain matches admin's school
        const adminSubdomain = adminResult.rows[0].subdomain;
        const requestSubdomain = req.subdomain;
        
        if (adminSubdomain !== requestSubdomain) {
            return res.status(403).json({ error: 'Subdomain mismatch' });
        }

        req.admin = adminResult.rows[0];
        next();
    } catch (error) {
        console.error('School admin auth error:', error);
        res.status(401).json({ error: 'Invalid token' });
    }
};

module.exports = schoolAdminAuth;
```

#### 2.2 Teacher Registration Management APIs
```javascript
// server/routes/schoolAdmin/teacherRegistrations.js
const express = require('express');
const router = express.Router();
const pool = require('../../db/postgres');
const schoolAdminAuth = require('../../middleware/schoolAdminAuth');

// Get pending teacher registrations for school
router.get('/pending', schoolAdminAuth, async (req, res) => {
    try {
        const query = `
            SELECT tr.*, u.name, u.email, u.phone 
            FROM teacher_registrations tr 
            JOIN users u ON tr.user_id = u.id 
            WHERE tr.school_id = $1 AND tr.status = 'pending'
            ORDER BY tr.created_at DESC
        `;
        
        const result = await pool.query(query, [req.admin.school_id]);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching pending registrations:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Approve teacher registration
router.post('/:registrationId/approve', schoolAdminAuth, async (req, res) => {
    try {
        const { registrationId } = req.params;
        
        // Update registration status
        const updateQuery = `
            UPDATE teacher_registrations 
            SET status = 'approved', reviewed_by = $1, reviewed_at = CURRENT_TIMESTAMP
            WHERE id = $2 AND school_id = $3
            RETURNING *
        `;
        
        const result = await pool.query(updateQuery, [req.admin.id, registrationId, req.admin.school_id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Registration not found' });
        }

        // Update user role to teacher
        const updateUserQuery = `
            UPDATE users 
            SET role = 'teacher', updated_at = CURRENT_TIMESTAMP
            WHERE id = (SELECT user_id FROM teacher_registrations WHERE id = $1)
        `;
        
        await pool.query(updateUserQuery, [registrationId]);
        
        res.json({ message: 'Teacher registration approved successfully' });
    } catch (error) {
        console.error('Error approving registration:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Reject teacher registration
router.post('/:registrationId/reject', schoolAdminAuth, async (req, res) => {
    try {
        const { registrationId } = req.params;
        const { rejectionReason } = req.body;
        
        const updateQuery = `
            UPDATE teacher_registrations 
            SET status = 'rejected', reviewed_by = $1, reviewed_at = CURRENT_TIMESTAMP, rejection_reason = $2
            WHERE id = $3 AND school_id = $4
            RETURNING *
        `;
        
        const result = await pool.query(updateQuery, [
            req.admin.id, 
            rejectionReason, 
            registrationId, 
            req.admin.school_id
        ]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Registration not found' });
        }
        
        res.json({ message: 'Teacher registration rejected' });
    } catch (error) {
        console.error('Error rejecting registration:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
```

#### 2.3 School Admin Dashboard APIs
```javascript
// server/routes/schoolAdmin/dashboard.js
const express = require('express');
const router = express.Router();
const pool = require('../../db/postgres');
const schoolAdminAuth = require('../../middleware/schoolAdminAuth');

// Get school admin dashboard data
router.get('/stats', schoolAdminAuth, async (req, res) => {
    try {
        const schoolId = req.admin.school_id;
        
        // Get school statistics
        const statsQuery = `
            SELECT 
                (SELECT COUNT(*) FROM users WHERE school_id = $1 AND role = 'teacher') as total_teachers,
                (SELECT COUNT(*) FROM users WHERE school_id = $1 AND role = 'student') as total_students,
                (SELECT COUNT(*) FROM exams WHERE school_id = $1) as total_exams,
                (SELECT COUNT(*) FROM exam_submissions WHERE school_id = $1) as total_submissions,
                (SELECT COUNT(*) FROM teacher_registrations WHERE school_id = $1 AND status = 'pending') as pending_registrations
        `;
        
        const statsResult = await pool.query(statsQuery, [schoolId]);
        
        // Get recent activity
        const activityQuery = `
            SELECT 
                'exam_created' as activity_type,
                e.title as description,
                e.created_at as timestamp
            FROM exams e WHERE e.school_id = $1
            UNION ALL
            SELECT 
                'teacher_registered' as activity_type,
                u.name || ' registered as teacher' as description,
                tr.created_at as timestamp
            FROM teacher_registrations tr
            JOIN users u ON tr.user_id = u.id
            WHERE tr.school_id = $1
            ORDER BY timestamp DESC
            LIMIT 10
        `;
        
        const activityResult = await pool.query(activityQuery, [schoolId]);
        
        res.json({
            stats: statsResult.rows[0],
            recentActivity: activityResult.rows
        });
    } catch (error) {
        console.error('Error fetching dashboard data:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
```

### Phase 3: Frontend Development
**Objective**: Create school admin dashboard with teacher approval workflow

#### 3.1 School Admin Dashboard Component
```javascript
// client/src/components/SchoolAdmin/Dashboard.js
import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { useSchoolSubdomain } from '../../hooks/useSchoolSubdomain';

const SchoolAdminDashboard = () => {
    const [stats, setStats] = useState({});
    const [recentActivity, setRecentActivity] = useState([]);
    const [pendingRegistrations, setPendingRegistrations] = useState([]);
    const { schoolInfo } = useSchoolSubdomain();

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            const [statsResponse, activityResponse, registrationsResponse] = await Promise.all([
                fetch('/api/school-admin/dashboard/stats'),
                fetch('/api/school-admin/teacher-registrations/pending')
            ]);

            const statsData = await statsResponse.json();
            const activityData = await activityResponse.json();
            const registrationsData = await registrationsResponse.json();

            setStats(statsData.stats);
            setRecentActivity(activityData.recentActivity);
            setPendingRegistrations(registrationsData);
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        }
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">School Admin Dashboard</h1>
                <Badge variant="outline">{schoolInfo?.name}</Badge>
            </div>

            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Total Teachers</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.total_teachers || 0}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Total Students</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.total_students || 0}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Total Exams</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.total_exams || 0}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Pending Registrations</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-orange-600">
                            {stats.pending_registrations || 0}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Pending Teacher Registrations */}
            {pendingRegistrations.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Pending Teacher Registrations</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {pendingRegistrations.map((registration) => (
                                <TeacherRegistrationCard
                                    key={registration.id}
                                    registration={registration}
                                    onApprove={handleApproveRegistration}
                                    onReject={handleRejectRegistration}
                                />
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Recent Activity */}
            <Card>
                <CardHeader>
                    <CardTitle>Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        {recentActivity.map((activity, index) => (
                            <div key={index} className="flex justify-between items-center py-2 border-b">
                                <div>
                                    <Badge variant="outline" className="mr-2">
                                        {activity.activity_type}
                                    </Badge>
                                    <span>{activity.description}</span>
                                </div>
                                <span className="text-sm text-gray-500">
                                    {new Date(activity.timestamp).toLocaleDateString()}
                                </span>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

const TeacherRegistrationCard = ({ registration, onApprove, onReject }) => {
    const [loading, setLoading] = useState(false);

    const handleApprove = async () => {
        setLoading(true);
        await onApprove(registration.id);
        setLoading(false);
    };

    const handleReject = async () => {
        const reason = prompt('Please provide rejection reason:');
        if (reason) {
            setLoading(true);
            await onReject(registration.id, reason);
            setLoading(false);
        }
    };

    return (
        <div className="border rounded-lg p-4">
            <div className="flex justify-between items-start">
                <div>
                    <h3 className="font-semibold">{registration.name}</h3>
                    <p className="text-sm text-gray-600">{registration.email}</p>
                    <p className="text-sm text-gray-600">{registration.phone}</p>
                    <p className="text-xs text-gray-500 mt-1">
                        Registered: {new Date(registration.created_at).toLocaleDateString()}
                    </p>
                </div>
                <div className="space-x-2">
                    <Button
                        onClick={handleApprove}
                        disabled={loading}
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                    >
                        Approve
                    </Button>
                    <Button
                        onClick={handleReject}
                        disabled={loading}
                        size="sm"
                        variant="destructive"
                    >
                        Reject
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default SchoolAdminDashboard;
```

#### 3.2 Teacher Registration Management Component
```javascript
// client/src/components/SchoolAdmin/TeacherRegistrationManagement.js
import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

const TeacherRegistrationManagement = () => {
    const [registrations, setRegistrations] = useState([]);
    const [filteredRegistrations, setFilteredRegistrations] = useState([]);
    const [statusFilter, setStatusFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchRegistrations();
    }, []);

    useEffect(() => {
        filterRegistrations();
    }, [registrations, statusFilter, searchTerm]);

    const fetchRegistrations = async () => {
        try {
            const response = await fetch('/api/school-admin/teacher-registrations');
            const data = await response.json();
            setRegistrations(data);
        } catch (error) {
            console.error('Error fetching registrations:', error);
        }
    };

    const filterRegistrations = () => {
        let filtered = registrations;

        if (statusFilter !== 'all') {
            filtered = filtered.filter(reg => reg.status === statusFilter);
        }

        if (searchTerm) {
            filtered = filtered.filter(reg =>
                reg.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                reg.email.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        setFilteredRegistrations(filtered);
    };

    const handleApprove = async (registrationId) => {
        try {
            const response = await fetch(`/api/school-admin/teacher-registrations/${registrationId}/approve`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });

            if (response.ok) {
                fetchRegistrations(); // Refresh data
            }
        } catch (error) {
            console.error('Error approving registration:', error);
        }
    };

    const handleReject = async (registrationId, reason) => {
        try {
            const response = await fetch(`/api/school-admin/teacher-registrations/${registrationId}/reject`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rejectionReason: reason })
            });

            if (response.ok) {
                fetchRegistrations(); // Refresh data
            }
        } catch (error) {
            console.error('Error rejecting registration:', error);
        }
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">Teacher Registration Management</h1>
            </div>

            {/* Filters */}
            <Card>
                <CardHeader>
                    <CardTitle>Filters</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex gap-4">
                        <Input
                            placeholder="Search by name or email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="max-w-sm"
                        />
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-48">
                                <SelectValue placeholder="Filter by status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Status</SelectItem>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="approved">Approved</SelectItem>
                                <SelectItem value="rejected">Rejected</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {/* Registrations List */}
            <Card>
                <CardHeader>
                    <CardTitle>Teacher Registrations ({filteredRegistrations.length})</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {filteredRegistrations.map((registration) => (
                            <RegistrationCard
                                key={registration.id}
                                registration={registration}
                                onApprove={handleApprove}
                                onReject={handleReject}
                            />
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

const RegistrationCard = ({ registration, onApprove, onReject }) => {
    const getStatusColor = (status) => {
        switch (status) {
            case 'pending': return 'bg-yellow-100 text-yellow-800';
            case 'approved': return 'bg-green-100 text-green-800';
            case 'rejected': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <div className="border rounded-lg p-4">
            <div className="flex justify-between items-start">
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold">{registration.name}</h3>
                        <Badge className={getStatusColor(registration.status)}>
                            {registration.status}
                        </Badge>
                    </div>
                    <div className="space-y-1 text-sm text-gray-600">
                        <p>Email: {registration.email}</p>
                        <p>Phone: {registration.phone}</p>
                        <p>Registered: {new Date(registration.created_at).toLocaleDateString()}</p>
                        {registration.reviewed_at && (
                            <p>Reviewed: {new Date(registration.reviewed_at).toLocaleDateString()}</p>
                        )}
                        {registration.rejection_reason && (
                            <p className="text-red-600">Rejection reason: {registration.rejection_reason}</p>
                        )}
                    </div>
                </div>
                {registration.status === 'pending' && (
                    <div className="space-x-2">
                        <Button
                            onClick={() => onApprove(registration.id)}
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                        >
                            Approve
                        </Button>
                        <Button
                            onClick={() => {
                                const reason = prompt('Please provide rejection reason:');
                                if (reason) onReject(registration.id, reason);
                            }}
                            size="sm"
                            variant="destructive"
                        >
                            Reject
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TeacherRegistrationManagement;
```

### Phase 4: Security & Access Control
**Objective**: Implement comprehensive security measures for school admin isolation

#### 4.1 Enhanced Subdomain Middleware
```javascript
// server/middleware/schoolSubdomainIsolation.js
const pool = require('../db/postgres');

const schoolSubdomainIsolation = async (req, res, next) => {
    try {
        const subdomain = req.subdomain;
        
        if (!subdomain) {
            return res.status(400).json({ error: 'Subdomain required' });
        }

        // Get school information
        const schoolQuery = 'SELECT id, name, is_active FROM schools WHERE subdomain = $1';
        const schoolResult = await pool.query(schoolQuery, [subdomain]);
        
        if (schoolResult.rows.length === 0) {
            return res.status(404).json({ error: 'School not found' });
        }

        const school = schoolResult.rows[0];
        
        if (!school.is_active) {
            return res.status(403).json({ error: 'School is not active' });
        }

        // Attach school info to request
        req.school = school;
        
        // For school admin routes, verify admin belongs to this school
        if (req.path.startsWith('/api/school-admin')) {
            const token = req.headers.authorization?.split(' ')[1];
            if (token) {
                try {
                    const decoded = jwt.verify(token, process.env.JWT_SECRET);
                    const adminQuery = `
                        SELECT id, school_id, is_active 
                        FROM school_admins 
                        WHERE id = $1 AND school_id = $2 AND is_active = true
                    `;
                    const adminResult = await pool.query(adminQuery, [decoded.userId, school.id]);
                    
                    if (adminResult.rows.length === 0) {
                        return res.status(403).json({ error: 'Admin access denied for this school' });
                    }
                } catch (error) {
                    // Token invalid, but let the auth middleware handle it
                }
            }
        }
        
        next();
    } catch (error) {
        console.error('Subdomain isolation error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = schoolSubdomainIsolation;
```

#### 4.2 Data Access Validation
```javascript
// server/utils/dataAccessValidation.js
const pool = require('../db/postgres');

const validateSchoolDataAccess = async (userId, schoolId, resourceType, resourceId) => {
    try {
        // Verify user belongs to the school
        const userQuery = `
            SELECT role, school_id 
            FROM users 
            WHERE id = $1 AND school_id = $2
        `;
        const userResult = await pool.query(userQuery, [userId, schoolId]);
        
        if (userResult.rows.length === 0) {
            return { authorized: false, reason: 'User not found in school' };
        }

        const user = userResult.rows[0];
        
        // Check resource-specific access
        switch (resourceType) {
            case 'exam':
                const examQuery = 'SELECT school_id FROM exams WHERE id = $1';
                const examResult = await pool.query(examQuery, [resourceId]);
                return examResult.rows.length > 0 && examResult.rows[0].school_id === schoolId
                    ? { authorized: true }
                    : { authorized: false, reason: 'Exam not found in school' };
            
            case 'student':
                const studentQuery = 'SELECT school_id FROM users WHERE id = $1 AND role = $2';
                const studentResult = await pool.query(studentQuery, [resourceId, 'student']);
                return studentResult.rows.length > 0 && studentResult.rows[0].school_id === schoolId
                    ? { authorized: true }
                    : { authorized: false, reason: 'Student not found in school' };
            
            default:
                return { authorized: true }; // Allow for other resources
        }
    } catch (error) {
        console.error('Data access validation error:', error);
        return { authorized: false, reason: 'Validation error' };
    }
};

module.exports = { validateSchoolDataAccess };
```

### Phase 5: Testing & Deployment
**Objective**: Comprehensive testing and deployment strategy

#### 5.1 Unit Tests
```javascript
// tests/schoolAdmin/teacherRegistration.test.js
const request = require('supertest');
const app = require('../../server/app');

describe('Teacher Registration Management', () => {
    let schoolAdminToken;
    let testSchoolId;

    beforeAll(async () => {
        // Setup test data
        const loginResponse = await request(app)
            .post('/api/school-admin/login')
            .send({
                email: 'test-admin@school.com',
                password: 'password123'
            });
        
        schoolAdminToken = loginResponse.body.token;
        testSchoolId = loginResponse.body.schoolId;
    });

    test('should fetch pending teacher registrations', async () => {
        const response = await request(app)
            .get('/api/school-admin/teacher-registrations/pending')
            .set('Authorization', `Bearer ${schoolAdminToken}`)
            .expect(200);

        expect(Array.isArray(response.body)).toBe(true);
    });

    test('should approve teacher registration', async () => {
        const response = await request(app)
            .post('/api/school-admin/teacher-registrations/test-id/approve')
            .set('Authorization', `Bearer ${schoolAdminToken}`)
            .expect(200);

        expect(response.body.message).toBe('Teacher registration approved successfully');
    });

    test('should reject teacher registration', async () => {
        const response = await request(app)
            .post('/api/school-admin/teacher-registrations/test-id/reject')
            .set('Authorization', `Bearer ${schoolAdminToken}`)
            .send({ rejectionReason: 'Invalid credentials' })
            .expect(200);

        expect(response.body.message).toBe('Teacher registration rejected');
    });
});
```

#### 5.2 Integration Tests
```javascript
// tests/integration/schoolAdminIsolation.test.js
const request = require('supertest');
const app = require('../../server/app');

describe('School Admin Isolation', () => {
    test('should prevent cross-school data access', async () => {
        const school1AdminToken = await getSchoolAdminToken('school1');
        const school2AdminToken = await getSchoolAdminToken('school2');

        // Try to access school2 data with school1 token
        const response = await request(app)
            .get('/api/school-admin/dashboard/stats')
            .set('Authorization', `Bearer ${school1AdminToken}`)
            .set('Host', 'school2.examplatform.com')
            .expect(403);

        expect(response.body.error).toBe('Admin access denied for this school');
    });

    test('should enforce subdomain isolation', async () => {
        const schoolAdminToken = await getSchoolAdminToken('school1');

        // Try to access without proper subdomain
        const response = await request(app)
            .get('/api/school-admin/dashboard/stats')
            .set('Authorization', `Bearer ${schoolAdminToken}`)
            .expect(400);

        expect(response.body.error).toBe('Subdomain required');
    });
});

async function getSchoolAdminToken(schoolSubdomain) {
    const response = await request(app)
        .post('/api/school-admin/login')
        .set('Host', `${schoolSubdomain}.examplatform.com`)
        .send({
            email: `admin@${schoolSubdomain}.com`,
            password: 'password123'
        });
    
    return response.body.token;
}
```

#### 5.3 Deployment Checklist
- [ ] Database migrations applied
- [ ] Environment variables configured
- [ ] Subdomain DNS records updated
- [ ] SSL certificates installed
- [ ] Load balancer configuration
- [ ] Security headers implemented
- [ ] Monitoring and logging setup
- [ ] Backup procedures verified
- [ ] Performance testing completed
- [ ] Security audit performed

## Implementation Timeline

### Week 1: Database & Backend Setup
- Day 1-2: Database schema enhancements
- Day 3-4: Backend API development
- Day 5: Initial testing and bug fixes

### Week 2: Frontend Development
- Day 1-3: School admin dashboard components
- Day 4-5: Teacher registration management interface

### Week 3: Security & Testing
- Day 1-2: Security implementation
- Day 3-4: Unit and integration testing
- Day 5: Performance optimization

### Week 4: Deployment & Documentation
- Day 1-2: Deployment preparation
- Day 3: Staging deployment
- Day 4: Production deployment
- Day 5: Documentation and training

## Key Features Summary

### 1. School Admin Isolation
- Subdomain-based access control
- School-specific data filtering
- Role-based permissions within school

### 2. Teacher Registration Approval
- Pending registration dashboard
- Approval/rejection workflow
- Audit trail for all actions

### 3. Security Features
- JWT token validation
- Subdomain verification
- Cross-school access prevention
- Comprehensive audit logging

### 4. Admin Dashboard
- School statistics overview
- Recent activity tracking
- Teacher management tools
- Performance metrics

### 5. User Experience
- Intuitive approval interface
- Real-time notifications
- Mobile-responsive design
- Comprehensive search and filtering

## Success Metrics

1. **Security**: Zero cross-school data access incidents
2. **Performance**: <2 second response times for all admin operations
3. **Usability**: >90% satisfaction rate from school admins
4. **Reliability**: 99.9% uptime for admin dashboard
5. **Compliance**: Full audit trail for all admin actions

## Risk Mitigation

### Technical Risks
- **Database Performance**: Implement proper indexing and query optimization
- **Security Breaches**: Multi-layer authentication and authorization
- **Data Integrity**: Comprehensive validation and error handling

### Operational Risks
- **User Training**: Detailed documentation and video tutorials
- **Support Overload**: Automated workflows and self-service options
- **Migration Issues**: Gradual rollout with rollback capabilities

## Conclusion

This comprehensive plan ensures that school administrators have complete control over their school's ecosystem while maintaining strict data isolation between schools. The teacher approval workflow adds an essential layer of oversight, ensuring that only authorized teachers can access the system.

The implementation follows security best practices and provides a scalable foundation for future enhancements. The modular architecture allows for easy maintenance and upgrades while maintaining system stability.
