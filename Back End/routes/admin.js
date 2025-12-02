import { Router } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import mongodb from "mongodb";
import { getDb, isValidObjectId } from "../config/config.js";
import { authenticateToken, requireCustomer } from "../middleware/auth.js";

const router = Router();

// CREATE ADMIN: REGISTER
//  POST /api/admin/register
//  (you can use this once in Postman to create an admin user)
// ----------------------
router.post("/api/admin/register", async (req, res) => {
  try {
    const admins = db.collection("admin_users");
    const { username, email, password, full_name, role } = req.body;

    if (!username || !email || !password) {
      return res
        .status(400)
        .json({ message: "username, email and password are required" });
    }

    const existing = await admins.findOne({
      $or: [{ username }, { email }],
    });
    if (existing) {
      return res
        .status(409)
        .json({ message: "Username or email already exists" });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const now = new Date();

    const newAdmin = {
      username,
      email,
      password_hash,
      full_name: full_name || null,
      role: role || "admin", // e.g. "admin" or "manager"
      is_active: true,
      created_at: now,
      last_login: null,
    };

    const result = await admins.insertOne(newAdmin);

    res.status(201).json({
      _id: result.insertedId,
      username,
      email,
      role: newAdmin.role,
    });
  } catch (err) {
    console.error("Error registering admin:", err);
    res.status(500).json({ message: "Error registering admin" });
  }
});

//  ADMIN: LOGIN
//  POST /api/admin/login
// ----------------------
router.post("/api/admin/login", async (req, res) => {
  try {
    const admins = db.collection("admin_users");
    const { usernameOrEmail, password } = req.body;

    if (!usernameOrEmail || !password) {
      return res
        .status(400)
        .json({ message: "usernameOrEmail and password are required." });
    }

    const admin = await admins.findOne({
      $or: [{ username: usernameOrEmail }, { email: usernameOrEmail }],
    });

    if (!admin || !admin.is_active) {
      return res.status(401).json({ message: "Invalid credentials." });
    }

    const ok = await bcrypt.compare(password, admin.password_hash || "");
    if (!ok) {
      return res.status(401).json({ message: "Invalid credentials." });
    }

    const token = jwt.sign(
      {
        adminId: admin._id,
        username: admin.username,
        role: admin.role || "admin", // 👈 IMPORTANT
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
        role: admin.role,
      },
    });
  } catch (err) {
    console.error("Error in admin login:", err);
    res.status(500).json({ message: "Admin login failed" });
  }
});

export default router;