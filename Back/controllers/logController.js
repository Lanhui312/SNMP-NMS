import { Log } from "../models/Log.js";

export const getLogs = async (req, res) => {
  try {
    const logs = await Log.findAll();

    // Sort logs by timestamp in descending order (newest first)
    logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    res.json(logs);
  } catch (error) {
    console.error("Failed to fetch logs:", error);
    res.status(500).json({ message: "Failed to fetch logs" });
  }
};
