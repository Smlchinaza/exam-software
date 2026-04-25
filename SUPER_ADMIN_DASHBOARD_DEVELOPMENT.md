# Super Admin Dashboard Development Guide

## Overview

This document outlines the development plan for a comprehensive Super Admin Dashboard that will oversee the entire multi-tenant exam software system. The super admin will have centralized control over school registrations, system metrics, and administrative assignments.

## Current School Registration Flow Analysis

### Existing Flow Issues
The current school registration process (`/api/schools/register`) immediately creates schools with 'active' status and provides admin access without super admin approval. This needs to be modified for proper oversight.

**Current Problems:**
1. Schools are immediately activated without verification
2. Admin accounts are created instantly without approval
3. No oversight mechanism for school quality control
4. Missing audit trail for registration decisions
5. No way to prevent inappropriate or duplicate schools

### Required Flow Changes
1. **Registration Request**: Schools should be created with 'pending' status
2. **Super Admin Approval**: Super admin reviews and approves/rejects requests  
3. **Admin Account Creation**: Admin accounts should only be created after approval
4. **Notification System**: Email notifications for approval status changes
5. **Audit Logging**: Track all approval actions and decisions

## Updated Registration Workflow

### Step 1: School Registration Request
**New Endpoint**: `/api/schools/request-registration` (already exists but needs enhancement)

**Current Implementation Issues:**
- Creates school with 'pending' status but lacks proper admin account handling
- No separation between requester and eventual school admin
- Missing notification system to super admins

**Required Updates:**
```javascript
// Enhanced request payload
{
  schoolName: string,
  stateId: uuid,
  requesterName: string,
  requesterEmail: string,
  requesterPhone: string,
  schoolAddress: string,
  schoolCity: string,
  schoolType: 'primary'|'secondary'|'tertiary'|'vocational',
  proposedAdminEmail: string,    // Email for future admin account
  proposedAdminFirstName: string,
  proposedAdminLastName: string,
  supportingDocuments: Array,     // Upload URLs for verification
  message: string                 // Additional information
}
```

### Step 2: Super Admin Review
**Dashboard Integration Required:**
- Pending requests list with filtering and search
- Detailed request view modal/page
- Document preview functionality
- Approval/rejection workflow with reason tracking

**Review Process:**
1. Verify school information completeness
2. Check for duplicate or similar schools
3. Review supporting documents
4. Validate requester credentials
5. Make approval decision with comments

### Step 3: Approval Processing
**If Approved:**
```sql
-- Update school status
UPDATE schools 
SET status = 'active', 
    is_verified = true,
    approved_at = NOW(),
    approved_by = [super_admin_id]
WHERE id = [school_id];

-- Create admin account
INSERT INTO users (
  school_id, email, password_hash, first_name, last_name, 
  role, is_active, created_at, updated_at
) VALUES (
  [school_id], [proposed_admin_email], [hashed_password], 
  [first_name], [last_name], 'admin', true, NOW(), NOW()
);

-- Send notification email
```

**If Rejected:**
```sql
-- Update school status
UPDATE schools 
SET status = 'rejected', 
    rejected_at = NOW(),
    rejected_by = [super_admin_id],
    rejection_reason = [reason]
WHERE id = [school_id];

-- Send rejection email
```

### Step 4: Post-Approval
- Admin receives email with login credentials
- School appears in active schools directory
- Full school management functionality enabled
- Regular metrics collection begins

## Database Schema Updates Required

### Enhanced schools Table (Already Partially Implemented)
The enhanced schools schema already includes most needed fields:
- `status` ('pending', 'active', 'rejected', 'suspended')
- `is_verified` (boolean for admin verification)
- `accreditation_status` for additional verification

### New Tables Needed

#### school_registration_requests (Enhanced Version)
```sql
CREATE TABLE school_registration_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid REFERENCES schools(id),
  requester_name text NOT NULL,
  requester_email text NOT NULL,
  requester_phone text,
  proposed_admin_email text NOT NULL,
  proposed_admin_first_name text,
  proposed_admin_last_name text,
  supporting_documents jsonb DEFAULT '[]',
  additional_message text,
  status text DEFAULT 'pending', -- pending, approved, rejected
  submitted_at timestamptz DEFAULT NOW(),
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES users(id),
  approval_notes text,
  rejection_reason text
);
```

