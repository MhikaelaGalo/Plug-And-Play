import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import mongodb from "mongodb";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 2141;
const JWT_SECRET = process.env.JWT_TOKEN || "dev-secret";
const isValidObjectId = (id) => mongodb.ObjectId.isValid(id);

app.use(cors());
app.use(express.json());

// ---- MongoDB connection (THIS is your "new connection") ----
const client = new mongodb.MongoClient(process.env.MONGODB_URI);
const dbName = process.env.MONGODB_NAME || "testing";
let db;

async function startServer() {
  try {
    await client.connect(); // <--- here Node connects to MongoDB
    db = client.db(dbName); // <--- picks the database (retail-store)
    console.log("✅ Connected to MongoDB");
    console.log("Using DB:", dbName);

    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("MongoDB connection failed", err);
    process.exit(1);
  }
}

startServer();

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"]; // "Bearer <token>"
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Access token required" });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET); // { customerId, username, ... }
    req.user = payload;
    next();
  } catch (err) {
    return res.status(403).json({ error: "Invalid or expired token" });
  }
};

app.get("/", (req, res) => {
  res.send("THE ADVENTURE IS STARTING");
});

// POST /generateToken - quick demo token generator
app.post("/generateToken", async (req, res) => {
  const { username } = req.body;

  if (!username) {
    return res.status(400).json({ error: "Username is required." });
  }

  try {
    const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: "1h" });
    res.status(200).json({ token });
  } catch (error) {
    console.error("Error generating token:", error);
    res
      .status(500)
      .json({ message: "Failed to generate token", error: error.message });
  }
});

//  CREATE CUSTOMER: REGISTER
//  POST /api/customers/register
// ----------------------
app.post("/api/customers/register", async (req, res) => {
  try {
    const customers = db.collection("customers");

    const { username, email, password, first_name, last_name, phone, address } =
      req.body;

    // required fields (based on table design)
    if (!username || !email || !password || !first_name || !last_name) {
      return res.status(400).json({
        message: "Missing required fields.",
        details:
          "username, email, password, first_name, last_name are required.",
      });
    }

    // check if username OR email already exist
    const existing = await customers.findOne({
      $or: [{ username }, { email }],
    });
    if (existing) {
      return res
        .status(409)
        .json({ message: "Username or email already exists." });
    }

    // hash password
    const password_hash = await bcrypt.hash(password, 10);
    const now = new Date();

    const newCustomer = {
      username,
      email,
      password_hash,
      first_name,
      last_name,
      phone: phone || null,
      address: address || null,
      created_at: now,
    };

    const result = await customers.insertOne(newCustomer);

    // do NOT send password_hash back
    res.status(201).json({
      _id: result.insertedId,
      username,
      email,
      first_name,
      last_name,
      phone: newCustomer.phone,
      address: newCustomer.address,
      created_at: newCustomer.created_at,
    });
  } catch (err) {
    console.error("Error in register:", err);
    res.status(500).json({ message: "DB error while creating customer" });
  }
});

//  READ CUSTOMER: VIEW PROFILE
//  GET /api/customers/me  (needs token)
// ----------------------
app.get("/api/customers/me", authenticateToken, async (req, res) => {
  try {
    const customers = db.collection("customers");
    const customerId = req.user.customerId; // from JWT

    const customer = await customers.findOne(
      { _id: new mongodb.ObjectId(customerId) },
      { projection: { password_hash: 0 } } // hide password
    );

    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    res.json(customer);
  } catch (err) {
    console.error("Error fetching profile:", err);
    res.status(500).json({ message: "Error fetching profile" });
  }
});

//  UPDATE CUSTOMER: UPDATE OWN PROFILE
//  PUT /api/customers/me  (needs token)
// ----------------------
app.put("/api/customers/me", authenticateToken, async (req, res) => {
  try {
    const customers = db.collection("customers");
    const customerId = req.user.customerId; // from JWT

    // safety: check if ID in token is valid
    if (!mongodb.ObjectId.isValid(customerId)) {
      return res
        .status(400)
        .json({ message: "Invalid customer ID in token" });
    }

    const { username, first_name, last_name, phone, address } = req.body;

    // build the "updates" object only from provided fields
    const updates = {};
    if (username !== undefined) updates.username = username;
    if (first_name !== undefined) updates.first_name = first_name;
    if (last_name !== undefined) updates.last_name = last_name;
    if (phone !== undefined) updates.phone = phone;
    if (address !== undefined) updates.address = address;

    if (Object.keys(updates).length === 0) {
      return res
        .status(400)
        .json({ message: "No valid fields provided for update" });
    }

    updates.updated_at = new Date();

    const result = await customers.updateOne(
      { _id: new mongodb.ObjectId(customerId) },
      { $set: updates }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: "Customer not found" });
    }

    // fetch updated doc (without password_hash)
    const updatedCustomer = await customers.findOne(
      { _id: new mongodb.ObjectId(customerId) },
      { projection: { password_hash: 0 } }
    );

    res.json({
      message: "Profile updated successfully",
      customer: updatedCustomer,
    });
  } catch (err) {
    console.error("Error updating profile:", err);
    res.status(500).json({ message: "Error updating profile" });
  }
});

