// test-states-selector.js
// Test the exact same fetch that StateSelector will use

const fetchStates = async () => {
    try {
      console.log('Testing StateSelector fetch...');
      
      // Use full backend URL to avoid proxy issues
      const apiUrl = 'http://localhost:5000/api/states';
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
      
      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch states: ${response.status} ${response.statusText}`);
      }
      
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error(`Expected JSON but received ${contentType}`);
      }
      
      const data = await response.json();
      console.log('✅ States data received:', data.length, 'states');
      console.log('✅ First state:', data[0]);
      console.log('✅ Last state:', data[data.length - 1]);
      
      return data;
    } catch (err) {
      console.error('❌ Error fetching states:', err);
      console.error('❌ Error details:', err.message);
      return [];
    }
  };

fetchStates();
