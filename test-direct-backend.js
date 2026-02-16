// test-direct-backend.js
// Test direct backend connection from frontend perspective

const http = require('http');

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/states',
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
};

const req = http.request(options, (res) => {
  console.log(`Direct backend status: ${res.statusCode}`);
  console.log(`Direct backend headers:`, res.headers);
  
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('Direct backend response type:', res.headers['content-type']);
    console.log('Direct backend response length:', data.length);
    console.log('Direct backend response preview:', data.substring(0, 200));
    
    if (data.includes('Abia') && data.includes('Lagos')) {
      console.log('✅ Direct backend connection working perfectly');
    } else {
      console.log('❌ Direct backend connection failed');
    }
  });
});

req.on('error', (error) => {
  console.error('Direct backend request error:', error.message);
});

req.end();
