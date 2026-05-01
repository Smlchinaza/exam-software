// Simple debug script to test subdomain generation function
console.log('🔍 Testing subdomain generation function...\n');

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
  'School With-Special Characters!',
  'Spectra Group of Schools'
];

console.log('Test Results:');
testNames.forEach(name => {
  const subdomain = generateSubdomainSlug(name);
  const domain = `${subdomain}.schoolshubs.com`;
  console.log(`"${name}" → "${domain}"`);
});

// Check if the function exists in the actual file
console.log('\n🔍 Checking if the function is properly added to super-admin-postgres.js...');
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'server', 'routes', 'super-admin-postgres.js');

try {
  const fileContent = fs.readFileSync(filePath, 'utf8');
  
  if (fileContent.includes('function generateSubdomainSlug')) {
    console.log('✅ generateSubdomainSlug function found in super-admin-postgres.js');
  } else {
    console.log('❌ generateSubdomainSlug function NOT found in super-admin-postgres.js');
  }
  
  if (fileContent.includes('schoolDomain = `${generateSubdomainSlug(request.school_name)}.schoolshubs.com`')) {
    console.log('✅ Domain generation logic found in approval endpoint');
  } else {
    console.log('❌ Domain generation logic NOT found in approval endpoint');
  }
  
  if (fileContent.includes('domain: schoolDomain,')) {
    console.log('✅ Domain included in response');
  } else {
    console.log('❌ Domain NOT included in response');
  }
  
} catch (error) {
  console.log('❌ Could not read super-admin-postgres.js file:', error.message);
}

console.log('\n🔍 Next steps:');
console.log('1. Make sure the server is restarted after the changes');
console.log('2. Test with a new school registration and approval');
console.log('3. Check the server logs for any errors during approval');
console.log('4. Verify the database to see if domains are being saved');
