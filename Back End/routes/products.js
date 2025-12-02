import { Router } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import mongodb from "mongodb";
import { getDb, isValidObjectId } from "../config/config.js";
import { authenticateToken, requireCustomer } from "../middleware/auth.js";

const router = Router();

// CREATE PRODUCTS:
//  POST /api/products
//  (protected - needs token)
// ----------------------
router.post("/api/products", authenticateToken, requireAdmin, async (req, res) => {
  try {
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
});

// READ PRODUCTS: LIST + SEARCH + PRICE FILTER
router.get("/api/products", async (req, res) => {
  try {
    const products = db.collection("products");
    const { q, minPrice, maxPrice } = req.query;

    const filter = {};

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
          { tags: { $regex: term, $options: "i" } },
          { "specs.cpu": { $regex: term, $options: "i" } },
          { "specs.gpu": { $regex: term, $options: "i" } },
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

    res.json({
      data,
      count: data.length,
    });
  } catch (err) {
    console.error("Error fetching products:", err);
    res.status(500).json({ message: "Error fetching products" });
  }
});

// READ PRODUCTS: GET ONE
//  GET /api/products/:id
// ----------------------
router.get("/api/products/:id", async (req, res) => {
  try {
    const products = db.collection("products");
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid product ID" });
    }

    const product = await products.findOne({
      _id: new mongodb.ObjectId(id),
    });

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json(product);
  } catch (err) {
    console.error("Error fetching product:", err);
    res.status(500).json({ message: "Error fetching product" });
  }
});

//  UPDATE PRODUCTS:
//  PUT /api/products/:id
//  (protected - needs token)
// ----------------------
router.put(
  "/api/products/:id",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const products = db.collection("products");
      const { id } = req.params;

      if (!isValidObjectId(id)) {
        return res.status(400).json({ message: "Invalid product ID" });
      }

      const updates = {};
      const fields = [
        "product_name",
        "description",
        "category_id",
        "supplier_id",
        "unit_price",
        "cost_price",
        "is_active",
      ];

      for (const field of fields) {
        if (req.body[field] !== undefined) {
          if (field === "unit_price" || field === "cost_price") {
            const num = Number(req.body[field]);
            if (Number.isNaN(num)) {
              return res
                .status(400)
                .json({ message: `${field} must be a number` });
            }
            updates[field] = num;
          } else if (field === "is_active") {
            updates[field] = Boolean(req.body[field]);
          } else {
            updates[field] = req.body[field];
          }
        }
      }

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

// DELETE PRODUCTS:
//  DELETE /api/products/:id
//  (protected - needs token)
// ----------------------
router.delete(
  "/api/products/:id",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
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

      res.json({ message: "Product deactivated (is_active = false)" });
    } catch (err) {
      console.error("Error deleting product:", err);
      res.status(500).json({ message: "Error deleting product" });
    }
  }
);

export default router;