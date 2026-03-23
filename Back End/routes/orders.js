// routes/orders.js - ADMIN ONLY VERSION
import { Router } from "express";
import mongodb from "mongodb";
import { getDb, isValidObjectId } from "../config/config.js";
import {
  authenticateToken,
  requireAdmin,
  // requireCustomer is no longer needed
} from "../middleware/auth.js";

const router = Router();

// status enums for validation
const ORDER_STATUSES = ["pending", "processing", "completed", "cancelled"];
const PAYMENT_STATUSES = ["pending", "paid", "failed"];

// =========================
// ORDERS MANAGEMENT (ADMIN ONLY)
// =========================

// ADMIN: Read All Orders (and filter by status, paymentStatus, customerId)
// GET /api/orders/admin/orders?status=...
router.get(
  "/admin/orders",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      const db = getDb();
      const orders = db.collection("orders");
      const { status, paymentStatus, customerId } = req.query;

      const filter = {};
      if (status) {
        filter.order_status = status;
      }
      if (paymentStatus) {
        filter.payment_status = paymentStatus;
      }
      if (customerId && isValidObjectId(customerId)) {
        filter.customer_id = new mongodb.ObjectId(customerId);
      }

      // Aggregation pipeline to join order_details and customer information
      const pipeline = [
        { $match: filter },
        // Join with order_details collection to get item list
        {
          $lookup: {
            from: "order_details",
            localField: "_id",
            foreignField: "order_id",
            as: "items",
          },
        },
        // Join with customers collection to get customer name/info
        {
          $lookup: {
            from: "customers",
            localField: "customer_id",
            foreignField: "_id",
            as: "customer_info",
          },
        },
        {
          $unwind: {
            path: "$customer_info",
            preserveNullAndEmptyArrays: true,
          },
        },
        // Project the final structure
        {
          $project: {
            _id: 1,
            customer_id: 1,
            customer_name: "$customer_info.username",
            order_status: 1,
            payment_status: 1,
            total_amount: 1,
            shipping_address: 1,
            payment_method: 1,
            created_at: 1,
            updated_at: 1,
            items: {
              $map: {
                input: "$items",
                as: "item",
                in: {
                  product_id: "$$item.product_id",
                  product_name: "$$item.product_name",
                  quantity: "$$item.quantity",
                  unit_price: "$$item.unit_price",
                },
              },
            },
          },
        },
        { $sort: { created_at: -1 } },
      ];

      const ordersList = await orders.aggregate(pipeline).toArray();

      res.json(ordersList);
    } catch (err) {
      console.error("Error fetching admin orders:", err);
      res.status(500).json({ message: "Error fetching orders" });
    }
  }
);

// ADMIN: Update Order Status
// PUT /api/orders/:id/status
router.put("/:id/status", authenticateToken, requireAdmin, async (req, res) => {
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
        return res.status(400).json({ message: "Invalid order_status value" });
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

    res.json({ message: "Order status updated successfully" });
  } catch (err) {
    console.error("Error updating order status:", err);
    res.status(500).json({ message: "Error updating order status" });
  }
});

export default router;
