// routes/products.js

import { Router } from "express";
import mongodb from "mongodb";
import { getDb, isValidObjectId } from "../config/config.js";
import { authenticateToken, requireAdmin } from "../middleware/auth.js";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs"; // 💡 FIX: Import the file system module

const router = Router();

// --- ABSOLUTE PATH SETUP FOR WINDOWS/LINUX/MAC ---
// This ensures that the file paths work correctly regardless of the OS
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Assuming 'routes' folder is inside the project root
const PROJECT_ROOT = path.join(__dirname, "..");
// Set the final destination for files: backend/public/images/products
const UPLOAD_DEST = path.join(PROJECT_ROOT, "public", "images", "products");
// --------------------------------------------------

// ===============================================
// MULTER CONFIGURATION (Image Upload Logic)
// ===============================================

// Destination and Filenaming Logic
const storage = multer.diskStorage({
  // 💡 CRITICAL FIX: Dynamically create the directory if it doesn't exist
  destination: (req, file, cb) => {
    // Check if the directory exists
    if (!fs.existsSync(UPLOAD_DEST)) {
      try {
        // Create the directory recursively (p: true)
        fs.mkdirSync(UPLOAD_DEST, { recursive: true });
        console.log(`Created directory: ${UPLOAD_DEST}`);
      } catch (err) {
        // Log any error during directory creation (e.g., permissions)
        console.error("Error creating upload directory:", err);
        return cb(err); // Pass error back to multer
      }
    }
    // Now that we're sure it exists, proceed
    cb(null, UPLOAD_DEST);
  },
  filename: (req, file, cb) => {
    // Create a unique filename: fieldname-timestamp.ext
    const extension = path.extname(file.originalname);
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + "-" + uniqueSuffix + extension);
  },
});

// Define the upload middleware
const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Limit file size to 5MB
});

// ===============================================
// ROUTES
// ===============================================

// R: Read All Products (GET /api/products)
router.get("/", async (req, res) => {
  try {
    const db = getDb();
    const products = db.collection("products");

    // Standard MongoDB Aggregation Pipeline for JOIN/Population
    const pipeline = [
      {
        $lookup: {
          from: "categories",
          localField: "category_id",
          foreignField: "_id",
          as: "category_info",
        },
      },
      {
        $unwind: {
          path: "$category_info",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "suppliers",
          localField: "supplier_id",
          foreignField: "_id",
          as: "supplier_info",
        },
      },
      {
        $unwind: {
          path: "$supplier_info",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          // Select all existing fields
          _id: 1,
          product_name: 1,
          description: 1,
          unit_price: 1,
          cost_price: 1,
          is_active: 1,
          brand: 1,
          model: 1,
          specs: 1,
          tags: 1,
          image_url: 1,
          created_at: 1,
          updated_at: 1,
          // Select only necessary fields from the joined collections
          category_id: {
            _id: "$category_info._id",
            category_name: "$category_info.category_name",
          },
          supplier_id: {
            _id: "$supplier_info._id",
            supplier_name: "$supplier_info.supplier_name",
          },
        },
      },
    ];

    const allProducts = await products.aggregate(pipeline).toArray();

    res.json(allProducts);
  } catch (err) {
    console.error("Error fetching products:", err);
    res.status(500).json({ message: "Error fetching products" });
  }
});