//  UPDATE CUSTOMER: CHANGE PASSWORD
//  PUT /api/customers/me/password  (needs token)
// ----------------------
app.put("/api/customers/me/password", authenticateToken, async (req, res) => {
  try {
    const customers = db.collection("customers");
    const customerId = req.user.customerId; // from JWT
    const { currentPassword, newPassword } = req.body;

    // basic validation
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        message: "currentPassword and newPassword are required",
      });
    }

    // check ID format
    if (!mongodb.ObjectId.isValid(customerId)) {
      return res.status(400).json({ message: "Invalid customer ID in token" });
    }

    // find customer
    const customer = await customers.findOne({
      _id: new mongodb.ObjectId(customerId),
    });

    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    // compare old password
    const ok = await bcrypt.compare(
      currentPassword,
      customer.password_hash || ""
    );

    if (!ok) {
      return res.status(401).json({ message: "Current password is incorrect" });
    }

    // hash new password
    const newHash = await bcrypt.hash(newPassword, 10);

    await customers.updateOne(
      { _id: new mongodb.ObjectId(customerId) },
      { $set: { password_hash: newHash, updated_at: new Date() } }
    );

    res.json({ message: "Password updated successfully" });
  } catch (err) {
    console.error("Error changing password:", err);
    res.status(500).json({ message: "Error changing password" });
  }
});

//  DELETE CUSTOMER: DELETE OWN ACCOUNT
//  DELETE /api/customers/me  (needs token)
// ----------------------
app.delete("/api/customers/me", authenticateToken, async (req, res) => {
  try {
    const customers = db.collection("customers");
    const customerId = req.user.customerId; // from JWT

    // safety check: valid ObjectId format
    if (!mongodb.ObjectId.isValid(customerId)) {
      return res.status(400).json({ message: "Invalid customer ID in token" });
    }

    const result = await customers.deleteOne({
      _id: new mongodb.ObjectId(customerId),
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: "Customer not found" });
    }

    res.json({ message: "Customer account deleted successfully" });
  } catch (err) {
    console.error("Error deleting customer:", err);
    res.status(500).json({ message: "Error deleting customer" });
  }
});

//  CUSTOMER: LOGIN
//  POST /api/customers/login
// ----------------------
app.post("/api/customers/login", async (req, res) => {
  try {
    const customers = db.collection("customers");
    const { usernameOrEmail, password } = req.body;

    if (!usernameOrEmail || !password) {
      return res.status(400).json({
        message: "usernameOrEmail and password are required.",
      });
    }

    // find user by username OR email
    const customer = await customers.findOne({
      $or: [{ username: usernameOrEmail }, { email: usernameOrEmail }],
    });

    if (!customer) {
      return res.status(401).json({ message: "Invalid credentials." });
    }

    // compare password with hashed password
    const ok = await bcrypt.compare(password, customer.password_hash || "");
    if (!ok) {
      return res.status(401).json({ message: "Invalid credentials." });
    }

    // create JWT token
    const token = jwt.sign(
      {
        customerId: customer._id,
        username: customer.username,
      },
      JWT_SECRET,
      { expiresIn: "2h" }
    );

    res.json({
      message: "Login success",
      token,
      customer: {
        _id: customer._id,
        username: customer.username,
        email: customer.email,
        first_name: customer.first_name,
        last_name: customer.last_name,
      },
    });
  } catch (err) {
    console.error("Error in login:", err);
    res.status(500).json({ message: "Login failed" });
  }
});

// PRODUCTS: LIST + SEARCH + PRICE FILTER
app.get("/api/products", async (req, res) => {
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
          { description:  { $regex: term, $options: "i" } },
          { brand:        { $regex: term, $options: "i" } },
          { model:        { $regex: term, $options: "i" } },
          { tags:         { $regex: term, $options: "i" } },
          { "specs.cpu":  { $regex: term, $options: "i" } },
          { "specs.gpu":  { $regex: term, $options: "i" } },
          { "specs.os":   { $regex: term, $options: "i" } }
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
      count: data.length
    });
  } catch (err) {
    console.error("Error fetching products:", err);
    res.status(500).json({ message: "Error fetching products" });
  }
});

// ----------------------
//  PRODUCTS: GET ONE
//  GET /api/products/:id
// ----------------------
app.get("/api/products/:id", async (req, res) => {
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

// ----------------------
//  PRODUCTS: CREATE
//  POST /api/products
//  (protected - needs token)
// ----------------------
app.post("/api/products", authenticateToken, async (req, res) => {
  try {
    const products = db.collection("products");
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
       tags
    } = req.body;

    // Required: name + price
    if (!product_name || unit_price === undefined) {
      return res.status(400).json({
        message: "product_name and unit_price are required",
      });
    }

    const unitPriceNumber = Number(unit_price);
    const costPriceNumber =
      cost_price !== undefined && cost_price !== null
        ? Number(cost_price)
        : null;

    if (
      Number.isNaN(unitPriceNumber) ||
      (costPriceNumber !== null && Number.isNaN(costPriceNumber))
    ) {
      return res.status(400).json({
        message: "unit_price and cost_price must be numbers",
      });
    }

    const now = new Date();

    const newProduct = {
    product_name,
    description: description || "",
    category_id: category_id || null,
    supplier_id: supplier_id || null,
    unit_price: unitPriceNumber,
    cost_price: costPriceNumber,
    is_active: is_active === undefined ? true : Boolean(is_active),
    brand: brand || null,
    model: model || null,
    specs: specs || {},
    tags: Array.isArray(tags) ? tags : [],
    created_at: now,
    updated_at: now,
  };


    const result = await products.insertOne(newProduct);

    res.status(201).json({
      _id: result.insertedId,
      ...newProduct,
    });
  } catch (err) {
    console.error("Error creating product:", err);
    res.status(500).json({ message: "Error creating product" });
  }
});

// ----------------------
//  PRODUCTS: UPDATE
//  PUT /api/products/:id
//  (protected - needs token)
// ----------------------
app.put("/api/products/:id", authenticateToken, async (req, res) => {
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
});

// ----------------------
//  PRODUCTS: DELETE (SOFT)
//  DELETE /api/products/:id
//  (protected - needs token)
// ----------------------
app.delete("/api/products/:id", authenticateToken, async (req, res) => {
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
});
