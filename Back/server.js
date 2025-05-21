import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import pool from './config/database.js';
import authRoutes from "./routes/authRoutes.js";
import logRoutes from "./routes/logRoutes.js";
import deviceRoutes from "./routes/deviceRoutes.js";

dotenv.config();
const app = express();
console.log("Loaded DB_USER:", process.env.DB_USER);
console.log("Loaded JWT_SECRET:", process.env.JWT_SECRET);

// Middleware
app.use(cors());
app.use(express.json());

// Test MySQL Connection Before Starting the Server
async function startServer() {
    try {
      await pool.query('SELECT 1'); // Simple query to check connection
      console.log('Connected to MySQL database successfully');
        
      console.log("Registering Device Routes...");
      // Routes
      app.use('/api/auth', authRoutes);
      app.use('/api/logs', logRoutes);
      app.use('/api/devices', deviceRoutes);
      console.log("Routes Registered Successfully");
  
      // Start the Express server
      const PORT = process.env.PORT || 5000;
      app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  
    } catch (error) {
      console.error('Failed to connect to MySQL:', error.message);
      process.exit(1); // Exit the process if the database is not connected
    }
  }
  
  // Call the function to start the server
  startServer();