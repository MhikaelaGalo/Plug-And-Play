// backend/routes/customers.js
import { Router } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import mongodb from "mongodb";
import { getDb, isValidObjectId } from "../config/config.js"; // ← keep your path
import {
  authenticateToken,
  requireCustomer,
  JWT_SECRET,
} from "../middleware/auth.js";

const router = Router();

// ------------------------------
// POST /api/customers/register
// ------------------------------
router.post("/register", async (req, res) => {
  try {
    const db = getDb();
    const customers = db.collection("customers");
    const {
      username,
      email,
      password,
      first_name,
      last_name,
      phone,
      address,
    } = req.body;

    if (!username || !email || !password || !first_name || !last_name) {
      return res.status(400).json({
        message:
          "Missing required fields: username, email, password, first_name, last_name.",
      });
    }

    const emailNorm = String(email).trim().toLowerCase();
    const exists = await customers.findOne({
      $or: [{ username }, { email: emailNorm }],
    });
    if (exists) {
      return res
        .status(409)
        .json({ message: "Username or email already exists." });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const now = new Date();
    const doc = {
      username,
      email: emailNorm,
      password_hash,
      first_name,
      last_name,
      phone: phone || null,
      address: address || null,
      is_active: true,
      created_at: now,
      updated_at: now,
      last_login: null,
    };

    const result = await customers.insertOne(doc);
    return res.status(201).json({
      message: "Customer registration successful",
      _id: result.insertedId,
      username,
      email: emailNorm,
      first_name,
      last_name,
    });
  } catch (err) {
    console.error("Error registering customer:", err);
    return res.status(500).json({ message: "Error registering customer" });
  }
});

// ------------------------------
// POST /api/customers/login
// Accepts: { usernameOrEmail, password } OR { email, password } OR { username, password }
// ------------------------------
router.post("/login", async (req, res) => {
  try {
    const db = getDb();
    const customers = db.collection("customers");

    const { usernameOrEmail, email, username, password } = req.body || {};
    const idRaw = (usernameOrEmail ?? email ?? username ?? "").trim();
    if (!idRaw || !password) {
      return res
        .status(400)
        .json({ message: "identifier and password are required." });
    }

    const isEmail = idRaw.includes("@");
    const query = isEmail
      ? { email: idRaw.toLowerCase(), is_active: true }
      : { username: idRaw, is_active: true };

    const customer = await customers.findOne(query);
    if (!customer) {
      return res.status(401).json({ message: "Invalid credentials." });
    }

    const ok = await bcrypt.compare(password, customer.password_hash || "");
    if (!ok) {
      return res.status(401).json({ message: "Invalid credentials." });
    }

    const token = jwt.sign(
      {
        customerId: String(customer._id), // stringify for portability
        username: customer.username,
        role: "customer",
      },
      JWT_SECRET,
      { expiresIn: "2h" }
    );

    await customers.updateOne(
      { _id: customer._id },
      { $set: { last_login: new Date() } }
    );

    return res.json({
      message: "Login success",
      token,
      customer: {
        _id: customer._id,
        username: customer.username,
        email: customer.email,
        first_name: customer.first_name,
        last_name: customer.last_name,
      },
    });
  } catch (err) {
    console.error("Error logging in customer:", err);
    return res.status(500).json({ message: "Error logging in customer" });
  }
});

// ------------------------------
// GET /api/customers/me  (auth)
// ------------------------------
router.get("/me", authenticateToken, requireCustomer, async (req, res) => {
  try {
    const db = getDb();
    const customers = db.collection("customers");
    const { customerId } = req.user || {};
    if (!customerId || !isValidObjectId(customerId)) {
      return res.status(400).json({ message: "Invalid customer token" });
    }

    const customer = await customers.findOne({
      _id: new mongodb.ObjectId(customerId),
    });
    if (!customer) return res.status(404).json({ message: "Customer not found" });

    return res.json({
      _id: customer._id,
      username: customer.username,
      email: customer.email,
      first_name: customer.first_name,
      last_name: customer.last_name,
      phone: customer.phone,
      address: customer.address,
      is_active: customer.is_active,
      created_at: customer.created_at,
      updated_at: customer.updated_at,
      last_login: customer.last_login,
    });
  } catch (err) {
    console.error("Error fetching customer info:", err);
    return res.status(500).json({ message: "Error fetching customer info" });
  }
});

export default router;
