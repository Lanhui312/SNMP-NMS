import pool from "../config/database.js";
import bcrypt from "bcryptjs";

export const User = {
  // Find user by username
  findByUsername: async (username) => {
    const [rows] = await pool.query("SELECT * FROM users WHERE username = ?", [
      username,
    ]);
    return rows[0];
  },

  // Create new user
  create: async (username, password, role) => {
    // Password is hashed with bcrypt before storing in DB for security
    const hashedPassword = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      "INSERT INTO users (username, password, role) VALUES (?, ?, ?)",
      [username, hashedPassword, role]
    );
    return result.insertId;
  },
};
