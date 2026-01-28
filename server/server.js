const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const errorHandler = require('./middleware/error');
const { 
  dynamicLimiter,
  generalLimiter, 
  authLimiter, 
  adminLimiter, 
  examSubmissionLimiter, 
  uploadLimiter 
} = require('./middleware/rateLimit');

// PostgreSQL connection pool (multi-tenant support)
const pool = require('./db/postgres');

// PostgreSQL routes (multi-tenant enabled)
const authPostgres = require('./routes/auth-postgres');
const examsPostgres = require('./routes/exams-postgres');
const submissionsPostgres = require('./routes/submissions-postgres');
const usersPostgres = require('./routes/users-postgres');

// Load environment variables
dotenv.config();

const app = express();
app.set('trust proxy', 1);

const allowedOrigins = [
  'http://localhost:3000',
  'https://exam-software-45ex.vercel.app',
  'https://exam-software-45ex-git-main-samuel-chinazas-projects.vercel.app',
  'https://exam-software-45ex-btw34co5j-samuel-chinazas-projects.vercel.app/'
];

// CORS configuration
const corsOptions = {
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 86400 // 24 hours
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({ 
      status: 'ok', 
      database: 'postgres',
      time: result.rows[0].now,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ status: 'error', error: error.message });
  }
});

// Apply dynamic rate limiting to all routes (adjusts based on user role)
// app.use(dynamicLimiter);

// PostgreSQL Routes (Multi-tenant enabled)
app.use("/api/auth", authPostgres);
app.use("/api/exams", examSubmissionLimiter, examsPostgres);
app.use("/api/submissions", examSubmissionLimiter, submissionsPostgres);
app.use("/api/users", usersPostgres);

// Error handler
app.use(errorHandler);
// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log('Database: PostgreSQL');
});