#### admin_approval_audit
```sql
CREATE TABLE admin_approval_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid REFERENCES schools(id),
  action text NOT NULL, -- 'approved', 'rejected', 'suspended'
  performed_by uuid REFERENCES users(id),
  performed_at timestamptz DEFAULT NOW(),
  reason text,
  previous_status text,
  new_status text,
  additional_data jsonb DEFAULT '{}'
);
```

## Core Responsibilities

### 1. School Registration Approval
- Review and approve/reject new school registration requests
- View detailed school information and documentation
- Manage registration workflow and status updates
- Send approval/rejection notifications
- Maintain audit trail of all approval actions

### 2. School Metrics Oversight
- Real-time dashboard showing key performance indicators for all schools
- Student enrollment statistics and trends
- Exam participation and completion rates
- System usage analytics and performance metrics
- School comparison and benchmarking tools

### 3. School Admin Assignment
- Assign and manage school administrators
- Update admin credentials and permissions
- Transfer admin responsibilities between schools
- Monitor admin activity and performance

## Technical Architecture

### Frontend Structure
```
client/src/
├── components/
│   ├── SuperAdmin/
│   │   ├── SuperAdminDashboard.js      # Main dashboard
│   │   ├── SchoolApproval.js          # Registration approval interface
│   │   ├── SchoolMetrics.js           # Metrics and analytics
│   │   ├── AdminAssignment.js         # Admin management
│   │   └── SuperAdminNavbar.js       # Navigation component
│   └── shared/
│       ├── MetricsCard.js            # Reusable metrics display
│       ├── SchoolTable.js            # School data table
│       └── StatusBadge.js            # Status indicators
├── services/
│   └── superAdminApi.js              # API service layer
└── pages/
    └── SuperAdminDashboardPage.js    # Main dashboard page
```

## API Endpoint Updates

### Modified Registration Endpoints

#### 1. Update Existing `/api/schools/register`
```javascript
// Should be deprecated in favor of request-registration flow
// Or modified to require super admin approval
```

#### 2. Enhance `/api/schools/request-registration`
```javascript
// Enhanced version with proper admin account handling
router.post('/request-registration', async (req, res) => {
  // 1. Create school with 'pending' status
  // 2. Create registration request record
  // 3. Store proposed admin details (don't create account yet)
  // 4. Upload and store supporting documents
  // 5. Send notification to super admins
  // 6. Return confirmation to requester
});
```

### New Super Admin Endpoints

#### 1. Registration Management
```javascript
GET /api/super-admin/registrations/pending
GET /api/super-admin/registrations/:id
POST /api/super-admin/registrations/:id/approve
POST /api/super-admin/registrations/:id/reject
GET /api/super-admin/registrations/history
```

#### 2. School Status Management
```javascript
GET /api/super-admin/schools/status/:status
PUT /api/super-admin/schools/:id/status
GET /api/super-admin/schools/:id/audit-log
```

## Frontend Flow Updates

### 1. Modified SchoolRegistration Component
- Change form to submit registration request instead of immediate registration
- Add fields for proposed admin credentials
- Include document upload functionality
- Show "request submitted" message instead of immediate access

### 2. New Super Admin Components
- **PendingRegistrations**: List of registration requests
- **RegistrationReview**: Detailed view and approval interface
- **SchoolStatusManager**: Status change interface
- **AuditLogViewer**: History of all approval actions

### 3. Updated User Flow
- Registration request → Pending status → Super admin review → Approval → Admin account creation → Login access

## Notification System Requirements

### Email Templates Needed
1. **Registration Request Received** (to super admins)
2. **Registration Approved** (to proposed admin)
3. **Registration Rejected** (to requester)
4. **School Status Changed** (to school admin)

### Real-time Notifications
- WebSocket notifications for new registration requests
- Dashboard indicators for pending approvals
- Alert system for urgent requests

## Security Considerations

### Registration Security
- CAPTCHA or similar bot protection
- Email verification for requester
- Document upload security scanning
- Rate limiting for registration requests

### Approval Security
- Multi-factor authentication for super admins
- Approval reason required for rejections
- Audit trail for all approval actions
- Role-based access control for approval permissions

