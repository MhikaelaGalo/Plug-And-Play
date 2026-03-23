// src/services/dataService.js
import api from "./api"; // Assuming 'api' is an Axios instance configured with the base URL

// Base URLs for all modules
const CATEGORIES_BASE_URL = "/categories";
const PRODUCTS_BASE_URL = "/products";
const SUPPLIERS_BASE_URL = "/suppliers";
const INVENTORY_BASE_URL = "/inventory";
const ORDERS_BASE_URL = "/orders";

// ===================================
// --- HELPER FUNCTION FOR FORM DATA ---
// ===================================
function convertToFormData(productData, imageFile) {
  const formData = new FormData();
  if (imageFile) {
    // CRITICAL: "product_image" must match the name in Multer (products.js)
    formData.append("product_image", imageFile);
  }
  for (const key in productData) {
    const value = productData[key];
    if (value !== null && value !== undefined && value !== "") {
      if (typeof value === "object" && !Array.isArray(value)) {
        // Stringify complex objects (like specs)
        formData.append(key, JSON.stringify(value));
      } else if (typeof value === "boolean") {
        // Convert booleans to strings
        formData.append(key, String(value));
      } else if (Array.isArray(value)) {
        // Stringify arrays (like tags)
        formData.append(key, JSON.stringify(value));
      } else {
        formData.append(key, value);
      }
    }
  }
  return formData;
}

// ===================================
// --- ERROR HANDLING HELPER ---
// ===================================
function handleError(error, operation) {
  const message =
    error.response?.data?.message ||
    `An unexpected error occurred during ${operation}.`;
  console.error(`Error during ${operation}:`, error);
  throw new Error(message);
}

// ===================================
// 1. CATEGORY CRUD OPERATIONS (Admin)
// ===================================

export async function fetchCategories() {
  try {
    const response = await api.get(CATEGORIES_BASE_URL);
    return response.data;
  } catch (error) {
    handleError(error, "fetch categories");
  }
}

export async function createCategory(categoryData) {
  try {
    const response = await api.post(CATEGORIES_BASE_URL, categoryData);
    return response.data;
  } catch (error) {
    handleError(error, "create category");
  }
}

export async function updateCategory(id, categoryData) {
  try {
    const response = await api.put(
      `${CATEGORIES_BASE_URL}/${id}`,
      categoryData
    );
    return response.data;
  } catch (error) {
    handleError(error, "update category");
  }
}

export async function deleteCategory(id) {
  try {
    const response = await api.delete(`${CATEGORIES_BASE_URL}/${id}`);
    return response.data;
  } catch (error) {
    handleError(error, "delete category");
  }
}

// ===================================
// 2. SUPPLIER CRUD OPERATIONS (Admin)
// ===================================

export async function fetchSuppliers() {
  try {
    const response = await api.get(SUPPLIERS_BASE_URL);
    return response.data;
  } catch (error) {
    handleError(error, "fetch suppliers");
  }
}

export async function createSupplier(supplierData) {
  try {
    const response = await api.post(SUPPLIERS_BASE_URL, supplierData);
    return response.data;
  } catch (error) {
    handleError(error, "create supplier");
  }
}

export async function updateSupplier(id, supplierData) {
  try {
    const response = await api.put(`${SUPPLIERS_BASE_URL}/${id}`, supplierData);
    return response.data;
  } catch (error) {
    handleError(error, "update supplier");
  }
}

export async function deleteSupplier(id) {
  try {
    const response = await api.delete(`${SUPPLIERS_BASE_URL}/${id}`);
    return response.data;
  } catch (error) {
    handleError(error, "delete supplier");
  }
}

// ===================================
// 3. PRODUCT CRUD OPERATIONS (Admin)
// ===================================

export async function fetchProducts() {
  try {
    const response = await api.get(PRODUCTS_BASE_URL);
    return response.data;
  } catch (error) {
    handleError(error, "fetch products");
  }
}

export async function createProduct(productData, imageFile) {
  try {
    const formData = convertToFormData(productData, imageFile);

    // 🔥 CRITICAL FIX: Tell Axios NOT to use the default 'application/json' header.
    // Setting Content-Type to undefined allows the browser to automatically set
    // the correct 'multipart/form-data; boundary=...' header for files.
    const response = await api.post(PRODUCTS_BASE_URL, formData, {
      headers: {
        "Content-Type": undefined,
      },
    });

    return response.data;
  } catch (error) {
    handleError(error, "create product");
  }
}

export async function updateProduct(id, productData, imageFile) {
  try {
    const formData = convertToFormData(productData, imageFile);

    // 🔥 CRITICAL FIX: Apply the same fix for PUT request.
    const response = await api.put(`${PRODUCTS_BASE_URL}/${id}`, formData, {
      headers: {
        "Content-Type": undefined,
      },
    });

    return response.data;
  } catch (error) {
    handleError(error, "update product");
  }
}

export async function deleteProduct(id) {
  try {
    const response = await api.delete(`${PRODUCTS_BASE_URL}/${id}`);
    return response.data;
  } catch (error) {
    handleError(error, "delete product");
  }
}

// ===================================
// 4. INVENTORY CRUD OPERATIONS (Admin)
// ===================================

export async function fetchInventory() {
  try {
    const response = await api.get(INVENTORY_BASE_URL);
    return response.data;
  } catch (error) {
    handleError(error, "fetch inventory");
  }
}

export async function createInventory(inventoryData) {
  try {
    const response = await api.post(INVENTORY_BASE_URL, inventoryData);
    return response.data;
  } catch (error) {
    handleError(error, "create inventory record");
  }
}

export async function updateInventory(id, inventoryData) {
  try {
    const response = await api.put(
      `${INVENTORY_BASE_URL}/${id}`,
      inventoryData
    );
    return response.data;
  } catch (error) {
    handleError(error, "update inventory record");
  }
}

export async function deleteInventory(id) {
  try {
    const response = await api.delete(`${INVENTORY_BASE_URL}/${id}`);
    return response.data;
  } catch (error) {
    handleError(error, "delete inventory record");
  }
}

// ===================================
// 5. ORDER MANAGEMENT OPERATIONS (ADMIN ONLY)
// ===================================

// R: Read All Orders (Admin View) (GET /api/orders/admin/orders?status=...)
export async function fetchAdminOrders(filters = {}) {
  try {
    const params = new URLSearchParams();
    if (filters.status) params.append("status", filters.status);
    if (filters.paymentStatus)
      params.append("paymentStatus", filters.paymentStatus);

    const response = await api.get(
      `${ORDERS_BASE_URL}/admin/orders?${params.toString()}`
    );
    return response.data;
  } catch (error) {
    handleError(error, "fetch admin orders");
  }
}

// U: Update Order Status (PUT /api/orders/:id/status)
export async function updateOrderStatus(id, updateData) {
  try {
    const response = await api.put(
      `${ORDERS_BASE_URL}/${id}/status`,
      updateData
    );
    return response.data;
  } catch (error) {
    handleError(error, "update order status");
  }
}
// NOTE: All customer order functions (placeOrder, fetchCustomerOrders, fetchCustomerOrderDetails) are removed.
