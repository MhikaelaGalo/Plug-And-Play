// routes/orders.js
import { Router } from "express";
import mongodb from "mongodb";
import { getDb, isValidObjectId } from "../config/db.js";
import {
  authenticateToken,
  requireAdmin,
  requireCustomer,
} from "../middleware/auth.js";

const router = Router();

// status enums for validation
const ORDER_STATUSES = ["pending", "processing", "completed", "cancelled"];
const PAYMENT_STATUSES = ["pending", "paid", "failed"];

// =========================
// ORDERS & ORDER_DETAILS
// =========================

// CUSTOMER: PLACE ORDER
// POST /api/orders
router.post("/orders", authenticateToken, requireCustomer, async (req, res) => {
  try {
    const db = getDb();
    const orders = db.collection("orders");
    const orderDetails = db.collection("order_details");
    const productsCol = db.collection("products");
    const inventoryCol = db.collection("inventory");

    const customerId = req.user.customerId;
    const { items, payment_method, shipping_address } = req.body;

    // 1) Basic validation
    if (!Array.isArray(items) || items.length === 0) {
      return res
        .status(400)
        .json({ message: "items array is required and cannot be empty" });
    }

    // Clean + validate each item
    const cleanedItems = [];
    for (const item of items) {
      const { product_id, quantity } = item || {};

      if (!product_id || !isValidObjectId(product_id)) {
        return res
          .status(400)
          .json({ message: "Each item must have a valid product_id" });
      }

      const qtyNum = Number(quantity);
      if (!Number.isInteger(qtyNum) || qtyNum <= 0) {
        return res.status(400).json({
          message: "Each item must have a positive integer quantity",
        });
      }

      cleanedItems.push({
        productObjectId: new mongodb.ObjectId(product_id),
        quantity: qtyNum,
      });
    }

    // 2) Load all products referenced
    const productIds = cleanedItems.map((it) => it.productObjectId);
    const products = await productsCol
      .find({ _id: { $in: productIds }, is_active: true })
      .toArray();

    if (products.length !== productIds.length) {
      return res.status(400).json({
        message: "One or more products are missing or inactive",
      });
    }

    // Map products by _id for easy lookup
    const productMap = new Map();
    for (const p of products) {
      productMap.set(String(p._id), p);
    }

    // 3) Check inventory (stock) for each product
    const inventoryRecords = await inventoryCol
      .find({ product_id: { $in: productIds } })
      .toArray();

    const inventoryMap = new Map();
    for (const inv of inventoryRecords) {
      inventoryMap.set(String(inv.product_id), inv);
    }

    for (const item of cleanedItems) {
      const key = String(item.productObjectId);
      const inv = inventoryMap.get(key);

      if (!inv) {
        return res.status(400).json({
          message: "Inventory record missing for a product",
          product_id: key,
        });
      }

      if (inv.stock_quantity < item.quantity) {
        return res.status(400).json({
          message: "Not enough stock for product",
          product_id: key,
          available: inv.stock_quantity,
          requested: item.quantity,
        });
      }
    }

    // 4) Compute totals
    let totalAmount = 0;
    const detailDocs = [];

    for (const item of cleanedItems) {
      const product = productMap.get(String(item.productObjectId));
      const unitPrice = Number(product.unit_price) || 0;
      const subtotal = unitPrice * item.quantity;
      totalAmount += subtotal;

      detailDocs.push({
        order_id: null, // fill after order insert
        product_id: item.productObjectId,
        quantity: item.quantity,
        unit_price: unitPrice,
        subtotal,
      });
    }

    const now = new Date();

    // 5) Create order header document
    const orderDoc = {
      customer_id: new mongodb.ObjectId(customerId),
      order_date: now,
      order_status: "pending",
      total_amount: Number(totalAmount.toFixed(2)),
      payment_status: "pending",
      payment_method: payment_method || "unspecified",
      shipping_address: shipping_address || null,
      updated_at: now,
    };

    const orderResult = await orders.insertOne(orderDoc);
    const orderId = orderResult.insertedId;

    // 6) Insert order_details docs
    for (const d of detailDocs) {
      d.order_id = orderId;
    }

    await orderDetails.insertMany(detailDocs);

    // 7) Update inventory stock (subtract quantities)
    for (const item of cleanedItems) {
      await inventoryCol.updateOne(
        { product_id: item.productObjectId },
        {
          $inc: { stock_quantity: -item.quantity },
          $set: { updated_at: new Date() },
        }
      );
    }

    res.status(201).json({
      message: "Order placed successfully",
      order: {
        _id: orderId,
        ...orderDoc,
      },
      items: detailDocs,
    });
  } catch (err) {
    console.error("Error placing order:", err);
    res.status(500).json({ message: "Error placing order" });
  }
});

