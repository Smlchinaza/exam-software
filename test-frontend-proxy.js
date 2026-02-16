// test-frontend-proxy.js
// Test if the frontend proxy is working correctly

const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/states',
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
};

const req = http.request(options, (res) => {
  console.log(`Frontend proxy status: ${res.statusCode}`);
  console.log(`Frontend proxy headers:`, res.headers);
  
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('Frontend proxy response type:', res.headers['content-type']);
    console.log('Frontend proxy response length:', data.length);
    console.log('Frontend proxy response preview:', data.substring(0, 200));
    
    if (data.includes('<!DOCTYPE')) {
      console.log('❌ Frontend proxy is returning HTML (React dev server) instead of proxying to backend');
    } else if (data.includes('Abia') && data.includes('Lagos')) {
      console.log('✅ Frontend proxy is working correctly');
    } else {
      console.log('⚠️  Unexpected response from frontend proxy');
    }
  });
});

req.on('error', (error) => {
  console.error('Frontend proxy request error:', error.message);
});

req.end();