## Migration Strategy

### Phase 1: Backend Updates
1. Add new database tables
2. Update registration endpoints
3. Create super admin endpoints
4. Implement notification system

### Phase 2: Frontend Updates  
1. Modify registration form
2. Create super admin dashboard components
3. Update routing and navigation
4. Add notification UI elements

### Phase 3: Data Migration
1. Update existing 'active' schools to 'verified' status
2. Create audit records for existing schools
3. Test approval workflow with sample data
4. Deploy to production with feature flag

### Phase 4: Go-Live
1. Enable new registration flow
2. Monitor for issues
3. Train super admins on new workflow
4. Collect feedback and iterate

### Backend API Endpoints
```
/api/super-admin/
├── schools/
│   ├── GET /pending-registrations    # Get pending school registrations
│   ├── POST /approve-school/:id      # Approve school registration
│   ├── POST /reject-school/:id       # Reject school registration
│   ├── GET /all-schools              # List all schools
│   └── GET /school-metrics/:id       # Get specific school metrics
├── metrics/
│   ├── GET /overview                 # System-wide metrics
│   ├── GET /school-comparison        # Comparative analytics
│   └── GET /performance-trends       # Historical performance data
└── admins/
    ├── GET /school-admins/:schoolId  # List school admins
    ├── POST /assign-admin            # Assign new admin
    ├── PUT /update-admin/:id         # Update admin details
    └── DELETE /remove-admin/:id      # Remove admin assignment
```

## Database Schema Extensions

### New Tables Required

