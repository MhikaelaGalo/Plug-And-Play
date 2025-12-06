import { Router } from "express";
import mongodb from "mongodb";
import { getDb, isValidObjectId } from "../config/config.js"; // 👈 FIXED IMPORT
import { authenticateToken, requireAdmin } from "../middleware/auth.js";

const router = Router();

// CREATE CATEGORY
// POST /api/categories
// ----------------------
router.post("/", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const db = getDb();
    const categories = db.collection("categories");
    const { category_name, description } = req.body;

    if (!category_name) {
      return res.status(400).json({ message: "category_name is required" });
    }

    // Check for existing category name
    const existing = await categories.findOne({ category_name });
    if (existing) {
      return res.status(409).json({ message: "Category name already exists" });
    }

    const newCategory = {
      category_name,
      description: description || null,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    };

    const result = await categories.insertOne(newCategory);

    res.status(201).json({
      message: "Category created successfully",
      _id: result.insertedId,
      category_name,
      description: newCategory.description,
      is_active: newCategory.is_active,
    });
  } catch (err) {
    console.error("Error creating category:", err);
    res.status(500).json({ message: "Error creating category" });
  }
});

// READ CATEGORIES (LIST)
// GET /api/categories
// ----------------------
router.get("/", async (req, res) => {
  try {
    const db = getDb();
    const categories = db.collection("categories");
    const { includeInactive } = req.query;

    const filter = {
      ...(includeInactive !== "true" && { is_active: true }),
    };

    const data = await categories
      .find(filter)
      .project({ products: 0 })
      .toArray();

    res.json(data);
  } catch (err) {
    console.error("Error fetching categories:", err);
    res.status(500).json({ message: "Error fetching categories" });
  }
});

// READ SINGLE CATEGORY
// GET /api/categories/:id
// ----------------------
router.get("/:id", async (req, res) => {
  try {
    const db = getDb();
    const categories = db.collection("categories");
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid category ID" });
    }

    const category = await categories.findOne(
      { _id: new mongodb.ObjectId(id) },
      { projection: { products: 0 } }
    );

    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    res.json(category);
  } catch (err) {
    console.error("Error fetching category:", err);
    res.status(500).json({ message: "Error fetching category" });
  }
});

// UPDATE CATEGORY
// PUT /api/categories/:id
// ----------------------
router.put("/:id", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const db = getDb();
    const categories = db.collection("categories");
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid category ID" });
    }

    const updates = {};
    const { category_name, description, is_active } = req.body;

    if (category_name !== undefined) updates.category_name = category_name;
    if (description !== undefined) updates.description = description;
    if (is_active !== undefined) updates.is_active = Boolean(is_active);

    if (Object.keys(updates).length === 0) {
      return res
        .status(400)
        .json({ message: "No valid fields provided for update" });
    }

    updates.updated_at = new Date();

    const result = await categories.updateOne(
      { _id: new mongodb.ObjectId(id) },
      { $set: updates }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: "Category not found" });
    }

    res.json({ message: "Category updated successfully" });
  } catch (err) {
    console.error("Error updating category:", err);
    res.status(500).json({ message: "Error updating category" });
  }
});

// DELETE CATEGORY (Soft Delete)
// DELETE /api/categories/:id
// ----------------------
router.delete("/:id", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const db = getDb();
    const categories = db.collection("categories");
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid category ID" });
    }

    const result = await categories.updateOne(
      { _id: new mongodb.ObjectId(id) },
      { $set: { is_active: false, updated_at: new Date() } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: "Category not found" });
    }

    res.json({
      message: "Category deactivated successfully (is_active: false)",
    });
  } catch (err) {
    console.error("Error deleting category:", err);
    res.status(500).json({ message: "Error deleting category" });
  }
});

export default router;
