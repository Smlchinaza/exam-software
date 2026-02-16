// test-search-endpoint.js
// Test the search endpoint directly

const http = require('http');

// Test search without authentication
const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/schools/search?q=school&stateId=5610bf34-cc36-4826-907c-9bd38ba0c769', // Using Abia state ID
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
};

const req = http.request(options, (res) => {
  console.log(`Search endpoint status: ${res.statusCode}`);
  console.log(`Search endpoint headers:`, res.headers);
  
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('Search endpoint response type:', res.headers['content-type']);
    console.log('Search endpoint response preview:', data.substring(0, 200));
    
    if (res.statusCode === 200) {
      console.log('✅ Search endpoint working correctly');
    } else {
      console.log('❌ Search endpoint failed');
    }
  });
});

req.on('error', (error) => {
  console.error('Search endpoint request error:', error.message);
});

req.end();
