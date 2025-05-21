import pool from "../config/database.js";

export const Log = {
  // Create a new log entry indicating a user action
  create: async (userId, action) => {
    await pool.query("INSERT INTO logs (user_id, action) VALUES (?, ?)", [
      userId,
      action,
    ]);
  },

  // Retrieves all logs
  findAll: async () => {
    const [rows] = await pool.query(
      `SELECT logs.id, logs.action, logs.timestamp, logs.user_id 
       FROM logs 
       JOIN users ON logs.user_id = users.id`
    );
    return rows;
  },
};
