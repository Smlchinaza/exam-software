# Multi-Tenant Registration and Login Redesign

## Overview

This document outlines the redesign of the registration and login pages to support a multi-tenant school platform where teachers select their state and school during registration.

## Current State Analysis

### Existing Registration Flow
- Single registration form for all user types (student, teacher, admin)
- No state or school selection
- Basic user information collection
- Direct user creation without tenant association

### Existing Login Flow
- Simple email/password authentication
- Role-based redirection after login
- No tenant context in login process

### Database Schema
- `schools` table exists with basic fields (id, name, domain, created_at, updated_at)
- `users` table has `school_id` foreign key for multi-tenancy
- No states table or location-based school filtering

## Proposed Multi-Tenant Registration Design

### 1. Database Schema Enhancements

#### Add States Table
```sql
CREATE TABLE IF NOT EXISTS states (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL UNIQUE,
    code text NOT NULL UNIQUE, -- e.g., "CA", "NY", "TX"
    country text NOT NULL DEFAULT 'Nigeria',
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now()
);
```

#### Update Schools Table
```sql
ALTER TABLE schools 
ADD COLUMN state_id uuid REFERENCES states(id),
ADD COLUMN address text,
ADD COLUMN city text,
ADD COLUMN postal_code text,
ADD COLUMN phone text,
ADD COLUMN type text DEFAULT 'secondary', -- primary, secondary, tertiary
ADD COLUMN is_public boolean DEFAULT true,
ADD COLUMN status text DEFAULT 'active'; -- active, inactive, suspended
```

### 2. New Registration Flow for Teachers

#### Step 1: Role Selection
- Teacher/Student/Admin selection (existing)
- For teachers, proceed to state selection

#### Step 2: State Selection
- Dropdown/select list of Nigerian states
- Fetch states from `/api/states` endpoint
- Auto-proceed to school selection after state selection

#### Step 3: School Selection
- Filter schools by selected state
- Display list of registered schools in that state
- Search functionality for school name
- If school not found, option to request school registration

#### Step 4: Teacher Information
- Personal details (name, email, phone)
- Professional details (subject specialization, employment type)
- Account credentials (password)
- School association automatically created

### 3. Enhanced Login Flow

#### Tenant-Aware Login
- Email/password authentication (existing)
- Backend automatically determines school/tenant from user record
- School context passed to frontend for proper routing
- Enhanced error messages for tenant-specific issues

#### School Context Management
- Store school information in auth context
- Display school name/branding in dashboard
- Ensure all API calls include school context

## API Endpoints Required

### 1. States Management
```
GET /api/states - List all active states
POST /api/states - Add new state (admin only)
PUT /api/states/:id - Update state (admin only)
```

### 2. Schools with State Filtering
```
GET /api/schools/by-state/:stateId - Get schools by state
GET /api/schools/search?q=query&stateId=id - Search schools
POST /api/schools/request-registration - Request new school registration
```

### 3. Enhanced Registration
```
POST /api/auth/register/teacher - Multi-step teacher registration
POST /api/auth/register/student - Existing student registration (unchanged)
```

### 4. Enhanced Login
```
POST /api/auth/login - Existing login with enhanced tenant context
GET /api/auth/current-school - Get current user's school details
```

## Frontend Component Architecture

### 1. New Components

#### `TeacherRegistrationWizard.js`
- Multi-step registration wizard
- Step indicators and progress
- Form validation per step
- State and school selection integration

#### `StateSelector.js`
- Dropdown of Nigerian states
- Search functionality
- Loading states

#### `SchoolSelector.js`
- School list by state
- Search and filter
- School details display
- "Request new school" option

#### `SchoolRegistrationRequest.js`
- Form for requesting new school registration
- Admin notification system
- Request tracking

### 2. Enhanced Existing Components

#### `Register.js`
- Route to appropriate registration component based on role
- Keep existing student registration flow
- Redirect teachers to new wizard

#### `Login.js`
- Enhanced with school context display
- Better error handling for tenant issues
- School branding if available

#### `AuthContext.js`
- Add school context management
- Tenant-aware API calls
- School information caching

## Implementation Phases

### Phase 1: Backend Foundation
1. Create states table and seed with Nigerian states
2. Update schools table with state and additional fields
3. Create states and enhanced schools API endpoints
4. Update existing schools with state information

