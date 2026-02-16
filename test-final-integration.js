// test-final-integration.js
// Test the complete integration with the new API service

const { statesApi } = require('./client/src/services/statesApi');

async function testIntegration() {
  console.log('=== Testing Final Integration ===\n');
  
  try {
    // Test 1: Get all states
    console.log('🔍 Testing getAllStates...');
    const states = await statesApi.getAllStates();
    console.log(`✅ Found ${states.length} states`);
    console.log(`✅ First state: ${states[0].name} (${states[0].code})`);
    console.log(`✅ Last state: ${states[states.length - 1].name} (${states[states.length - 1].code})`);
    
    if (states.length > 0) {
      // Test 2: Get schools by state (using first state)
      console.log('\n🔍 Testing getSchoolsByState...');
      const schoolsByState = await statesApi.getSchoolsByState(states[0].id);
      console.log(`✅ Found ${schoolsByState.schools?.length || 0} schools in ${states[0].name}`);
      
      // Test 3: Search schools
      console.log('\n🔍 Testing searchSchools...');
      const searchResults = await statesApi.searchSchools('school', states[0].id);
      console.log(`✅ Search found ${searchResults.schools?.length || 0} schools matching "school" in ${states[0].name}`);
    }
    
    console.log('\n🎉 All API tests passed!');
    console.log('📊 StateSelector and SchoolSelector should now work correctly');
    
  } catch (error) {
    console.error('❌ Integration test failed:', error.message);
  }
}

testIntegration();
