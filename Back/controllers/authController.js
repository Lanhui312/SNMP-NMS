import jwt from "jsonwebtoken";
import { User } from "../models/User.js";
import { Log } from "../models/Log.js";
import bcrypt from "bcryptjs";

export const login = async (req, res) => {
  const { username, password } = req.body;

  try {
    if (!username || !password) {
      return res
        .status(400)
        .json({ message: "Username and password are required" });
    }

    // Check if user exists, then verify password with bcrypt
    const user = await User.findByUsername(username);
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({
        message:
          "Invalid credentials" +
          " password:" +
          password +
          " user password:" +
          user.password,
      });
    }

    // Sign a new JWT token with user id and role
    console.log("JWT_SECRET:", process.env.JWT_SECRET);
    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    // Add an entry to the logs to track the login
    await Log.create(user.id, "login");
    res.json({ token, role: user.role });
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const register = async (req, res) => {
  const { username, password, role, validationCode } = req.body;

  // Basic check to allow admin registration only if a valid admin code is provided
  if (role === "admin" && validationCode !== process.env.ADMIN_CODE) {
    return res.status(403).json({ message: "Invalid admin code" });
  }

  try {
    // Check if the username is already taken
    const existingUser = await User.findByUsername(username);
    if (existingUser) {
      return res.status(409).json({ message: "Username exists" });
    }

    const userId = await User.create(username, password, role || "user");
    await Log.create(userId, "register");
    res.status(201).json({ message: "User created" });
  } catch (error) {
    res.status(500).json({ message: "Registration failed" });
  }
};
