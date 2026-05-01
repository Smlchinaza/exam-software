// Debug script to check subdomain generation issue
const axios = require('axios');

const API_BASE = 'http://localhost:5000';

async function debugSubdomainIssue() {
  try {
    console.log('🔍 Debugging subdomain generation issue...\n');

    // Step 1: Check if server is running
    console.log('1. Checking if server is running...');
    try {
      const response = await axios.get(`${API_BASE}/api/states`);
      console.log('✅ Server is running');
      console.log(`   Found ${response.data.length} states`);
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        console.log('❌ Server is not running on localhost:5000');
        console.log('   Please start the server first: npm run dev or node server/server.js');
        return;
      } else {
        console.log('✅ Server is running');
      }
    }

    // Step 2: Test the subdomain generation function directly
    console.log('\n2. Testing subdomain generation function...');
    function generateSubdomainSlug(schoolName) {
      return schoolName
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '')      // Remove special characters
        .replace(/\s+/g, '-')               // Replace spaces with hyphens
        .replace(/-+/g, '-')                // Replace multiple hyphens with single
        .slice(0, 50);                      // Limit to 50 characters
    }

    const testNames = [
      'Excellence Academy',
      'St. Mary\'s College',
      'Lagos Grammar School',
      'ABC School 123',
      'School With-Special Characters!'
    ];

    testNames.forEach(name => {
      const subdomain = generateSubdomainSlug(name);
      const domain = `${subdomain}.schoolshubs.com`;
      console.log(`   "${name}" → ${domain}`);
    });

    // Step 3: Check database for schools without domains
    console.log('\n3. Checking database for existing schools...');
    try {
      // This would require database connection, let's try through API
      console.log('   (Would need database access to check existing schools)');
    } catch (error) {
      console.log('   Could not check database directly');
    }

    // Step 4: Try to create a test registration and approval
    console.log('\n4. Testing registration and approval flow...');
    
    // Get states first
    const statesResponse = await axios.get(`${API_BASE}/api/states`);
    const firstState = statesResponse.data[0];
    
    if (!firstState) {
      console.log('❌ No states found in database');
      return;
    }

    // Create test registration
    const testSchoolName = `Test School ${Date.now()}`;
    console.log(`   Creating registration for: ${testSchoolName}`);
    
    const registrationResponse = await axios.post(`${API_BASE}/api/schools/request-registration`, {
      schoolName: testSchoolName,
      stateId: firstState.id,
      requesterName: 'Debug Test',
      requesterEmail: `debug${Date.now()}@test.com`,
      requesterPhone: '+1234567890',
      proposedAdminEmail: `admin${Date.now()}@test.com`,
      proposedAdminFirstName: 'Debug',
      proposedAdminLastName: 'Admin'
    });

    console.log('✅ Registration created successfully');
    console.log(`   Registration ID: ${registrationResponse.data.request.id}`);
    console.log(`   School ID: ${registrationResponse.data.request.schoolId}`);

    // Now try to login as super admin (this might fail without proper credentials)
    console.log('\n5. Testing super admin approval...');
    try {
      const loginResponse = await axios.post(`${API_BASE}/api/auth/login`, {
        email: 'super@admin.com',
        password: 'admin123'
      });
      
      const token = loginResponse.data.token;
      console.log('✅ Super admin login successful');

      // Get pending registrations
      const pendingResponse = await axios.get(`${API_BASE}/api/super-admin/registrations/pending`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const pendingRequest = pendingResponse.data.pendingRequests.find(
        r => r.id === registrationResponse.data.request.id
      );

      if (pendingRequest) {
        console.log(`   Found pending request: ${pendingRequest.school_name}`);
        
        // Check if domain is null before approval
        console.log(`   Current domain: ${pendingRequest.domain || 'NULL'}`);
        
        // Approve the registration
        const approvalResponse = await axios.post(`${API_BASE}/api/super-admin/registrations/${pendingRequest.id}/approve`, {
          adminPassword: 'TestPassword123',
          approvalNotes: 'Debug test approval'
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });

        const { school } = approvalResponse.data;
        console.log('✅ Registration approved');
        console.log(`   Assigned domain: ${school.domain}`);
        console.log(`   Subdomain: ${school.subdomain}`);
        
        // Verify the domain was generated correctly
        const expectedSubdomain = generateSubdomainSlug(testSchoolName);
        const expectedDomain = `${expectedSubdomain}.schoolshubs.com`;
        
        if (school.domain === expectedDomain) {
          console.log('✅ Subdomain generation working correctly!');
        } else {
          console.log('❌ Subdomain generation issue detected!');
          console.log(`   Expected: ${expectedDomain}`);
          console.log(`   Actual: ${school.domain}`);
        }
      } else {
        console.log('❌ Pending request not found in super admin view');
      }

    } catch (loginError) {
      console.log('❌ Super admin login failed');
      console.log('   This is expected if credentials are not set up');
      console.log('   Please check your super admin credentials in the database');
    }

  } catch (error) {
    console.error('❌ Debug failed:', error.response?.data || error.message);
  }
}

// Run the debug
debugSubdomainIssue();
