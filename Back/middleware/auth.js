import jwt from "jsonwebtoken";

export const authenticate = (req, res, next) => {
  const token = req.headers["authorization"];

  console.log("Received Token:", token);

  if (!token) {
    return res.status(401).json({ message: "No token provided" });
  }

  try {
    const decoded = jwt.verify(token.split(" ")[1], process.env.JWT_SECRET);
    req.user = decoded;
    console.log("Token Verified:", decoded);
    next();
  } catch (error) {
    console.error("Token Verification Failed:", error.message);
    res.status(400).json({ message: "Invalid token" });
  }
};
