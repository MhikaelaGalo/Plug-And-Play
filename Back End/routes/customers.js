import { Router } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import mongodb from "mongodb";
import { getDb, isValidObjectId } from "../config/config.js";
import {
  authenticateToken,
  requireCustomer,
  JWT_SECRET, //  Relies on imported secret
} from "../middleware/auth.js";

const router = Router();

// CREATE CUSTOMER: REGISTER
// POST /api/customers/register
// ----------------------
router.post("/register", async (req, res) => {
  try {
    const db = getDb();
    const customers = db.collection("customers");

    const { username, email, password, first_name, last_name, phone, address } =
      req.body;

    // required fields
    if (!username || !email || !password || !first_name || !last_name) {
      return res.status(400).json({
        message: "Missing required fields.",
        details:
          "username, email, password, first_name, last_name are required.",
      });
    }

    // check if username OR email already exist
    const existing = await customers.findOne({
      $or: [{ username }, { email }],
    });
    if (existing) {
      return res
        .status(409)
        .json({ message: "Username or email already exists." });
    }

    // hash password
    const password_hash = await bcrypt.hash(password, 10);
    const now = new Date();

    const newCustomer = {
      username,
      email,
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

    const result = await customers.insertOne(newCustomer);

    // Respond without sending the password hash
    res.status(201).json({
      message: "Customer registration successful",
      _id: result.insertedId,
      username: newCustomer.username,
      email: newCustomer.email,
      first_name: newCustomer.first_name,
      last_name: newCustomer.last_name,
    });
  } catch (err) {
    console.error("Error registering customer:", err);
    res.status(500).json({ message: "Error registering customer" });
  }
});

// CUSTOMER LOGIN:
// Final Endpoint: POST /api/customers/login
// ----------------------
router.post("/login", async (req, res) => {
  try {
    const db = getDb(); // 👈 FIXED: Added getDb()
    const customers = db.collection("customers");
    // Changed parameter name to be clear for frontend use
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "email and password are required.",
      });
    }

    // find user by email
    const customer = await customers.findOne({
      email: email,
      is_active: true,
    });

    if (!customer) {
      return res.status(401).json({ message: "Invalid credentials." });
    }

    // compare password with hashed password
    const ok = await bcrypt.compare(password, customer.password_hash || "");
    if (!ok) {
      return res.status(401).json({ message: "Invalid credentials." });
    }

    // create JWT token
    const token = jwt.sign(
      {
        customerId: customer._id,
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

    res.json({
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
    res.status(500).json({ message: "Error logging in customer" });
  }
});

// CUSTOMER: GET MY INFO
// Final Endpoint: GET /api/customers/me
// (protected - needs customer token)
// ----------------------
router.get("/me", authenticateToken, requireCustomer, async (req, res) => {
  try {
    const db = getDb();
    const customers = db.collection("customers");

    const customer = await customers.findOne({
      _id: new mongodb.ObjectId(req.user.customerId),
    });

    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    res.json({
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
    res.status(500).json({ message: "Error fetching customer info" });
  }
});

export default router;
