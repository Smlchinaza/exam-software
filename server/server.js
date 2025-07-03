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
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const questionRoutes = require('./routes/questions');
const examRoutes = require('./routes/exams');
const studentRoutes = require('./routes/students');
const subjectRoutes = require('./routes/subjects');

// Load environment variables
dotenv.config();

const app = express();

// CORS configuration
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 86400 // 24 hours
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Apply dynamic rate limiting to all routes (adjusts based on user role)
app.use(dynamicLimiter);

// Routes with specific rate limiting
app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/questions", uploadLimiter, questionRoutes);
app.use("/api/exams", examSubmissionLimiter, examRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/subjects", adminLimiter, subjectRoutes);

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