### Phase 2: Teacher Registration
1. Create TeacherRegistrationWizard component
2. Implement StateSelector component
3. Implement SchoolSelector component
4. Update registration API for teachers
5. Integrate wizard into main registration flow

### Phase 3: Login Enhancement
1. Update login to include school context
2. Enhance AuthContext with tenant information
3. Add school branding to dashboards
4. Update API calls to include tenant context

### Phase 4: School Registration Requests
1. Create SchoolRegistrationRequest component
2. Implement admin notification system
3. Add school approval workflow
4. Create admin dashboard for school management

## Data Flow Examples

### Teacher Registration Flow
```
1. User selects "Teacher" role
2. Fetch states from /api/states
3. User selects state (e.g., "Lagos")
4. Fetch schools from /api/schools/by-state/:stateId
5. User selects school (e.g., "Lagos High School")
6. User fills teacher information
7. Submit to /api/auth/register/teacher with:
   {
     "firstName": "John",
     "lastName": "Doe",
     "email": "john@lagoshigh.edu",
     "password": "secure123",
     "schoolId": "uuid-of-lagos-high-school",
     "phone": "+2348012345678",
     "subjects": ["Mathematics", "Physics"],
     "employmentType": "full-time"
   }
8. Backend creates user with school_id association
9. Return success with school context
```

### Login Flow with Tenant Context
```
1. User submits email/password
2. Backend authenticates and retrieves user with school info
3. Return response:
   {
     "user": {
       "id": "user-uuid",
       "email": "john@lagoshigh.edu",
       "role": "teacher",
       "school_id": "school-uuid"
     },
     "school": {
       "id": "school-uuid",
       "name": "Lagos High School",
       "state": "Lagos",
       "domain": "lagoshigh.examplatform.com"
     },
     "token": "jwt-token"
   }
4. Frontend stores school context in AuthContext
5. Redirect to teacher dashboard with school branding
```

## Security Considerations

### 1. Tenant Isolation
- All API calls must include school context
- Backend middleware enforces tenant scoping
- Users cannot access data from other schools

### 2. School Registration
- Admin approval required for new school requests
- Verification process for school legitimacy
- Domain validation for school emails

### 3. Data Privacy
- School information only accessible to authenticated users
- State data is public but read-only
- Teacher requests are private to school admins

## Testing Strategy

### 1. Unit Tests
- Component rendering and interaction
- Form validation
- API integration

### 2. Integration Tests
- Complete registration flow
- Login with tenant context
- School selection and filtering

### 3. End-to-End Tests
- Multi-step registration wizard
- Teacher dashboard with school context
- Cross-tenant data isolation

## Performance Considerations

### 1. State and School Data
- Cache states data (static)
- Implement school search with debouncing
- Lazy loading for large school lists

### 2. Form Optimization
- Progressive disclosure of form fields
- Client-side validation
- Optimistic UI updates

## Accessibility Requirements

### 1. Form Navigation
- Keyboard navigation through wizard steps
- Screen reader support for form fields
- Focus management between steps

### 2. Visual Design
- High contrast colors
- Clear step indicators
- Error message positioning

## Mobile Responsiveness

### 1. Wizard Layout
- Single column layout on mobile
- Touch-friendly controls
- Swipe gesture support for step navigation

### 2. School Selection
- Optimized dropdown for mobile
- Search functionality prominently displayed
- School cards with essential information only

## Migration Strategy

### 1. Existing Users
- Current users remain functional
- Gradual migration to new system
- Backward compatibility for existing schools

### 2. Data Migration
- Add state information to existing schools
- Update user records if needed
- Database migration scripts

## Success Metrics

### 1. User Experience
- Reduced registration time for teachers
- Improved school discovery
- Higher completion rates for teacher registration

### 2. System Performance
- Faster login times with cached school context
- Reduced API calls through efficient data loading
- Improved data organization through tenant structure

### 3. Business Metrics
- Increased teacher registration rates
- Better school representation on platform
- Enhanced data quality for analytics

## Future Enhancements

### 1. Advanced School Features
- School profiles with detailed information
- School comparison tools
- Geographic school mapping

### 2. Enhanced Teacher Profiles
- Teacher verification system
- Professional development tracking
- Subject specialization matching

### 3. Student Registration Enhancements
- Parent/guardian school selection
- Class assignment during registration
- School-specific enrollment requirements

---

This design provides a comprehensive foundation for implementing multi-tenant registration and login functionality while maintaining the existing system's stability and user experience.
