const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse');
const axios = require('axios');
const { once } = require('events');

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

async function parseCSVAndRegister() {
  const registrations = [];
  const parser = fs.createReadStream(CSV_FILE)
    .pipe(parse({ columns: ['email', 'password'], from_line: 2, trim: true }));

  parser.on('data', (row) => {
    registrations.push(registerUser(row));
  });

  await once(parser, 'end');
  await Promise.all(registrations);
  console.log('Bulk registration complete.');
}

parseCSVAndRegister(); 