// test-states-api.js
// Test script to check if states API is working

const http = require('http');

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/states',
  method: 'GET',
  headers: {
    'Content-Type': 'application/json'
  }
};

const req = http.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  console.log(`Headers:`, res.headers);
  
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('Response type:', res.headers['content-type']);
    console.log('Response length:', data.length);
    console.log('Response preview:', data.substring(0, 200));
    
    try {
      const jsonData = JSON.parse(data);
      console.log('✅ JSON parsed successfully');
      console.log(`Found ${jsonData.length} states`);
      if (jsonData.length > 0) {
        console.log('First state:', jsonData[0]);
      }
    } catch (error) {
      console.log('❌ Failed to parse JSON:', error.message);
      if (data.includes('<!DOCTYPE')) {
        console.log('❌ Received HTML instead of JSON - likely an error page');
      }
    }
  });
});

req.on('error', (error) => {
  console.error('Request error:', error.message);
});

req.end();