// C: Create Product
// POST /api/products
router.post(
  "/",
  authenticateToken,
  requireAdmin,
  upload.single("product_image"), // <-- Handles the file upload
  async (req, res) => {
    try {
      const db = getDb();
      const products = db.collection("products");

      let {
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

      if (!product_name || !category_id || !supplier_id || !unit_price) {
        return res
          .status(400)
          .json({
            message:
              "Product name, category, supplier, and unit price are required",
          });
      }

      // Handle JSON strings from FormData sent by the frontend
      try {
        specs = specs ? JSON.parse(specs) : {};
        tags = tags ? JSON.parse(tags) : [];
      } catch (e) {
        console.warn("Failed to parse JSON field from FormData:", e.message);
      }

      // Handle File Upload (req.file contains the file info)
      let image_url = null;
      if (req.file) {
        // Construct the public URL path for the file
        image_url = `/images/products/${req.file.filename}`;
      }

      const now = new Date();
      const newProduct = {
        product_name,
        description,
        category_id: isValidObjectId(category_id)
          ? new mongodb.ObjectId(category_id)
          : null,
        supplier_id: isValidObjectId(supplier_id)
          ? new mongodb.ObjectId(supplier_id)
          : null,
        unit_price: parseFloat(unit_price),
        cost_price: parseFloat(cost_price),
        is_active: is_active === "true",
        brand,
        model,
        specs,
        tags,
        image_url, // Store the URL path
        created_at: now,
        updated_at: now,
      };

      const result = await products.insertOne(newProduct);

      res.status(201).json({
        message: "Product created successfully",
        product: { _id: result.insertedId, ...newProduct },
      });
    } catch (err) {
      console.error("Error creating product:", err);
      // 💡 FIX: Ensure file is deleted if database save fails
      if (req.file) {
        try {
          fs.unlinkSync(req.file.path);
          console.log(
            `Deleted uploaded file due to DB error: ${req.file.path}`
          );
        } catch (unlinkError) {
          console.error(
            "Failed to delete uploaded file after DB error:",
            unlinkError
          );
        }
      }
      res.status(500).json({ message: "Error creating product" });
    }
  }
);

// R: Read Single Product
// GET /api/products/:id
router.get("/:id", async (req, res) => {
  try {
    const db = getDb();
    const products = db.collection("products");
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid product ID" });
    }

    // Standard MongoDB Aggregation Pipeline for JOIN/Population
    const pipeline = [
      {
        $match: {
          _id: new mongodb.ObjectId(id),
        },
      },
      {
        $lookup: {
          from: "categories",
          localField: "category_id",
          foreignField: "_id",
          as: "category_info",
        },
      },
      {
        $unwind: {
          path: "$category_info",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "suppliers",
          localField: "supplier_id",
          foreignField: "_id",
          as: "supplier_info",
        },
      },
      {
        $unwind: {
          path: "$supplier_info",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          // Select all existing fields
          _id: 1,
          product_name: 1,
          description: 1,
          unit_price: 1,
          cost_price: 1,
          is_active: 1,
          brand: 1,
          model: 1,
          specs: 1,
          tags: 1,
          image_url: 1,
          created_at: 1,
          updated_at: 1,
          // Select only necessary fields from the joined collections
          category_id: {
            _id: "$category_info._id",
            category_name: "$category_info.category_name",
          },
          supplier_id: {
            _id: "$supplier_info._id",
            supplier_name: "$supplier_info.supplier_name",
          },
        },
      },
    ];

    const product = await products.aggregate(pipeline).next();

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json(product);
  } catch (err) {
    console.error("Error fetching single product:", err);
    res.status(500).json({ message: "Error fetching single product" });
  }
});

