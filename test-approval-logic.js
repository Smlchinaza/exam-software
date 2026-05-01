// Test the approval logic directly
console.log('🔍 Testing approval logic simulation...\n');

// Simulate the generateSubdomainSlug function
function generateSubdomainSlug(schoolName) {
  return schoolName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')      // Remove special characters
    .replace(/\s+/g, '-')               // Replace spaces with hyphens
    .replace(/-+/g, '-')                // Replace multiple hyphens with single
    .slice(0, 50);                      // Limit to 50 characters
}

// Simulate the approval process
function simulateApproval(schoolName, currentDomain = null) {
  console.log(`\n--- Simulating Approval for: ${schoolName} ---`);
  console.log(`Current domain: ${currentDomain || 'NULL'}`);
  
  let schoolDomain = currentDomain;
  
  // If domain doesn't exist, auto-generate from school name
  if (!schoolDomain) {
    schoolDomain = `${generateSubdomainSlug(schoolName)}.schoolshubs.com`;
    console.log(`✅ Generated new domain: ${schoolDomain}`);
  } else {
    console.log(`✅ Using existing domain: ${schoolDomain}`);
  }
  
  const subdomain = schoolDomain.split('.')[0];
  console.log(`📍 Subdomain: ${subdomain}`);
  
  return {
    originalName: schoolName,
    originalDomain: currentDomain,
    finalDomain: schoolDomain,
    subdomain: subdomain,
    domainGenerated: !currentDomain
  };
}

// Test cases
const testCases = [
  { name: 'Excellence Academy', domain: null },
  { name: 'St. Mary\'s College', domain: null },
  { name: 'Existing School', domain: 'existing.schoolshubs.com' },
  { name: 'Test School 123', domain: null },
  { name: 'School With-Special Characters!', domain: null }
];

console.log('🧪 Running approval simulations...');
testCases.forEach(testCase => {
  const result = simulateApproval(testCase.name, testCase.domain);
  console.log(`Result: ${result.domainGenerated ? 'GENERATED' : 'EXISTING'} domain`);
});

console.log('\n🔍 Potential issues to check:');
console.log('1. Is the server restarted after the code changes?');
console.log('2. Are there any errors in the server logs during approval?');
console.log('3. Is the database transaction being committed successfully?');
console.log('4. Are there any validation errors preventing the domain update?');
console.log('5. Is the schools table accepting the domain value?');

console.log('\n🔍 Debugging steps:');
console.log('1. Add console.log statements in the approval endpoint');
console.log('2. Check the actual SQL queries being executed');
console.log('3. Verify the database connection and transaction handling');
console.log('4. Test with a simple direct database update');

// Example of what the SQL should look like
console.log('\n📋 Expected SQL queries:');
console.log('1. SELECT domain FROM schools WHERE id = $1');
console.log('2. If domain is NULL:');
console.log('   UPDATE schools SET domain = $1, status = \'active\', is_verified = true, updated_at = NOW() WHERE id = $2');
console.log('3. COMMIT');

console.log('\n💡 Quick test: Try manually updating a school\'s domain in the database to verify the column accepts data:');
console.log('   UPDATE schools SET domain = \'test.schoolshubs.com\' WHERE id = \'your-school-id\';');
