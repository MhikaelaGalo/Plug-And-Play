// routes/inventory.js

import { Router } from "express";
import mongodb from "mongodb";
import { getDb, isValidObjectId } from "../config/config.js";
import { authenticateToken, requireAdmin } from "../middleware/auth.js";

const router = Router();

// CREATE INVENTORY RECORD
// POST /api/inventory
// (admin only)
router.post("/", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const db = getDb();
    const inventory = db.collection("inventory");
    const products = db.collection("products");

    const { product_id, stock_quantity, reorder_level, max_stock_level } =
      req.body;

    if (!product_id) {
      return res.status(400).json({ message: "product_id is required" });
    }

    if (!isValidObjectId(product_id)) {
      return res.status(400).json({ message: "Invalid product_id" });
    }

    const productObjectId = new mongodb.ObjectId(product_id);

    // make sure product exists
    const product = await products.findOne({ _id: productObjectId });
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // enforce 1:1: one inventory record per product
    const existing = await inventory.findOne({ product_id: productObjectId });
    if (existing) {
      return res
        .status(409)
        .json({ message: "Inventory record already exists for this product" });
    }

    const now = new Date();
    const doc = {
      product_id: productObjectId,
      stock_quantity: Number.isNaN(Number(stock_quantity))
        ? 0
        : Number(stock_quantity),
      reorder_level: Number.isNaN(Number(reorder_level))
        ? 10
        : Number(reorder_level),
      max_stock_level:
        max_stock_level === undefined || max_stock_level === null
          ? null
          : Number(max_stock_level),
      last_restocked: null,
      updated_at: now,
    };

    const result = await inventory.insertOne(doc);

    res.status(201).json({
      message: "Inventory record created",
      _id: result.insertedId,
      ...doc,
    });
  } catch (err) {
    console.error("Error creating inventory record:", err);
    res.status(500).json({ message: "Error creating inventory record" });
  }
});

// READ INVENTORY LIST
// GET /api/inventory
// (admin only – management view)
router.get("/", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const db = getDb();
    const inventory = db.collection("inventory");

    // 💡 MODIFIED: Use aggregation to join inventory records with the product name
    const pipeline = [
      {
        $lookup: {
          from: "products", // The collection to join
          localField: "product_id", // Field from the inventory document
          foreignField: "_id", // Field from the products document
          as: "product_info", // Array field containing the joined product
        },
      },
      {
        $unwind: {
          path: "$product_info",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          // Keep all existing fields from the inventory record
          _id: 1,
          stock_quantity: 1,
          reorder_level: 1,
          max_stock_level: 1,
          last_restocked: 1,
          updated_at: 1,
          // Project the product details under product_id
          product_id: {
            _id: "$product_info._id",
            product_name: "$product_info.product_name",
            // Include other necessary fields from product_info if needed
          },
        },
      },
    ];

    const data = await inventory.aggregate(pipeline).toArray();

    res.json(data);
  } catch (err) {
    console.error("Error fetching inventory list:", err);
    res.status(500).json({ message: "Error fetching inventory list" });
  }
});

// READ INVENTORY BY PRODUCT ID
// GET /api/inventory/by-product/:productId
// (can be used later by frontend to show stock)
router.get("/by-product/:productId", async (req, res) => {
  try {
    const db = getDb();
    const inventory = db.collection("inventory");
    const { productId } = req.params;

    if (!isValidObjectId(productId)) {
      return res.status(400).json({ message: "Invalid productId" });
    }

    const productObjectId = new mongodb.ObjectId(productId);
    const item = await inventory.findOne({ product_id: productObjectId });

    if (!item) {
      return res.status(404).json({ message: "Inventory record not found" });
    }

    res.json(item);
  } catch (err) {
    console.error("Error fetching inventory by product:", err);
    res.status(500).json({ message: "Error fetching inventory by product" });
  }
});

// UPDATE INVENTORY RECORD (by Inventory ID)
// PUT /api/inventory/:id
// (admin only)
router.put("/:id", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const db = getDb();
    const inventory = db.collection("inventory");
    const { id } = req.params;
    const { stock_quantity, reorder_level, max_stock_level, last_restocked } =
      req.body;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid inventory ID" });
    }

    const updates = {};
    if (stock_quantity !== undefined)
      updates.stock_quantity = Number(stock_quantity);
    if (reorder_level !== undefined)
      updates.reorder_level = Number(reorder_level);

    // Handle max_stock_level being explicitly set to null (or empty string in JSON, which is treated as undefined here)
    if (max_stock_level !== undefined) {
      // If the frontend sends null, we store null. If it sends a number, we store the number.
      updates.max_stock_level =
        max_stock_level === null ? null : Number(max_stock_level);
    }

    // Manual update to restock date (e.g., when a shipment arrives)
    if (last_restocked !== undefined && last_restocked)
      updates.last_restocked = new Date(last_restocked);

    if (Object.keys(updates).length === 0) {
      return res
        .status(400)
        .json({ message: "No valid fields provided for update" });
    }

    updates.updated_at = new Date();

    const result = await inventory.updateOne(
      { _id: new mongodb.ObjectId(id) },
      { $set: updates }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: "Inventory record not found" });
    }

    res.json({ message: "Inventory updated successfully" });
  } catch (err) {
    console.error("Error updating inventory:", err);
    res.status(500).json({ message: "Error updating inventory" });
  }
});

// DELETE INVENTORY RECORD
// DELETE /api/inventory/:id
// (admin only – hard delete, no is_active field here)
router.delete("/:id", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const db = getDb();
    const inventory = db.collection("inventory");
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid inventory ID" });
    }

    const result = await inventory.deleteOne({
      _id: new mongodb.ObjectId(id),
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: "Inventory record not found" });
    }

    res.json({ message: "Inventory record deleted successfully" });
  } catch (err) {
    console.error("Error deleting inventory:", err);
    res.status(500).json({ message: "Error deleting inventory" });
  }
});

export default router;
