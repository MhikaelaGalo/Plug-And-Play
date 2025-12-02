import { Router } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import mongodb from "mongodb";
import { getDb, isValidObjectId } from "../config/config.js";
import { authenticateToken, requireCustomer } from "../middleware/auth.js";

const router = Router();
const JWT_SECRET = process.env.JWT_TOKEN || "dev-secret";

//  CREATE CUSTOMER: REGISTER
//  POST /api/customers/register
// ----------------------
router.post("/api/customers/register", async (req, res) => {
  try {
    const customers = db.collection("customers");

    const { username, email, password, first_name, last_name, phone, address } =
      req.body;

    // required fields (based on table design)
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
      created_at: now,
    };

    const result = await customers.insertOne(newCustomer);

    // do NOT send password_hash back
    res.status(201).json({
      _id: result.insertedId,
      username,
      email,
      first_name,
      last_name,
      phone: newCustomer.phone,
      address: newCustomer.address,
      created_at: newCustomer.created_at,
    });
  } catch (err) {
    console.error("Error in register:", err);
    res.status(500).json({ message: "DB error while creating customer" });
  }
});

//  READ CUSTOMER: VIEW PROFILE
//  GET /api/customers/me  (needs token)
// ----------------------
router.get(
  "/api/customers/me",
  authenticateToken,
  requireCustomer,
  async (req, res) => {
    try {
      const customers = db.collection("customers");
      const customerId = req.user.customerId; // from JWT

      const customer = await customers.findOne(
        { _id: new mongodb.ObjectId(customerId) },
        { projection: { password_hash: 0 } } // hide password
      );

      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }

      res.json(customer);
    } catch (err) {
      console.error("Error fetching profile:", err);
      res.status(500).json({ message: "Error fetching profile" });
    }
  }
);

//  UPDATE CUSTOMER: UPDATE OWN PROFILE
//  PUT /api/customers/me  (needs token)
// ----------------------
router.put(
  "/api/customers/me",
  authenticateToken,
  requireCustomer,
  async (req, res) => {
    try {
      const customers = db.collection("customers");
      const customerId = req.user.customerId; // from JWT

      // safety: check if ID in token is valid
      if (!mongodb.ObjectId.isValid(customerId)) {
        return res
          .status(400)
          .json({ message: "Invalid customer ID in token" });
      }

      const { username, first_name, last_name, phone, address } = req.body;

      // build the "updates" object only from provided fields
      const updates = {};
      if (username !== undefined) updates.username = username;
      if (first_name !== undefined) updates.first_name = first_name;
      if (last_name !== undefined) updates.last_name = last_name;
      if (phone !== undefined) updates.phone = phone;
      if (address !== undefined) updates.address = address;

      if (Object.keys(updates).length === 0) {
        return res
          .status(400)
          .json({ message: "No valid fields provided for update" });
      }

      updates.updated_at = new Date();

      const result = await customers.updateOne(
        { _id: new mongodb.ObjectId(customerId) },
        { $set: updates }
      );

      if (result.matchedCount === 0) {
        return res.status(404).json({ message: "Customer not found" });
      }

      // fetch updated doc (without password_hash)
      const updatedCustomer = await customers.findOne(
        { _id: new mongodb.ObjectId(customerId) },
        { projection: { password_hash: 0 } }
      );

      res.json({
        message: "Profile updated successfully",
        customer: updatedCustomer,
      });
    } catch (err) {
      console.error("Error updating profile:", err);
      res.status(500).json({ message: "Error updating profile" });
    }
  }
);

//  UPDATE CUSTOMER: CHANGE PASSWORD
//  PUT /api/customers/me/password  (needs token)
// ----------------------
router.put(
  "/api/customers/me/password",
  authenticateToken,
  requireCustomer,
  async (req, res) => {
    try {
      const customers = db.collection("customers");
      const customerId = req.user.customerId; // from JWT
      const { currentPassword, newPassword } = req.body;

      // basic validation
      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          message: "currentPassword and newPassword are required",
        });
      }

      // check ID format
      if (!mongodb.ObjectId.isValid(customerId)) {
        return res
          .status(400)
          .json({ message: "Invalid customer ID in token" });
      }

      // find customer
      const customer = await customers.findOne({
        _id: new mongodb.ObjectId(customerId),
      });

      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }

      // compare old password
      const ok = await bcrypt.compare(
        currentPassword,
        customer.password_hash || ""
      );

      if (!ok) {
        return res
          .status(401)
          .json({ message: "Current password is incorrect" });
      }

      // hash new password
      const newHash = await bcrypt.hash(newPassword, 10);

      await customers.updateOne(
        { _id: new mongodb.ObjectId(customerId) },
        { $set: { password_hash: newHash, updated_at: new Date() } }
      );

      res.json({ message: "Password updated successfully" });
    } catch (err) {
      console.error("Error changing password:", err);
      res.status(500).json({ message: "Error changing password" });
    }
  }
);

//  DELETE CUSTOMER: DELETE OWN ACCOUNT
//  DELETE /api/customers/me  (needs token)
// ----------------------
router.delete(
  "/api/customers/me",
  authenticateToken,
  requireCustomer,
  async (req, res) => {
    try {
      const customers = db.collection("customers");
      const customerId = req.user.customerId; // from JWT

      // safety check: valid ObjectId format
      if (!mongodb.ObjectId.isValid(customerId)) {
        return res
          .status(400)
          .json({ message: "Invalid customer ID in token" });
      }

      const result = await customers.deleteOne({
        _id: new mongodb.ObjectId(customerId),
      });

      if (result.deletedCount === 0) {
        return res.status(404).json({ message: "Customer not found" });
      }

      res.json({ message: "Customer account deleted successfully" });
    } catch (err) {
      console.error("Error deleting customer:", err);
      res.status(500).json({ message: "Error deleting customer" });
    }
  }
);

//  CUSTOMER: LOGIN
//  POST /api/customers/login
// ----------------------
router.post("/api/customers/login", async (req, res) => {
  try {
    const customers = db.collection("customers");
    const { usernameOrEmail, password } = req.body;

    if (!usernameOrEmail || !password) {
      return res.status(400).json({
        message: "usernameOrEmail and password are required.",
      });
    }

    // find user by username OR email
    const customer = await customers.findOne({
      $or: [{ username: usernameOrEmail }, { email: usernameOrEmail }],
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
    console.error("Error in login:", err);
    res.status(500).json({ message: "Login failed" });
  }
});

export default router;