import { Router } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import mongodb from "mongodb";
import { getDb, isValidObjectId } from "../config/config.js";
import { authenticateToken, requireAdmin } from "../middleware/auth.js";

const router = Router();

// CREATE PRODUCTS:
// POST /api/products
// ----------------------
router.post(
  "/", // 👈 FIXED PATH
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const db = getDb(); // 👈 FIXED: Added getDb()
      const products = db.collection("products");

      // Allow either a single object or an array of objects
      const incoming = Array.isArray(req.body) ? req.body : [req.body];

      if (incoming.length === 0) {
        return res.status(400).json({ message: "No products provided" });
      }

      // Map each item to our cleaned product structure
      const now = new Date();
      const docs = incoming.map((p) => {
        const unitPriceNumber = Number(p.unit_price);
        const costPriceNumber =
          p.cost_price !== undefined && p.cost_price !== null
            ? Number(p.cost_price)
            : null;

        if (!p.product_name || Number.isNaN(unitPriceNumber)) {
          throw new Error(
            "Each product must have product_name and valid unit_price"
          );
        }

        return {
          product_name: p.product_name,
          description: p.description || "",
          category_id: p.category_id || null,
          supplier_id: p.supplier_id || null,
          unit_price: unitPriceNumber,
          cost_price: costPriceNumber,
          is_active: p.is_active === undefined ? true : Boolean(p.is_active),
          brand: p.brand || null,
          model: p.model || null,
          specs: p.specs || {},
          tags: Array.isArray(p.tags) ? p.tags : [],
          created_at: now,
          updated_at: now,
        };
      });

      const result = await products.insertMany(docs);

      res.status(201).json({
        message: "Products created",
        insertedCount: result.insertedCount,
        ids: result.insertedIds,
      });
    } catch (err) {
      console.error("Error creating products:", err);
      res
        .status(500)
        .json({ message: "Error creating products", error: err.message });
    }
  }
);

// READ PRODUCTS: LIST + SEARCH + PRICE FILTER
// GET /api/products
router.get("/", async (req, res) => {
  // 👈 FIXED PATH
  try {
    const db = getDb(); // 👈 FIXED: Added getDb()
    const products = db.collection("products");
    const { q, minPrice, maxPrice, categoryId, isActive } = req.query;

    const filter = {};
    if (isActive !== undefined) {
      filter.is_active = isActive === "true";
    } else {
      filter.is_active = true; // Default: only show active products
    }

    // --- category filter ---
    if (categoryId && isValidObjectId(categoryId)) {
      filter.category_id = categoryId;
    }

    // --- keyword search (q) ---
    if (q) {
      const terms = q
        .split(" ")
        .map((t) => t.trim())
        .filter((t) => t.length > 0);

      filter.$and = terms.map((term) => {
        const orConditions = [
          { product_name: { $regex: term, $options: "i" } },
          { description: { $regex: term, $options: "i" } },
          { brand: { $regex: term, $options: "i" } },
          { model: { $regex: term, $options: "i" } },
          { "specs.os": { $regex: term, $options: "i" } },
        ];
        // if the term is all digits, also check numeric specs
        if (/^\d+$/.test(term)) {
          const num = Number(term);
          orConditions.push({ "specs.storage_gb": num });
          orConditions.push({ "specs.ram_gb": num });
        }
        return { $or: orConditions };
      });
    }

    // --- numeric price filters (unit_price) ---
    const priceFilter = {};
    if (minPrice !== undefined) {
      const min = Number(minPrice);
      if (!Number.isNaN(min)) {
        priceFilter.$gte = min;
      }
    }
    if (maxPrice !== undefined) {
      const max = Number(maxPrice);
      if (!Number.isNaN(max)) {
        priceFilter.$lte = max;
      }
    }
    if (Object.keys(priceFilter).length > 0) {
      filter.unit_price = priceFilter;
    }

    const data = await products.find(filter).toArray();
    res.json(data);
  } catch (err) {
    console.error("Error fetching products:", err);
    res.status(500).json({ message: "Error fetching products" });
  }
});

// READ SINGLE PRODUCT
// GET /api/products/:id
router.get("/:id", async (req, res) => {
  // 👈 FIXED PATH
  try {
    const db = getDb(); // 👈 FIXED: Added getDb()
    const products = db.collection("products");
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid product ID" });
    }

    const product = await products.findOne({ _id: new mongodb.ObjectId(id) });

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json(product);
  } catch (err) {
    console.error("Error fetching product:", err);
    res.status(500).json({ message: "Error fetching product" });
  }
});

// UPDATE PRODUCTS:
// PUT /api/products/:id
// ----------------------
router.put(
  "/:id", // 👈 FIXED PATH
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const db = getDb(); // 👈 FIXED: Added getDb()
      const products = db.collection("products");
      const { id } = req.params;

      if (!isValidObjectId(id)) {
        return res.status(400).json({ message: "Invalid product ID" });
      }

      const updates = {};
      const {
        product_name,
        description,
        category_id,
        supplier_id,
        unit_price,
        cost_price,
        is_active,
        brand,
        model,
        specs,
        tags,
      } = req.body;

      // Only add to updates if the field is present in the request body
      if (product_name !== undefined) updates.product_name = product_name;
      if (description !== undefined) updates.description = description;
      if (category_id !== undefined) updates.category_id = category_id;
      if (supplier_id !== undefined) updates.supplier_id = supplier_id;
      if (unit_price !== undefined) updates.unit_price = Number(unit_price);
      if (cost_price !== undefined) updates.cost_price = Number(cost_price);
      if (is_active !== undefined) updates.is_active = Boolean(is_active);
      if (brand !== undefined) updates.brand = brand;
      if (model !== undefined) updates.model = model;
      if (specs !== undefined) updates.specs = specs;
      if (tags !== undefined && Array.isArray(tags)) updates.tags = tags;

      if (Object.keys(updates).length === 0) {
        return res
          .status(400)
          .json({ message: "No valid fields provided for update" });
      }

      updates.updated_at = new Date();

      const result = await products.updateOne(
        { _id: new mongodb.ObjectId(id) },
        { $set: updates }
      );

      if (result.matchedCount === 0) {
        return res.status(404).json({ message: "Product not found" });
      }

      res.json({ message: "Product updated successfully" });
    } catch (err) {
      console.error("Error updating product:", err);
      res.status(500).json({ message: "Error updating product" });
    }
  }
);

// DELETE PRODUCTS (Soft Delete):
// DELETE /api/products/:id
// ----------------------
router.delete(
  "/:id", // 👈 FIXED PATH
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const db = getDb(); // 👈 FIXED: Added getDb()
      const products = db.collection("products");
      const { id } = req.params;

      if (!isValidObjectId(id)) {
        return res.status(400).json({ message: "Invalid product ID" });
      }

      const result = await products.updateOne(
        { _id: new mongodb.ObjectId(id) },
        { $set: { is_active: false, updated_at: new Date() } }
      );

      if (result.matchedCount === 0) {
        return res.status(404).json({ message: "Product not found" });
      }

      res.json({ message: "Product deactivated (is_active: false)" });
    } catch (err) {
      console.error("Error deleting product:", err);
      res.status(500).json({ message: "Error deleting product" });
    }
  }
);

export default router;