// CUSTOMER: VIEW OWN ORDERS
// GET /api/orders/me
router.get(
  "/orders/me",
  authenticateToken,
  requireCustomer,
  async (req, res) => {
    try {
      const db = getDb();
      const orders = db.collection("orders");
      const customerId = new mongodb.ObjectId(req.user.customerId);

      const data = await orders
        .find({ customer_id: customerId })
        .sort({ order_date: -1 })
        .toArray();

      res.json({
        data,
        count: data.length,
      });
    } catch (err) {
      console.error("Error fetching customer orders:", err);
      res.status(500).json({ message: "Error fetching customer orders" });
    }
  }
);

// CUSTOMER / ADMIN: VIEW SINGLE ORDER + ITEMS
// GET /api/orders/:id
router.get("/orders/:id", authenticateToken, async (req, res) => {
  try {
    const db = getDb();
    const orders = db.collection("orders");
    const orderDetails = db.collection("order_details");
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid order ID" });
    }

    const orderId = new mongodb.ObjectId(id);
    const order = await orders.findOne({ _id: orderId });

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Security: customers can only see their own orders
    if (req.user.role === "customer") {
      const myId = String(req.user.customerId);
      if (String(order.customer_id) !== myId) {
        return res
          .status(403)
          .json({ message: "Not allowed to view this order" });
      }
    }

    const items = await orderDetails.find({ order_id: orderId }).toArray();

    res.json({ order, items });
  } catch (err) {
    console.error("Error fetching order:", err);
    res.status(500).json({ message: "Error fetching order" });
  }
});

// ADMIN: LIST ALL ORDERS
// GET /api/admin/orders?status=pending
router.get(
  "/admin/orders",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const db = getDb();
      const orders = db.collection("orders");
      const { status } = req.query;

      const filter = {};
      if (status && ORDER_STATUSES.includes(status)) {
        filter.order_status = status;
      }

      const data = await orders
        .find(filter)
        .sort({ order_date: -1 })
        .toArray();

      res.json({
        data,
        count: data.length,
      });
    } catch (err) {
      console.error("Error fetching all orders:", err);
      res.status(500).json({ message: "Error fetching all orders" });
    }
  }
);

// ADMIN: UPDATE ORDER STATUS / PAYMENT STATUS
// PUT /api/admin/orders/:id/status
router.put(
  "/admin/orders/:id/status",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const db = getDb();
      const orders = db.collection("orders");
      const { id } = req.params;
      const { order_status, payment_status } = req.body;

      if (!isValidObjectId(id)) {
        return res.status(400).json({ message: "Invalid order ID" });
      }

      const updates = {};

      if (order_status !== undefined) {
        if (!ORDER_STATUSES.includes(order_status)) {
          return res
            .status(400)
            .json({ message: "Invalid order_status value" });
        }
        updates.order_status = order_status;
      }

      if (payment_status !== undefined) {
        if (!PAYMENT_STATUSES.includes(payment_status)) {
          return res
            .status(400)
            .json({ message: "Invalid payment_status value" });
        }
        updates.payment_status = payment_status;
      }

      if (Object.keys(updates).length === 0) {
        return res
          .status(400)
          .json({ message: "No valid fields provided for update" });
      }

      updates.updated_at = new Date();

      const result = await orders.updateOne(
        { _id: new mongodb.ObjectId(id) },
        { $set: updates }
      );

      if (result.matchedCount === 0) {
        return res.status(404).json({ message: "Order not found" });
      }

      res.json({
        message: "Order status updated successfully",
        updates,
      });
    } catch (err) {
      console.error("Error updating order status:", err);
      res.status(500).json({ message: "Error updating order status" });
    }
  }
);

export default router;
