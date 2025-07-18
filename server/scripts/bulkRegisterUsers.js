const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse');
const axios = require('axios');

const CSV_FILE = path.join(__dirname, '../../users.csv'); // Adjust path if needed
const REGISTER_URL = 'http://localhost:5000/api/auth/register';

async function registerUser(user) {
  try {
    const response = await axios.post(REGISTER_URL, {
      email: user.email,
      password: user.password,
      firstName: 'Test',
      lastName: 'User',
      displayName: 'TestUser',
      role: 'student',
      rememberMe: false
    });
    console.log(`Registered: ${user.email}`);
  } catch (err) {
    if (err.response && err.response.data && err.response.data.message) {
      console.log(`Failed: ${user.email} - ${err.response.data.message}`);
    } else {
      console.log(`Failed: ${user.email} - ${err.message}`);
    }
  }
}

function parseCSVAndRegister() {
  fs.createReadStream(CSV_FILE)
    .pipe(parse({ columns: ['email', 'password'], from_line: 2, trim: true }))
    .on('data', (row) => {
      registerUser(row);
    })
    .on('end', () => {
      console.log('Bulk registration complete.');
    })
    .on('error', (err) => {
      console.error('Error reading CSV:', err);
    });
}

parseCSVAndRegister(); 