import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs"; // <-- 1. Import fs module

import { connectToDb } from "./config/config.js";

// Route imports
import customerRoutes from "./routes/customers.js";
import productRoutes from "./routes/products.js";
import adminRoutes from "./routes/admin.js";
import categoryRoutes from "./routes/categories.js";
import supplierRoutes from "./routes/suppliers.js";
import inventoryRoutes from "./routes/inventory.js";
import orderRoutes from "./routes/orders.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 2141;

// ES module dirname fix
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ------------------------------------------------------
// 🔥 STATIC IMAGE SERVING WITH DEBUG LOGS
// ------------------------------------------------------
const imagesPath = path.join(__dirname, "public", "images");
const productsPath = path.join(imagesPath, "products"); // <-- Full path to upload folder

console.log("------------------------------------------------------");
console.log("🔍 DEBUG — STATIC IMAGE SERVICE INFO");
console.log("📌 __dirname:", __dirname);
console.log("📌 Serving images from folder:", imagesPath);
console.log("📌 Try opening this URL after server starts:");
console.log(`👉 http://localhost:${PORT}/images/products/<filename>`);
console.log("------------------------------------------------------");

app.use("/images", express.static(imagesPath));
// ------------------------------------------------------

app.use(cors());
app.use(express.json());

// ** NEW FUNCTION TO CHECK DIRECTORY AND PERMISSIONS **
function checkAndVerifyUploadDir() {
  console.log("------------------------------------------------------");
  console.log(`Checking upload directory: ${productsPath}`);

  // Check for both existence (F_OK) and write permission (W_OK)
  fs.access(productsPath, fs.constants.F_OK | fs.constants.W_OK, (err) => {
    if (err) {
      if (err.code === "ENOENT") {
        console.error(
          "❌ ERROR: The directory public/images/products DOES NOT EXIST."
        );
        console.error("    ACTION: Please create this folder and try again.");
      } else if (err.code === "EACCES") {
        console.error(
          "❌ ERROR: Directory exists, but WRITE PERMISSION IS DENIED."
        );
        console.error(
          "    ACTION: Check the OS permissions for the user running this server."
        );
      } else {
        console.error(
          "❌ An unexpected file system error occurred:",
          err.message
        );
      }
      // You may choose to exit the process here if file uploads are critical
      // process.exit(1);
    } else {
      console.log(
        "✅ Success: The 'products' upload directory exists and is writable."
      );
    }
    console.log("------------------------------------------------------");
  });
}
// ******************************************************

// Root route
app.get("/", (req, res) => {
  res.send("THE ADVENTURE IS STARTING");
});

// API routes
app.use("/api/customers", customerRoutes);
app.use("/api/products", productRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/suppliers", supplierRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/orders", orderRoutes);

async function startServer() {
  try {
    await connectToDb();

    // ** RUN THE CHECK BEFORE STARTING THE SERVER **
    checkAndVerifyUploadDir();
    // ********************************************

    app.listen(PORT, () => {
      console.log("------------------------------------------------------");
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log("📁 Static images served from:");
      console.log(imagesPath);
      console.log(
        `📷 Test a file: http://localhost:${PORT}/images/products/yourfile.jpg`
      );
      console.log("------------------------------------------------------");
    });
  } catch (err) {
    console.error("MongoDB connection failed", err);
    process.exit(1);
  }
}

startServer();
