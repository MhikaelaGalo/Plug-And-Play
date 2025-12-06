import { Router } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import mongodb from "mongodb"; // 👈 FIX: Re-added for ObjectId use in the /me route
import { getDb, isValidObjectId } from "../config/config.js";
import {
  authenticateToken,
  requireAdmin,
  JWT_SECRET,
} from "../middleware/auth.js";

const router = Router();

// CREATE ADMIN: REGISTER
// Final Endpoint: POST /api/admin/register
// ----------------------
router.post("/register", async (req, res) => {
  try {
    const db = getDb();
    const admins = db.collection("admin_users");
    // Ensure all required fields are destructured
    const { username, email, password, full_name, role } = req.body;

    if (!username || !email || !password) {
      return res
        .status(400)
        .json({ message: "username, email and password are required" });
    }

    // Check for existing user
    const existing = await admins.findOne({
      $or: [{ username }, { email }],
    });
    if (existing) {
      return res
        .status(409)
        .json({ message: "Username or email already exists" });
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 10);
    const now = new Date();

    const newAdmin = {
      username,
      email,
      password_hash,
      full_name: full_name || null,
      role: role || "admin", // Default role
      is_active: true,
      created_at: now,
      updated_at: now,
      last_login: null,
    };

    const result = await admins.insertOne(newAdmin);

    // Respond without sending the password hash
    res.status(201).json({
      message: "Admin registration successful",
      _id: result.insertedId,
      username: newAdmin.username,
      email: newAdmin.email,
      role: newAdmin.role,
    });
  } catch (err) {
    console.error("Error registering admin:", err);
    res.status(500).json({ message: "Error registering admin" });
  }
});

// ADMIN LOGIN:
// Final Endpoint: POST /api/admin/login
// ----------------------
router.post("/login", async (req, res) => {
  try {
    const db = getDb();
    const admins = db.collection("admin_users");
    const { usernameOrEmail, password } = req.body;

    if (!usernameOrEmail || !password) {
      return res
        .status(400)
        .json({ message: "usernameOrEmail and password are required" });
    }

    const admin = await admins.findOne({
      $or: [{ username: usernameOrEmail }, { email: usernameOrEmail }],
      is_active: true,
    });

    if (!admin) {
      return res
        .status(401)
        .json({ message: "Invalid credentials or user inactive" });
    }

    const ok = await bcrypt.compare(password, admin.password_hash || "");
    if (!ok) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // create JWT token
    const token = jwt.sign(
      {
        adminId: admin._id,
        username: admin.username,
        role: "admin",
      },
      JWT_SECRET,
      { expiresIn: "2h" }
    );

    await admins.updateOne(
      { _id: admin._id },
      { $set: { last_login: new Date() } }
    );

    res.json({
      message: "Admin login success",
      token,
      admin: {
        _id: admin._id,
        username: admin.username,
        email: admin.email,
        full_name: admin.full_name,
        role: admin.role,
      },
    });
  } catch (err) {
    console.error("Error logging in admin:", err);
    res.status(500).json({ message: "Error logging in admin" });
  }
});

// ADMIN: GET MY INFO
// Final Endpoint: GET /api/admin/me
// (protected - needs admin token)
// ----------------------
router.get("/me", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const db = getDb();
    const admins = db.collection("admin_users");

    const admin = await admins.findOne({
      _id: new mongodb.ObjectId(req.user.adminId),
    });

    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    res.json({
      _id: admin._id,
      username: admin.username,
      email: admin.email,
      full_name: admin.full_name,
      role: admin.role,
      is_active: admin.is_active,
      created_at: admin.created_at,
      updated_at: admin.updated_at,
      last_login: admin.last_login,
    });
  } catch (err) {
    console.error("Error fetching admin info:", err);
    res.status(500).json({ message: "Error fetching admin info" });
  }
});

export default router;
