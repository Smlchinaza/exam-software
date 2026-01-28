const express = require("express");
const mongoose = require("mongoose");
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

// MongoDB routes (legacy - for gradual migration)
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const questionRoutes = require('./routes/questions');
const examRoutes = require('./routes/exams');
const studentRoutes = require('./routes/students');
const subjectRoutes = require('./routes/subjects');

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

// Health check endpoints
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    mongodb: mongoose.connection.readyState,
    timestamp: new Date().toISOString()
  });
});

app.get('/health/postgres', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({ status: 'ok', database: 'postgres', time: result.rows[0].now });
  } catch (error) {
    res.status(500).json({ status: 'error', error: error.message });
  }
});

// Apply dynamic rate limiting to all routes (adjusts based on user role)
// app.use(dynamicLimiter);

// Routes with specific rate limiting
// POSTGRES ROUTES (Multi-tenant enabled - use these)
app.use("/api/auth", authPostgres);
app.use("/api/exams", examSubmissionLimiter, examsPostgres);
app.use("/api/submissions", examSubmissionLimiter, submissionsPostgres);
app.use("/api/users", usersPostgres);

// LEGACY MONGODB ROUTES (kept for backward compatibility during migration)
// Uncomment to use old routes; comment out Postgres routes above to switch
// app.use("/api/auth", authLimiter, authRoutes);
// app.use("/api/users", userRoutes);
// app.use("/api/questions", uploadLimiter, questionRoutes);
// app.use("/api/exams", examSubmissionLimiter, examRoutes);
// app.use("/api/students", studentRoutes);
// app.use("/api/subjects", adminLimiter, subjectRoutes);

// Error handler
app.use(errorHandler);

// MongoDB connection configuration
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/exam-software?tlsAllowInvalidCertificates=true";
const MAX_RETRIES = 5;
const RETRY_INTERVAL = 5000; // 5 seconds
let retryCount = 0;

// MongoDB connection options
const mongooseOptions = {
  serverSelectionTimeoutMS: 10000,
  socketTimeoutMS: 45000,
  family: 4,
  maxPoolSize: 10,
  minPoolSize: 5,
  maxIdleTimeMS: 30000,
  connectTimeoutMS: 10000,
  heartbeatFrequencyMS: 10000,
  retryWrites: true,
  retryReads: true,
  tlsAllowInvalidCertificates: true
};

// Enhanced MongoDB connection with retry logic
const connectDB = async () => {
  try {
    if (mongoose.connection.readyState === 1) {
      console.log('MongoDB is already connected');
      return;
    }

    console.log(`Attempting to connect to MongoDB (Attempt ${retryCount + 1}/${MAX_RETRIES})...`);
    
    const conn = await mongoose.connect(MONGODB_URI, mongooseOptions);
    
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    console.log('Connection state:', mongoose.connection.readyState);
    
    // Reset retry count on successful connection
    retryCount = 0;

    // Safely log connection pool stats
    try {
      const poolStats = mongoose.connection.client?.topology?.s?.pool;
      if (poolStats) {
        console.log('Connection pool stats:', {
          size: poolStats.size,
          available: poolStats.available,
          pending: poolStats.pending,
          max: poolStats.max
        });
      }
    } catch (statsError) {
      console.log('Connection pool stats not available');
    }

  } catch (error) {
    console.error(`MongoDB connection error (Attempt ${retryCount + 1}/${MAX_RETRIES}):`, error.message);
    
    if (error.message.includes('IP whitelist')) {
      console.error('Please add your IP address to MongoDB Atlas whitelist');
      console.error('Visit: https://www.mongodb.com/docs/atlas/security-whitelist/');
    }
    
    if (retryCount < MAX_RETRIES) {
      retryCount++;
      console.log(`Retrying connection in ${RETRY_INTERVAL/1000} seconds...`);
      setTimeout(connectDB, RETRY_INTERVAL);
    } else {
      console.error('Max retry attempts reached. Please check your MongoDB connection settings.');
      process.exit(1);
    }
  }
};

// Handle MongoDB connection events
mongoose.connection.on('connected', () => {
  console.log('MongoDB connected successfully');
});

mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error:', err);
  if (retryCount < MAX_RETRIES) {
    retryCount++;
    console.log(`Attempting to reconnect (${retryCount}/${MAX_RETRIES})...`);
    setTimeout(connectDB, RETRY_INTERVAL);
  }
});

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected. Attempting to reconnect...');
  if (retryCount < MAX_RETRIES) {
    retryCount++;
    setTimeout(connectDB, RETRY_INTERVAL);
  }
});

mongoose.connection.on('reconnected', () => {
  console.log('MongoDB reconnected successfully');
  retryCount = 0;
});

// Handle process termination
process.on('SIGINT', async () => {
  try {
    await mongoose.connection.close();
    console.log('MongoDB connection closed through app termination');
    process.exit(0);
  } catch (err) {
    console.error('Error during MongoDB connection closure:', err);
    process.exit(1);
  }
});

// Initial connection
connectDB();

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});