// U: Update Product
// PUT /api/products/:id
router.put(
  "/:id",
  authenticateToken,
  requireAdmin,
  upload.single("product_image"), // <-- Handles the file upload
  async (req, res) => {
    // Variable to hold old image path if a new one is uploaded
    let old_image_path = null;

    try {
      const db = getDb();
      const products = db.collection("products");
      const { id } = req.params;

      if (!isValidObjectId(id)) {
        return res.status(400).json({ message: "Invalid product ID" });
      }

      const updates = {};
      const body = req.body;

      // Map fields from request body to update object
      if (body.product_name !== undefined)
        updates.product_name = body.product_name;
      if (body.description !== undefined)
        updates.description = body.description;
      if (body.brand !== undefined) updates.brand = body.brand;
      if (body.model !== undefined) updates.model = body.model;

      if (body.category_id && isValidObjectId(body.category_id)) {
        updates.category_id = new mongodb.ObjectId(body.category_id);
      }
      if (body.supplier_id && isValidObjectId(body.supplier_id)) {
        updates.supplier_id = new mongodb.ObjectId(body.supplier_id);
      }

      // Parse numbers
      if (body.unit_price !== undefined) {
        updates.unit_price = parseFloat(body.unit_price);
      }
      if (body.cost_price !== undefined) {
        updates.cost_price = parseFloat(body.cost_price);
      }

      // Parse boolean (comes as string from FormData)
      if (body.is_active !== undefined) {
        updates.is_active =
          body.is_active === "true" || body.is_active === true;
      }

      // Handle JSON strings for complex types
      if (body.specs) {
        try {
          updates.specs = JSON.parse(body.specs);
        } catch (e) {
          /* ignore parse error */
        }
      }
      if (body.tags) {
        try {
          updates.tags = JSON.parse(body.tags);
        } catch (e) {
          /* ignore parse error */
        }
      }

      // Handle New File Upload or Image Removal
      if (req.file) {
        // New file uploaded: Construct the public URL path
        updates.image_url = `/images/products/${req.file.filename}`;

        // Fetch the existing product to get the old image URL for deletion
        const existingProduct = await products.findOne({
          _id: new mongodb.ObjectId(id),
        });
        if (existingProduct && existingProduct.image_url) {
          // Calculate the absolute path of the old file for later deletion
          old_image_path = path.join(
            PROJECT_ROOT,
            "public",
            existingProduct.image_url
          );
        }
      } else if (body.image_url === "") {
        // Explicit image removal requested (frontend sends empty string to clear the field)
        updates.image_url = null;

        // Fetch the existing product to get the old image URL for deletion
        const existingProduct = await products.findOne({
          _id: new mongodb.ObjectId(id),
        });
        if (existingProduct && existingProduct.image_url) {
          // Calculate the absolute path of the old file for deletion
          old_image_path = path.join(
            PROJECT_ROOT,
            "public",
            existingProduct.image_url
          );
        }
      } else if (body.image_url !== undefined && body.image_url !== null) {
        // If body.image_url is present and not empty/null, it means the old URL is preserved.
        // No action needed for image_url update.
      }

      if (Object.keys(updates).length === 0) {
        // If no file was uploaded and no fields were changed
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
        // If product not found, delete the newly uploaded file
        if (req.file) {
          fs.unlinkSync(req.file.path);
        }
        return res.status(404).json({ message: "Product not found" });
      }

      // SUCCESS: If a file was uploaded or an image was removed, delete the old file
      if (old_image_path && fs.existsSync(old_image_path)) {
        try {
          fs.unlinkSync(old_image_path);
          console.log(`Successfully deleted old file: ${old_image_path}`);
        } catch (unlinkError) {
          // This is not a critical error, just log it.
          console.warn("Failed to delete old product image file:", unlinkError);
        }
      }

      res.json({ message: "Product updated successfully" });
    } catch (err) {
      console.error("Error updating product:", err);
      // On update failure, delete the newly uploaded file (if one exists)
      if (req.file) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (unlinkError) {
          console.error(
            "Failed to delete uploaded file after DB error:",
            unlinkError
          );
        }
      }
      res.status(500).json({ message: "Error updating product" });
    }
  }
);

// D: Delete Product (Soft Delete)
// DELETE /api/products/:id
router.delete("/:id", authenticateToken, requireAdmin, async (req, res) => {
  let image_url_to_delete = null;
  try {
    const db = getDb();
    const products = db.collection("products");
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid product ID" });
    }

    // 1. Find the product to check if it has an image
    const existingProduct = await products.findOne({
      _id: new mongodb.ObjectId(id),
    });

    if (!existingProduct) {
      return res.status(404).json({ message: "Product not found" });
    }

    if (existingProduct.image_url) {
      image_url_to_delete = existingProduct.image_url;
    }

    // 2. Perform soft delete (set is_active to false)
    const result = await products.updateOne(
      { _id: new mongodb.ObjectId(id) },
      { $set: { is_active: false, updated_at: new Date() } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: "Product not found" });
    }

    // 3. Delete the file from the disk (optional for soft delete, but good for cleanup)
    if (image_url_to_delete) {
      const absolute_path = path.join(
        PROJECT_ROOT,
        "public",
        image_url_to_delete
      );
      if (fs.existsSync(absolute_path)) {
        try {
          fs.unlinkSync(absolute_path);
          console.log(
            `Successfully deleted image on soft delete: ${absolute_path}`
          );
        } catch (unlinkError) {
          console.warn(
            "Failed to delete product image file during soft delete:",
            unlinkError
          );
        }
      }
    }

    res.json({
      message: "Product deleted successfully (is_active set to false)",
    });
  } catch (err) {
    console.error("Error deleting product:", err);
    res.status(500).json({ message: "Error deleting product" });
  }
});

export default router;
