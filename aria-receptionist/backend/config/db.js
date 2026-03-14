const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/aria_receptionist', {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      family: 4, // Force IPv4 connections
    });
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(`✅ Database ready for bookings`);
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    console.error('❌ CRITICAL: Bookings will NOT be saved! Database must be running.');
    console.error('❌ Please start MongoDB and restart the backend server.');
  }
};

module.exports = connectDB;
