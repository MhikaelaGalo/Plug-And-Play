import { Router } from "express";
import mongodb from "mongodb";
import { getDb, isValidObjectId } from "../config/config.js"; // 👈 FIXED IMPORT
import { authenticateToken, requireAdmin } from "../middleware/auth.js";

const router = Router();

// CREATE SUPPLIER
// POST /api/suppliers
// (admin only)
router.post("/", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const db = getDb();
    const suppliers = db.collection("suppliers");
    const { supplier_name, contact_person, email, phone, address, is_active } =
      req.body;

    if (!supplier_name) {
      return res.status(400).json({ message: "supplier_name is required" });
    }

    // optional: avoid duplicate supplier name or email
    const existing = await suppliers.findOne({
      $or: [{ supplier_name }, { email }],
    });
    if (existing) {
      return res
        .status(409)
        .json({ message: "Supplier with same name or email already exists" });
    }

    const now = new Date();
    const newSupplier = {
      supplier_name,
      contact_person: contact_person || null,
      email: email || null,
      phone: phone || null,
      address: address || null,
      is_active: is_active === undefined ? true : Boolean(is_active),
      created_at: now,
      updated_at: now,
    };

    const result = await suppliers.insertOne(newSupplier);

    res.status(201).json({
      message: "Supplier created successfully",
      _id: result.insertedId,
      ...newSupplier,
    });
  } catch (err) {
    console.error("Error creating supplier:", err);
    res.status(500).json({ message: "Error creating supplier" });
  }
});

// READ SUPPLIERS (LIST)
// GET /api/suppliers?includeInactive=true
router.get("/", async (req, res) => {
  try {
    const db = getDb();
    const suppliers = db.collection("suppliers");
    const { includeInactive } = req.query;

    const filter = {};
    if (includeInactive !== "true") {
      filter.is_active = true;
    }

    const data = await suppliers.find(filter).toArray();

    res.json(data);
  } catch (err) {
    console.error("Error fetching suppliers:", err);
    res.status(500).json({ message: "Error fetching suppliers" });
  }
});

// READ SINGLE SUPPLIER
// GET /api/suppliers/:id
router.get("/:id", async (req, res) => {
  try {
    const db = getDb();
    const suppliers = db.collection("suppliers");
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid supplier ID" });
    }

    const supplier = await suppliers.findOne({ _id: new mongodb.ObjectId(id) });

    if (!supplier) {
      return res.status(404).json({ message: "Supplier not found" });
    }

    res.json(supplier);
  } catch (err) {
    console.error("Error fetching supplier:", err);
    res.status(500).json({ message: "Error fetching supplier" });
  }
});

// UPDATE SUPPLIER
// PUT /api/suppliers/:id
// (admin only)
router.put("/:id", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const db = getDb();
    const suppliers = db.collection("suppliers");
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid supplier ID" });
    }

    const updates = {};
    const { supplier_name, contact_person, email, phone, address, is_active } =
      req.body;

    if (supplier_name !== undefined) updates.supplier_name = supplier_name;
    if (contact_person !== undefined) updates.contact_person = contact_person;
    if (email !== undefined) updates.email = email;
    if (phone !== undefined) updates.phone = phone;
    if (address !== undefined) updates.address = address;
    if (is_active !== undefined) updates.is_active = Boolean(is_active);

    if (Object.keys(updates).length === 0) {
      return res
        .status(400)
        .json({ message: "No valid fields provided for update" });
    }

    updates.updated_at = new Date();

    const result = await suppliers.updateOne(
      { _id: new mongodb.ObjectId(id) },
      { $set: updates }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: "Supplier not found" });
    }

    res.json({ message: "Supplier updated successfully" });
  } catch (err) {
    console.error("Error updating supplier:", err);
    res.status(500).json({ message: "Error updating supplier" });
  }
});

// DELETE SUPPLIER (SOFT DELETE)
// DELETE /api/suppliers/:id
// (admin only)
router.delete("/:id", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const db = getDb();
    const suppliers = db.collection("suppliers");
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid supplier ID" });
    }

    const result = await suppliers.updateOne(
      { _id: new mongodb.ObjectId(id) },
      { $set: { is_active: false, updated_at: new Date() } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: "Supplier not found" });
    }

    res.json({ message: "Supplier deactivated (is_active: false)" });
  } catch (err) {
    console.error("Error deleting supplier:", err);
    res.status(500).json({ message: "Error deleting supplier" });
  }
});

export default router;