#### super_admins
```sql
CREATE TABLE super_admins (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  permissions JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### school_registration_requests
```sql
CREATE TABLE school_registration_requests (
  id SERIAL PRIMARY KEY,
  school_id INTEGER REFERENCES schools(id),
  status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  reviewed_at TIMESTAMP,
  reviewed_by INTEGER REFERENCES super_admins(id),
  rejection_reason TEXT,
  admin_notes TEXT,
  supporting_documents JSONB DEFAULT '[]'
);
```

#### school_metrics
```sql
CREATE TABLE school_metrics (
  id SERIAL PRIMARY KEY,
  school_id INTEGER REFERENCES schools(id),
  metric_type VARCHAR(50), -- enrollment, exams, performance
  metric_value DECIMAL(10,2),
  metric_date DATE,
  additional_data JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Component Development Plan

### Phase 1: Core Dashboard Structure
1. **SuperAdminDashboard Component**
   - Main layout with sidebar navigation
   - Overview cards with key metrics
   - Quick actions for common tasks
   - Responsive design for mobile/desktop

2. **Authentication & Authorization**
   - Extend existing AuthContext for super admin role
   - Route protection for super admin pages
   - Permission-based UI rendering

### Phase 2: School Registration Management
1. **SchoolApproval Component**
   - Table of pending registration requests
   - Detailed view modal for each request
   - Approval/rejection workflow
   - Email notification system integration

2. **Registration Request Details**
   - School information display
   - Document upload/review interface
   - Comments and notes system
   - Status tracking and history

### Phase 3: Metrics & Analytics
1. **SchoolMetrics Component**
   - Interactive charts and graphs
   - Filterable data tables
   - Export functionality
   - Real-time data updates

2. **Performance Analytics**
   - School comparison tools
   - Trend analysis
   - Custom date range filtering
   - Drill-down capabilities

### Phase 4: Admin Management
1. **AdminAssignment Component**
   - School admin listing
   - Add/edit admin functionality
   - Permission management
   - Activity monitoring

2. **Admin Profile Management**
   - Admin user details
   - Role assignments
   - Access control settings
   - Audit trail

## API Integration

### Super Admin API Service
```javascript
// services/superAdminApi.js
import api from './api';

export const superAdminApi = {
  // School Registration Management
  getPendingRegistrations: async () => {
    const response = await api.get('/super-admin/schools/pending-registrations');
    return response.data;
  },
  
  approveSchool: async (schoolId, notes) => {
    const response = await api.post(`/super-admin/schools/approve-school/${schoolId}`, { notes });
    return response.data;
  },
  
  rejectSchool: async (schoolId, reason) => {
    const response = await api.post(`/super-admin/schools/reject-school/${schoolId}`, { reason });
    return response.data;
  },
  
  // Metrics & Analytics
  getSystemMetrics: async (filters = {}) => {
    const response = await api.get('/super-admin/metrics/overview', { params: filters });
    return response.data;
  },
  
  getSchoolMetrics: async (schoolId, timeRange) => {
    const response = await api.get(`/super-admin/schools/school-metrics/${schoolId}`, { 
      params: { timeRange } 
    });
    return response.data;
  },
  
  // Admin Management
  getSchoolAdmins: async (schoolId) => {
    const response = await api.get(`/super-admin/admins/school-admins/${schoolId}`);
    return response.data;
  },
  
  assignAdmin: async (adminData) => {
    const response = await api.post('/super-admin/admins/assign-admin', adminData);
    return response.data;
  },
  
  updateAdmin: async (adminId, updateData) => {
    const response = await api.put(`/super-admin/admins/update-admin/${adminId}`, updateData);
    return response.data;
  }
};
```

## UI/UX Design Specifications

### Design System
- **Color Scheme**: Professional blue/gray palette
- **Typography**: Clean, readable fonts with clear hierarchy
- **Icons**: Consistent icon set for actions and status
- **Layout**: Sidebar navigation with main content area

### Key Components
1. **Metrics Cards**
   - Large, readable numbers
   - Color-coded indicators
   - Trend arrows
   - Hover effects

2. **Data Tables**
   - Sortable columns
   - Search functionality
   - Pagination
   - Bulk actions

3. **Modals & Forms**
   - Clean form layouts
   - Validation feedback
   - Progress indicators
   - Confirmation dialogs

## Security Considerations

### Authentication
- Multi-factor authentication for super admin access
- Session timeout and re-authentication
- IP whitelisting options
- Audit logging for all actions

### Authorization
- Role-based access control (RBAC)
- Permission-based UI rendering
- API endpoint protection
- Data access restrictions

### Data Protection
- Encrypted data transmission
- Sensitive data masking
- Regular security audits
- Compliance with data protection regulations

## Testing Strategy

### Unit Testing
- Component testing with Jest/React Testing Library
- API service testing
- Utility function testing
- Mock data for consistent testing

### Integration Testing
- API endpoint testing
- Authentication flow testing
- Permission testing
- Cross-browser compatibility

### End-to-End Testing
- Complete user workflows
- Performance testing
- Load testing for metrics dashboard
- Accessibility testing

## Deployment & Monitoring

### Deployment Checklist
- [ ] Environment configuration
- [ ] Database migrations
- [ ] API endpoint deployment
- [ ] Frontend build and deployment
- [ ] SSL certificate setup
- [ ] Domain configuration

### Monitoring & Analytics
- Application performance monitoring
- Error tracking and alerting
- Usage analytics
- System health checks
- Backup and recovery procedures

## Future Enhancements

### Advanced Features
- AI-powered insights and recommendations
- Automated reporting system
- Mobile app for super admin access
- Integration with external analytics platforms
- Advanced filtering and search capabilities

### Scalability Improvements
- Microservices architecture
- Real-time data streaming
- Caching strategies
- Load balancing
- Database optimization

## Development Timeline

### Sprint 1 (2 weeks): Foundation
- Set up project structure
- Implement authentication
- Create basic dashboard layout
- Set up API integration

### Sprint 2 (2 weeks): School Registration
- Develop registration approval interface
- Implement status management
- Add notification system
- Create detailed request views

### Sprint 3 (2 weeks): Metrics Dashboard
- Build metrics collection system
- Create analytics components
- Implement data visualization
- Add filtering and export features

### Sprint 4 (2 weeks): Admin Management
- Develop admin assignment interface
- Implement user management
- Add permission controls
- Create audit logging

### Sprint 5 (1 week): Testing & Polish
- Comprehensive testing
- Performance optimization
- Security audit
- Documentation updates

## Conclusion

This Super Admin Dashboard will provide centralized control and oversight of the entire multi-tenant exam system. By following this development plan, we can create a robust, secure, and user-friendly interface that enables efficient management of schools, metrics, and administrative assignments.

The modular architecture ensures maintainability and scalability, while the comprehensive security measures protect sensitive data and system integrity. Regular monitoring and analytics will help optimize performance and user experience over time.
