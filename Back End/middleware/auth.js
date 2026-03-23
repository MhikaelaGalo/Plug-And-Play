// middleware/auth.js
import jwt from "jsonwebtoken";
import dotenv from "dotenv"; // Import dotenv

dotenv.config(); // Load environment variables here

const JWT_SECRET = process.env.JWT_TOKEN || "dev-secret";

export function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Access token required" });
  }

  try {
    // This verification uses the JWT_SECRET defined above, which now correctly
    // loads the value from process.env.JWT_TOKEN.
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch (err) {
    // This is the error you were seeing! It means the secret was mismatched.
    return res.status(403).json({ error: "Invalid or expired token" });
  }
}

export function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
}

export function requireCustomer(req, res, next) {
  if (!req.user || !req.user.customerId) {
    // Note: The token payload for customers should contain customerId (e.g., from your customers.js login route)
    return res.status(403).json({ message: "Customer token required" });
  }
  next();
}

export function requireRole(...allowed) {
  return (req, res, next) => {
    if (!req.user || !allowed.includes(req.user.role)) {
      return res.status(403).json({ message: "Access denied" });
    }
    next();
  };
}

export { JWT_SECRET };
