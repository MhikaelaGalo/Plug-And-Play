import express from "express";
import dotenv from "dotenv";
import cors from "cors";

import { connectToDb } from "./config/config.js";

// your route files:
import customerRoutes from "./routes/customers.js";
import productRoutes from "./routes/products.js";

// 👈 FIX: ADDED ALL MISSING IMPORTS
import adminRoutes from "./routes/admin.js";
import categoryRoutes from "./routes/categories.js";
import supplierRoutes from "./routes/suppliers.js";
import inventoryRoutes from "./routes/inventory.js";
import orderRoutes from "./routes/orders.js";
// later: adminRoutes, categoryRoutes, supplierRoutes, inventoryRoutes, orderRoutes, etc.

dotenv.config();

const app = express();
const PORT = process.env.PORT || 2141;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("THE ADVENTURE IS STARTING");
});

// mount routes
app.use("/api/customers", customerRoutes);
app.use("/api/products", productRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/suppliers", supplierRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/orders", orderRoutes); // 👈 FIX: UNCOMMENTED

async function startServer() {
  try {
    await connectToDb();
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("MongoDB connection failed", err);
    process.exit(1);
  }
}

startServer();
