const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;
console.log(
  "Testing connection to:",
  MONGODB_URI.replace(/:([^@]+)@/, ":****@"),
);

const options = {
  serverSelectionTimeoutMS: 5000,
  connectTimeoutMS: 5000,
};

mongoose
  .connect(MONGODB_URI, options)
  .then(() => {
    console.log("Successfully connected to MongoDB");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Failed to connect to MongoDB:", err.message);
    process.exit(1);
  });
