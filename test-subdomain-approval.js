// Test script to verify subdomain generation during school approval
const axios = require('axios');

const API_BASE = 'http://localhost:5000';

async function testSubdomainApproval() {
  try {
    console.log('🧪 Testing subdomain generation during school approval...\n');

    // Step 1: Login as super admin
    console.log('1. Logging in as super admin...');
    const loginResponse = await axios.post(`${API_BASE}/api/auth/login`, {
      email: 'super@admin.com', // Replace with actual super admin email
      password: 'admin123'      // Replace with actual password
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Super admin login successful');

    // Step 2: Get pending registrations
    console.log('\n2. Fetching pending registrations...');
    const pendingResponse = await axios.get(`${API_BASE}/api/super-admin/registrations/pending`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (pendingResponse.data.pendingRequests.length === 0) {
      console.log('⚠️  No pending registrations found. Creating a test registration first...');
      
      // Create a test registration
      const statesResponse = await axios.get(`${API_BASE}/api/states`);
      const firstState = statesResponse.data[0];
      
      await axios.post(`${API_BASE}/api/schools/request-registration`, {
        schoolName: 'Test School for Subdomain ' + Date.now(),
        stateId: firstState.id,
        requesterName: 'Test Requester',
        requesterEmail: `test${Date.now()}@example.com`,
        requesterPhone: '+1234567890',
        proposedAdminEmail: `admin${Date.now()}@testschool.com`,
        proposedAdminFirstName: 'Test',
        proposedAdminLastName: 'Admin'
      });
      
      console.log('✅ Test registration created');
      
      // Fetch pending registrations again
      const newPendingResponse = await axios.get(`${API_BASE}/api/super-admin/registrations/pending`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const pendingRequest = newPendingResponse.data.pendingRequests[0];
      
      // Step 3: Approve the registration
      console.log('\n3. Approving registration and checking subdomain generation...');
      const approvalResponse = await axios.post(`${API_BASE}/api/super-admin/registrations/${pendingRequest.id}/approve`, {
        adminPassword: 'TestPassword123',
        approvalNotes: 'Testing subdomain generation'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const { school } = approvalResponse.data;
      
      console.log('✅ Registration approved successfully!');
      console.log('\n📋 Approval Results:');
      console.log(`   School ID: ${school.id}`);
      console.log(`   School Name: ${school.name}`);
      console.log(`   Domain: ${school.domain}`);
      console.log(`   Subdomain: ${school.subdomain}`);
      console.log(`   Status: ${school.status}`);
      
      // Verify the subdomain format
      const expectedSubdomain = school.name.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').slice(0, 50);
      const expectedDomain = `${expectedSubdomain}.schoolshubs.com`;
      
      if (school.domain === expectedDomain) {
        console.log('\n✅ Subdomain generation working correctly!');
        console.log(`   Expected: ${expectedDomain}`);
        console.log(`   Actual: ${school.domain}`);
      } else {
        console.log('\n❌ Subdomain generation issue detected!');
        console.log(`   Expected: ${expectedDomain}`);
        console.log(`   Actual: ${school.domain}`);
      }
      
      // Step 4: Verify in database
      console.log('\n4. Verifying domain is saved in database...');
      const schoolsResponse = await axios.get(`${API_BASE}/api/super-admin/schools/all`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const verifiedSchool = schoolsResponse.data.schools.find(s => s.id === school.id);
      
      if (verifiedSchool && verifiedSchool.domain === school.domain) {
        console.log('✅ Domain correctly saved in database!');
      } else {
        console.log('❌ Domain not found or incorrect in database!');
      }
      
    } else {
      console.log(`Found ${pendingResponse.data.pendingRequests.length} pending registrations`);
      console.log('Please approve one manually to test the subdomain generation.');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    if (error.response?.status === 401) {
      console.log('\n💡 Tip: Make sure to update the super admin credentials in the script');
    }
  }
}

// Run the test
testSubdomainApproval();
